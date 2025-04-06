import Essentia from 'essentia.js/dist/essentia.js-core.es.js'; 
import { EssentiaWASM } from 'essentia.js/dist/essentia-wasm.es.js';
import Meyda from 'meyda';
import { useState } from "react";

async function processAudioEssentia(audioBuffer) {
  const essentia = new Essentia(EssentiaWASM);
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const totalSamples = channelData.length;
  const totalDuration = totalSamples / sampleRate; // Total duration of the audio in seconds
  const segmentDuration = 1; // Target segment duration in seconds

  // Calculate the number of segments (round up to ensure >= 10 seconds per segment)
  const numSegments = Math.ceil(totalDuration / segmentDuration);
  const segments = [];

  console.log('Beginning extraction....');
  
  // Loop through the audio data and create segments
  for (let i = 0; i < numSegments; i++) {
      const startTime = i * segmentDuration; // Start time of the segment in seconds
      const endTime = Math.min((i + 1) * segmentDuration, totalDuration); // End time of the segment in seconds

      // Convert the start and end times to sample indices
      const startSample = Math.floor(startTime * sampleRate); // Convert start time to sample index
      const endSample = Math.floor(endTime * sampleRate);     // Convert end time to sample index

      const segmentData = channelData.slice(startSample, endSample); // Extract the segment data
      
      const segmentVector = essentia.arrayToVector(segmentData);

      // Extract audio features for each segment
      const features = await extractFeatures(essentia, segmentVector);
      segments.push({
          start: startTime, // Start time of the segment in seconds
          end: endTime,     // End time of the segment in seconds
          features
      });
  }

  return segments;
}

async function extractFeatures(essentia, segmentVector) {
    const algorithmsToExtract = [
        'KeyExtractor',
        'Loudness',
        'Flux',
        'RollOff',
        'Energy',
        'DynamicComplexity'
    ];
    
    const features = {};
    const algorithms = essentia.algorithmNames;

    for (const algo of algorithmsToExtract) {
        try {
            if (algorithms.includes(algo)) {
                const result = essentia[algo](segmentVector);
                if (result) {
                    if (result.ticks) {
                        // Convert beats array properly
                        features[algo] = Array.from(essentia.vectorToArray(result.ticks)).map(beat => beat.toFixed(2));
                    } else if (typeof result === 'object' && result !== null) {
                        // Flatten object properties if it only contains numeric values
                        for (const key in result) {
                            if (typeof result[key] === 'number') {
                                features[key] = result[key]; // Store the numeric value directly
                            }
                        }
                    } else {
                        features[algo] = result; // Store directly if it's not an object
                    }
                }
            } else {
                console.warn(`Algorithm ${algo} not available in Essentia.js`);
            }
        } catch (error) {
            console.error(`Error with ${algo}:`, error);
        }
    }

    return features;
}

async function processAudioMeyda(audioBuffer) {
  const sampleRate = audioBuffer.sampleRate;
  const bufferSize = 1024;
  const desiredSegmentDuration = 1; // in seconds
  const frameDuration = bufferSize / sampleRate;
  const frameRate = 1 / frameDuration;
  const segmentLength = Math.round(frameRate * desiredSegmentDuration);

  let songData = {
    featureHistory: [],
    segmentBoundaries: [],  // Store fixed-length segments
  };

  // Offline processing: extract features from each frame of the audio buffer
  const channelData = audioBuffer.getChannelData(0);
  
  // Define processFeatures so it has access to segmentLength
  function processFeatures(features, songData) {
    if (!features) return;
    songData.featureHistory.push({
      time: features.currentTime, // set in the loop below
      energy: features.energy,
      rms: features.rms,
      spectralCentroid: features.spectralCentroid,
      rollOff: features.spectralRolloff,
      zcr: features.zcr
    });

    // Only create segment boundaries by fixed length
    createSegmentByLength(songData, segmentLength);
  }

  // Loop over the audio buffer offline, processing in chunks of bufferSize
  for (let i = 0; i <= channelData.length - bufferSize; i += bufferSize) {
    const frame = channelData.slice(i, i + bufferSize);
    const features = Meyda.extract(
      ['rms', 'spectralCentroid', 'spectralRolloff', 'zcr', 'energy'],
      frame,
      { sampleRate: sampleRate }
    );
    // Compute the time (in seconds) for this frame based on the sample index
    features.currentTime = i / sampleRate;
    processFeatures(features, songData);
  }

  // Return the segment boundaries with features, matching the structure of Essentia output
  return songData.segmentBoundaries;
}

function createSegmentByLength(songData, segmentLength) {
  if (songData.featureHistory.length >= segmentLength) {
    // Calculate the averages for this segment
    let avgEnergy = songData.featureHistory.reduce((sum, f) => sum + f.energy, 0) / songData.featureHistory.length;
    let avgSpectralCentroid = songData.featureHistory.reduce((sum, f) => sum + (f.spectralCentroid || 0), 0) / songData.featureHistory.length;
    let avgRms = songData.featureHistory.reduce((sum, f) => sum + f.rms, 0) / songData.featureHistory.length;
    let avgRollOff = songData.featureHistory.reduce((sum, f) => sum + f.rollOff, 0) / songData.featureHistory.length;
    let avgZcr = songData.featureHistory.reduce((sum, f) => sum + f.zcr, 0) / songData.featureHistory.length;

    // Create a segment that matches Essentia's output structure
    songData.segmentBoundaries.push({
      time: songData.featureHistory[0].time, // Use the timestamp of the first feature in the segment
      features: { // All features are grouped inside the "features" object
        energy: avgEnergy,
        spectralCentroid: avgSpectralCentroid,
        rms: avgRms,
        rollOff: avgRollOff,
        zcr: avgZcr
      }
    });

    // Clear the feature history while keeping reference
    songData.featureHistory.length = 0;
  }
}

async function getSongData(audioBuffer){

  const essentiaResults = await processAudioEssentia(audioBuffer)
  const meydaResults = await processAudioMeyda(audioBuffer)


  function normalize(essentiaSegments, meydaSegments, tolerance = 1) {

    let normalizedSegments = [];
  
    for (let i = 0; i < essentiaSegments.length; i++) {
      let matchedMeydaSegment = null;
      const essentiaSegment = essentiaSegments[i];
      const meydaSegment = meydaSegments[i];
  
      // Find matching Meyda segment within tolerance
      if (i <= meydaSegments.length - 1 && meydaSegment && Math.abs(essentiaSegment.start - meydaSegment.time) <= tolerance) {
        matchedMeydaSegment = meydaSegment;
      }
  
      if (matchedMeydaSegment) {
        let normalizedSegment = {
          start: essentiaSegment.start,
          end: essentiaSegment.end,
          features: {}
        };
  
        let allFeatures = {};
  
        // Add Essentia features
        for (const key in essentiaSegment.features) {
          const feature = essentiaSegment.features[key];
          
          if (Array.isArray(feature)) {
            // Ensure array is properly formatted (no unnecessary indices)
            allFeatures[key] = feature.filter(val => typeof val !== "number");
          } else if (typeof feature === 'object' && feature !== null) {
            // If it's an object, leave it as is (don't flatten)
            allFeatures[key] = feature;
          } else {
            // Directly assign non-object values
            allFeatures[key] = feature;
          }
        }
  
        // Merge Meyda features
        if (matchedMeydaSegment.features) {
          Object.assign(allFeatures, matchedMeydaSegment.features);
        }
  
        // Merge features based on the new logic
        for (const feature in allFeatures) {
          const essentiaValue = essentiaSegment.features?.[feature];
          const meydaValue = matchedMeydaSegment.features?.[feature];
  
          if (essentiaValue !== undefined && meydaValue !== undefined) {
            // If both values exist, use Essentia's value
            normalizedSegment.features[feature] = meydaValue;
          } else if (essentiaValue !== undefined) {
            // If only Essentia has the value, use Essentia's value
            normalizedSegment.features[feature] = essentiaValue;
          } else if (meydaValue !== undefined) {
            // If only Meyda has the value, use Meyda's value
            normalizedSegment.features[feature] = meydaValue;
          }
        }
        // Push the normalized segment
        normalizedSegments.push(normalizedSegment);
      }
    }

    return normalizedSegments;
  }

  const songData = normalize(essentiaResults, meydaResults)
  const featureDatasets = extractFeatureDatasets(songData);

  return [songData, featureDatasets]
}

function extractFeatureDatasets(data) {
  const featureNames = Object.keys(data[0].features); // Get all feature names
  let datasets = {};

  // Initialize empty arrays for each feature
  featureNames.forEach(feature => {
      datasets[feature] = [];
  });

  // Populate datasets with { index, value } pairs
  data.forEach((entry, index) => {
      featureNames.forEach(feature => {
          datasets[feature].push({
              index: index, // Using array index as the reference
              value: entry.features[feature] // Extract feature value
          });
      });
  });

  return datasets;
}

function segmentValues(data, minSegLength = 5) {
    
  let segments = [];
  data = data.map(element => ({
    ...element,
    value: roundToTwoDecimals(element.value)
    }))
  let currentSegment = data.slice(0, minSegLength);
  let avg = roundToTwoDecimals(currentSegment.slice(2).reduce((sum, d) => sum + d.value, 0) / (currentSegment.length - 2));
  
  for (let i = minSegLength; i < data.length - 1; i++) {

        if (i + minSegLength < data.length) {
        
            //common values
            let prevValue = data[i - 1].value;
            let currentValue = data[i].value;
            let nextTrend = data.slice(i + 1, i + minSegLength + 1).map(d => d.value);
            let avgTrend = nextTrend.reduce((sum, val) => sum + val, 0) / nextTrend.length
            
            
            //conditionals
            let baseCondition = roundDownToBase(avg) - roundDownToBase(avgTrend) != 0
            
            let conditionIncrease1 = currentValue > avg
            let conditionIncrease2 = currentValue > prevValue
            let conditionIncrease3 = nextTrend.every(val => val > avg && val > prevValue)
          
            let conditionDecrease1 = currentValue < avg
            let conditionDecrease2 = currentValue < prevValue
            let conditionDecrease3 = nextTrend.every(val => val < avg && val < prevValue)
            
            

            //segmentation
            const detectIncrease = conditionIncrease1 && conditionIncrease2 && conditionIncrease3 && baseCondition
            const detectDecrease = conditionDecrease1 && conditionDecrease2 && conditionDecrease3 &&
                baseCondition
          
            if (detectIncrease || detectDecrease) {
              currentSegment.push(data[i])
              segments.push([...currentSegment])
              currentSegment = data.slice(i + 1, i + minSegLength + 1)
              avg = roundToTwoDecimals(currentSegment.reduce((sum, d) => sum + d.value, 0) / currentSegment.length);
              i += minSegLength;
              continue;
            }
        }
  
        currentSegment.push(data[i]);
        
        if(segments.length == 0){
        avg = roundToTwoDecimals(currentSegment.slice(2).reduce((sum, d) => sum + d.value, 0) / (currentSegment.length - 2));
        } else {
        avg = roundToTwoDecimals(currentSegment.reduce((sum, d) => sum + d.value, 0) / currentSegment.length);  
        }
  }
  
  segments.push(currentSegment);
  return segments;
}

function roundDownToBase(n) {
    let base = Math.pow(10, Math.floor(Math.log10(Math.abs(n))));
    let adjustment = base / 2;
    let candidate = n - (n % base);

    if(n < 10 && n >= 0){
        return roundToTwoDecimals(n)
    }
    else if (n > 10) {
    return n >= candidate + adjustment ? candidate + adjustment : candidate;
    } else {
    return n <= candidate - adjustment ? candidate - adjustment : candidate;
    }
}

function roundToTwoDecimals(value) {
    return Math.round(value * 100) / 100;
}

function findCommonIndexes(arrays) {
  const tolerance = 2;
  const threshold = 0.6
  let allIndexes = [];

  const extractBoundaryIndexes = (mainArray) => {
    return mainArray.flatMap(subarray => [subarray[0].index, subarray[subarray.length - 1].index]);
  }
  const mainIndexes = arrays.map(extractBoundaryIndexes);
  const groupIndexes = (indexes) => {
    let grouped = [];
    let currentGroup = [indexes[0]];

    for (let i = 1; i < indexes.length; i++) {
      let isWithinRange = currentGroup.some(value => Math.abs(value - indexes[i]) <= tolerance);
      if (isWithinRange) {
        currentGroup.push(indexes[i]);
      } else {
        grouped.push(currentGroup);
        currentGroup = [indexes[i]];
      }
    }
    if (currentGroup.length > 0) {
      grouped.push(currentGroup);
    }
    return grouped;
  }
  const groupedIndexes = mainIndexes.map(groupIndexes);
  const createNewSegments = (grouped) => {
    let newSegments = []
    for (let i = 0; i < grouped.length; i++) {
      let currentGroup = grouped[i];
      if (newSegments.length === 0) {
        newSegments = currentGroup.map(subarray => [subarray])
        continue;
      }
      for (let currentSubarray of currentGroup) {
        let isMerged = false;
        for (let segment of newSegments) {
          for (let segmentSubarray of segment) {
            for (let currentValue of currentSubarray) {
              for (let segmentValue of segmentSubarray) {
                if (Math.abs(currentValue - segmentValue) <= tolerance) {
                  segment.push(currentSubarray);
                  isMerged = true;
                  break;
                }
              }
              if (isMerged) break;
            }
            if (isMerged) break;
          }
          if (isMerged) break;
        }
        if (!isMerged) {
          newSegments.push([currentSubarray]);
        }
      }
    }
    newSegments = newSegments.filter(segment => {
      return segment.length >= Math.round(threshold * grouped.length)
    })
    return newSegments;
  }
  const finalSegments = createNewSegments(groupedIndexes);
  finalSegments.forEach(segment => {
    segment.forEach(subarray => subarray.sort((a, b) => a - b)); // Sort each subarray within a segment
  });
  finalSegments.sort((a, b) => Math.min(...a.flat()) - Math.min(...b.flat()));
  const processSegments = (segments) => {
  return segments.map(subarray => {
    let uniqueValues = [...new Set(subarray.flat())].sort((a, b) => a - b);

    if (uniqueValues.length === 1) {
      return uniqueValues[0];
    } else if (uniqueValues.length === 2) {
      let [a, b] = uniqueValues;
      return (b - a === 1) ? b : (b - a === 2) ? a + 1 : Math.round((a + b) / 2);
    } else {
      let min = uniqueValues[0];
      let max = uniqueValues[uniqueValues.length - 1];
      let middle = (min + max) / 2;
      return Number.isInteger(middle) ? middle : Math.floor(middle);
    }
  });
  };
  allIndexes = processSegments(finalSegments);
  const processIndexes = (arr) => {
  let result = [];
  for (let i = 0; i < arr.length - 1; i++) {
    let firstValue = arr[i];
    let secondValue = arr[i + 1];

    if(i == 0){
        result.push([firstValue, secondValue])
    } else {
        if(i + 1 < arr.length){
            result.push([firstValue + 1, secondValue])
        }
    }
  }
  
  return result;
  };
  const finalIndexes = processIndexes(allIndexes)
  return finalIndexes;
}

async function segmentSongByFeatures(audioBuffer){
  const  fullSongData = await getSongData(audioBuffer)
  const featureDatasets = fullSongData[1]
  const arrays = [];
  for (const feature in featureDatasets) {
    arrays.push(segmentValues(featureDatasets[feature]));
  }
  const filteredArrays = arrays.filter(arr => arr.length >= 4);
  const commonIndexes = findCommonIndexes(filteredArrays);
  function segmentArray(fullArray, segments) {
    return segments.map(([start, end]) => {
        return fullArray.slice(start, end + 1);
    });
  }
  const finalSong = segmentArray(fullSongData[0], commonIndexes)
  return finalSong
}

async function findMixPoint(firstAudioBuffer, secondAudioBuffer){
  const firstSong = await segmentSongByFeatures(firstAudioBuffer)
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
    for (let i = 0; i < song1.length - 1; i++) { // Ensure there's a next segment
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
    let maxSimilarity = Math.max(...mixPoints.map(mp => parseFloat(mp[2])));
    return mixPoints.filter(mp => parseFloat(mp[2]) === maxSimilarity);
  }

  let mixPoints = findMixPoints(firstSong, secondSong)[0]
  return mixPoints
}

async function findMixTime(firstAudioBuffer, secondAudioBuffer){
  const mixingPoint = await findMixPoint(firstAudioBuffer, secondAudioBuffer)
  const songData1 = await segmentSongByFeatures(firstAudioBuffer)
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

function applyFadeTransition(audioBuffer1, mixPoint1, audioBuffer2, mixPoint2, fadeDuration = 7) {
  const sampleRate = audioBuffer1.sampleRate; // Assuming both have the same sample rate
  const fadeSamples = fadeDuration * sampleRate;

  const channelData1 = audioBuffer1.getChannelData(0); // First song
  const channelData2 = audioBuffer2.getChannelData(0); // Second song

  const startFadeOut = Math.floor(mixPoint1 * sampleRate);
  const startFadeIn = Math.floor(mixPoint2 * sampleRate);

  for (let i = 0; i < fadeSamples; i++) {
    let fadeOutFactor = 1 - i / fadeSamples; // Decrease from 1 to 0
    let fadeInFactor = i / fadeSamples; // Increase from 0 to 1

    if (startFadeOut + i < channelData1.length) {
      channelData1[startFadeOut + i] *= fadeOutFactor;
    }
    if (startFadeIn + i < channelData2.length) {
      channelData2[startFadeIn + i] *= fadeInFactor;
    }
  }

  return [audioBuffer1, audioBuffer2]; // Return modified buffers
}

async function mixSongs(audioBuffers) {

  const songMixingPoints = Array(audioBuffers.length).fill(null).map(() => [null, null]);

  for (let i = 0; i < audioBuffers.length - 1; i++) {
    let bufferA = audioBuffers[i];
    const bufferB = audioBuffers[i + 1];

    // If this isn't the first song and it has a fade-in, trim bufferA
    if (i > 0 && songMixingPoints[i][0] !== null) {
      const fadeInTime = songMixingPoints[i][0];
      const remainingDuration = bufferA.duration - fadeInTime;
      const halfUsedStart = fadeInTime + remainingDuration / 2;

      const sampleRate = bufferA.sampleRate;
      const startSample = Math.floor(halfUsedStart * sampleRate);
      const length = bufferA.length - startSample;

      const trimmedBuffer = new AudioBuffer({
        numberOfChannels: bufferA.numberOfChannels,
        length,
        sampleRate,
      });

      for (let ch = 0; ch < bufferA.numberOfChannels; ch++) {
        const oldData = bufferA.getChannelData(ch);
        const newData = trimmedBuffer.getChannelData(ch);
        newData.set(oldData.subarray(startSample));
      }

      bufferA = trimmedBuffer;
    }

    // Get mixing points
    const [fadeOutTime, fadeInTime] = await findMixTime(bufferA, bufferB);

    // First song always starts normally
    if (i === 0) {
      songMixingPoints[i][0] = null;
    }

    if (fadeOutTime !== null && fadeInTime !== null) {
      songMixingPoints[i][1] = fadeOutTime;         // Fade out for current song
      songMixingPoints[i + 1][0] = fadeInTime;      // Fade in for next song
    } else {
      // No mix found: song ends and next one starts normally (nulls already set)
    }
  }

  // Last song ends normally (its fade-out is null already)
  console.log('Final data:', songMixingPoints)
  return songMixingPoints;
}

const TestMixer = () => {
  const [files, setFiles] = useState([]);

  const maxFiles = 5;
  const maxSize = 50 * 1024 * 1024; // 50MB per file

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);

    if (files.length + selectedFiles.length > maxFiles) {
      alert(`You can only upload up to ${maxFiles} files.`);
      return;
    }

    const validFiles = selectedFiles.filter((file) => {
      if (file.type !== "audio/mpeg") {
        alert(`${file.name} is not a valid MP3 file.`);
        return false;
      }
      if (file.size > maxSize) {
        alert(`${file.name} exceeds the 50MB size limit.`);
        return false;
      }
      return true;
    });

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const deleteFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const processFiles = async () => {
    if (files.length === 0) {
      alert("Please upload at least one file.");
      return;
    }

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      const audioBuffers = await Promise.all(
        files.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          return await audioContext.decodeAudioData(arrayBuffer);
        })
      );

      await mixSongs(...audioBuffers); // replace with your actual mixing function
      console.log("Finished processing...");
    } catch (error) {
      console.error("Error processing files:", error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <input
        type="file"
        accept="audio/mp3"
        multiple
        onChange={handleFileChange}
        className="border p-2"
      />

      <ul className="text-sm w-full max-w-md">
        {files.map((file, index) => (
          <li
            key={index}
            className="flex justify-between items-center border-b py-2"
          >
            <span>
              {file.name} ({(file.size / (1024 * 1024)).toFixed(2)}MB)
            </span>
            <button
              onClick={() => deleteFile(index)}
              className="text-red-500 hover:text-red-700 text-xs"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <button
        onClick={processFiles}
        className="bg-blue-500 text-white p-2 rounded cursor-pointer"
      >
        Process Files
      </button>
    </div>
  );
};

export default TestMixer