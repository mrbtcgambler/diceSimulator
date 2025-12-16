/**
 * @fileoverview Simulates a coin flip game where players are eliminated if they guess incorrectly.
 * The simulation runs for a specified number of games and provides statistics on round counts.
 */

/**
 * Simulates a single round of the coin flip game.
 * Players make a random guess (0 for tails, 1 for heads).
 * A fair coin is flipped, and only players who guessed correctly advance.
 * @param {number} numPlayers - The number of players starting this round.
 * @returns {number} The number of players remaining after this round.
 */
function simulateRound(numPlayers) {
  if (numPlayers <= 0) {
    return 0; // No players to simulate
  }

  const coinFlip = Math.floor(Math.random() * 2); // 0 for tails, 1 for heads
  let correctGuesses = 0;

  for (let i = 0; i < numPlayers; i++) {
    const playerGuess = Math.floor(Math.random() * 2); // Player makes a random guess
    if (playerGuess === coinFlip) {
      correctGuesses++;
    }
  }
  return correctGuesses;
}

/**
 * Simulates a single game of the coin flip game.
 * The game continues until 1 or fewer players remain.
 * @param {number} initialPlayers - The number of players starting the game.
 * @returns {number} The total number of rounds played in this game.
 */
function simulateGame(initialPlayers) {
  let currentPlayers = initialPlayers;
  let rounds = 0;

  // The game continues as long as there are more than 1 player to compete
  // If only 1 player remains, that player is the winner and the game ends.
  // If 0 players remain, it means everyone was eliminated in the last round.
  while (currentPlayers > 1) {
    rounds++;
    currentPlayers = simulateRound(currentPlayers);
  }
  return rounds;
}

/**
 * Runs the coin flip game simulation multiple times and collects statistics.
 * @param {number} numGames - The total number of games to simulate.
 * @param {number} initialPlayersPerGame - The number of players starting each game.
 */
function runSimulation(numGames, initialPlayersPerGame) {
  const roundCounts = {}; // Stores frequency of games by round count
  let maxRounds = 0;

  console.log(
    `Starting simulation of ${numGames} games with ${initialPlayersPerGame} players each...`
  );

  for (let i = 0; i < numGames; i++) {
    const roundsInThisGame = simulateGame(initialPlayersPerGame);

    // Update maximum rounds
    if (roundsInThisGame > maxRounds) {
      maxRounds = roundsInThisGame;
    }

    // Update frequency count for rounds
    roundCounts[roundsInThisGame] = (roundCounts[roundsInThisGame] || 0) + 1;
  }

  console.log("\n--- Simulation Summary ---");
  console.log(`Maximum number of rounds in any game: ${maxRounds}`);
  console.log("\nFrequency count of games by round count:");

  // Sort the round counts for better readability
  const sortedRoundCounts = Object.keys(roundCounts).sort(
    (a, b) => parseInt(a) - parseInt(b)
  );

  for (const rounds of sortedRoundCounts) {
    const count = roundCounts[rounds];
    console.log(`${rounds} rounds: ${count.toLocaleString()} games`);
  }

  console.log("\nSimulation complete.");
}

// --- Main execution ---
const NUMBER_OF_SIMULATIONS = 1000000;
const INITIAL_PLAYERS = 15; // P-0 through P-14, which is 15 players.

// Run the simulation
runSimulation(NUMBER_OF_SIMULATIONS, INITIAL_PLAYERS);
