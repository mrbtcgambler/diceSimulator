// coin_game_sim.js
function playOneGame() {
  // players P-0 through P-14 (15 players)
  let players = Array.from({ length: 15 }, (_, i) => `P-${i}`);
  let rounds = 0;

  while (players.length > 1) {
    rounds++;
    // flip the coin
    const coinFlip = Math.random() < 0.5 ? "H" : "T";

    // players guess randomly
    players = players.filter(() => {
      const guess = Math.random() < 0.5 ? "H" : "T";
      return guess === coinFlip;
    });

    // If all players are eliminated in this round,
    // restart the round with the same set of players
    if (players.length === 0) {
      players = Array.from({ length: 15 }, (_, i) => `P-${i}`);
      rounds = 0;
    }
  }

  return rounds;
}

function simulateGames(numGames) {
  const freq = new Map();
  let maxRounds = 0;

  for (let i = 0; i < numGames; i++) {
    const rounds = playOneGame();
    maxRounds = Math.max(maxRounds, rounds);
    freq.set(rounds, (freq.get(rounds) || 0) + 1);
  }

  console.log(`Simulated ${numGames.toLocaleString()} games`);
  console.log(`Maximum number of rounds observed: ${maxRounds}`);
  console.log("\nFrequency of games by round count:");
  [...freq.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([rounds, count]) => {
      console.log(`${rounds} rounds: ${count.toLocaleString()} games`);
    });
}

// Run 1,000,000 simulations
simulateGames(1_000_000);
