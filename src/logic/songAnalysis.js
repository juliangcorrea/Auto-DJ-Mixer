import { findBestMatch } from "./segmentMatcher.js"
import { cleanBeats, segmentBeats, categorizeSegments } from "../utils/beatProcessor.js"

export function analyzeSongs(song1, song2, song1Duration, song2Duration) {
    let beats1 = cleanBeats(song1.beats);
    let beats2 = cleanBeats(song2);

    console.log(`important data of ${song1.name}`, segmentBeatsByTempo(song1.beats))

    let segments1 = categorizeSegments(segmentBeats(beats1));
    let segments2 = categorizeSegments(segmentBeats(beats2));

    return findBestMatch(segments1, segments2, song1Duration, song2Duration);
}


function segmentBeatsByTempo(beatsArray) {
    const segmentSize = 4; // Each segment contains 4 beats
    const tempoChangeThreshold = 10; // BPM change threshold to define a new segment
    const bpmDecimalPlaces = 1; // Round BPM to 1 decimal place
    let segments = [];
    let currentSegment = null;
    let previousBpm = null;

    function calculateBPM(segment) {
        if (segment.length < 2) return null; // Not enough beats to calculate BPM
        let intervals = [];
        for (let i = 1; i < segment.length; i++) {
            intervals.push(segment[i] - segment[i - 1]);
        }
        const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        const bpm = 60 / averageInterval;
        return parseFloat(bpm.toFixed(bpmDecimalPlaces)); // Round BPM
    }

    for (let i = 0; i < beatsArray.length; i += segmentSize) {
        let segmentBeats = beatsArray.slice(i, i + segmentSize);
        if (segmentBeats.length < 2) break; // Skip if not enough beats

        const currentBpm = calculateBPM(segmentBeats);
        if (!currentBpm) continue; // Skip invalid BPM calculations

        if (
            currentSegment &&
            Math.abs(currentBpm - currentSegment.bpm) < tempoChangeThreshold
        ) {
            // Merge segments
            currentSegment.beats.push(...segmentBeats);
            currentSegment.bpm = calculateBPM(currentSegment.beats); // Recalculate BPM after merging
        } else {
            // Save the previous segment
            if (currentSegment) segments.push(currentSegment);
            currentSegment = {
                beats: segmentBeats,
                bpm: currentBpm,
                startTime: segmentBeats[0]
            };
        }
        previousBpm = currentSegment.bpm;
    }

    // Push the last segment
    if (currentSegment) segments.push(currentSegment);

    return segments;
}