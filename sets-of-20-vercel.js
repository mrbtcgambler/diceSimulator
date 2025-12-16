const { count } = require("rxjs");

// Generate array of 10,000 random numbers between 0.00 and 100.00
function generateRandomNumbers() {
  const numbers = [];
  for (let i = 0; i < 1000000; i++) {
    const randomNum = Math.random() * 100;
    numbers.push(Number.parseFloat(randomNum.toFixed(2)));
  }
  return numbers;
}

// Process sets of 20 numbers
function processNumberSets(numbers) {
  const results = [];

  for (let i = 0; i < numbers.length; i += 20) {
    // Get current set of 20 numbers
    const currentSet = numbers.slice(i, i + 20);

    // Skip if we don't have a full set of 20
    if (currentSet.length < 20) break;

    // Count UN50 (≤ 50.00) and OV50 (> 50.00)
    let un50Count = 0;
    let ov50Count = 0;

    currentSet.forEach((num) => {
      if (num <= 50.0) {
        un50Count++;
      } else {
        ov50Count++;
      }
    });

    // Determine winner
    let winner;
    let loser;
    if (un50Count > ov50Count) {
      winner = "UN";
      loser = "OV";
    } else if (ov50Count > un50Count) {
      winner = "OV";
      loser = "UN";
    } else {
      winner = "TIE";
      loser = null;
    }

    // Find next occurrence of loser
    let nextLoserIndex = -1;
    if (loser) {
      for (let j = i + 20; j < numbers.length; j++) {
        const isLoserCategory =
          (loser === "UN" && numbers[j] <= 50.0) ||
          (loser === "OV" && numbers[j] > 50.0);
        if (isLoserCategory) {
          nextLoserIndex = j;
          break;
        }
      }
    }

    const countUntilNextLoser =
      nextLoserIndex === -1 ? -1 : nextLoserIndex - (i + 19);

    results.push({
      startIndex: i,
      endIndex: i + 19,
      un50Count,
      ov50Count,
      winner,
      nextLoserIndex,
      countUntilNextLoser,
    });
  }

  return results;
}

// Main execution
console.log("Generating 10,000 random numbers...");
const numbers = generateRandomNumbers();

console.log("Processing sets of 20 numbers...");
const results = processNumberSets(numbers);

let maxCountUntilNextLoser = 0;
let countUntilNextLoserGt11 = 0;

console.log("\n=== SUMMARY RESULTS ===");
console.log(
  "Set | Start-End Index | UN50 | OV50 | Winner | Next Loser Index | Count Until Next Loser"
);
console.log("-".repeat(100));

results.forEach((result, index) => {
  const setNumber = (index + 1).toString().padStart(3, " ");
  const indexRange = `${result.startIndex}-${result.endIndex}`.padStart(9, " ");
  const un50 = result.un50Count.toString().padStart(4, " ");
  const ov50 = result.ov50Count.toString().padStart(4, " ");
  const winner = result.winner.padStart(6, " ");
  const nextLoser =
    result.nextLoserIndex === -1 ? "N/A" : result.nextLoserIndex.toString();
  const countUntilNextLoser =
    result.countUntilNextLoser === -1
      ? "N/A".padStart(18, " ")
      : result.countUntilNextLoser.toString().padStart(17, " ");

  if (result.countUntilNextLoser > 11) {
    countUntilNextLoserGt11++;
  }
  if (
    result.countUntilNextLoser !== -1 &&
    result.countUntilNextLoser > maxCountUntilNextLoser
  ) {
    maxCountUntilNextLoser = result.countUntilNextLoser;
  }

  console.log(
    `${setNumber} | ${indexRange}     | ${un50} | ${ov50} | ${winner} | ${nextLoser} | ${countUntilNextLoser}`
  );
});

// Additional statistics
console.log("\n=== ADDITIONAL STATISTICS ===");
const winnerCounts = { UN: 0, OV: 0, TIE: 0, maxCountUntilNextLoser };
results.forEach((result) => winnerCounts[result.winner]++);

console.log(`Total sets processed: ${results.length}`);
console.log(`UN wins: ${winnerCounts.UN}`);
console.log(`OV wins: ${winnerCounts.OV}`);
console.log(`Ties: ${winnerCounts.TIE}`);
console.log(`MaxCountUntilNextLoser: ${maxCountUntilNextLoser}`);
console.log(`CountUntilNextLoserGt11: ${countUntilNextLoserGt11}`);

// Show first few numbers as sample
console.log("\n=== SAMPLE DATA (First 40 numbers) ===");
for (let i = 0; i < 40; i++) {
  const category = numbers[i] <= 50.0 ? "UN" : "OV";
  console.log(
    `Index ${i.toString().padStart(2, " ")}: ${numbers[i].toFixed(
      2
    )} (${category})`
  );
}
