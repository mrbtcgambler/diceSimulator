// Generate array of 1,000,000 random numbers (0.00 to 100.00)
const arr = Array.from({ length: 1000000 }, () =>
  parseFloat((Math.random() * 100).toFixed(2))
);

// Initialize tracking variables
let unWins = 0;
let ovWins = 0;
let ties = 0;
let maxCountUntilNextLoser = 0;
const countUntilNextLoserFreq = new Map();

// Output CSV header
console.log("Index|UN50|OV50|Winner|Next Loser Index|Count Until Next Loser");

// Process array in sets of 20
for (let i = 0; i < arr.length; i += 20) {
  // Get current set of 20 (or remaining elements)
  const set = arr.slice(i, i + 20);

  // Count UN50 (<= 50.00) and OV50 (> 50.00)
  const un50Count = set.filter((num) => num <= 50.0).length;
  const ov50Count = set.filter((num) => num > 50.0).length;

  // Determine winner
  let winner = "TIE";
  if (un50Count > ov50Count) {
    winner = "UN";
    unWins++;
  } else if (ov50Count > un50Count) {
    winner = "OV";
    ovWins++;
  } else {
    ties++;
  }

  // Find index of next loser
  let nextLoserIndex = -1;
  let countUntilNextLoser = 0;

  if (winner !== "TIE") {
    const loserValue = winner === "UN" ? 50.01 : 50.0;
    const comparison =
      winner === "UN" ? (x) => x > loserValue : (x) => x <= loserValue;

    for (let j = i + 20; j < arr.length; j++) {
      countUntilNextLoser++;
      if (comparison(arr[j])) {
        nextLoserIndex = j;
        break;
      }
    }

    // Update max count and frequency
    if (countUntilNextLoser > maxCountUntilNextLoser) {
      maxCountUntilNextLoser = countUntilNextLoser;
    }
    countUntilNextLoserFreq.set(
      countUntilNextLoser,
      (countUntilNextLoserFreq.get(countUntilNextLoser) || 0) + 1
    );
  }

  // Output CSV row
  console.log(
    `${i}|${un50Count}|${ov50Count}|${winner}|${nextLoserIndex}|${countUntilNextLoser}`
  );
}

// Output summary
console.log("\n=== Summary ===");
console.log(`Total Sets Processed: ${Math.ceil(arr.length / 20)}`);
console.log(`UN Wins: ${unWins}`);
console.log(`OV Wins: ${ovWins}`);
console.log(`Ties: ${ties}`);
console.log(`Maximum Count Until Next Loser: ${maxCountUntilNextLoser}`);
console.log("Frequency of Count Until Next Loser:");

// Sort and display frequency in ascending order of count
const sortedFreq = Array.from(countUntilNextLoserFreq.entries()).sort(
  (a, b) => a[0] - b[0]
);
for (const [count, freq] of sortedFreq) {
  console.log(`  Count ${count}: ${freq} times`);
}
console.log(
  `Sum of Frequency Counts: ${sortedFreq.reduce(
    (sum, [, freq]) => sum + freq,
    0
  )}`
);
