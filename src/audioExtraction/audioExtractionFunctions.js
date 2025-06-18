import Essentia from 'essentia.js/dist/essentia.js-core.es.js'
import { EssentiaWASM } from 'essentia.js/dist/essentia-wasm.es.js'
import Meyda from 'meyda'
import { extractFeatures, 
  createSegmentByLength, 
  normalizeData, 
  extractFeatureDatasets 
} from '../utils/audioExtractionUtils'

// Splits audio into 1-second segments and extracts features from each segment using Essentia.
async function processAudioEssentia(audioBuffer) {
  const essentia = new Essentia(EssentiaWASM)
  const sampleRate = audioBuffer.sampleRate
  const channelData = audioBuffer.getChannelData(0)

  if (typeof sampleRate !== 'number' || sampleRate <= 0 || isNaN(sampleRate)) {
    throw new Error("Invalid sample rate")
  }

  const totalSamples = channelData.length
  const totalDuration = totalSamples / sampleRate
  const segmentDuration = 1 // seconds
  const numSegments = Math.ceil(totalDuration / segmentDuration)

  // Prepare promises to process segments in parallel
  const featurePromises = []
  for (let i = 0; i < numSegments; i++) {
    const startTime = i * segmentDuration
    const endTime = Math.min((i + 1) * segmentDuration, totalDuration)

    const startSample = Math.floor(startTime * sampleRate)
    const endSample = Math.floor(endTime * sampleRate)

    if (startSample >= endSample) continue

    const segmentData = channelData.slice(startSample, endSample)
    if (segmentData.length === 0) continue

    const segmentVector = essentia.arrayToVector(segmentData)

    // Wrap extraction in promise with catch to avoid halting all
    featurePromises.push(
      extractFeatures(essentia, segmentVector)
        .then(features => ({ start: startTime, end: endTime, features }))
        .catch(error => {
          console.warn(`Feature extraction failed for segment ${i}:`, error)
          return null
        })
    )
  }

  // Wait for all to complete and filter out failed ones
  const segments = (await Promise.all(featurePromises)).filter(Boolean)

  return segments
}

// Splits audio into frames, extracts features per frame,
// then groups frames into 1-second segments with aggregated features.
async function processAudioMeyda(audioBuffer) {
  const sampleRate = audioBuffer.sampleRate;
  if (sampleRate <= 0 || isNaN(sampleRate)) {
    throw new Error("Invalid sample rate.");
  }

  const bufferSize = 1024;
  const desiredSegmentDuration = 1; // seconds
  const frameDuration = bufferSize / sampleRate;
  const frameRate = 1 / frameDuration;
  const segmentLength = Math.round(frameRate * desiredSegmentDuration);

  const songData = {
    featureHistory: [],
    segmentBoundaries: [],
  };

  const channelData = audioBuffer.getChannelData(0);

  function processFeatures(features) {
    if (!features) return;

    songData.featureHistory.push({
      time: features.currentTime,
      energy: features.energy,
      rms: features.rms,
      spectralCentroid: features.spectralCentroid,
      rollOff: features.spectralRolloff,  // renamed for consistency
      zcr: features.zcr,
    });

    createSegmentByLength(songData, segmentLength);
  }

  for (let i = 0; i <= channelData.length - bufferSize; i += bufferSize) {
    const frame = channelData.slice(i, i + bufferSize);
    if (frame.length < bufferSize) continue;

    const features = Meyda.extract(
      ['rms', 'spectralCentroid', 'spectralRolloff', 'zcr', 'energy'],
      frame,
      { sampleRate }
    );

    if (features) {
      features.currentTime = i / sampleRate;
      processFeatures(features);
    }
  }

  return songData.segmentBoundaries;
}


// Processes an audio buffer through Essentia and Meyda,
// normalizes and optionally trims data based on fade-in,
// then extracts feature datasets for downstream use.
export default async function getSongData(audioBuffer, fadein = 0) {
  try {
    const essentiaResults = await processAudioEssentia(audioBuffer);
    const meydaResults = await processAudioMeyda(audioBuffer);
    let songData = normalizeData(essentiaResults, meydaResults);
    if (fadein > 0) {
      songData = songData.slice(fadein);
    }
    const featureDatasets = extractFeatureDatasets(songData);
    return [songData, featureDatasets];
  } catch (err) {
    console.error("Error in getSongData:", err);
    throw err;
  }
}