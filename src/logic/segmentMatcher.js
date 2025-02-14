// import { dtwDistance } from "../utils/beatDTW";

// export function findBestMatch(song1Segments, song2Segments) {
//     let bestMatch = null;
//     let bestScore = Infinity;

//     for (let seg1 of song1Segments) {
//         for (let seg2 of song2Segments) {
//             if (seg1.category === seg2.category) { // Only compare similar BPM groups
//                 let score = dtwDistance(seg1.beats, seg2.beats);
//                 if (score < bestScore) {
//                     bestScore = score;
//                     bestMatch = { seg1, seg2, score };
//                 }
//             }
//         }
//     }

//     return bestMatch;
// }


import { dtwDistance } from "../utils/beatDTW";

export function findBestMatch(song1Segments, song2Segments, song1Duration, song2Duration) {
    let bestMatches = [];
    const halfSong1 = song1Duration * 0.5
    const halfSong2 = song2Duration * 0.5

    for (let seg1 of song1Segments) {
        if (seg1.startTime < halfSong1) continue;
        for (let seg2 of song2Segments) {
            if(seg2.startTime > halfSong2) continue
            if (seg1.category === seg2.category) {
                let score = dtwDistance(seg1.beats, seg2.beats);
                bestMatches.push({ seg1, seg2, score });
                bestMatches.sort((a, b) => a.score - b.score);
                if (bestMatches.length > 1) {
                    bestMatches.pop();
                }
            }
        }
    }
    return bestMatches;
}
