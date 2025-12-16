// Generate array of 1,000,000 random numbers between 0.00 and 100.00
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

    results.push({
      startIndex: i,
      endIndex: i + 19,
      un50Count,
      ov50Count,
      winner,
      nextLoserIndex,
    });
  }

  return results;
}

// Main execution
console.log("Generating 1,000,000 random numbers...");
const numbers = generateRandomNumbers();

console.log("Processing sets of 20 numbers...");
const results = processNumberSets(numbers);

console.log("\n=== SUMMARY RESULTS ===");
console.log(
  "Set | Start-End Index | UN50 | OV50 | Winner | Next Loser Index | Count Until Next Loser"
);
console.log("-".repeat(85));

results.forEach((result, index) => {
  const setNumber = (index + 1).toString().padStart(3, " ");
  const indexRange = `${result.startIndex}-${result.endIndex}`.padStart(9, " ");
  const un50 = result.un50Count.toString().padStart(4, " ");
  const ov50 = result.ov50Count.toString().padStart(4, " ");
  const winner = result.winner.padStart(6, " ");
  const nextLoser =
    result.nextLoserIndex === -1 ? "N/A" : result.nextLoserIndex.toString();

  const countUntilNext =
    result.nextLoserIndex === -1
      ? "N/A"
      : (result.nextLoserIndex - (result.endIndex + 1)).toString();

  console.log(
    `${setNumber} | ${indexRange}     | ${un50} | ${ov50} | ${winner} | ${nextLoser.padStart(
      16,
      " "
    )} | ${countUntilNext}`
  );
});

console.log("\n=== ADDITIONAL STATISTICS ===");
const winnerCounts = { UN: 0, OV: 0, TIE: 0 };
const countUntilNextLoser = [];

results.forEach((result) => {
  winnerCounts[result.winner]++;

  if (result.nextLoserIndex !== -1) {
    const count = result.nextLoserIndex - (result.endIndex + 1);
    countUntilNextLoser.push(count);
  }
});

console.log(`Total sets processed: ${results.length}`);
console.log(`UN wins: ${winnerCounts.UN}`);
console.log(`OV wins: ${winnerCounts.OV}`);
console.log(`Ties: ${winnerCounts.TIE}`);

if (countUntilNextLoser.length > 0) {
  const maxCount = Math.max(...countUntilNextLoser);
  console.log(`Maximum Count Until Next Loser: ${maxCount}`);

  const frequency = {};
  countUntilNextLoser.forEach((count) => {
    frequency[count] = (frequency[count] || 0) + 1;
  });

  console.log(`Frequency of Count Until Next Loser:`);
  let totalFrequency = 0;
  Object.keys(frequency)
    .sort((a, b) => Number(a) - Number(b))
    .forEach((count) => {
      console.log(`  ${count} steps: ${frequency[count]} times`);
      totalFrequency += frequency[count];
    });

  console.log(`Sum of frequency counts: ${totalFrequency}`);
} else {
  console.log(
    `Maximum Count Until Next Loser: N/A (no winners with next loser found)`
  );
  console.log(`Frequency of Count Until Next Loser: N/A`);
  console.log(`Sum of frequency counts: 0`);
}

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
