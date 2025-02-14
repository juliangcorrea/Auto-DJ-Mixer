export default function calculateMixingTimestamps(song1, segment1, song2, segment2) {
    // Helper function to calculate the timestamp for a beat in a song
    const getTimestamp = (songBeats, index, bpm) => {
        const timePerBeat = 60 / bpm; // Time between beats in seconds
        return index * timePerBeat; // Calculate the time in seconds for the given index
    };

    // Helper function to find the closest beat in a song
    const findClosestBeatIndex = (songBeats, beat) => {
        return songBeats.reduce((prev, curr, idx) => {
            return Math.abs(curr - beat) < Math.abs(songBeats[prev] - beat) ? idx : prev;
        }, 0);
    };

    // Get the BPM of each song (assuming this is known from previous steps)
    const bpm1 = calculateBPM(song1);
    const bpm2 = calculateBPM(song2);

    // Find the index of the closest beat of segment1 in song1
    const segment1StartIndex = findClosestBeatIndex(song1, segment1[0]);

    // Find the index of the closest beat of segment2 in song2
    const segment2StartIndex = findClosestBeatIndex(song2, segment2[0]);

    // Calculate the timestamp for the first beat of each segment
    const segment1StartTimestamp = getTimestamp(song1, segment1StartIndex, bpm1);
    const segment2StartTimestamp = getTimestamp(song2, segment2StartIndex, bpm2);

    // Convert timestamps to minutes as well
    const segment1StartTimestampMinutes = (segment1StartTimestamp / 60).toFixed(2);
    const segment2StartTimestampMinutes = (segment2StartTimestamp / 60).toFixed(2);

    return {
        song1Segment1Start: {
            seconds: segment1StartTimestamp.toFixed(2),
            minutes: segment1StartTimestampMinutes
        },
        song2Segment2Start: {
            seconds: segment2StartTimestamp.toFixed(2),
            minutes: segment2StartTimestampMinutes
        }
    };
}

// Helper function to calculate BPM from a song's beats (assuming song's beats are evenly spaced)
function calculateBPM(songBeats) {
    const beatDuration = songBeats[songBeats.length - 1] - songBeats[0]; // Total duration in beats
    const totalSeconds = (songBeats.length - 1) * 60 / beatDuration; // Total duration in seconds
    return totalSeconds;
}
