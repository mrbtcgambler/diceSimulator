function getRandomNumber() {
  return +(Math.random() * 100).toFixed(2);
}

const SIZE = 1_000_000;
const WINDOW = 20;
const numbers = Array.from({ length: SIZE }, getRandomNumber);

let unWins = 0,
  ovWins = 0,
  ties = 0;
let freqCounts = new Map();
let maxCount = 0;
let totalSets = 0;

console.log(
  "Index|UN50|OV50|Winner|NextLoserIndex|CountUntilNextLoser|LargeNextLoser"
);

for (let i = WINDOW; i <= SIZE; i += WINDOW) {
  const slice = numbers.slice(i - WINDOW, i);

  const unCount = slice.filter((v) => v <= 50).length;
  const ovCount = slice.length - unCount;

  let winner = "TIE";
  if (unCount > ovCount) {
    winner = "UN";
    unWins++;
  } else if (ovCount > unCount) {
    winner = "OV";
    ovWins++;
  } else {
    ties++;
  }

  let nextLoserIndex = -1;
  let countUntilNextLoser = -1;

  if (winner !== "TIE") {
    const loser = winner === "UN" ? "OV" : "UN";
    for (let j = i; j < SIZE; j++) {
      const val = numbers[j];
      if ((loser === "UN" && val <= 50) || (loser === "OV" && val > 50)) {
        nextLoserIndex = j;
        countUntilNextLoser = j - (i - 1); // distance from last index of current set
        break;
      }
    }

    if (countUntilNextLoser >= 0) {
      freqCounts.set(
        countUntilNextLoser,
        (freqCounts.get(countUntilNextLoser) || 0) + 1
      );
      if (countUntilNextLoser > maxCount) maxCount = countUntilNextLoser;
    }
  }

  let largeNextLoser = "";
  if (countUntilNextLoser >= 10) {
    largeNextLoser = "LARGE";
  }

  console.log(
    `${i}|${unCount}|${ovCount}|${winner}|${nextLoserIndex}|${countUntilNextLoser}|${largeNextLoser}`
  );
  totalSets++;
}

// ---- SUMMARY ----
console.log("\n--- SUMMARY ---");
console.log(`Total Sets Processed: ${totalSets}`);
console.log(`UN Wins: ${unWins}`);
console.log(`OV Wins: ${ovWins}`);
console.log(`Ties: ${ties}`);
console.log(`Maximum Count Until Next Loser: ${maxCount}`);

let sumFreq = 0;
console.log("\nCountUntilNextLoser|Frequency");
for (let c = 0; c <= maxCount; c++) {
  const f = freqCounts.get(c) || 0;
  console.log(`${c}|${f}`);
  sumFreq += f;
}
console.log(`\nSum of Frequency Counts: ${sumFreq}`);
