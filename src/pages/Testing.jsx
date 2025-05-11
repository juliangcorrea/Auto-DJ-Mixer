import Essentia from 'essentia.js/dist/essentia.js-core.es.js'; 
import { EssentiaWASM } from 'essentia.js/dist/essentia-wasm.es.js';
import Meyda from 'meyda';
import { useState } from "react";
import lamejs from 'lamejs'


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

  if (sampleRate <= 0 || isNaN(sampleRate)) {
    throw new Error("Invalid sample rate");
  }

  console.log('Beginning extraction....');
  
  // Loop through the audio data and create segments
  for (let i = 0; i < numSegments; i++) {
      const startTime = i * segmentDuration; // Start time of the segment in seconds
      const endTime = Math.min((i + 1) * segmentDuration, totalDuration); // End time of the segment in seconds

      // Convert the start and end times to sample indices
      const startSample = Math.floor(startTime * sampleRate); // Convert start time to sample index
      const endSample = Math.floor(endTime * sampleRate);     // Convert end time to sample index

      if (startSample >= endSample) {
        console.warn(`Skipping invalid segment: startSample >= endSample (${startSample} >= ${endSample})`);
        continue;
      }

      const segmentData = channelData.slice(startSample, endSample); // Extract the segment data

      if (segmentData.length === 0) {
        console.warn(`Skipping empty segment: ${startTime} - ${endTime}`);
        continue;
      }
      
      const segmentVector = essentia.arrayToVector(segmentData);

      let features;
      try {
        // Extract audio features for each segment
        features = await extractFeatures(essentia, segmentVector);
      } catch (error) {
        console.error(`Error extracting features for segment ${startTime} - ${endTime}:`, error);
        // Optionally skip this segment or continue with the next one
        continue;
      }

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

  if (sampleRate <= 0 || isNaN(sampleRate)) {
    throw new Error("Invalid sample rate.");
  }

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
    if (frame.length < bufferSize) continue;
    const features = Meyda.extract(
      ['rms', 'spectralCentroid', 'spectralRolloff', 'zcr', 'energy'],
      frame,
      { sampleRate: sampleRate }
    );
    // Compute the time (in seconds) for this frame based on the sample index
    if (features) {
      features.currentTime = i / sampleRate;
      processFeatures(features, songData);
    }
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

async function getSongData(audioBuffer, fadein = 0){

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

  let songData = normalize(essentiaResults, meydaResults)

  if(fadein != 0){
    songData = songData.splice(fadein)
  }

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
  // Check for invalid input (non-numeric or undefined)
  if (typeof n !== 'number' || isNaN(n)) {
      throw new Error("Invalid input: n must be a valid number.");
  }
  
  // Handle zero explicitly to avoid Math.log10(0)
  if (n === 0) return 0;
  
  let base = Math.pow(10, Math.floor(Math.log10(Math.abs(n))));
  let adjustment = base / 2;
  let candidate = n - (n % base);

  if (n < 10 && n >= 0) {
      return roundToTwoDecimals(n);  // assuming roundToTwoDecimals is defined elsewhere
  } else if (n > 10) {
      return n >= candidate + adjustment ? candidate + adjustment : candidate;
  } else {
      return n <= candidate - adjustment ? candidate - adjustment : candidate;
  }
}

function roundToTwoDecimals(value) {
  if (typeof value !== 'number' || isNaN(value)) {
      console.error('Invalid input for roundToTwoDecimals:', value);
      return 0; // Return 0 if the value is invalid
  }
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
    } 
    else {
        if(i + 1 < arr.length){
            result.push([firstValue + 1, secondValue])
        }
    }
  }
  
  return result;
  };

  const finalIndexes = processIndexes(allIndexes)

  if (finalIndexes.length === 0) {
    return null;  // Return null if no matches are found
  }

  return finalIndexes;
}

async function segmentSongByFeatures(audioBuffer, fadein = 0){
  const fullSongData = await getSongData(audioBuffer, fadein)

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

async function findMixPoint(firstAudioBuffer, secondAudioBuffer, fadein = 0){
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

async function findMixTime(firstAudioBuffer, secondAudioBuffer, fadein = 0){
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

async function mixSongs(audioBuffers) {
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

const TestMixer = () => {
  const [files, setFiles] = useState([]);

  const [selectedForSwap, setSelectedForSwap] = useState([]);

  const maxFiles = 5;

  const maxSize = 50 * 1024 * 1024; // 50MB

  const isValidMP3 = (file) => {
    const validTypes = ["audio/mpeg", "audio/mp3"];
    const validExtension = file.name.toLowerCase().endsWith(".mp3");
    return validTypes.includes(file.type) || validExtension;
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);

    if (files.length + selectedFiles.length > maxFiles) {
      alert(`You can only upload up to ${maxFiles} files.`);
      return;
    }

    const validFiles = selectedFiles.filter((file) => {
      if (!isValidMP3(file)) {
        alert(`${file.name} is not a valid MP3 file.`);
        return false;
      }
      if (file.size > maxSize) {
        alert(`${file.name} exceeds the 50MB size limit.`);
        return false;
      }
      return true;
    });

    const newUniqueFiles = validFiles.filter(
      (file) => !files.some((existing) => existing.name === file.name)
    );

    setFiles((prev) => [...prev, ...newUniqueFiles]);
  };

  const deleteFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setSelectedForSwap((prev) => prev.filter((i) => i !== index).map(i => (i > index ? i - 1 : i)));
  };

  const toggleSelect = (index) => {
    setSelectedForSwap((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : prev.length < 2
        ? [...prev, index]
        : prev
    );
  };

  const swapSelectedFiles = () => {
    if (selectedForSwap.length !== 2) {
      alert("Please select exactly 2 songs to swap.");
      return;
    }

    const [i, j] = selectedForSwap;
    const updatedFiles = [...files];
    [updatedFiles[i], updatedFiles[j]] = [updatedFiles[j], updatedFiles[i]];
    setFiles(updatedFiles);
    setSelectedForSwap([]);
  };

  const processFiles = async () => {
    if (files.length === 0) {
      alert("Please upload at least one file.");
      return;
    }

    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();

      const audioBuffersResults = await Promise.allSettled(
        files.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer();
          return await audioContext.decodeAudioData(arrayBuffer);
        })
      );

      const successfulBuffers = audioBuffersResults
        .filter((res) => res.status === "fulfilled")
        .map((res) => res.value)
        .filter((buffer) => {
          const channelData = buffer.getChannelData(0);
          return channelData.some((sample) => sample !== 0);
        });

      if (successfulBuffers.length === 0) {
        alert("None of the files could be processed.");
        await audioContext.close();
        return;
      }

      await mixSongs(successfulBuffers); // Replace with your mixing function
      console.log("Finished processing...");

      await audioContext.close();
    } catch (error) {
      console.error("Error processing files:", error);
      alert("Something went wrong while processing your files.");
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedForSwap.includes(index)}
                onChange={() => toggleSelect(index)}
              />
              <span>
                {file.name} ({(file.size / (1024 * 1024)).toFixed(2)}MB)
              </span>
            </div>
            <button
              onClick={() => deleteFile(index)}
              className="text-red-500 hover:text-red-700 text-xs"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <button
          onClick={swapSelectedFiles}
          className="bg-yellow-500 text-white px-4 py-2 rounded"
        >
          Swap Selected
        </button>

        <button
          onClick={processFiles}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Process Files
        </button>
      </div>
    </div>
  );
};

export default TestMixer