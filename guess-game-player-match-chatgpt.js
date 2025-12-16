// guessingGameSim.js
// Simulates 15 players guessing coin tosses for consecutive rounds.
// Runs 1,000,000 simulations and reports how many times >=2 players succeed.

function simulate(numPlayers, numGuesses, numTrials) {
  let count = 0;

  for (let t = 0; t < numTrials; t++) {
    let successes = 0;

    for (let p = 0; p < numPlayers; p++) {
      // A player is correct if they guess every toss in the streak
      let correct = true;
      for (let g = 0; g < numGuesses; g++) {
        const coin = Math.random() < 0.5 ? 0 : 1; // 0 = heads, 1 = tails
        const guess = Math.random() < 0.5 ? 0 : 1;
        if (coin !== guess) {
          correct = false;
          break;
        }
      }
      if (correct) successes++;
      if (successes >= 2) break; // no need to check further
    }

    if (successes >= 2) count++;
  }

  return count;
}

function run() {
  const numPlayers = 15;
  const numTrials = 1_000_000;

  const one = simulate(numPlayers, 1, numTrials);
  const two = simulate(numPlayers, 2, numTrials);
  const three = simulate(numPlayers, 3, numTrials);
  const four = simulate(numPlayers, 4, numTrials);
  const five = simulate(numPlayers, 5, numTrials);
  const six = simulate(numPlayers, 6, numTrials);
  const seven = simulate(numPlayers, 7, numTrials);
  const eight = simulate(numPlayers, 8, numTrials);
  const nine = simulate(numPlayers, 9, numTrials);
  const ten = simulate(numPlayers, 10, numTrials);
  const eleven = simulate(numPlayers, 11, numTrials);
  const twelve = simulate(numPlayers, 12, numTrials);
  const thirteen = simulate(numPlayers, 13, numTrials);
  const fourteen = simulate(numPlayers, 14, numTrials);

  console.log("Simulation results (1,000,000 trials):");
  console.log(`1 consecutive correct guesses (>=2 players): ${one}`);
  console.log(`2 consecutive correct guesses (>=2 players): ${two}`);
  console.log(`3 consecutive correct guesses (>=2 players): ${three}`);
  console.log(`4 consecutive correct guesses (>=2 players): ${four}`);
  console.log(`5 consecutive correct guesses (>=2 players): ${five}`);
  console.log(`6 consecutive correct guesses (>=2 players): ${six}`);
  console.log(`7 consecutive correct guesses (>=2 players): ${seven}`);
  console.log(`8 consecutive correct guesses (>=2 players): ${eight}`);
  console.log(`9 consecutive correct guesses (>=2 players): ${nine}`);
  console.log(`10 consecutive correct guesses (>=2 players): ${ten}`);
  console.log(`11 consecutive correct guesses (>=2 players): ${eleven}`);
  console.log(`12 consecutive correct guesses (>=2 players): ${twelve}`);
  console.log(`13 consecutive correct guesses (>=2 players): ${thirteen}`);
  console.log(`14 consecutive correct guesses (>=2 players): ${fourteen}`);

  console.log("\nApproximate probabilities:");
  console.log(`1 guesses: ${((one / numTrials) * 100).toFixed(4)}%`);
  console.log(`2 guesses: ${((two / numTrials) * 100).toFixed(4)}%`);
  console.log(`3 guesses: ${((three / numTrials) * 100).toFixed(4)}%`);
  console.log(`4 guesses: ${((four / numTrials) * 100).toFixed(4)}%`);
  console.log(`5 guesses: ${((five / numTrials) * 100).toFixed(4)}%`);
  console.log(`6 guesses: ${((six / numTrials) * 100).toFixed(4)}%`);
  console.log(`7 guesses: ${((seven / numTrials) * 100).toFixed(4)}%`);
  console.log(`8 guesses: ${((eight / numTrials) * 100).toFixed(4)}%`);
  console.log(`9 guesses: ${((nine / numTrials) * 100).toFixed(4)}%`);
  console.log(`10 guesses: ${((ten / numTrials) * 100).toFixed(4)}%`);
  console.log(`11 guesses: ${((eleven / numTrials) * 100).toFixed(4)}%`);
  console.log(`12 guesses: ${((twelve / numTrials) * 100).toFixed(4)}%`);
  console.log(`13 guesses: ${((thirteen / numTrials) * 100).toFixed(4)}%`);
  console.log(`14 guesses: ${((fourteen / numTrials) * 100).toFixed(4)}%`);
}

run();
