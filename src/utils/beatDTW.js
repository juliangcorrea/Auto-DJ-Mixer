export function dtwDistance(seq1, seq2) {
    const n = seq1.length;
    const m = seq2.length;
    let dtw = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
    
    dtw[0][0] = 0;

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            let cost = Math.abs(seq1[i - 1] - seq2[j - 1]);
            dtw[i][j] = cost + Math.min(dtw[i - 1][j], dtw[i][j - 1], dtw[i - 1][j - 1]);
        }
    }

    return dtw[n][m];
}
