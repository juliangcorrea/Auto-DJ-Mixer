// import Essentia from 'essentia.js/dist/essentia.js-core.es.js'; 
// import { EssentiaWASM } from 'essentia.js/dist/essentia-wasm.es.js';
// import { useState } from "react";

// async function processAudio(audioBuffer) {
//     const essentia = new Essentia(EssentiaWASM);
//     const sampleRate = audioBuffer.sampleRate;
//     const channelData = audioBuffer.getChannelData(0);
//     const totalSamples = channelData.length;
//     const segmentDuration = 10; // Target segment duration in seconds
//     const segmentSize = segmentDuration * sampleRate; // Size of each segment in samples

//     // Calculate the number of segments (round up to ensure >= 10 seconds per segment)
//     const numSegments = Math.ceil(totalSamples / segmentSize);
//     const segments = [];
    
//     // Loop through the audio data and create segments
//     for (let i = 0; i < numSegments; i++) {
//         const start = i * segmentSize;
//         const end = Math.min((i + 1) * segmentSize, totalSamples);
//         const segmentData = channelData.slice(start, end); // Extract segment data
        
//         const segmentVector = essentia.arrayToVector(segmentData);

//         // Extract audio features for each segment
//         const features = await extractFeatures(essentia, segmentVector);
//         segments.push({
//             start,
//             end,
//             features
//         });
//     }

//     // Group similar adjacent segments based on feature comparison
//     const groupedSegments = groupSimilarSegments(segments);

//     console.log('Grouped Segments:', groupedSegments);
//     return groupedSegments;
// }

// async function extractFeatures(essentia, segmentVector) {
//     const algorithmsToExtract = [
//         'BeatTrackerDegara',
//         'RhythmExtractor2013',
//         'KeyExtractor',
//         'Loudness',
//         'Flux',
//         'RollOff',
//         'Energy',
//         'DynamicComplexity'
//     ];
    
//     const features = {};
//     const algorithms = essentia.algorithmNames;

//     for (const algo of algorithmsToExtract) {
//         try {
//             if (algorithms.includes(algo)) {
//                 const result = essentia[algo](segmentVector);
//                 if (result) {
//                     if (result.ticks) {
//                         const beatsArray = Array.from(essentia.vectorToArray(result.ticks));
//                         features[algo] = beatsArray.map(beat => beat.toFixed(2));
//                     } else {
//                         features[algo] = result;
//                     }
//                 }
//             } else {
//                 console.warn(`Algorithm ${algo} not available in Essentia.js`);
//             }
//         } catch (error) {
//             console.error(`Error with ${algo}:`, error);
//         }
//     }
//     return features;
// }

// function groupSimilarSegments(segments) {
//     const threshold = 0.1; // Define a threshold for grouping similar segments
//     let grouped = [];
//     let currentGroup = [segments[0]];

//     for (let i = 1; i < segments.length; i++) {
//         const prevSegment = segments[i - 1];
//         const currSegment = segments[i];

//         // Compare the loudness between adjacent segments (or any other feature you want to compare)
//         const prevLoudness = prevSegment.features.Loudness || 0;
//         const currLoudness = currSegment.features.Loudness || 0;

//         // If the difference is smaller than the threshold, group the segments together
//         if (Math.abs(prevLoudness - currLoudness) < threshold) {
//             currentGroup.push(currSegment);
//         } else {
//             // Otherwise, push the current group and start a new one
//             grouped.push(currentGroup);
//             currentGroup = [currSegment];
//         }
//     }

//     // Push the last group
//     if (currentGroup.length > 0) {
//         grouped.push(currentGroup);
//     }

//     return grouped;
// }

// const TestMixer = () => {
//     const [files, setFiles] = useState([]);

//     const handleFileChange = (event) => {
//         setFiles([...event.target.files]);
//     };

//     const processFiles = async () => {
//         if (files.length === 0) {
//             console.log("No files uploaded.");
//             return;
//         }

//         const allAnalysisResults = [];
//         for (const file of files) {
//             try {
//                 const arrayBuffer = await file.arrayBuffer();
//                 const audioContext = new (window.AudioContext || window.webkitAudioContext)();
//                 const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                
//                 const results = await processAudio(audioBuffer);
//                 allAnalysisResults.push({ name: file.name, results });
                
//             } catch (error) {
//                 console.error(`Error processing file ${file.name}:`, error);
//             }
//         }
//     };

//     return (
//         <div className="flex flex-col items-center gap-4 p-4">
//             <input
//                 type="file"
//                 accept="audio/*"
//                 multiple
//                 onChange={handleFileChange}
//                 className="border p-2"
//             />
//             <button
//                 onClick={processFiles}
//                 className="bg-blue-500 text-white p-2 rounded cursor-pointer"
//             >
//                 Process Files
//             </button>
//         </div>
//     );
// };

// export default TestMixer;











import { useState } from "react";
import Meyda from 'meyda';

async function processAudioMeyda(audioBuffer) {
  console.log('Starting extraction with Meyda....');
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;

  // Step 1: Get the sample rate
  const sampleRate = audioContext.sampleRate;

  // Step 2: Define the buffer size and desired segment duration
  const bufferSize = 1024;
  const desiredSegmentDuration = 1; // in seconds

  // Step 3: Calculate the frame duration
  const frameDuration = bufferSize / sampleRate;

  // Step 4: Calculate the frame rate
  const frameRate = 1 / frameDuration;

  // Step 5: Calculate the segment length (number of frames required for 10 seconds)
  const segmentLength = Math.round(frameRate * desiredSegmentDuration);

  // Log the segment length to check the calculation
  console.log('Calculated segmentLength:', segmentLength);

  let songData = {
    featureHistory: [],
    segmentBoundaries: [],  // Store fixed-length segments
  };

  // Create Meyda Analyzer
  const analyzer = Meyda.createMeydaAnalyzer({
    audioContext: audioContext,
    source: source,
    bufferSize: 1024,
    featureExtractors: ['rms', 'spectralCentroid', 'spectralRolloff', 'zcr', 'energy'],
    callback: (features) => {
      processFeatures(features, songData);
    },
  });

  // Start audio playback and feature extraction immediately
  source.start();
  analyzer.start();

  function processFeatures(features, songData) {
    if (!features) return;
    songData.featureHistory.push({
      time: audioContext.currentTime,
      energy: features.energy,
      rms: features.rms,
      spectralCentroid: features.spectralCentroid,
      spectralRolloff: features.spectralRolloff,
      zcr: features.zcr
    });

    // Only create segment boundaries by fixed length
    createSegmentByLength(songData, segmentLength);
  }

  // Wait until the song finishes
  await new Promise(resolve => setTimeout(resolve, audioBuffer.duration * 1000));
  analyzer.stop();

  console.log('Segment Boundaries After Length Check:', songData.segmentBoundaries);

  // After length-based segmentation, classify by type
  const classifiedSegments = createSegmentByType(songData.segmentBoundaries);
  console.log('Classified Segments:', classifiedSegments);
  return classifiedSegments; // Return the classified segments after type categorization
}

function createSegmentByLength(songData, segmentLength) {
  if (songData.featureHistory.length >= segmentLength) {
    // Calculate the averages for this segment
    let avgEnergy = songData.featureHistory.reduce((sum, f) => sum + f.energy, 0) / songData.featureHistory.length;
    let avgSpectralCentroid = songData.featureHistory.reduce((sum, f) => sum + (f.spectralCentroid || 0), 0) / songData.featureHistory.length;
    let avgRms = songData.featureHistory.reduce((sum, f) => sum + f.rms, 0) / songData.featureHistory.length;
    let avgSpectralRolloff = songData.featureHistory.reduce((sum, f) => sum + f.spectralRolloff, 0) / songData.featureHistory.length;
    let avgZcr = songData.featureHistory.reduce((sum, f) => sum + f.zcr, 0) / songData.featureHistory.length;

    // Directly push the segment boundary without any difference check
    songData.segmentBoundaries.push({
      time: songData.featureHistory[0].time,
      energy: avgEnergy,
      spectralCentroid: avgSpectralCentroid,
      rms: avgRms,
      spectralRolloff: avgSpectralRolloff,
      zcr: avgZcr
    });

    // Clear the feature history while keeping reference
    songData.featureHistory.length = 0;
  }
}

function createSegmentByType(segmentBoundaries) {
  // If there are fewer than two boundaries, we cannot create any segments.
  if (segmentBoundaries.length < 2) return [];
  const lastBoundary = segmentBoundaries[segmentBoundaries.length - 1]
  segmentBoundaries.push(lastBoundary);

  const segments = [];
  let prev = null; // Will store the previous segment for condition checks

  function checkConditionals(energyLimitMin, energyLimitMax, rmsLimitMin, rmsLimitMax, 
    spectralCentroidLimitMin, spectralCentroidLimitMax, spectralRolloffLimitMin,
    spectralRolloffLimitMax, zcrLimitMin, zcrLimitMax, element, checkType = true){
    let passes = 0
    const checks = {
      energy: [energyLimitMin, energyLimitMax],
      rms: [rmsLimitMin, rmsLimitMax],
      spectralCentroid: [spectralCentroidLimitMin, spectralCentroidLimitMax],
      spectralRolloff: [spectralRolloffLimitMin, spectralRolloffLimitMax],
      zcr: [zcrLimitMin, zcrLimitMax]
    }

    Object.entries(checks).forEach(([key, [min, max]]) => {
      if (element[key] >= min && element[key] <= max) {
        passes++;
      }
    });

    if(checkType){
      return passes >= 3;
    } else if (!checkType){
      return passes;
    } else {
      return undefined
    }
  }

  function checkStructure(currentElement, i, prev, next, segmentBoundaries){
    const matches = []
    const doubleMatches = []
    const divisions = 
      {
        Intro: [
          (currentElement, i, prev) => {
          if (
            i === 0 || prev && prev.type == "Intro" && checkConditionals(0, 1, 0, 0.03, 0, 25, 0, 13000, 0, 25, currentElement)
          ) {
            return true
          }
          return false
        }, (currentElement, checkType) => checkConditionals(0, 1, 0, 0.03, 0, 25, 0, 13000, 0, 25, currentElement, checkType)
        ],
        Drop: [
          (currentElement) => {
          if(currentElement.start > 10 && checkConditionals(0, 1, 0, 0.03, 0, 25, 0, 13000, 0, 25, currentElement)){
            return true
          }
          return false
        }, (currentElement, checkType) => checkConditionals(0, 1, 0, 0.03, 0, 25, 0, 13000, 0, 25, currentElement, checkType)
        ],
        Verse: [
          (currentElement) => {
          if (checkConditionals(1, 5, 0.03, 0.07, 30, 70, 13000, 14400, 40, 70, currentElement)) {
            return true
          }
          return false
        }, (currentElement, checkType) =>checkConditionals(1, 5, 0.03, 0.07, 30, 70, 13000, 14400, 40, 70, currentElement, checkType)
        ],
        BuildUp: [
          (currentElement) => {
          if(checkConditionals(5, 9, 0.07, 0.1, 50, 70, 13600, 14000, 40, 80, currentElement)){
            return true
          }
          return false
        }, (currentElement, checkType) => checkConditionals(5, 9, 0.07, 0.1, 50, 70, 13600, 14000, 40, 80, currentElement, checkType)
        ],
        Chorus: [
          (currentElement) => {
          if (checkConditionals(9, 25, 0.09, 0.2, 40, 70, 13200, 15000, 40, 70, currentElement) ) {
            return true
          }
          return false
        }, (currentElement, checkType) => checkConditionals(9, 25, 0.09, 0.2, 40, 70, 13200, 15000, 40, 70, currentElement, checkType)
        ],
        Break: [
          (currentElement) => {
          if (checkConditionals(14, 18, 0.10, 0.13, 50, 60, 14000, 14800, 30, 50, currentElement)) {
            return true
          }
          return false
        }, (currentElement, checkType) => checkConditionals(14, 18, 0.10, 0.13, 50, 60, 14000, 14800, 30, 50, currentElement, checkType)
        ],
        Bridge: [
          (currentElement) => {
          if (checkConditionals(3, 7.5, 0.05, 0.09, 60, 75, 13500, 14600, 50, 70, currentElement)) {
            return true
          }
          return false
        }, (currentElement, checkType) => checkConditionals(3, 7.5, 0.05, 0.09, 60, 75, 13500, 14600, 50, 70, currentElement, checkType)
        ],
        Outro: [
          (currentElement, i, prev, next) => {
          if(currentElement.start > ((segmentBoundaries[segmentBoundaries.length -2].time/100)*80) && 
          (((prev && currentElement.energy < prev.energy * 0.9) ||
            (next && currentElement.energy > next.energy * 1.3)) || 
            currentElement.energy < 1)) {
            return true
          }
          return false
        }, (currentElement, checkType) => checkConditionals(0, 1, 0, 0.02, 0, 500, 12000, 15000, 0, 500, currentElement, checkType)
        ]
      }
    
    Object.keys(divisions).forEach(type => {
      if(divisions[type][0](currentElement, i, prev, next) == true){
        matches.push(type)
      }
    })

    if(matches.length <= 0){
      currentElement.type = "Transition"
    } else if(matches.length == 1){
      currentElement.type = matches[0]
    } else if (matches.length > 1){
        matches.forEach(type => {
            const possibleMatch = [type, divisions[type][1](currentElement, false)]
            doubleMatches.push(possibleMatch)
      })
      const highestMatch = Math.max(...doubleMatches.map((entry) => entry[1])); // Use entry[1] for score
      const highestMatchTypes = doubleMatches
        .filter((entry) => entry[1] === highestMatch) // Filter based on the score
        .map((entry) => entry[0]); // Extract the type (entry[0])
      if(highestMatchTypes.length == 0){
        currentElement.type = "Transition"
        doubleMatches.push('done')

      } else if(doubleMatches.length == 1){
        currentElement.type = highestMatchTypes[0]
        doubleMatches.push('done')
      } else {
        if(prev && prev.type && highestMatchTypes.includes(prev.type)){
          currentElement.type = prev.type
          doubleMatches.push('done')  
        };
      }
      if(doubleMatches[doubleMatches.length - 1] != 'done'){
        const randomIndex = Math.floor(Math.random() * highestMatchTypes.length)
        currentElement.type = highestMatchTypes[randomIndex]
        if(doubleMatches.length == 2 && doubleMatches.includes('Bridge') && doubleMatches.includes('BuildUp')){
          currentElement.type = 'BuildUp'
        }
      }
    }
  }

  // // Create segments with initial categorization
  for (let i = 0; i < segmentBoundaries.length - 1; i++) {
    const curr = segmentBoundaries[i];
    const next = segmentBoundaries[i + 1];

    // Create a segment using the current boundary and the next one.
    const segment = {
      start: curr.time,
      end: next.time, // Now has a real length
      energy: curr.energy,
      spectralCentroid: curr.spectralCentroid,
      spectralRolloff: curr.spectralRolloff,
      zcr: curr.zcr,
      rms: curr.rms,
      type: "Transition" // Default type is now Interlude
    };

    checkStructure(segment, i, prev, next, segmentBoundaries)

    segments.push(segment);
    prev = segment;
  }

  for (let i = segments.length - 2; i > 0; i--) {
    if ((segments[i - 1].type === segments[i + 1].type && 
        segments[i].type !== segments[i - 1].type) || 
        (segments[i - 1].type !== segments[i]. type && 
          segments[i + 1].type !== segments[i].type)) {
      segments[i].type = segments[i + 1].type;
    }
  }

  const mergedSegments = segments.reduce((acc, seg) => {
    if (acc.length === 0 || acc[acc.length - 1].type !== seg.type) {
      acc.push(seg);
    } else {
      // Merge the properties of the current segment with the last one
      acc[acc.length - 1].end = seg.end;
  
      // Average the properties of the two segments
      acc[acc.length - 1].energy = (acc[acc.length - 1].energy + seg.energy) / 2;
      acc[acc.length - 1].rms = (acc[acc.length - 1].rms + seg.rms) / 2;
      acc[acc.length - 1].spectralCentroid = (acc[acc.length - 1].spectralCentroid + seg.spectralCentroid) / 2;
      acc[acc.length - 1].spectralRolloff = (acc[acc.length - 1].spectralRolloff + seg.spectralRolloff) / 2;
      acc[acc.length - 1].zcr = (acc[acc.length - 1].zcr + seg.zcr) / 2;
    }
    return acc;
  }, []);  

  for (let i = mergedSegments.length - 2; i > 0; i--) {
    if (mergedSegments[i].end - mergedSegments[i].start < 5) {
      // Merge the segment by extending the previous segment's end time
      mergedSegments[i - 1].end = mergedSegments[i].end;
  
      // Merge all properties (e.g., energy, rms, spectralCentroid, etc.)
      mergedSegments[i - 1].energy = (mergedSegments[i - 1].energy + mergedSegments[i].energy) / 2;
      mergedSegments[i - 1].rms = (mergedSegments[i - 1].rms + mergedSegments[i].rms) / 2;
      mergedSegments[i - 1].spectralCentroid = (mergedSegments[i - 1].spectralCentroid + mergedSegments[i].spectralCentroid) / 2;
      mergedSegments[i - 1].spectralRolloff = (mergedSegments[i - 1].spectralRolloff + mergedSegments[i].spectralRolloff) / 2;
      mergedSegments[i - 1].zcr = (mergedSegments[i - 1].zcr + mergedSegments[i].zcr) / 2;
  
      // Optionally, remove the current segment as it has been merged
      mergedSegments.splice(i, 1);
    }
  }

  let merged;
  do {
    merged = false;
    for (let i = mergedSegments.length - 2; i >= 0; i--) {
      if (mergedSegments[i].type === mergedSegments[i + 1].type) {
        // Merge adjacent same-type segments
        mergedSegments[i].end = mergedSegments[i + 1].end;
        mergedSegments[i].energy = (mergedSegments[i].energy + mergedSegments[i + 1].energy) / 2;
        mergedSegments[i].rms = (mergedSegments[i].rms + mergedSegments[i + 1].rms) / 2;
        mergedSegments[i].spectralCentroid = (mergedSegments[i].spectralCentroid + mergedSegments[i + 1].spectralCentroid) / 2;
        mergedSegments[i].spectralRolloff = (mergedSegments[i].spectralRolloff + mergedSegments[i + 1].spectralRolloff) / 2;
        mergedSegments[i].zcr = (mergedSegments[i].zcr + mergedSegments[i + 1].zcr) / 2;

        mergedSegments.splice(i + 1, 1);
        merged = true;
      }
    }
  } while (merged);


  return mergedSegments;
  // return segments
}

const TestMixer = () => {
  const [file, setFile] = useState(null);

  const handleFileChange = (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
    }
  };

  const processFiles = async () => {
    if (!file) {
      console.log("No file uploaded.");
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // await processAudioEssentia(audioBuffer);
      // await processAudioMT(audioBuffer);
      await processAudioMeyda(audioBuffer);
    } catch (error) {
      console.error("Error processing file:", error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <input
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="border p-2"
      />
      <button
        onClick={processFiles}
        className="bg-blue-500 text-white p-2 rounded cursor-pointer"
      >
        Process File
      </button>

      {file && (
        <div className="mt-4">
          <h3>Uploaded Song:</h3>
          <p>{file.name}</p>
        </div>
      )}
    </div>
  );
};

export default TestMixer;