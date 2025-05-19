import lamejs from 'lamejs'
import { segmentSongByFeatures } from '../utils/audioAnalysisUtils';

export async function findMixPoint(firstAudioBuffer, secondAudioBuffer, fadein = 0){
  const firstSong = await segmentSongByFeatures(firstAudioBuffer, fadein)
  const secondSong = await segmentSongByFeatures(secondAudioBuffer)

  function euclideanDistance(features1, features2) {
    let distance = 0;
    for (let i = 0; i < features1.length; i++) {
      distance += Math.pow(features1[i] - features2[i], 2);
    }
    return Math.sqrt(distance)
  }

  function calculateAverageFeatures(featureObjects) {
    let avgFeatures = {};
    let count = featureObjects.length;
  
    // Early exit if featureObjects is empty or no valid features are present
    if (count === 0 || !featureObjects[0] || !featureObjects[0].features) {
      console.error("Invalid featureObjects data:", featureObjects);
      return avgFeatures;
    }
  
    // Initialize avgFeatures with zero values based on the first feature object's keys
    for (let key of Object.keys(featureObjects[0].features)) {
      avgFeatures[key] = 0;
    }
  
    // Loop through each object and accumulate the feature values
    featureObjects.forEach(obj => {
      if (obj.features) {
        for (let key of Object.keys(obj.features)) {
          avgFeatures[key] += obj.features[key];
        }
      } else {
        console.warn("Missing 'features' in one of the objects:", obj);
      }
    });
  
    // Calculate the average for each feature
    for (let key in avgFeatures) {
      avgFeatures[key] /= count;
    }
  
    return avgFeatures;
  }  

  function calculateAverageDistance(song1, song2) {
    let distances = [];

    // Loop through each sub-array in song1 and song2
    for (let i = 0; i < song1.length; i++) {
      for (let j = 0; j < song2.length; j++) {
        // Get the average features for each sub-array
        let avgFeatures1 = calculateAverageFeatures(song1[i]);
        let avgFeatures2 = calculateAverageFeatures(song2[j]);
        
        // Calculate the Euclidean distance between the two sub-arrays
        let features1 = Object.values(avgFeatures1);
        let features2 = Object.values(avgFeatures2);
        let dist = euclideanDistance(features1, features2);
        distances.push(dist);
      }
    }

    // Calculate the average distance between all pairs
    let totalDistance = distances.reduce((sum, dist) => sum + dist, 0);
    return totalDistance / distances.length;
  }

  function findMixPoints(song1, song2) {
    let mixPoints = [];
  
    // Calculate the average distance between all subarray pairs
    let avgDistance = calculateAverageDistance(song1, song2);
  
    // Loop through all subarray pairs and check for matches
    for (let i = 1; i < song1.length - 1; i++) { // Ensure there's a next segment
      for (let j = 0; j < song2.length - 1; j++) { // Ensure there's a next segment
  
        // Get the average features for each sub-array
        let avgFeatures1 = calculateAverageFeatures(song1[i]);
        let avgFeatures2 = calculateAverageFeatures(song2[j]);
  
        // Calculate the Euclidean distance between the two sub-arrays
        let features1 = Object.values(avgFeatures1);
        let features2 = Object.values(avgFeatures2);
        let dist = euclideanDistance(features1, features2);
  
        if (dist <= 0.2 * avgDistance) {
          // Now check the next segments
          let nextFeatures1 = calculateAverageFeatures(song1[i + 1]);
          let nextFeatures2 = calculateAverageFeatures(song2[j + 1]);
  
          let nextDist = euclideanDistance(
            Object.values(nextFeatures1),
            Object.values(nextFeatures2)
          );
  
          let similarity = 1 - nextDist / avgDistance; // Normalize similarity (1 = identical, 0 = max distance)
          let currentSimilarity = 1 - dist / avgDistance
          let similarityPercentage = currentSimilarity * 100

          if (similarity >= 0.6) {
            mixPoints.push([i, j, similarityPercentage.toFixed(2)]);
          }
        }
      }
    }

    if (mixPoints.length === 0) {
      return [null];
    }

    let maxSimilarity = Math.max(...mixPoints.map(mp => parseFloat(mp[2])));

    return mixPoints.filter(mp => parseFloat(mp[2]) === maxSimilarity);
  }

  let mixPoints = findMixPoints(firstSong, secondSong)[0]

  return mixPoints
}

export async function findMixTime(firstAudioBuffer, secondAudioBuffer, fadein = 0){
  const mixingPoint = await findMixPoint(firstAudioBuffer, secondAudioBuffer, fadein)
  if (mixingPoint === null) {
    return null;
  }
  const songData1 = await segmentSongByFeatures(firstAudioBuffer, fadein)
  const songData2 = await segmentSongByFeatures(secondAudioBuffer)
  const firstMixPoint = songData1[mixingPoint[0]]
  const secondMixPoint = songData2[mixingPoint[1]]
  const lengthSecondSong = songData2[songData2.length - 1][songData2[songData2.length - 1].length - 1].start

  function findMixStart(firstMixPoint, secondMixPoint) {
    // 1. Get the first 7 seconds of the second track (secondMixPoint)
    const secondTrack7Sec = secondMixPoint.slice(0, 7);  // Get the first 7 segments
  
    // 2. Calculate the average of each feature for the first 7 seconds of secondMixPoint
    const secondTrackAverages = getFeatureAverages(secondTrack7Sec);
  
    let highestSimilarity = 0;

    let bestMatchIndex = null;
  
    for (let i = 0; i <= firstMixPoint.length - 8; i++) {
      const firstTrack7Sec = firstMixPoint.slice(i, i + 7);  // Current 7-second window
  
      // 4. Calculate the average of each feature for the current 7 seconds of firstMixPoint
      const firstTrackAverages = getFeatureAverages(firstTrack7Sec);
  
      // 5. Compare the averages between the two 7-second windows
      const similarity = compareFeatures(secondTrackAverages, firstTrackAverages);
  
      // 6. Track the highest similarity and update the best match index
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatchIndex = i;
      }
    }

    return [firstMixPoint[bestMatchIndex].start, secondMixPoint[0].start - 3, lengthSecondSong];
  }

  function getFeatureAverages(segments) {
    const featureNames = Object.keys(segments[0].features);  // List of feature names
    const averages = {};
  
    // Calculate average for each feature across all segments in the window
    featureNames.forEach((featureName) => {
      averages[featureName] = segments.reduce((sum, segment) => sum + segment.features[featureName], 0) / segments.length;
    });
  
    return averages;
  }
  
  function compareFeatures(features1, features2) {
    let totalSimilarity = 0;
    const featureNames = Object.keys(features1);  // Dynamically get all feature names
  
    // Compare each feature
    for (let featureName of featureNames) {
      const similarity = compareFeature(features1[featureName], features2[featureName]);
      totalSimilarity += similarity;
    }
  
    // Calculate the average similarity across all features
    return totalSimilarity / featureNames.length;
  }
  
  function compareFeature(value1, value2) {
    // Calculate similarity as the percentage of similarity (adjust this as needed)
    const distance = Math.abs(value1 - value2);  // Euclidean-like distance (absolute difference)
    const maxPossibleDifference = Math.max(value1, value2);  // To normalize the similarity
    const similarity = 1 - (distance / maxPossibleDifference);  // Similarity: 1 = identical, 0 = no match
  
    return similarity;
  }

  const mixStart = findMixStart(firstMixPoint, secondMixPoint)

  return mixStart
}

export async function mixSongs(audioBuffers) {
  const songMixingPoints = Array(audioBuffers.length).fill(null).map(() => [null, null]);

  // STEP 1: Calculate mix points
  for (let i = 0; i < audioBuffers.length - 1; i++) {
    const bufferA = audioBuffers[i];
    const bufferB = audioBuffers[i + 1];
    let fadein = 0;

    if (i > 0 && songMixingPoints[i][0] !== null) {
      const fadeInTime = songMixingPoints[i][0];
      const remainingDuration = bufferA.duration - fadeInTime;
      const halfUsedStart = Math.floor(fadeInTime + remainingDuration / 2);
      fadein = halfUsedStart;
    }

    const mixTimes = await findMixTime(bufferA, bufferB, fadein);

    if (mixTimes !== null) {
      const [fadeOutTime, fadeInTime] = mixTimes;

      if (i === 0) songMixingPoints[i][0] = null;

      if (fadeOutTime !== null && fadeInTime !== null) {
        songMixingPoints[i][1] = fadeOutTime;
        songMixingPoints[i + 1][0] = fadeInTime;
      }
    }
  }

  // STEP 2: Apply fades and combine
  const sampleRate = audioBuffers[0].sampleRate;
  const fadeInDuration = 5;
  const fadeOutDuration = 7;
  const fadeInSamples = fadeInDuration * sampleRate;
  const fadeOutSamples = fadeOutDuration * sampleRate;
  let finalLength = 0;

  const processedChannels = [];

  for (let i = 0; i < audioBuffers.length; i++) {
    const buffer = audioBuffers[i];
    const channel = buffer.getChannelData(0);
    const newChannel = new Float32Array(channel.length);
    newChannel.set(channel);

    const [fadeInTime, fadeOutTime] = songMixingPoints[i];

    if (fadeInTime !== null) {
      const startFadeIn = Math.floor(fadeInTime * sampleRate);
      for (let j = 0; j < fadeInSamples && (startFadeIn + j) < newChannel.length; j++) {
        const fadeFactor = j / fadeInSamples;
        newChannel[startFadeIn + j] *= fadeFactor;
      }
    }

    if (fadeOutTime !== null) {
      const startFadeOut = Math.floor(fadeOutTime * sampleRate);
      for (let j = 0; j < fadeOutSamples && (startFadeOut + j) < newChannel.length; j++) {
        const fadeFactor = 1 - (j / fadeOutSamples);
        newChannel[startFadeOut + j] *= fadeFactor;
      }
    }

    processedChannels.push(newChannel);

    // Update final length (with overlap accounted)
    let start = 0;
    let end = buffer.length;
    if (songMixingPoints[i][0] !== null) {
      start = Math.floor(songMixingPoints[i][0] * sampleRate);
    }
    if (songMixingPoints[i][1] !== null && i < audioBuffers.length - 1) {
      end = Math.floor(songMixingPoints[i][1] * sampleRate) + fadeOutSamples;
    }
    finalLength += (end - start);
    if (i < audioBuffers.length - 1 && songMixingPoints[i][1] !== null) {
      finalLength -= fadeOutSamples; // overlap correction
    }
  }

  const mixedChannel = new Float32Array(finalLength);
  let offset = 0;

  for (let i = 0; i < processedChannels.length; i++) {
    const current = processedChannels[i];
    let start = 0;
    let end = current.length;

    if (i > 0 && songMixingPoints[i][0] !== null) {
      start = Math.floor(songMixingPoints[i][0] * sampleRate);
    }

    if (i < processedChannels.length - 1 && songMixingPoints[i][1] !== null) {
      end = Math.floor(songMixingPoints[i][1] * sampleRate) + fadeOutSamples;
    }

    const lengthToCopy = end - start;

    for (let j = 0; j < lengthToCopy; j++) {
      const sample = current[start + j] || 0;
      if (offset + j < mixedChannel.length) {
        mixedChannel[offset + j] += sample; // handles overlap
      }
    }

    offset += lengthToCopy;
    if (i < processedChannels.length - 1 && songMixingPoints[i][1] !== null) {
      offset -= fadeOutSamples;
    }
  }

  // STEP 3: Encode to MP3 using lamejs
  const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
  const samples = mixedChannel;
  const mp3Data = [];

  const samplesInt16 = samples.map(s => Math.max(-1, Math.min(1, s)) * 32767).map(s => s | 0);
  const chunkSize = 1152;
  for (let i = 0; i < samplesInt16.length; i += chunkSize) {
    const chunk = samplesInt16.slice(i, i + chunkSize);
    const mp3buf = mp3encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) mp3Data.push(new Uint8Array(mp3buf));
  }

  const endBuf = mp3encoder.flush();
  if (endBuf.length > 0) mp3Data.push(new Uint8Array(endBuf));

  // STEP 4: Trigger browser download
  const blob = new Blob(mp3Data, { type: 'audio/mp3' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'mixed_songs.mp3';
  document.body.appendChild(a);
  a.click();

  URL.revokeObjectURL(url);
  document.body.removeChild(a);

  return blob;
}