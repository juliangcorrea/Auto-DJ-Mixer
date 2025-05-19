import { roundDownToBase, roundToTwoDecimals } from './mathUtils'


//Essentia song audio features extraction helper function
export async function extractFeatures(essentia, segmentVector) {
  // List of Essentia algorithms to extract features from the audio segment
  const algorithmsToExtract = [
    'KeyExtractor',
    'Loudness',
    'Flux',
    'RollOff',
    'Energy',
    'DynamicComplexity'
  ]

  // Object to accumulate all extracted features
  const features = {}

  // Retrieve the list of available algorithms from Essentia instance
  const algorithms = essentia.algorithmNames

  // Iterate over each desired algorithm
  for (const algo of algorithmsToExtract) {
    try {
      // Only run the algorithm if it is available in Essentia
      if (algorithms.includes(algo)) {
        // Execute the algorithm on the audio segment vector
        const result = essentia[algo](segmentVector)

        if (result) {
          // If the result contains beat ticks, convert and format them
          if (result.ticks) {
            features[algo] = Array.from(essentia.vectorToArray(result.ticks)).map(beat => beat.toFixed(2))
          }
          // If the result is an object, extract numeric properties directly
          else if (typeof result === 'object' && result !== null) {
            for (const key in result) {
              if (typeof result[key] === 'number') {
                features[key] = result[key]
              }
            }
          }
          // Otherwise, store the result as-is
          else {
            features[algo] = result
          }
        }
      } else {
        // Warn if the algorithm is not available in the current Essentia build
        console.warn(`Algorithm ${algo} not available in Essentia.js`)
      }
    } catch (error) {
      // Log any errors encountered during feature extraction for this algorithm
      console.error(`Error with ${algo}:`, error)
    }
  }

  // Return the compiled features object for the audio segment
  return features
}

//Meyda song audio features extraction helper function
export function createSegmentByLength(songData, segmentLength) {
  // Proceed only if enough feature frames have been collected to form a segment
  if (songData.featureHistory.length >= segmentLength) {
    // Calculate average values of each feature over the collected frames
    let avgEnergy = songData.featureHistory.reduce((sum, f) => sum + f.energy, 0) / songData.featureHistory.length
    let avgSpectralCentroid = songData.featureHistory.reduce((sum, f) => sum + (f.spectralCentroid || 0), 0) / songData.featureHistory.length
    let avgRms = songData.featureHistory.reduce((sum, f) => sum + f.rms, 0) / songData.featureHistory.length
    let avgRollOff = songData.featureHistory.reduce((sum, f) => sum + f.rollOff, 0) / songData.featureHistory.length
    let avgZcr = songData.featureHistory.reduce((sum, f) => sum + f.zcr, 0) / songData.featureHistory.length

    // Create a new segment boundary object with the timestamp of the first frame in the segment
    songData.segmentBoundaries.push({
      time: songData.featureHistory[0].time,
      features: {
        energy: avgEnergy,
        spectralCentroid: avgSpectralCentroid,
        rms: avgRms,
        rollOff: avgRollOff,
        zcr: avgZcr
      }
    })

    // Reset feature history array for the next segment without losing reference
    songData.featureHistory.length = 0
  }
}

export function normalizeData(essentiaSegments, meydaSegments, tolerance = 1) {
  let normalizedSegments = []

  for (let i = 0; i < essentiaSegments.length; i++) {
    let matchedMeydaSegment = null
    const essentiaSegment = essentiaSegments[i]
    const meydaSegment = meydaSegments[i]

    // Find matching Meyda segment within tolerance
    if (
      i <= meydaSegments.length - 1 &&
      meydaSegment &&
      Math.abs(essentiaSegment.start - meydaSegment.time) <= tolerance
    ) {
      matchedMeydaSegment = meydaSegment
    }

    if (matchedMeydaSegment) {
      let normalizedSegment = {
        start: essentiaSegment.start,
        end: essentiaSegment.end,
        features: {},
      }

      let allFeatures = {}

      // Add Essentia features
      for (const key in essentiaSegment.features) {
        const feature = essentiaSegment.features[key]

        if (Array.isArray(feature)) {
          // Ensure array is properly formatted (no unnecessary indices)
          allFeatures[key] = feature.filter((val) => typeof val !== 'number')
        } else if (typeof feature === 'object' && feature !== null) {
          // If it's an object, leave it as is (don't flatten)
          allFeatures[key] = feature
        } else {
          // Directly assign non-object values
          allFeatures[key] = feature
        }
      }

      // Merge Meyda features
      if (matchedMeydaSegment.features) {
        Object.assign(allFeatures, matchedMeydaSegment.features)
      }

      // Merge features based on the new logic
      for (const feature in allFeatures) {
        const essentiaValue = essentiaSegment.features?.[feature]
        const meydaValue = matchedMeydaSegment.features?.[feature]

        if (essentiaValue !== undefined && meydaValue !== undefined) {
          // If both values exist, use Essentia's value
          normalizedSegment.features[feature] = meydaValue
        } else if (essentiaValue !== undefined) {
          // If only Essentia has the value, use Essentia's value
          normalizedSegment.features[feature] = essentiaValue
        } else if (meydaValue !== undefined) {
          // If only Meyda has the value, use Meyda's value
          normalizedSegment.features[feature] = meydaValue
        }
      }
      // Push the normalized segment
      normalizedSegments.push(normalizedSegment)
    }
  }

  return normalizedSegments
}

export function extractFeatureDatasets(data) {
  const featureNames = Object.keys(data[0].features) // Get all feature names
  let datasets = {}

  // Initialize empty arrays for each feature
  featureNames.forEach((feature) => {
    datasets[feature] = []
  })

  // Populate datasets with { index, value } pairs
  data.forEach((entry, index) => {
    featureNames.forEach((feature) => {
      datasets[feature].push({
        index: index, // Using array index as the reference
        value: entry.features[feature], // Extract feature value
      })
    })
  })

  return datasets
}

export function segmentValues(data, minSegLength = 5) {
  let segments = []
  data = data.map((element) => ({
    ...element,
    value: roundToTwoDecimals(element.value),
  }))
  let currentSegment = data.slice(0, minSegLength)
  let avg = roundToTwoDecimals(
    currentSegment.slice(2).reduce((sum, d) => sum + d.value, 0) /
      (currentSegment.length - 2)
  )

  for (let i = minSegLength; i < data.length - 1; i++) {
    if (i + minSegLength < data.length) {
      //common values
      let prevValue = data[i - 1].value
      let currentValue = data[i].value
      let nextTrend = data
        .slice(i + 1, i + minSegLength + 1)
        .map((d) => d.value)
      let avgTrend =
        nextTrend.reduce((sum, val) => sum + val, 0) / nextTrend.length

      //conditionals
      let baseCondition = roundDownToBase(avg) - roundDownToBase(avgTrend) != 0

      let conditionIncrease1 = currentValue > avg
      let conditionIncrease2 = currentValue > prevValue
      let conditionIncrease3 = nextTrend.every(
        (val) => val > avg && val > prevValue
      )

      let conditionDecrease1 = currentValue < avg
      let conditionDecrease2 = currentValue < prevValue
      let conditionDecrease3 = nextTrend.every(
        (val) => val < avg && val < prevValue
      )

      //segmentation
      const detectIncrease =
        conditionIncrease1 &&
        conditionIncrease2 &&
        conditionIncrease3 &&
        baseCondition
      const detectDecrease =
        conditionDecrease1 &&
        conditionDecrease2 &&
        conditionDecrease3 &&
        baseCondition

      if (detectIncrease || detectDecrease) {
        currentSegment.push(data[i])
        segments.push([...currentSegment])
        currentSegment = data.slice(i + 1, i + minSegLength + 1)
        avg = roundToTwoDecimals(
          currentSegment.reduce((sum, d) => sum + d.value, 0) /
            currentSegment.length
        )
        i += minSegLength
        continue
      }
    }

    currentSegment.push(data[i])

    if (segments.length == 0) {
      avg = roundToTwoDecimals(
        currentSegment.slice(2).reduce((sum, d) => sum + d.value, 0) /
          (currentSegment.length - 2)
      )
    } else {
      avg = roundToTwoDecimals(
        currentSegment.reduce((sum, d) => sum + d.value, 0) /
          currentSegment.length
      )
    }
  }

  segments.push(currentSegment)
  return segments
}