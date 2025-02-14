// import Essentia from 'essentia.js/dist/essentia.js-core.es.js'; 
// import { EssentiaWASM } from 'essentia.js/dist/essentia-wasm.es.js';
// import { useState } from "react";
// import { analyzeSongs } from '../logic/songAnalysis';
// import calculateMixingTimestamps from '../utils/songTiming';
// async function processAudio(audioBuffer) {
//     const essentia = new Essentia(EssentiaWASM)
//     const channelData = audioBuffer.getChannelData(0)
//     const audioVector = essentia.arrayToVector(channelData)
    
//     console.log('starting extraction...')
//     const beatTracker = essentia.BeatTrackerDegara(audioVector)
//     const beatsArray = Array.from(essentia.vectorToArray(beatTracker.ticks))
//     const roundedBeats = beatsArray.map(beat => beat.toFixed(2))
//     //console.log(roundedBeats)
//     // const algorithms = essentia.algorithmNames;
//     // console.log(algorithms)
//     // const rhythmExtractor = essentia.RhythmExtractor2013(audioVector);
//     // const keyExtractor = essentia.KeyExtractor(audioVector);
//     // const mfcc = essentia.MFCC(audioVector);
//     // const pitchMelodia = essentia.PitchMelodia(audioVector);
//     // const loudness = essentia.Loudness(audioVector);
//     // const spectralPeaks = essentia.SpectralPeaks(audioVector);

//     // Storing the results in an object
//     const analysisResults = {
//         beats: roundedBeats,
//         // rhythm: rhythmExtractor,
//         // key: keyExtractor,
//         // mfcc: mfcc,
//         // pitch: pitchMelodia,
//         // loudness: loudness,
//         // spectralPeaks: spectralPeaks,
//     }
//     return analysisResults;
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
//         const allAnalysisResults = []
//         for (const file of files) {
//             try {
//                 const arrayBuffer = await file.arrayBuffer();
//                 const audioContext = new (window.AudioContext || window.webkitAudioContext)();
//                 const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                
//                 // Now use the new processAudio function from File 2
//                 const analysisResults = await processAudio(audioBuffer);
//                 allAnalysisResults.push({ beats: analysisResults.beats, name: file.name });
//                 //console.log(analysisResults)
//             } catch (error) {
//                 console.error(`Error processing file ${file.name}:`, error);
//             }
//         }
//         if (allAnalysisResults.length === 2) {
//             const [song1Analysis, song2Analysis] = allAnalysisResults;
//             const match = await analyzeSongs(song1Analysis.beats, song2Analysis.beats);
//             console.log("Best Match between the two songs:", match);

//             match.forEach(element => {
//                 const result = calculateMixingTimestamps(song1Analysis.beats, element.seg1.beats, song2Analysis.beats, element.seg2.beats);
//                 console.log(song1Analysis.name, "Segment 1 Start in Song 1:", result.song1Segment1Start);
//                 console.log(song2Analysis.name, "Segment 2 Start in Song 2:", result.song2Segment2Start);
//             });
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

// import Essentia from 'essentia.js/dist/essentia.js-core.es.js'; 
// import { EssentiaWASM } from 'essentia.js/dist/essentia-wasm.es.js';
// import { useState } from "react";
// import { analyzeSongs } from '../logic/songAnalysis';
// import calculateMixingTimestamps from '../utils/songTiming';

// async function processAudio(audioBuffer) {
//     const essentia = new Essentia(EssentiaWASM);
//     const channelData = audioBuffer.getChannelData(0);
//     const audioVector = essentia.arrayToVector(channelData);
    
//     console.log('starting extraction...');
//     const beatTracker = essentia.BeatTrackerDegara(audioVector);
//     const beatsArray = Array.from(essentia.vectorToArray(beatTracker.ticks));
//     const roundedBeats = beatsArray.map(beat => beat.toFixed(2));

//     const analysisResults = {
//         beats: roundedBeats,
//     };
//     return analysisResults;
// }

// async function processAudio(audioBuffer) {
//     const essentia = new Essentia(EssentiaWASM);
//     const channelData = audioBuffer.getChannelData(0);
//     const audioVector = essentia.arrayToVector(channelData);

//     console.log('Starting extraction...');

//     // Use RhythmExtractor2013 to get beats and BPM
//     const rhythmData = essentia.RhythmExtractor2013(audioVector);
//     let beatsArray = Array.from(essentia.vectorToArray(rhythmData.ticks));
//     let detectedBPM = rhythmData.bpm;

//     // Step 1: Reject BPM values that are unnaturally high
//     if (detectedBPM > 160) {
//         detectedBPM /= 2; // Adjust if BPM is too high
//     }

//     // Step 2: Smooth sudden BPM changes
//     let filteredBeats = [];
//     const minBeatSpacing = 0.3; // Minimum time (in seconds) between beats
//     beatsArray.forEach((beat, index) => {
//         if (index === 0 || beat - beatsArray[index - 1] > minBeatSpacing) {
//             filteredBeats.push(beat.toFixed(2));
//         }
//     });

//     return {
//         beats: filteredBeats,
//         bpm: detectedBPM.toFixed(1),
//     };
// }


// const TestMixer = () => {
//     const [files, setFiles] = useState([]);
//     const [fileNames, setFileNames] = useState([]); // Store file names to display in order

//     const handleFileChange = (event) => {
//         const uploadedFiles = Array.from(event.target.files);

//         // Prevent adding more than 5 files
//         if (files.length + uploadedFiles.length <= 5) {
//             const newFiles = [...files, ...uploadedFiles];
//             setFiles(newFiles);
//             setFileNames(newFiles.map(file => file.name)); // Update file names list
//         } else {
//             alert("You can upload a maximum of 5 files.");
//         }
//     };

//     const removeFile = (index) => {
//         const newFiles = files.filter((_, fileIndex) => fileIndex !== index);
//         setFiles(newFiles);
//         setFileNames(newFiles.map(file => file.name)); // Update file names list after removal
//     };

//     const processFiles = async () => {
//         if (files.length === 0) {
//             console.log("No files uploaded.");
//             return;
//         }
//         const allAnalysisResults = []
//         let firstSongLength = 0
//         let secondSongLength = 0
//         for (let index = 0; index < files.length; index++) {
//             const file = files[index];
//             try {
//                 const arrayBuffer = await file.arrayBuffer();
//                 const audioContext = new (window.AudioContext || window.webkitAudioContext)();
//                 const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                
//                 // Now use the processAudio function
//                 const analysisResults = await processAudio(audioBuffer);
//                 allAnalysisResults.push({ beats: analysisResults.beats, name: file.name, index });

//                 if (allAnalysisResults.length === 1) {
//                     firstSongLength = audioBuffer.duration;
//                 } else if (allAnalysisResults.length === 2) {
//                     secondSongLength = audioBuffer.duration;
//                 }
//             } catch (error) {
//                 console.error(`Error processing file ${file.name}:`, error);
//             }
//         }

//         if (allAnalysisResults.length === 2) {
//             const [song1Analysis, song2Analysis] = allAnalysisResults;

//             // Use the order of files for processing
//             const match = await analyzeSongs(song1Analysis, song2Analysis.beats, firstSongLength, secondSongLength);
//             console.log("Best Match between the two songs:", match);

//             match.forEach(element => {
//                 const result = calculateMixingTimestamps(song1Analysis.beats, element.seg1.beats, song2Analysis.beats, element.seg2.beats);
//                 console.log(song1Analysis.name, "Segment 1 Start in Song 1:", result.song1Segment1Start);
//                 console.log(song2Analysis.name, "Segment 2 Start in Song 2:", result.song2Segment2Start);
//             });
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

//             {files.length > 0 && (
//                 <div className="mt-4">
//                     <h3>Uploaded Songs (in order):</h3>
//                     <ul>
//                         {fileNames.map((fileName, index) => (
//                             <li key={index} className="flex items-center gap-2">
//                                 {`Song ${index + 1}: ${fileName}`}
//                                 <button
//                                     onClick={() => removeFile(index)}
//                                     className="bg-red-500 text-white p-1 rounded text-xs"
//                                 >
//                                     Remove
//                                 </button>
//                             </li>
//                         ))}
//                     </ul>
//                 </div>
//             )}
//         </div>
//     );
// };

// export default TestMixer;








import { useState } from "react";
import Essentia from 'essentia.js/dist/essentia.js-core.es.js'; 
import { EssentiaWASM } from 'essentia.js/dist/essentia-wasm.es.js';
import MusicTempo from 'music-tempo';
import Meyda from 'meyda';


async function processAudioEssentia(audioBuffer) {
  const essentia = new Essentia(EssentiaWASM);
  const channelData = audioBuffer.getChannelData(0);
  const audioVector = essentia.arrayToVector(channelData);

  console.log('Starting extraction with Essentia...');

  // Use RhythmExtractor2013 to get beats and BPM
  const rhythmData = essentia.RhythmExtractor2013(audioVector);
  let beatsArray = Array.from(essentia.vectorToArray(rhythmData.ticks));
  let detectedBPM = rhythmData.bpm;

  // Step 1: Reject BPM values that are unnaturally high
  if (detectedBPM > 160) {
    detectedBPM /= 2; // Adjust if BPM is too high
  }

  // Step 2: Smooth sudden BPM changes
  let filteredBeats = [];
  const minBeatSpacing = 0.3; // Minimum time (in seconds) between beats
  beatsArray.forEach((beat, index) => {
    if (index === 0 || beat - beatsArray[index - 1] > minBeatSpacing) {
      filteredBeats.push(beat.toFixed(2));
    }
  });

  console.log("Essentia Results:");
  console.log("Beats:", filteredBeats);
  console.log("BPM:", detectedBPM.toFixed(1));
}

async function processAudioMT(audioBuffer) {
    console.log('Processing with MT...')
    try {
      const channelData = audioBuffer.getChannelData(0); // Get audio data from the first channel
      const mt = new MusicTempo(channelData);
  
      const bpm = mt.tempo;
      const beats = mt.beats;
  
      if (bpm && beats) {
        console.log("MusicTempo Results:");
        console.log("BPM:", bpm); // Tempo in BPM
        console.log("Beats:", beats); // Array of beat times
        return {
          bpm,
          beats
        };
      } else {
        throw new Error("Error extracting tempo and beats with MusicTempo.");
      }
    } catch (error) {
      console.error(error);
    }
}

async function processAudioMeyda(audioBuffer) {
    console.log('Starting extraction with Meyda....');
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer
    const analyzer = Meyda.createMeydaAnalyzer({
        audioContext: audioContext,
        source: source,
        bufferSize: 1024,
        featureExtractors: [
            'rms',
            'spectralCentroid',
            'spectralRolloff',
            'zcr',
            'energy',
        ],
        callback: (features) => {
            processFeatures(features);
        },
    })
    analyzer.start();
    source.start();



    let featureHistory = [];
    let segmentBoundaries = [];
    function processFeatures(features) {
        if (!features) return;
        // Store feature data in an array
        featureHistory.push({
            time: audioContext.currentTime,
            energy: features.energy,
            rms: features.rms,
            spectralCentroid: features.spectralCentroid,
            spectralRolloff: features.spectralRolloff,
            zcr: features.zcr
        });

        // Group features into segments every 5 seconds (adjustable)
        if (featureHistory.length >= 435) {
            let avgEnergy = featureHistory.reduce((sum, f) => sum + f.energy, 0) / featureHistory.length;
            let avgSpectralCentroid = featureHistory.reduce((sum, f) => sum + (f.spectralCentroid || 0), 0) / featureHistory.length;
            let avgRms = featureHistory.reduce((sum, f) => sum + f.rms, 0) / featureHistory.length;
            let avgSpectralRolloff = featureHistory.reduce((sum, f) => sum + f.spectralRolloff, 0) / featureHistory.length;
            let avgZcr = featureHistory.reduce((sum, f) => sum + f.zcr, 0) / featureHistory.length;

            // Detect changes in energy, spectral centroid, and other features
            if (segmentBoundaries.length === 0 || 
                Math.abs(avgEnergy - segmentBoundaries[segmentBoundaries.length - 1].energy) > 0.05 ||
                Math.abs(avgSpectralCentroid - segmentBoundaries[segmentBoundaries.length - 1].spectralCentroid) > 500 ||
                Math.abs(avgRms - segmentBoundaries[segmentBoundaries.length - 1].rms) > 0.05 ||
                Math.abs(avgSpectralRolloff - segmentBoundaries[segmentBoundaries.length - 1].spectralRolloff) > 100 ||
                Math.abs(avgZcr - segmentBoundaries[segmentBoundaries.length - 1].zcr) > 0.02) {

                // Mark the current boundary if significant changes are detected
                segmentBoundaries.push({
                    time: featureHistory[0].time,
                    energy: avgEnergy,
                    spectralCentroid: avgSpectralCentroid,
                    rms: avgRms,
                    spectralRolloff: avgSpectralRolloff,
                    zcr: avgZcr
                });
            }
            
            featureHistory = []; // Reset for next batch
        }
    }
    await new Promise(resolve => setTimeout(resolve, audioBuffer.duration * 1000));
    analyzer.stop();



    // Now create the segment data
    const segments = createSegments(segmentBoundaries);
    console.log('Final Segments:', segments);
    return segments;
}

function createSegments(segmentBoundaries) {
    let segments = [];
    const segmentDuration = 10;  // Set segment duration to 10 seconds
    let currentSegment = {};     // Temporary variable to hold the current segment being formed

    for (let i = 0; i < segmentBoundaries.length - 1; i++) {
        const segment = {
            start: segmentBoundaries[i].time,
            end: segmentBoundaries[i + 1].time,
            type: 'undetermined'  // Default type
        };

        const prev = segmentBoundaries[i];
        const curr = segmentBoundaries[i + 1];

        // Assign segment type based on feature comparisons
        if (curr.energy > prev.energy * 1.2) {
            // If energy increases significantly, assume it's a Chorus or Transition
            segment.type = 'chorus';
        } else if (curr.energy < prev.energy * 0.8) {
            // If energy drops significantly, assume it might be an Outro or Intro
            segment.type = 'outro';
        } else if (curr.spectralCentroid > 5000 && curr.energy > prev.energy * 1.1) {
            // High spectral centroid and higher energy might indicate a Verse or Chorus
            segment.type = 'verse';
        } else {
            // For all other cases, treat it as a bridge or transitional section
            segment.type = 'bridge';
        }

        // Check if we are still in the same segment type
        if (segment.type === currentSegment.type) {
            // If the current segment type matches the last one, extend the current segment
            currentSegment.end = curr.time;
        } else {
            // If it's a new segment type, push the old segment and start a new one
            if (currentSegment.start !== undefined) {
                // Ensure that the segment is large enough (>= segmentDuration)
                if (currentSegment.end - currentSegment.start >= segmentDuration) {
                    segments.push(currentSegment);
                }
            }
            currentSegment = { start: curr.time, end: curr.time, type: segment.type };
        }
    }

    // Handle the last segment outside the loop
    if (currentSegment.start !== undefined) {
        // Ensure the final segment meets the minimum duration
        if (currentSegment.end - currentSegment.start >= segmentDuration) {
            segments.push(currentSegment);
        }
    }

    return segments;
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

    //   await processAudioEssentia(audioBuffer);
    //   await processAudioMT(audioBuffer);
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