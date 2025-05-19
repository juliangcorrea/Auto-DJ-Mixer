import {segmentValues} from './audioExtractionUtils'
import {getSongData} from '../audioExtraction/audioExtractionFunctions'

export function findCommonIndexes(arrays) {
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

export async function segmentSongByFeatures(audioBuffer, fadein = 0){
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