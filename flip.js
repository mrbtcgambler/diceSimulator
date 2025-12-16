const crypto = require("crypto"); // Node.js crypto module

// Byte generator for cryptographic randomness
function* byteGenerator(serverSeed, clientSeed, nonce, cursor) {
  let currentRound = Math.floor(cursor / 32);
  let currentRoundCursor = cursor % 32;

  while (true) {
    const hmac = crypto.createHmac("sha256", serverSeed);
    hmac.update(`${clientSeed}:${nonce}:${currentRound}`);
    const buffer = hmac.digest();

    while (currentRoundCursor < 32) {
      yield buffer[currentRoundCursor];
      currentRoundCursor += 1;
    }

    currentRoundCursor = 0;
    currentRound += 1;
  }
}

// Simulate a single coin flip for a play
function getFlipResult(serverSeed, clientSeed, nonce) {
  const rng = byteGenerator(serverSeed, clientSeed, nonce, 0); // cursor = 0 for one flip
  const bytes = [];
  for (let i = 0; i < 4; i++) {
    bytes.push(rng.next().value);
  }
  const floatResult = bytes.reduce(
    (acc, value, i) => acc + value / Math.pow(256, i + 1),
    0
  );
  return floatResult <= 0.5 ? "tails" : "heads";
}

// Count Heads and Tails over multiple plays
function countFlips(serverSeed, clientSeed, numPlays) {
  const counts = { heads: 0, tails: 0 };
  console.log(`Row,Value,Nonce`);
  for (let nonce = 0; nonce < numPlays; nonce++) {
    const result = getFlipResult(serverSeed, clientSeed, nonce);
    counts[result]++;
    console.log(`${nonce + 1},${result},${nonce}`);
  }
  const headsPercentage = ((counts.heads / numPlays) * 100).toFixed(2);
  const tailsPercentage = ((counts.tails / numPlays) * 100).toFixed(2);
  return {
    heads: counts.heads,
    tails: counts.tails,
    headsPercentage: headsPercentage,
    tailsPercentage: tailsPercentage,
  };
}

// Example usage
const serverSeed =
  "b1b696cca462c7198bb7002421e071afa898cc5002b8ef398d3a8be33ebcf66a";
const clientSeed = "WtlEiQKYqB";
const numPlays = 10000; // 10,000 plays = 10,000 flips

const result = countFlips(serverSeed, clientSeed, numPlays);
console.log(`Results for ${numPlays} flips:`);
console.log(`Heads: ${result.heads} (${result.headsPercentage}%)`);
console.log(`Tails: ${result.tails} (${result.tailsPercentage}%)`);
