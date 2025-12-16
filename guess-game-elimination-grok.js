// Simulate one game and return the number of rounds
function simulateGame() {
  // Initialize 15 players (P-0 to P-14)
  let players = Array(15).fill(true);
  let round = 0;

  while (players.filter((p) => p).length > 1) {
    round++;
    // Simulate coin flip (0 or 1)
    const coin = Math.floor(Math.random() * 2);
    // Each active player guesses (0 or 1)
    players = players.map((active) => {
      if (!active) return false;
      const guess = Math.floor(Math.random() * 2);
      return guess === coin;
    });
  }

  // If last player guessed correctly, count final round
  if (players.some((p) => p)) {
    round++;
  }

  return round;
}

// Run simulation for 1,000,000 games
const numGames = 1000000;
const roundCounts = {};
let maxRounds = 0;

for (let i = 0; i < numGames; i++) {
  const rounds = simulateGame();
  roundCounts[rounds] = (roundCounts[rounds] || 0) + 1;
  maxRounds = Math.max(maxRounds, rounds);
}

// Display results
console.log(`Maximum number of rounds in any game: ${maxRounds}`);
console.log("\nFrequency of games by round count:");
for (let rounds = 1; rounds <= maxRounds; rounds++) {
  const count = roundCounts[rounds] || 0;
  console.log(`${rounds} round${rounds > 1 ? "s" : ""}: ${count} games`);
}
