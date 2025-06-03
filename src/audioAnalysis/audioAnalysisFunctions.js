import lamejs from 'lamejs'
import { 
  segmentSongByFeatures, 
  calculateAverageDistance, 
  calculateAverageFeatures, 
  euclideanDistance, 
  getFeatureAverages,
  compareFeatures
} from '../utils/audioAnalysisUtils'

// Finds optimal transition points between two audio tracks
// by comparing feature segments and validating smooth continuation.
export async function findMixPoint(firstAudioBuffer, secondAudioBuffer, fadein = 0) {
  if (!firstAudioBuffer || !secondAudioBuffer) {
    throw new Error("Both audio buffers must be provided to findMixPoint.")
  }

  // [1] Extract segmented features from both audio buffers
  let firstSongSegments, secondSongSegments
  try {
    firstSongSegments = await segmentSongByFeatures(firstAudioBuffer, fadein)
    secondSongSegments = await segmentSongByFeatures(secondAudioBuffer)
  } catch (err) {
    console.error("Error during segmentation in findMixPoint:", err)
    throw err
  }

  if (!Array.isArray(firstSongSegments) || firstSongSegments.length < 3 ||
      !Array.isArray(secondSongSegments) || secondSongSegments.length < 2) {
    // Not enough segments to find a meaningful mix point
    return [null]
  }

  // [2] Calculate global average distance as baseline similarity metric
  const avgDistance = calculateAverageDistance(firstSongSegments, secondSongSegments)
  if (typeof avgDistance !== "number" || avgDistance <= 0) {
    // Invalid average distance, cannot compare
    return [null]
  }

  // Container for candidate mix points: [indexFirstSong, indexSecondSong, similarityScore]
  const candidateMixPoints = []

  // [3] Scan segments of both songs to find compatible mix points
  // Skip first and last segments of first song to avoid edge artifacts
  for (let i = 1; i < firstSongSegments.length - 1; i++) {
    const firstFeaturesAvg = calculateAverageFeatures(firstSongSegments[i])
    if (!firstFeaturesAvg) continue
    const featuresFirst = Object.values(firstFeaturesAvg)

    for (let j = 0; j < secondSongSegments.length - 1; j++) {
      const secondFeaturesAvg = calculateAverageFeatures(secondSongSegments[j])
      if (!secondFeaturesAvg) continue
      const featuresSecond = Object.values(secondFeaturesAvg)

      const currentDistance = euclideanDistance(featuresFirst, featuresSecond)
      if (typeof currentDistance !== "number") continue

      // Check if current segment similarity passes 20% threshold
      if (currentDistance <= 0.2 * avgDistance) {
        const nextFeaturesFirstAvg = calculateAverageFeatures(firstSongSegments[i + 1])
        const nextFeaturesSecondAvg = calculateAverageFeatures(secondSongSegments[j + 1])
        if (!nextFeaturesFirstAvg || !nextFeaturesSecondAvg) continue

        const nextFeaturesFirst = Object.values(nextFeaturesFirstAvg)
        const nextFeaturesSecond = Object.values(nextFeaturesSecondAvg)

        const nextDistance = euclideanDistance(nextFeaturesFirst, nextFeaturesSecond)
        if (typeof nextDistance !== "number") continue

        // Convert distances to similarity percentages (higher = better)
        const currentSimilarity = (1 - currentDistance / avgDistance) * 100
        const nextSimilarity = (1 - nextDistance / avgDistance) * 100

        // Ensure next segments have at least 60% similarity for smooth continuation
        if (nextSimilarity >= 60) {
          candidateMixPoints.push([i, j, currentSimilarity.toFixed(2)])
        }
      }
    }
  }

  // [4] Return the best mix point or [null] if none found
  if (candidateMixPoints.length === 0) {
    return [null]
  }

  // Find the highest similarity score among candidates
  const maxSimilarity = Math.max(...candidateMixPoints.map((p) => parseFloat(p[2])))

  // Return the first candidate with the highest similarity
  return candidateMixPoints.find((p) => parseFloat(p[2]) === maxSimilarity)
}

// Slides a 7-segment (~7 seconds) window over the first track's mix points
// to find the best alignment with the incoming track’s intro segments.
function findMixStart(firstMixPoint, secondMixPoint) {
  // Defensive checks to avoid errors if inputs are invalid or too short
  if (!Array.isArray(firstMixPoint) || firstMixPoint.length < 7) {
    throw new Error("firstMixPoint must be an array with at least 7 segments.")
  }
  if (!Array.isArray(secondMixPoint) || secondMixPoint.length < 7) {
    throw new Error("secondMixPoint must be an array with at least 7 segments.")
  }

  // [1] Extract the first 7 segments (~7 seconds) of the second track
  const secondTrackWindow = secondMixPoint.slice(0, 7)

  // [2] Compute average features for those 7 segments
  const secondTrackAverages = getFeatureAverages(secondTrackWindow)
  if (!secondTrackAverages) {
    throw new Error("Failed to get feature averages for second track window.")
  }

  let highestSimilarity = -Infinity
  let bestMatchIndex = null

  // [3] Slide a 7-segment window over the first track to compare similarity
  for (let i = 0; i <= firstMixPoint.length - 7; i++) {
    const firstTrackWindow = firstMixPoint.slice(i, i + 7)

    // [4] Compute average features for current window in first track
    const firstTrackAverages = getFeatureAverages(firstTrackWindow)
    if (!firstTrackAverages) continue

    // [5] Compare features and compute similarity score
    const similarity = compareFeatures(secondTrackAverages, firstTrackAverages)
    if (typeof similarity !== "number") continue

    // [6] Update highest similarity and best match index if better
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity
      bestMatchIndex = i
    }
  }

  if (bestMatchIndex === null) {
    throw new Error("No suitable mix start point found.")
  }

  // [7] Return start times:
  // - Start time in first track at best matching window
  // - Start time in second track minus 3 seconds (fade-in offset)
  return [
    firstMixPoint[bestMatchIndex].start,
    Math.max(0, secondMixPoint[0].start - 3) // Ensure non-negative start time
  ]
}

// Determines the best time points to start mixing two audio tracks
// by analyzing segment similarity and timing alignment.
export async function findMixTime(firstAudioBuffer, secondAudioBuffer, fadein = 0) {
  if (!firstAudioBuffer || !secondAudioBuffer) {
    throw new Error("Both audio buffers must be provided to findMixTime.")
  }

  // [1] Find the best matching segment indices between the two tracks
  const mixingPoint = await findMixPoint(firstAudioBuffer, secondAudioBuffer, fadein)
  if (!mixingPoint || mixingPoint[0] === null || mixingPoint[1] === null) {
    // No suitable mix point found
    return null
  }

  // [2] Segment both tracks into feature-based chunks
  const firstTrackSegments = await segmentSongByFeatures(firstAudioBuffer, fadein)
  const secondTrackSegments = await segmentSongByFeatures(secondAudioBuffer)

  const firstMixSegment = firstTrackSegments[mixingPoint[0]]
  const secondMixSegment = secondTrackSegments[mixingPoint[1]]

  if (!firstMixSegment || !secondMixSegment) {
    return null
  }

  // [3] Get the start time of the last segment in the second track
  const lastSecondTrackSegment = secondTrackSegments[secondTrackSegments.length - 1]
  const lastSegmentStartTime = lastSecondTrackSegment?.[lastSecondTrackSegment.length - 1]?.start ?? 0

  // [4] Compute mix start times using the matched segments
  let mixStartTimes
  try {
    mixStartTimes = findMixStart(firstMixSegment, secondMixSegment)
  } catch (err) {
    console.warn("Failed to find mix start times:", err)
    return null
  }

  // Append the reference end time of the second track
  mixStartTimes.push(lastSegmentStartTime)

  return mixStartTimes
}

// mixSongs: Mixes multiple audio buffers with crossfade transitions,
// encodes to MP3 using lamejs, and returns the resulting blob.
export default async function mixSongs(audioBuffers) {
  if (!Array.isArray(audioBuffers) || audioBuffers.length === 0) {
    throw new Error("No audio buffers provided for mixing.")
  }

  try {
    // Initialize mix points: [fadeInTime, fadeOutTime] for each song
    const songMixPoints = audioBuffers.map(() => [null, null])

    for (let i = 0; i < audioBuffers.length - 1; i++) {
      const currentBuffer = audioBuffers[i]
      const nextBuffer = audioBuffers[i + 1]
      let fadein = 0

      if (i > 0 && songMixPoints[i][0] !== null) {
        const fadeInTime = songMixPoints[i][0]
        const remainingDuration = currentBuffer.duration - fadeInTime
        if (remainingDuration > 0) {
          fadein = fadeInTime + remainingDuration / 2
        }
      }

      const mixTimes = await findMixTime(currentBuffer, nextBuffer, fadein)
      if (mixTimes !== null && Array.isArray(mixTimes)) {
        const [fadeOutTime, fadeInTime] = mixTimes

        if (i === 0) {
          songMixPoints[i][0] = null
        }

        if (fadeOutTime != null && fadeInTime != null) {
          songMixPoints[i][1] = fadeOutTime
          songMixPoints[i + 1][0] = fadeInTime
        }
      }
    }

    const sampleRate = audioBuffers[0].sampleRate
    const FADE_IN_SECONDS = 5
    const FADE_OUT_SECONDS = 7
    const fadeInSamples = Math.floor(FADE_IN_SECONDS * sampleRate)
    const fadeOutSamples = Math.floor(FADE_OUT_SECONDS * sampleRate)

    let finalLength = 0
    const processedChannels = []

    for (let i = 0; i < audioBuffers.length; i++) {
      const buffer = audioBuffers[i]
      const channelData = buffer.getChannelData(0)
      const processedData = new Float32Array(channelData.length)
      processedData.set(channelData)

      const [fadeInTime, fadeOutTime] = songMixPoints[i]

      if (fadeInTime !== null) {
        const fadeInStartSample = Math.floor(fadeInTime * sampleRate)
        for (let j = 0; j < fadeInSamples && fadeInStartSample + j < processedData.length; j++) {
          processedData[fadeInStartSample + j] *= j / fadeInSamples
        }
      }

      if (fadeOutTime !== null) {
        const fadeOutStartSample = Math.floor(fadeOutTime * sampleRate)
        for (let j = 0; j < fadeOutSamples && fadeOutStartSample + j < processedData.length; j++) {
          processedData[fadeOutStartSample + j] *= 1 - j / fadeOutSamples
        }
      }

      processedChannels.push(processedData)

      let segmentStart = 0
      let segmentEnd = buffer.length

      if (fadeInTime !== null) {
        segmentStart = Math.floor(fadeInTime * sampleRate)
      }

      if (fadeOutTime !== null && i < audioBuffers.length - 1) {
        segmentEnd = Math.min(buffer.length, Math.floor(fadeOutTime * sampleRate) + fadeOutSamples)
      }

      finalLength += segmentEnd - segmentStart

      if (i < audioBuffers.length - 1 && fadeOutTime !== null) {
        finalLength -= fadeOutSamples
      }
    }

    const mixedChannel = new Float32Array(finalLength)
    let offset = 0

    for (let i = 0; i < processedChannels.length; i++) {
      const currentData = processedChannels[i]
      let segmentStart = 0
      let segmentEnd = currentData.length

      if (i === 0 && songMixPoints[i][0] !== null) {
        segmentStart = Math.floor(songMixPoints[i][0] * sampleRate)
      }

      if (i < audioBuffers.length - 1 && songMixPoints[i][1] !== null) {
        segmentEnd = Math.min(currentData.length, Math.floor(songMixPoints[i][1] * sampleRate) + fadeOutSamples)
      }

      // Avoid negative lengths or invalid segments
      if (segmentEnd <= segmentStart) continue

      mixedChannel.set(currentData.subarray(segmentStart, segmentEnd), offset)
      offset += segmentEnd - segmentStart

      if (i < audioBuffers.length - 1 && songMixPoints[i][1] !== null) {
        offset -= fadeOutSamples
      }
    }

    // Convert Float32Array samples [-1, 1] to Int16 for lamejs encoder
    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128)
    const sampleBlockSize = 1152
    const mp3Data = []

    for (let i = 0; i < mixedChannel.length; i += sampleBlockSize) {
      const sampleChunk = mixedChannel.subarray(i, i + sampleBlockSize)
      const samples16bit = new Int16Array(sampleChunk.length)

      for (let j = 0; j < sampleChunk.length; j++) {
        // Clamp and convert to 16-bit PCM
        const s = Math.max(-1, Math.min(1, sampleChunk[j]))
        samples16bit[j] = s < 0 ? s * 0x8000 : s * 0x7FFF
      }

      const mp3buf = mp3encoder.encodeBuffer(samples16bit)
      if (mp3buf.length > 0) {
        mp3Data.push(new Uint8Array(mp3buf))
      }
    }

    const mp3buf = mp3encoder.flush()
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf))
    }

    // Concatenate all mp3 chunks into a single Uint8Array
    const totalLength = mp3Data.reduce((sum, arr) => sum + arr.length, 0)
    const mp3BlobArray = new Uint8Array(totalLength)
    let mp3Offset = 0

    for (const chunk of mp3Data) {
      mp3BlobArray.set(chunk, mp3Offset)
      mp3Offset += chunk.length
    }

    const blob = new Blob([mp3BlobArray], { type: "audio/mpeg" })
    return blob

  } catch (err) {
    console.error("Error while mixing songs:", err)
    throw err
  }
}