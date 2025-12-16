// Generate 1,000,000 random numbers between 0.00 and 100.00
const generateRandomNumbers = () => {
  const numbers = [];
  for (let i = 0; i < 1000000; i++) {
    const randomNum = Math.random() * 100;
    numbers.push(parseFloat(randomNum.toFixed(2)));
  }
  return numbers;
};

// Find the next occurrence of the loser type
const findNextLoser = (array, startIndex, loserType) => {
  for (let i = startIndex; i < array.length; i++) {
    if (loserType === "UN" && array[i] <= 50.0) {
      return i;
    } else if (loserType === "OV" && array[i] > 50.0) {
      return i;
    }
  }
  return -1; // Not found
};

// Main analysis function
const analyzeNumbers = () => {
  console.log("Generating 1,000,000 random numbers...");
  const numbers = generateRandomNumbers();

  console.log("Analyzing data...");

  // Results storage
  const results = [];
  const summary = {
    totalSets: 0,
    unWins: 0,
    ovWins: 0,
    ties: 0,
    maxCountUntilNextLoser: 0,
    frequencyMap: new Map(),
    sumFrequencyCounts: 0,
  };

  // CSV header
  console.log(
    "Index|UN50|OV50|Winner|NextLoserIndex|CountUntilNextLoser|LargeNextLoser"
  );

  // Process sets of 20 (starting from index 20)
  for (let i = 20; i < numbers.length; i += 20) {
    if (i + 19 >= numbers.length) break; // Ensure we have enough numbers for the set

    // Get previous 20 numbers
    const previous20 = numbers.slice(i - 20, i);

    // Count UN50 (<=50) and OV50 (>50)
    let un50Count = 0;
    let ov50Count = 0;

    for (const num of previous20) {
      if (num <= 50.0) {
        un50Count++;
      } else {
        ov50Count++;
      }
    }

    // Determine winner
    let winner, loserType;
    if (un50Count > ov50Count) {
      winner = "UN";
      loserType = "OV";
    } else if (ov50Count > un50Count) {
      winner = "OV";
      loserType = "UN";
    } else {
      winner = "TIE";
      loserType = null;
    }

    // Find next loser index and count
    let nextLoserIndex = -1;
    let countUntilNextLoser = -1;

    if (loserType) {
      nextLoserIndex = findNextLoser(numbers, i, loserType);
      if (nextLoserIndex !== -1) {
        countUntilNextLoser = nextLoserIndex - i;
        summary.maxCountUntilNextLoser = Math.max(
          summary.maxCountUntilNextLoser,
          countUntilNextLoser
        );

        // Update frequency map
        const currentFreq = summary.frequencyMap.get(countUntilNextLoser) || 0;
        summary.frequencyMap.set(countUntilNextLoser, currentFreq + 1);
      }
    }

    let largeNextLoser = "";
    if (countUntilNextLoser >= 9) {
      largeNextLoser = "LARGE";
    }
    // Display CSV row
    console.log(
      `${i}|${un50Count}|${ov50Count}|${winner}|${nextLoserIndex}|${countUntilNextLoser}|${largeNextLoser}`
    );

    // Update summary
    summary.totalSets++;
    if (winner === "UN") summary.unWins++;
    else if (winner === "OV") summary.ovWins++;
    else summary.ties++;
  }

  // Calculate sum of frequency counts
  for (const freq of summary.frequencyMap.values()) {
    summary.sumFrequencyCounts += freq;
  }

  // Display summary
  console.log("\n=== SUMMARY ===");
  console.log(`Total Sets Processed: ${summary.totalSets}`);
  console.log(`UN Wins: ${summary.unWins}`);
  console.log(`OV Wins: ${summary.ovWins}`);
  console.log(`Ties: ${summary.ties}`);
  console.log(
    `Maximum Count Until Next Loser: ${summary.maxCountUntilNextLoser}`
  );
  console.log(`Sum of Frequency Counts: ${summary.sumFrequencyCounts}`);

  console.log("\n=== FREQUENCY OF COUNT UNTIL NEXT LOSER ===");
  // Sort frequency map by count (ascending)
  const sortedFrequencies = [...summary.frequencyMap.entries()].sort(
    (a, b) => a[0] - b[0]
  );

  for (const [count, frequency] of sortedFrequencies) {
    console.log(`Count ${count}: ${frequency} occurrences`);
  }
};

// Run the analysis
analyzeNumbers();
