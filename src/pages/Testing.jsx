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

async function getBothSegments(audioBuffer){

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
            normalizedSegment.features[feature] = essentiaValue;
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

async function mixingSongs(audioBuffer){
  const testing = await getCommonIndexes(audioBuffer)
  console.log('full song array:', testing[0])
  console.log('index song strcuture:', testing[1])
}

async function getCommonIndexes(audioBuffer){
  const  fullSongData = await getBothSegments(audioBuffer)
  const featureDatasets = fullSongData[1]
  const arrays = [];
  for (const feature in featureDatasets) {
    arrays.push(segmentValues(featureDatasets[feature]));
  }
  const commonIndexes = findCommonIndexes(arrays);
  return [fullSongData[0], commonIndexes]
}

const TestMixer = () => {
  const [file, setFile] = useState(null);

  const handleFileChangeBoth = (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
    }
  };

  const processFilesBoth = async () => {
    if (!file) {
      alert("No file uploaded.");
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      await mixingSongs(audioBuffer)
      console.log('Finished processing...')
    } catch (error) {
      console.error("Error processing file:", error);
    }
  };

  return (
      <div className="flex flex-col items-center gap-4 p-4">
          <input
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFileChangeBoth}
              className="border p-2"
          />
          <button
              onClick={processFilesBoth}
              className="bg-blue-500 text-white p-2 rounded cursor-pointer"
          >
              Process Files
          </button>
      </div>
  );
};

export default TestMixer