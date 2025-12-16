// Coin Guessing Game Simulation
// 15 players start, make random guesses on coin flips
// Players advance only if they guess correctly
// Game continues until 1 player remains

function simulateGame() {
  let players = Array.from({ length: 15 }, (_, i) => `P-${i}`);
  let rounds = 0;
  const playerProgression = [15]; // Start with 15 players

  while (players.length > 1) {
    rounds++;

    // Flip the coin (0 = heads, 1 = tails)
    const coinResult = Math.random() < 0.5 ? 0 : 1;

    // Each player makes a random guess
    const survivingPlayers = [];

    for (const player of players) {
      const guess = Math.random() < 0.5 ? 0 : 1;

      // Player survives if their guess matches the coin flip
      if (guess === coinResult) {
        survivingPlayers.push(player);
      }
    }

    players = survivingPlayers;
    playerProgression.push(players.length);

    // If no players survive, the game ends with no winner
    if (players.length === 0) {
      break;
    }
  }

  return { rounds, playerProgression };
}

function runSimulation(numGames = 1000000) {
  console.log(
    `Running ${numGames.toLocaleString()} coin guessing game simulations...`
  );
  console.log("Each game starts with 15 players (P-0 through P-14)");
  console.log("Players advance only if they correctly guess the coin flip\n");

  const roundCounts = {};
  let maxRounds = 0;
  let gamesWithWinner = 0;
  const playersByRound = {}; // roundNumber -> array of player counts

  const startTime = Date.now();

  for (let game = 0; game < numGames; game++) {
    const { rounds, playerProgression } = simulateGame();

    if (rounds > 0) {
      gamesWithWinner++;
      maxRounds = Math.max(maxRounds, rounds);
      roundCounts[rounds] = (roundCounts[rounds] || 0) + 1;

      for (
        let roundIndex = 0;
        roundIndex < playerProgression.length;
        roundIndex++
      ) {
        if (!playersByRound[roundIndex]) {
          playersByRound[roundIndex] = [];
        }
        playersByRound[roundIndex].push(playerProgression[roundIndex]);
      }
    }

    // Progress indicator for long simulations
    if ((game + 1) % 100000 === 0) {
      console.log(`Completed ${(game + 1).toLocaleString()} games...`);
    }
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  // Display results
  console.log("\n=== SIMULATION RESULTS ===");
  console.log(`Total games simulated: ${numGames.toLocaleString()}`);
  console.log(`Games with a winner: ${gamesWithWinner.toLocaleString()}`);
  console.log(
    `Games with no winner: ${(numGames - gamesWithWinner).toLocaleString()}`
  );
  console.log(`Maximum rounds in any game: ${maxRounds}`);
  console.log(`Simulation time: ${duration.toFixed(2)} seconds\n`);

  // Sort rounds by number and display frequency
  console.log("=== FREQUENCY DISTRIBUTION ===");
  const sortedRounds = Object.keys(roundCounts)
    .map(Number)
    .sort((a, b) => a - b);

  for (const rounds of sortedRounds) {
    const count = roundCounts[rounds];
    const percentage = ((count / gamesWithWinner) * 100).toFixed(2);
    console.log(
      `${rounds} rounds: ${count.toLocaleString()} games (${percentage}%)`
    );
  }

  // Calculate some statistics
  console.log("\n=== STATISTICS ===");
  let totalRounds = 0;
  for (const [rounds, count] of Object.entries(roundCounts)) {
    totalRounds += Number.parseInt(rounds) * count;
  }
  const averageRounds = (totalRounds / gamesWithWinner).toFixed(2);
  console.log(`Average rounds per game: ${averageRounds}`);

  // Find median
  const allRounds = [];
  for (const [rounds, count] of Object.entries(roundCounts)) {
    for (let i = 0; i < count; i++) {
      allRounds.push(Number.parseInt(rounds));
    }
  }
  allRounds.sort((a, b) => a - b);
  const median = allRounds[Math.floor(allRounds.length / 2)];
  console.log(`Median rounds per game: ${median}`);

  console.log("\n=== AVERAGE PLAYERS PER ROUND ===");
  const maxRoundIndex = Math.max(...Object.keys(playersByRound).map(Number));

  for (let roundIndex = 0; roundIndex <= maxRoundIndex; roundIndex++) {
    if (playersByRound[roundIndex]) {
      const playerCounts = playersByRound[roundIndex];
      const averagePlayers = (
        playerCounts.reduce((sum, count) => sum + count, 0) /
        playerCounts.length
      ).toFixed(2);

      if (roundIndex === 0) {
        console.log(`Start of game: ${averagePlayers} players (always 15)`);
      } else {
        console.log(
          `After round ${roundIndex}: ${averagePlayers} players on average`
        );
      }
    }
  }

  return {
    maxRounds,
    roundCounts,
    gamesWithWinner,
    averageRounds: Number.parseFloat(averageRounds),
    median,
    playersByRound,
  };
}

// Run the simulation
const results = runSimulation(1000000);

// Additional analysis
console.log("\n=== GAME THEORY ANALYSIS ===");
console.log(
  "In each round, each player has a 50% chance of guessing correctly."
);
console.log("Expected players remaining after round 1: 15 × 0.5 = 7.5");
console.log("Expected players remaining after round 2: 7.5 × 0.5 = 3.75");
console.log("Expected players remaining after round 3: 3.75 × 0.5 = 1.875");
console.log("Expected players remaining after round 4: 1.875 × 0.5 = 0.9375");
console.log("\nTheoretically, most games should end in 3-5 rounds.");
