import { segmentValues } from './audioExtractionUtils'
import { getSongData } from '../audioExtraction/audioExtractionFunctions'


 // Finds common index ranges across multiple arrays by grouping and merging
 // close indexes, returning pairs of index ranges that appear consistently.
export function findCommonIndexes(arrays) {
  const tolerance = 2
  const threshold = 0.6

  if (!Array.isArray(arrays) || arrays.length === 0) {
    console.warn('Input must be a non-empty array of arrays.')
    return null
  }

  // Extract boundary indexes from each subarray
  const extractBoundaryIndexes = (mainArray) => {
    if (!Array.isArray(mainArray) || mainArray.length === 0) return []
    return mainArray.flatMap(subarray => {
      if (!Array.isArray(subarray) || subarray.length === 0) return []
      const first = subarray[0]?.index
      const last = subarray[subarray.length - 1]?.index
      return (typeof first === 'number' && typeof last === 'number') ? [first, last] : []
    })
  }

  const mainIndexes = arrays.map(extractBoundaryIndexes)

  // Group indexes within a tolerance
  const groupIndexes = (indexes) => {
    if (!Array.isArray(indexes) || indexes.length === 0) return []
    let grouped = []
    let currentGroup = [indexes[0]]

    for (let i = 1; i < indexes.length; i++) {
      const currentIndex = indexes[i]
      const isWithinRange = currentGroup.some(value => Math.abs(value - currentIndex) <= tolerance)
      if (isWithinRange) {
        currentGroup.push(currentIndex)
      } else {
        grouped.push(currentGroup)
        currentGroup = [currentIndex]
      }
    }

    if (currentGroup.length > 0) grouped.push(currentGroup)
    return grouped
  }

  const groupedIndexes = mainIndexes.map(groupIndexes)

  // Merge groups across arrays based on shared indexes
  const createNewSegments = (grouped) => {
    if (!Array.isArray(grouped) || grouped.length === 0) return []
    let newSegments = []

    for (const currentGroup of grouped) {
      for (const currentSubarray of currentGroup) {
        let isMerged = false

        for (const segment of newSegments) {
          if (segment.some(segmentSubarray =>
            segmentSubarray.some(segmentValue =>
              currentSubarray.some(currentValue =>
                Math.abs(currentValue - segmentValue) <= tolerance
              )
            )
          )) {
            segment.push(currentSubarray)
            isMerged = true
            break
          }
        }

        if (!isMerged) {
          newSegments.push([currentSubarray])
        }
      }
    }

    return newSegments.filter(segment => segment.length >= Math.round(threshold * grouped.length))
  }

  const finalSegments = createNewSegments(groupedIndexes)

  // Sort indexes within and across segments
  finalSegments.forEach(segment => {
    segment.forEach(subarray => subarray.sort((a, b) => a - b))
  })

  finalSegments.sort((a, b) => Math.min(...a.flat()) - Math.min(...b.flat()))

  // Reduce grouped index sets to representative single values
  const processSegments = (segments) => {
    return segments.map(subarray => {
      const uniqueValues = [...new Set(subarray.flat())].sort((a, b) => a - b)

      if (uniqueValues.length === 1) return uniqueValues[0]
      if (uniqueValues.length === 2) {
        const [a, b] = uniqueValues
        if (b - a === 1) return b
        if (b - a === 2) return a + 1
        return Math.round((a + b) / 2)
      }

      const min = uniqueValues[0]
      const max = uniqueValues[uniqueValues.length - 1]
      const middle = (min + max) / 2
      return Number.isInteger(middle) ? middle : Math.floor(middle)
    })
  }

  const allIndexes = processSegments(finalSegments)

  // Convert single values into index pairs
  const processIndexes = (arr) => {
    if (!Array.isArray(arr) || arr.length < 2) return []
    const result = []

    for (let i = 0; i < arr.length - 1; i++) {
      const firstValue = arr[i]
      const secondValue = arr[i + 1]
      result.push(i === 0 ? [firstValue, secondValue] : [firstValue + 1, secondValue])
    }

    return result
  }

  const finalIndexes = processIndexes(allIndexes)
  return finalIndexes.length > 0 ? finalIndexes : null
}

 // Segments an audio buffer into meaningful parts using extracted features.
export async function segmentSongByFeatures(audioBuffer, fadein = 0) {
  if (!audioBuffer) {
    console.error("Audio buffer is required for segmentation.")
    return []
  }

  const fullSongData = await getSongData(audioBuffer, fadein)
  const [fullArray, featureDatasets] = fullSongData

  const arrays = Object.values(featureDatasets).map(segmentValues)
  const filteredArrays = arrays.filter(arr => arr.length >= 4)

  const commonIndexes = findCommonIndexes(filteredArrays)
  if (!commonIndexes) return []

  const segmentArray = (arr, segments) =>
    segments.map(([start, end]) => arr.slice(start, end + 1))

  return segmentArray(fullArray, commonIndexes)
}

 // Computes the Euclidean distance between two feature vectors.
export function euclideanDistance(features1, features2) {
  if (!Array.isArray(features1) || !Array.isArray(features2)) {
    throw new Error('Both inputs must be arrays.')
  }
  if (features1.length !== features2.length) {
    throw new Error('Feature arrays must be the same length.')
  }

  return Math.sqrt(features1.reduce((sum, val, i) =>
    sum + Math.pow(val - features2[i], 2), 0))
}

 // Computes the average Euclidean distance between all segment pairs of two songs.
export function calculateAverageDistance(song1, song2) {
  if (!Array.isArray(song1) || !Array.isArray(song2) || song1.length === 0 || song2.length === 0) {
    throw new Error('Both song inputs must be non-empty arrays.')
  }

  const distances = []

  for (const seg1 of song1) {
    for (const seg2 of song2) {
      const avg1 = calculateAverageFeatures(seg1)
      const avg2 = calculateAverageFeatures(seg2)
      distances.push(euclideanDistance(Object.values(avg1), Object.values(avg2)))
    }
  }

  const totalDistance = distances.reduce((sum, d) => sum + d, 0)
  return totalDistance / distances.length
}

 // Calculates average values for each feature in a segment array.
export function calculateAverageFeatures(featureObjects) {
  if (!Array.isArray(featureObjects) || featureObjects.length === 0 || !featureObjects[0]?.features) {
    console.error("Invalid featureObjects data:", featureObjects)
    return {}
  }

  const count = featureObjects.length
  const avgFeatures = {}

  // Initialize and sum features
  Object.keys(featureObjects[0].features).forEach(key => {
    avgFeatures[key] = featureObjects.reduce((sum, obj) =>
      sum + (obj.features[key] || 0), 0)
    avgFeatures[key] /= count
  })

  return avgFeatures
}

 // Computes average feature values across all segments.
export function getFeatureAverages(segments) {
  if (!Array.isArray(segments) || segments.length === 0 || !segments[0]?.features) {
    console.error('Invalid segments input:', segments)
    return {}
  }

  const featureNames = Object.keys(segments[0].features)
  const averages = {}

  featureNames.forEach(name => {
    averages[name] = segments.reduce((sum, seg) =>
      sum + (seg.features[name] || 0), 0) / segments.length
  })

  return averages
}

 // Compares two feature objects and returns a similarity score [0-1].
export function compareFeatures(features1, features2) {
  if (typeof features1 !== 'object' || features1 === null ||
      typeof features2 !== 'object' || features2 === null) {
    console.error('Invalid feature objects provided')
    return 0
  }

  const featureNames = Object.keys(features1)
  if (featureNames.length === 0) return 0

  const totalSimilarity = featureNames.reduce((sum, name) =>
    sum + compareFeature(features1[name], features2[name]), 0)

  return totalSimilarity / featureNames.length
}

 // Compares two numeric values with normalized similarity.
function compareFeature(value1, value2) {
  if (typeof value1 !== 'number' || typeof value2 !== 'number') {
    console.error('Both values must be numbers:', value1, value2)
    return 0
  }

  const distance = Math.abs(value1 - value2)
  const maxDiff = Math.max(value1, value2) || 1 // Avoid division by zero
  return 1 - (distance / maxDiff)
}