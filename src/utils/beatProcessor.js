// export function cleanBeats(rawBeats) {
//     return rawBeats.map(b => parseFloat(b)).filter(b => !isNaN(b));
// }
// export function segmentBeats(beats, segmentSize = 24) {
//     let segments = [];
//     for (let i = 0; i < beats.length; i += segmentSize) {
//         segments.push(beats.slice(i, i + segmentSize));
//     }
//     return segments;
// }
//     function calculateBPM(beats) {
//     let intervals = [];
//     for (let i = 1; i < beats.length; i++) {
//         intervals.push(beats[i] - beats[i - 1]);
//     }
//     const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
//     return 60 / averageInterval; // Return BPM for this segment
// }
// export function categorizeSegments(segments) {
//     return segments.map(seg => {
//         const bpm = calculateBPM(seg); // Calculate BPM for this segment
//         let category = 'slow'; // Default category
        
//         // Categorize based on the calculated BPM
//         if (bpm > 120) {
//             category = 'fast';
//         } else if (bpm > 80) {
//             category = 'moderate';
//         }

//         return {
//             beats: seg,
//             bpm, // Include the calculated BPM
//             category
//         };
//     });
// }


export function cleanBeats(rawBeats) {
    return rawBeats.map(b => parseFloat(b)).filter(b => !isNaN(b));
}

export function segmentBeats(beats, segmentSize = 24) {
    let segments = [];
    for (let i = 0; i < beats.length; i += segmentSize) {
        segments.push(beats.slice(i, i + segmentSize));
    }
    return segments;
}

function calculateBPM(beats) {
    let intervals = [];
    for (let i = 1; i < beats.length; i++) {
        intervals.push(beats[i] - beats[i - 1]);
    }
    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    return 60 / averageInterval; // Return BPM for this segment
}

export function categorizeSegments(segments) {
    return segments.map(seg => {
        const bpm = calculateBPM(seg); // Calculate BPM for this segment
        let category = 'slow'; // Default category
        
        // Categorize based on the calculated BPM
        if (bpm > 120) {
            category = 'fast';
        } else if (bpm > 80) {
            category = 'moderate';
        }

        // Calculate start time based on the first beat of the segment
        const startTime = seg[0]

        return {
            beats: seg,
            bpm, // Include the calculated BPM
            category,
            startTime // Add the startTime to the segment
        };
    });
}