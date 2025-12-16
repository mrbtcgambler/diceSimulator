// Coin Guessing Game Simulation
// 15 players, each making random guesses on consecutive coin tosses
// Count how many times exactly 2 players achieve N consecutive correct guesses

const NUM_PLAYERS = 15;
const NUM_SIMULATIONS = 1000000;

// Function to simulate a single player's performance for N consecutive tosses
function simulatePlayer(consecutiveGuesses) {
  for (let i = 0; i < consecutiveGuesses; i++) {
    const coinResult = Math.random() < 0.5 ? 0 : 1; // 0 = heads, 1 = tails
    const playerGuess = Math.random() < 0.5 ? 0 : 1; // random guess

    if (coinResult !== playerGuess) {
      return false; // Player failed
    }
  }
  return true; // Player succeeded in all consecutive guesses
}

// Function to run a single simulation
function runSingleSimulation(consecutiveGuesses) {
  let successfulPlayers = 0;

  for (let player = 0; player < NUM_PLAYERS; player++) {
    if (simulatePlayer(consecutiveGuesses)) {
      successfulPlayers++;
    }
  }

  return successfulPlayers === 2; // Return true if exactly 2 players succeeded
}

// Function to run multiple simulations
function runSimulations(consecutiveGuesses, numSims) {
  let exactlyTwoSuccesses = 0;

  for (let sim = 0; sim < numSims; sim++) {
    if (runSingleSimulation(consecutiveGuesses)) {
      exactlyTwoSuccesses++;
    }

    // Progress indicator for long simulations
    if (sim % 100000 === 0 && sim > 0) {
      console.log(
        `Progress: ${
          (sim / 1000000) * 100
        }% complete for ${consecutiveGuesses} consecutive guesses`
      );
    }
  }

  return exactlyTwoSuccesses;
}

// Calculate theoretical probabilities for comparison
function calculateTheoreticalProbability(consecutiveGuesses) {
  const p = Math.pow(0.5, consecutiveGuesses); // Probability of success for one player
  const q = 1 - p; // Probability of failure for one player
  const combinations = 105; // C(15,2) = 105

  return combinations * Math.pow(p, 2) * Math.pow(q, 13);
}

// Main simulation
console.log("Starting Coin Guessing Game Simulation...");
console.log(
  `Running ${NUM_SIMULATIONS.toLocaleString()} simulations with ${NUM_PLAYERS} players each\n`
);

const results = {};

// Test for 6, 7, and 8 consecutive matches
for (let consecutive = 6; consecutive <= 8; consecutive++) {
  console.log(`\n=== Testing ${consecutive} Consecutive Correct Guesses ===`);

  const startTime = Date.now();
  const successCount = runSimulations(consecutive, NUM_SIMULATIONS);
  const endTime = Date.now();

  const observedProbability = successCount / NUM_SIMULATIONS;
  const theoreticalProbability = calculateTheoreticalProbability(consecutive);

  results[consecutive] = {
    successCount,
    observedProbability,
    theoreticalProbability,
    timeTaken: endTime - startTime,
  };

  console.log(`\nResults for ${consecutive} consecutive correct guesses:`);
  console.log(
    `- Times exactly 2 players succeeded: ${successCount.toLocaleString()}`
  );
  console.log(
    `- Observed probability: ${(observedProbability * 100).toFixed(4)}%`
  );
  console.log(
    `- Theoretical probability: ${(theoreticalProbability * 100).toFixed(4)}%`
  );
  console.log(
    `- Difference: ${(
      (observedProbability - theoreticalProbability) *
      100
    ).toFixed(4)}%`
  );
  console.log(
    `- Time taken: ${(results[consecutive].timeTaken / 1000).toFixed(
      2
    )} seconds`
  );
}

// Summary
console.log("\n" + "=".repeat(60));
console.log("SIMULATION SUMMARY");
console.log("=".repeat(60));

console.log(
  "\nConsecutive | Success Count | Observed % | Theoretical % | Difference"
);
console.log("-".repeat(70));

for (let consecutive = 6; consecutive <= 8; consecutive++) {
  const r = results[consecutive];
  console.log(
    `${consecutive.toString().padStart(11)} | ` +
      `${r.successCount.toString().padStart(13)} | ` +
      `${(r.observedProbability * 100).toFixed(4).padStart(10)} | ` +
      `${(r.theoreticalProbability * 100).toFixed(4).padStart(13)} | ` +
      `${((r.observedProbability - r.theoreticalProbability) * 100)
        .toFixed(4)
        .padStart(10)}`
  );
}

const totalTime = Object.values(results).reduce(
  (sum, r) => sum + r.timeTaken,
  0
);
console.log(
  `\nTotal simulation time: ${(totalTime / 1000).toFixed(2)} seconds`
);
console.log("Simulation completed!");
