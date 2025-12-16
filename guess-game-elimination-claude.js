// Coin Flip Elimination Game Simulation
// Players guess coin flips, winners advance to next round

function simulateGame() {
  // Initialize 15 players (P-0 through P-14)
  let players = [];
  for (let i = 0; i < 15; i++) {
    players.push(`P-${i}`);
  }

  let round = 1;

  while (players.length > 1) {
    // Fair coin flip (0 = heads, 1 = tails)
    const coinResult = Math.random() < 0.5 ? 0 : 1;

    // Each player makes a random guess
    const survivors = [];

    for (const player of players) {
      const guess = Math.random() < 0.5 ? 0 : 1;

      // Player survives if guess matches coin result
      if (guess === coinResult) {
        survivors.push(player);
      }
    }

    // If no one guessed correctly, all players are eliminated
    // If everyone guessed correctly, all players advance
    // In practice, we need at least one survivor to continue
    if (survivors.length === 0) {
      // Edge case: no survivors, game ends with no winner
      // For this simulation, we'll consider this as ending the game
      break;
    }

    players = survivors;
    round++;

    // Safety check to prevent infinite loops (though mathematically unlikely)
    if (round > 100) {
      console.log(`Warning: Game exceeded 100 rounds, ending simulation`);
      break;
    }
  }

  return round - 1; // Return number of rounds played
}

function runSimulation(numGames) {
  console.log(`Running simulation for ${numGames.toLocaleString()} games...\n`);

  const roundCounts = {};
  let maxRounds = 0;
  let totalGames = 0;

  for (let game = 0; game < numGames; game++) {
    const rounds = simulateGame();

    // Update statistics
    if (rounds > 0) {
      roundCounts[rounds] = (roundCounts[rounds] || 0) + 1;
      maxRounds = Math.max(maxRounds, rounds);
      totalGames++;
    }

    // Progress indicator for large simulations
    if ((game + 1) % 100000 === 0) {
      console.log(`Completed ${(game + 1).toLocaleString()} games...`);
    }
  }

  // Display results
  console.log(`\n=== SIMULATION RESULTS ===`);
  console.log(`Total games simulated: ${totalGames.toLocaleString()}`);
  console.log(`Maximum number of rounds in any game: ${maxRounds}`);
  console.log(`\nGame frequency by round count:`);

  // Sort by round number and display
  const sortedRounds = Object.keys(roundCounts)
    .map(Number)
    .sort((a, b) => a - b);

  for (const rounds of sortedRounds) {
    const count = roundCounts[rounds];
    const percentage = ((count / totalGames) * 100).toFixed(2);
    console.log(
      `${rounds} rounds: ${count.toLocaleString()} games (${percentage}%)`
    );
  }

  // Calculate and display average rounds
  let totalRounds = 0;
  for (const [rounds, count] of Object.entries(roundCounts)) {
    totalRounds += parseInt(rounds) * count;
  }
  const averageRounds = (totalRounds / totalGames).toFixed(2);
  console.log(`\nAverage rounds per game: ${averageRounds}`);

  return {
    maxRounds,
    roundCounts,
    totalGames,
    averageRounds: parseFloat(averageRounds),
  };
}

// Run the simulation
const NUM_SIMULATIONS = 1000000;
const startTime = Date.now();

const results = runSimulation(NUM_SIMULATIONS);

const endTime = Date.now();
const executionTime = ((endTime - startTime) / 1000).toFixed(2);

console.log(`\nSimulation completed in ${executionTime} seconds`);

// Export for potential use as a module
module.exports = { simulateGame, runSimulation };
