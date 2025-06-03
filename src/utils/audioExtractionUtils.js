// Extracts a set of audio features from a segment vector using selected Essentia algorithms
export async function extractFeatures(essentia, segmentVector) {
  const algorithmsToExtract = [
    'KeyExtractor',
    'Loudness',
    'Flux',
    'RollOff',
    'Energy',
    'DynamicComplexity'
  ]

  const features = {}
  const algorithms = essentia.algorithmNames

  for (const algo of algorithmsToExtract) {
    try {
      if (algorithms.includes(algo)) {
        const result = essentia[algo](segmentVector)

        if (result) {
          // Handle beat ticks output
          if (result.ticks) {
            features[algo] = Array.from(essentia.vectorToArray(result.ticks)).map(beat =>
              Number(beat.toFixed(2))
            )
          } 
          // Handle object results with numeric properties
          else if (typeof result === 'object' && result !== null) {
            for (const key in result) {
              if (typeof result[key] === 'number') {
                features[key] = result[key]
              }
            }
          } 
          // Handle simple scalar values
          else {
            features[algo] = result
          }
        }
      } else {
        console.warn(`Algorithm ${algo} not available in Essentia.js`)
      }
    } catch (error) {
      console.error(`Error extracting ${algo}:`, error)
    }
  }

  return features
}

// Creates a segment from feature history by averaging values over a fixed segment length
export function createSegmentByLength(songData, segmentLength) {
  if (songData.featureHistory.length >= segmentLength) {
    const length = songData.featureHistory.length

    const avgEnergy = songData.featureHistory.reduce((sum, f) => sum + f.energy, 0) / length
    const avgSpectralCentroid = songData.featureHistory.reduce((sum, f) => sum + (f.spectralCentroid || 0), 0) / length
    const avgRms = songData.featureHistory.reduce((sum, f) => sum + f.rms, 0) / length
    const avgRollOff = songData.featureHistory.reduce((sum, f) => sum + f.rollOff, 0) / length
    const avgZcr = songData.featureHistory.reduce((sum, f) => sum + f.zcr, 0) / length

    // Push new segment with averaged features
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

    // Clear feature history for next segment window
    songData.featureHistory.length = 0
  }
}

// Merges and normalizes features from Essentia and Meyda segments by aligning within tolerance
export function normalizeData(essentiaSegments, meydaSegments, tolerance = 1) {
  const normalizedSegments = []

  for (let i = 0; i < essentiaSegments.length; i++) {
    const essentiaSegment = essentiaSegments[i]
    const meydaSegment = meydaSegments[i]

    const isMatch =
      i < meydaSegments.length &&
      meydaSegment &&
      Math.abs(essentiaSegment.start - meydaSegment.time) <= tolerance

    if (!isMatch) continue

    const normalizedSegment = {
      start: essentiaSegment.start,
      end: essentiaSegment.end,
      features: {},
    }

    const allFeatures = {}

    // Copy features from Essentia
    for (const key in essentiaSegment.features) {
      const feature = essentiaSegment.features[key]
      if (Array.isArray(feature)) {
        allFeatures[key] = feature.filter(val => typeof val === 'number')
      } else if (typeof feature === 'object' && feature !== null) {
        allFeatures[key] = feature
      } else {
        allFeatures[key] = feature
      }
    }

    // Merge Meyda features, overwriting Essentia if needed
    if (meydaSegment.features) {
      Object.assign(allFeatures, meydaSegment.features)
    }

    // Assign merged features to normalized segment
    for (const feature in allFeatures) {
      normalizedSegment.features[feature] = allFeatures[feature]
    }

    normalizedSegments.push(normalizedSegment)
  }

  return normalizedSegments
}

// Extracts per-feature datasets from segment array into arrays of { index, value } pairs
export function extractFeatureDatasets(data) {
  if (!Array.isArray(data) || data.length === 0 || !data[0]?.features) {
    console.error('Invalid input data:', data)
    return {}
  }

  const featureNames = Object.keys(data[0].features)
  const datasets = {}

  // Initialize dataset structure
  featureNames.forEach(feature => {
    datasets[feature] = []
  })

  // Populate dataset arrays
  data.forEach((entry, index) => {
    featureNames.forEach(feature => {
      datasets[feature].push({
        index,
        value: entry.features[feature],
      })
    })
  })

  return datasets
}

// Segments an array of feature values based on trend changes using a rolling average
export function segmentValues(data, minSegLength = 5) {
  if (!Array.isArray(data) || data.length === 0) {
    console.error('Invalid or empty data provided to segmentValues')
    return []
  }

  const segments = []

  // Preprocess values by rounding
  data = data.map(element => ({
    ...element,
    value: roundToTwoDecimals(element.value),
  }))

  let currentSegment = data.slice(0, minSegLength)

  let avg = roundToTwoDecimals(
    currentSegment.slice(2).reduce((sum, d) => sum + d.value, 0) / (currentSegment.length - 2)
  )

  for (let i = minSegLength; i < data.length - 1; i++) {
    if (i + minSegLength < data.length) {
      const prevValue = data[i - 1].value
      const currentValue = data[i].value
      const nextTrend = data.slice(i + 1, i + minSegLength + 1).map(d => d.value)
      const avgTrend = nextTrend.reduce((sum, val) => sum + val, 0) / nextTrend.length

      const baseCondition = roundDownToBase(avg) - roundDownToBase(avgTrend) !== 0

      const conditionIncrease1 = currentValue > avg
      const conditionIncrease2 = currentValue > prevValue
      const conditionIncrease3 = nextTrend.every(val => val > avg && val > prevValue)

      const conditionDecrease1 = currentValue < avg
      const conditionDecrease2 = currentValue < prevValue
      const conditionDecrease3 = nextTrend.every(val => val < avg && val < prevValue)

      const detectIncrease = conditionIncrease1 && conditionIncrease2 && conditionIncrease3 && baseCondition
      const detectDecrease = conditionDecrease1 && conditionDecrease2 && conditionDecrease3 && baseCondition

      if (detectIncrease || detectDecrease) {
        currentSegment.push(data[i])
        segments.push([...currentSegment])
        currentSegment = data.slice(i + 1, i + minSegLength + 1)

        avg = roundToTwoDecimals(
          currentSegment.reduce((sum, d) => sum + d.value, 0) / currentSegment.length
        )

        i += minSegLength
        continue
      }
    }

    currentSegment.push(data[i])

    avg = segments.length === 0
      ? roundToTwoDecimals(currentSegment.slice(2).reduce((sum, d) => sum + d.value, 0) / (currentSegment.length - 2))
      : roundToTwoDecimals(currentSegment.reduce((sum, d) => sum + d.value, 0) / currentSegment.length)
  }

  segments.push(currentSegment)
  return segments
}

// Rounds a number down to the nearest base value with handling for small and zero values
function roundDownToBase(n) {
  if (typeof n !== 'number' || isNaN(n)) {
    throw new Error("Invalid input: n must be a valid number.")
  }

  if (n === 0) return 0

  const base = Math.pow(10, Math.floor(Math.log10(Math.abs(n))))
  const adjustment = base / 2
  const candidate = n - (n % base)

  if (n < 10 && n >= 0) {
    return roundToTwoDecimals(n)
  } else if (n > 10) {
    return n >= candidate + adjustment ? candidate + adjustment : candidate
  } else {
    return n <= candidate - adjustment ? candidate - adjustment : candidate
  }
}

// Rounds a numeric value to two decimal places with fallback for invalid input
function roundToTwoDecimals(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    console.error('Invalid input for roundToTwoDecimals:', value)
    return 0
  }

  return Math.round(value * 100) / 100
}