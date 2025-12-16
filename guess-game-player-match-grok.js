// Simulate one game for a given number of rounds
function simulateGame(numRounds) {
  const numPlayers = 15;
  let correctStreaks = new Array(numPlayers).fill(0); // Tracks current streak for each player

  // Simulate rounds
  for (let round = 0; round < numRounds; round++) {
    // Flip a fair coin (0 for tails, 1 for heads)
    const coin = Math.floor(Math.random() * 2);
    // Each player guesses randomly (0 or 1)
    for (let i = 0; i < numPlayers; i++) {
      const guess = Math.floor(Math.random() * 2);
      // If guess matches coin, increment streak; otherwise, reset
      correctStreaks[i] = guess === coin ? correctStreaks[i] + 1 : 0;
    }
  }

  // Count players with streaks of at least 6, 7, and 8
  const atLeast6 = correctStreaks.filter((streak) => streak >= 6).length;
  const atLeast7 = correctStreaks.filter((streak) => streak >= 7).length;
  const atLeast8 = correctStreaks.filter((streak) => streak >= 8).length;

  return {
    hasAtLeastTwo6: atLeast6 >= 2,
    hasAtLeastTwo7: atLeast7 >= 2,
    hasAtLeastTwo8: atLeast8 >= 2,
  };
}

// Run the simulation
function runSimulation(numSimulations) {
  let count6 = 0; // Count games with >= 2 players having 6+ correct guesses
  let count7 = 0; // Count games with >= 2 players having 7+ correct guesses
  let count8 = 0; // Count games with >= 2 players having 8+ correct guesses

  // Run for numSimulations
  for (let i = 0; i < numSimulations; i++) {
    // Simulate for the maximum number of rounds needed (8)
    const result = simulateGame(8);
    if (result.hasAtLeastTwo6) count6++;
    if (result.hasAtLeastTwo7) count7++;
    if (result.hasAtLeastTwo8) count8++;
  }

  // Calculate probabilities
  const prob6 = count6 / numSimulations;
  const prob7 = count7 / numSimulations;
  const prob8 = count8 / numSimulations;

  return { count6, count7, count8, prob6, prob7, prob8 };
}

// Run 1,000,000 simulations
const numSimulations = 1000000;
console.log(`Running ${numSimulations.toLocaleString()} simulations...`);
const startTime = Date.now();
const results = runSimulation(numSimulations);
const endTime = Date.now();

// Output results
console.log(`\nSimulation Results (${numSimulations.toLocaleString()} runs):`);
console.log(
  `- Games with >= 2 players having 6 consecutive correct guesses: ${results.count6.toLocaleString()} (Probability: ${results.prob6.toFixed(
    4
  )})`
);
console.log(
  `- Games with >= 2 players having 7 consecutive correct guesses: ${results.count7.toLocaleString()} (Probability: ${results.prob7.toFixed(
    4
  )})`
);
console.log(
  `- Games with >= 2 players having 8 consecutive correct guesses: ${results.count8.toLocaleString()} (Probability: ${results.prob8.toFixed(
    4
  )})`
);
console.log(
  `\nTime taken: ${((endTime - startTime) / 1000).toFixed(2)} seconds`
);
