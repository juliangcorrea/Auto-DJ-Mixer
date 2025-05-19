import Essentia from 'essentia.js/dist/essentia.js-core.es.js';
import { EssentiaWASM } from 'essentia.js/dist/essentia-wasm.es.js';
import Meyda from 'meyda';
import { extractFeatures, createSegmentByLength, normalizeData, extractFeatureDatasets } from '../utils/audioExtractionUtils';

//Essentia song audio features extraction function
export async function processAudioEssentia(audioBuffer) {
  // Initialize Essentia with the WebAssembly module
  const essentia = new Essentia(EssentiaWASM)

  // Extract sample rate and channel data from the audio buffer
  const sampleRate = audioBuffer.sampleRate
  const channelData = audioBuffer.getChannelData(0)

  // Calculate total samples and duration of the audio
  const totalSamples = channelData.length
  const totalDuration = totalSamples / sampleRate

  // Define segment duration (1 second) and calculate number of segments
  const segmentDuration = 1
  const numSegments = Math.ceil(totalDuration / segmentDuration)

  // Array to hold feature data for each segment
  const segments = []

  // Validate sample rate before processing
  if (sampleRate <= 0 || isNaN(sampleRate)) {
    throw new Error("Invalid sample rate")
  }

  // Process each segment individually
  for (let i = 0; i < numSegments; i++) {
    const startTime = i * segmentDuration
    const endTime = Math.min((i + 1) * segmentDuration, totalDuration)

    // Calculate sample indices for the segment
    const startSample = Math.floor(startTime * sampleRate)
    const endSample = Math.floor(endTime * sampleRate)

    // Skip invalid segments where start is after or equal to end
    if (startSample >= endSample) {
      console.warn(`Skipping invalid segment: startSample >= endSample (${startSample} >= ${endSample})`)
      continue
    }

    // Extract audio data for the current segment
    const segmentData = channelData.slice(startSample, endSample)

    // Skip empty segments
    if (segmentData.length === 0) {
      console.warn(`Skipping empty segment: ${startTime} - ${endTime}`)
      continue
    }

    // Convert segment data to Essentia vector format
    const segmentVector = essentia.arrayToVector(segmentData)

    let features
    try {
      // Extract audio features using Essentia helper function
      features = await extractFeatures(essentia, segmentVector)
    } catch (error) {
      console.error(`Error extracting features for segment ${startTime} - ${endTime}:`, error)
      continue
    }

    // Store segment timing and extracted features
    segments.push({
      start: startTime,
      end: endTime,
      features
    })
  }

  // Return array of all segments with their features
  return segments
}

//Meyda song audio features extraction function
export async function processAudioMeyda(audioBuffer) {
  // Extract sample rate and define buffer size for analysis frames
  const sampleRate = audioBuffer.sampleRate
  const bufferSize = 1024

  // Define desired segment duration in seconds
  const desiredSegmentDuration = 1

  // Calculate frame duration and frame rate based on buffer size and sample rate
  const frameDuration = bufferSize / sampleRate
  const frameRate = 1 / frameDuration

  // Calculate number of frames per segment
  const segmentLength = Math.round(frameRate * desiredSegmentDuration)

  // Validate sample rate before processing
  if (sampleRate <= 0 || isNaN(sampleRate)) {
    throw new Error("Invalid sample rate.")
  }

  // Initialize data structure to hold feature history and segment boundaries
  let songData = {
    featureHistory: [],
    segmentBoundaries: [],
  }

  // Get audio channel data (assuming mono or first channel)
  const channelData = audioBuffer.getChannelData(0)

  // Helper function to process extracted features and update songData
  function processFeatures(features, songData) {
    if (!features) return

    // Append current features with timestamp to feature history
    songData.featureHistory.push({
      time: features.currentTime, // set in main loop
      energy: features.energy,
      rms: features.rms,
      spectralCentroid: features.spectralCentroid,
      rollOff: features.spectralRolloff,
      zcr: features.zcr
    })

    // Check if enough frames collected to create a segment using Meyda helper function
    createSegmentByLength(songData, segmentLength)
  }

  // Loop through audio data in chunks of bufferSize
  for (let i = 0; i <= channelData.length - bufferSize; i += bufferSize) {
    // Extract current frame slice
    const frame = channelData.slice(i, i + bufferSize)

    // Skip incomplete frames at the end
    if (frame.length < bufferSize) continue

    // Extract audio features from the current frame using Meyda
    const features = Meyda.extract(
      ['rms', 'spectralCentroid', 'spectralRolloff', 'zcr', 'energy'],
      frame,
      { sampleRate: sampleRate }
    )

    if (features) {
      // Annotate features with current time in seconds
      features.currentTime = i / sampleRate

      // Process and store features
      processFeatures(features, songData)
    }
  }

  // Return the array of segment boundaries with aggregated features
  return songData.segmentBoundaries
}

export async function getSongData(audioBuffer, fadein = 0) {
  const essentiaResults = await processAudioEssentia(audioBuffer)

  const meydaResults = await processAudioMeyda(audioBuffer)

  let songData = normalizeData(essentiaResults, meydaResults)

  if (fadein != 0) {
    songData = songData.splice(fadein)
  }

  const featureDatasets = extractFeatureDatasets(songData)

  return [songData, featureDatasets]
}