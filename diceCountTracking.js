// diceCountTracking.js
// CLI-based Node.js script to track dice outcomes mimicking Stake.us with CSV output
const crypto = require("crypto");
class DiceRoll {
  constructor() {
    this.nonce = 0;
    this.row = 1;
    this.number = 0.0;
    this.ovUnEq50 = "EQ"; // OV, UN
    this.isLowProbability = "";
    this.reverse50WL = ""; // W, L
    this.reverse50Val = 0; // 1, -1
    this.nextPlay = 0.0; // number from previous roll
    this.plReverse50 = 0.0;
    this.plReverse50Cume = 0.0;
  }

  assignNumber(number) {
    this.number = number;

    const isOver = this.number > 50; // Adjust threshold if needed
    this.ovUnEq50 = isOver ? "OV" : "UN";
  }

  getNumberDisplay() {
    return this.number.toFixed(2);
  }

  getNextPlayDisplay() {
    return this.nextPlay.toFixed(2);
  }

  getPLReverse50Display() {
    return this.plReverse50.toFixed(2);
  }

  getPLReverse50CumeDisplay() {
    return this.plReverse50Cume.toFixed(2);
  }

  getCSVLine() {
    const csvLine = `${this.row},${this.getNumberDisplay()},${this.ovUnEq50},${
      this.isLowProbability
    },${this.reverse50WL},${
      this.reverse50Val
    },${this.getNextPlayDisplay()},${this.getPLReverse50Display()},${this.getPLReverse50CumeDisplay()}`;
    return csvLine;
  }
}

class DiceRollManager {
  constructor() {
    this.diceRolls = [];
    this.initialize();
  }

  initialize() {}

  createDiceRoll() {
    const diceRoll = new DiceRoll();
    diceRoll.row = this.diceRolls.length + 1;
    this.diceRolls.push(diceRoll);
    return diceRoll;
  }

  getCount() {
    return this.diceRolls.length;
  }
}

let manager = new DiceRollManager();

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

// Generate a dice roll in [0, 100)
function getDiceResult(serverSeed, clientSeed, nonce) {
  const rng = byteGenerator(serverSeed, clientSeed, nonce, 0);
  const bytes = [];
  for (let i = 0; i < 4; i++) {
    bytes.push(rng.next().value);
  }
  const floatResult = bytes.reduce(
    (acc, value, i) => acc + value / Math.pow(256, i + 1),
    0
  );
  return floatResult * 100; // Scale to [0, 100)
}

// Function to calculate probability of sequences
function assignHasLowProbabilitySequence(newestRoll) {
  // Use only the last 20 outcomes for probability checks
  const recentRolls = manager.diceRolls.slice(-20);
  if (recentRolls.length < 10) return false;

  // Check for 10 consecutive Over or Under
  for (let i = 0; i <= recentRolls.length - 10; i++) {
    const slice = recentRolls.slice(i, i + 10);
    if (
      slice.every((roll) => roll.ovUnEq50 === "OV") ||
      slice.every((roll) => roll.ovUnEq50 === "UN")
    ) {
      newestRoll.isLowProbability = "CON_10*";
    }
  }

  // Check for 5 consecutive high (>=75) or low (<=25) rolls
  for (let i = 0; i <= recentRolls.length - 5; i++) {
    const slice = recentRolls.slice(i, i + 5);
    if (
      slice.every((roll) => roll.number >= 75) ||
      slice.every((roll) => roll.number <= 25)
    ) {
      newestRoll.isLowProbability = "CON_25_75*";
    }
  }
}

// 10 Highly Improbable Outcomes in Stake.us Dice
// #	Description	Estimated Probability	Notes
// 1	Rolling 20 consecutive values over 50	~1 in 1,048,576 (0.000095%)	Each roll has a 50% chance. 0.5^20.
// 2	Hitting exactly 49.50 twenty times in a row	1 in 10,000^20	Borderline impossible; each exact roll is 1 in 10,000.
// 3	Setting a 2% win chance and hitting 5 times in a row	~1 in 3.2 million	0.02^5 = 0.00000032 (0.000032%).
// 4	Alternating high/low outcomes for 30 consecutive rolls (e.g., over/under 50 repeatedly)	~1 in 1 billion	Pattern probability = 0.5^29 (first roll free).
// 5	Rolling 10 consecutive values within the 0.01–1.00 range	1 in 10^20	Each roll has a 1% chance (0.01–1.00 = 1 out of 100). 0.01^10.
// 6	Triggering a win with a 0.10% win chance	1 in 1,000	Achievable but very rare; many players never see it.
// 7	Rolling a palindrome pattern like 12.34 → 43.21 → 12.34	Extremely rare	Random, but notable and unlikely pattern.
// 8	Winning 100 times in a row with a 90% win chance	~1 in 1 in 2.7 million	0.9^100 ≈ 0.00000037
// 9	Getting every tenth roll to be a win over a 500-roll session	Combinatorially rare	Requires periodic structure across many trials.
// 10	Matching Stake's server seed roll to a locally pre-seeded hash guess	Practically 0%	Like hitting a cryptographic jackpot — infeasible unless seed is leaked.

// #	Description	Probability Estimate	Notes
// 1	Every 5th roll alternates (e.g., U,O,U,O,U...) for 500 rolls	~1 in 2³³ (1 in ~8.6 billion)	Every 5th roll must toggle between O/U.
// 2	All prime-numbered rolls are "Under" in a 200-roll session	~1 in 2⁴⁶ (1 in 7e13)	46 primes ≤ 200 → all must be "U"
// 3	Mirror symmetry: First 100 rolls match last 100 in reverse	1 in 2¹⁰⁰	Like palindromes in outcome
// 4	Only one "Under" in 1000 rolls (the rest are Over)	1000 × (0.5)^999 ≈ 1e-301	Almost impossible
// 5	Alternating wins and losses for 50 rolls (perfect zig-zag)	1 in 2⁴⁹ ≈ 1 in 5.6e14	Assuming win/loss is 50%
// 6	Repeating cycle of 3 (e.g., O-U-O, repeated ~166×)	1 in 2¹⁶⁵ ≈ 1e49	Forces rigid structure
// 7	Perfect 4x4 grid pattern: In every block of 4 rolls, exactly 2 Over & 2 Under	~1 in 6e72	Every 4-roll block has to have perfect balance
// 8	The number of Overs equals the number of Unders over 1000 rolls AND they alternate every 2	1 in absurd	Each pair must be one O and one U, while also keeping global balance
// 9	"Rolling staircase": each Over has a value 1% higher than the last Over	Depends on decimal RNG	Requires value memory, not just over/under — very rare
// 10	Roll 1000 times with zero repeat 6-roll sequences	~1 in 0 (impossible after ~300 rolls)	Birthday paradox kicks in — repeats inevitable

// Every Fibonacci-numbered roll is Over
// The 6-roll pattern of the first 6 rolls repeats exactly every 6 rolls
// No roll matches the previous roll's outcome for 500 rolls (anti-streak)

// ...

// Exact 6-roll pattern repeated 4 times in a row
// Every 10th roll is Over
// First 100 rolls mirror the last 100 in reverse
// Rolling alternating Over/Under for 50+ rolls
// All primes ≤ N are Under
// Every block of 4 rolls has 2 Overs, 2 Unders
// Any user-defined 10-roll pattern appearing N+ times
// No repeated 6-roll pattern in 1,000,000 rolls

// 10 Consecutive Rolls of "Over 98" (2% Win Probability)
// Specific Sequence of 20 Alternating Outcomes (e.g., OV, UN, OV, UN, ..., OV, UN)
// 15 Consecutive Rolls Landing in a 5% Range (e.g., Over 95)
// Specific 10-Roll Sequence with 2% Range (e.g., Over 98 for 5, Under 2 for 5)
// 12 Consecutive Rolls in a 10% Range (e.g., Over 90)

function simulateRepeating6x4(numRolls = 1_000_000) {
  let hits = 0;
  const history = [];

  for (let i = 0; i < numRolls; i++) {
    const outcome = rollDice() > 50 ? "O" : "U";
    history.push(outcome);

    if (history.length >= 24) {
      const last24 = history.slice(-24);
      const base = last24.slice(0, 6).join("");
      const valid = [1, 2, 3].every((i) => {
        return last24.slice(i * 6, i * 6 + 6).join("") === base;
      });
      if (valid) {
        hits++;
      }
    }
  }

  console.log(`6x4 pattern match: ${hits} in ${numRolls} rolls`);
}

function simulateEvery10thRollOver(numRolls = 1_000_000) {
  let matchCount = 0;

  for (let i = 0; i <= numRolls - 500; i++) {
    let success = true;
    for (let j = 0; j < 50; j++) {
      if (rollDice() <= 50) {
        success = false;
        break;
      }
    }
    if (success) {
      matchCount++;
    }
  }

  console.log(`Every 10th roll over: ${matchCount} times`);
}

function simulateCustom10RollPattern(targetPattern, numRolls = 1_000_000) {
  const patternStr = targetPattern.join("");
  let hits = 0;
  const buffer = [];

  for (let i = 0; i < numRolls; i++) {
    buffer.push(rollDice() > 50 ? "O" : "U");
    if (buffer.length > 10) buffer.shift();

    if (buffer.length === 10 && buffer.join("") === patternStr) {
      hits++;
    }
  }

  console.log(`Pattern "${patternStr}" matched ${hits} times`);
  // simulateCustom10RollPattern(['O', 'U', 'O', 'U', 'O', 'U', 'O', 'U', 'O', 'U']);
}

function assignReversal50Result(newestRoll) {
  // Check for reversal patterns in the last 20 outcomes}
  const recentRolls = manager.diceRolls.slice(-2);
  if (recentRolls.length < 2) return;

  const secondNewestRoll = recentRolls[recentRolls.length - 2];

  newestRoll.nextPlay = secondNewestRoll.number;
  if (secondNewestRoll.number <= 50) {
    newestRoll.nextPlay = 100 - secondNewestRoll.number;
  }

  if (
    (secondNewestRoll.ovUnEq50 === "OV" &&
      newestRoll.number <= secondNewestRoll.number) ||
    (secondNewestRoll.ovUnEq50 === "UN" &&
      newestRoll.number > secondNewestRoll.number)
  ) {
    newestRoll.reverse50WL = "W";
    newestRoll.reverse50Val = 1;
    newestRoll.plReverse50 = 100.0 / newestRoll.nextPlay - 1.02;
  } else {
    newestRoll.reverse50WL = "L";
    newestRoll.reverse50Val = -1;
    newestRoll.plReverse50 = -1;
  }
  newestRoll.plReverse50Cume =
    secondNewestRoll.plReverse50Cume + newestRoll.plReverse50;
}

function logDiceRoll(roll) {
  const csvLine = roll.getCSVLine();
  console.log(csvLine);
}

// Main function to process a dice roll
function processDiceRoll(roll) {
  assignHasLowProbabilitySequence(roll);
  assignReversal50Result(roll);
  logDiceRoll(roll);
}

// Simulate dice rolls (replace with your own loop or trigger)
function simulateDiceRolls(
  count = 20,
  serverSeed = "serverSeedExample",
  clientSeed = "clientSeedExample"
) {
  // Print CSV header
  console.log(
    `Row,Number,OV/UN,LOW_PROB,REVERSE_WL,REVERSE_VAL,NEXT_GUESS,CURRENT_PL,CUME_PL,${clientSeed},${serverSeed}`
  );
  for (let i = 0; i < count; i++) {
    const nonce = i; // Increment nonce for each roll
    const roll = manager.createDiceRoll();
    roll.nonce = nonce;
    roll.assignNumber(getDiceResult(serverSeed, clientSeed, roll.nonce));
    processDiceRoll(roll);
  }
}

// Run the simulation
// simulateDiceRolls(
//   10000,
//   "9ffc838d845949595ed16ff4d1f24b7263559ec7a1cf25a4681a51aa7a95836a",
//   "KapGnsupbw"
// );
// simulateDiceRolls(
//   10000,
//   "2eaffe5858ef6914cd79aca54439a807b5348c589c2b48c5c26762d512155dce",
//   "y2m15V6I7-"
// );
// simulateDiceRolls(
//   10000,
//   "cd64cf54d8a10a65d69f3afc9031d3402012c063fc32ed283b8db79bfc91655b",
//   "kXA7YUDhAb"
// );
// simulateDiceRolls(
//   10000,
//   "664215b82cdc4de92f351bf54022425661dac1a6c1bc1a3d26c5b3f7a505bc62",
//   "2UvhERpUjd"
// );
// simulateDiceRolls(
//   10000,
//   "5a029e1f0037c6dcb187e9bd3ef3a42bcde2965e2c4f4cf4435b800b71c8c6f3",
//   "TlfT4skVct"
// );
// simulateDiceRolls(
//   10000,
//   "bd3bf42b0460e7fcee3cc7c72c8f6ee62a344db67a88cd1035601e0ebabfbad6",
//   "tyc6G63pVx"
// );
// simulateDiceRolls(
//   10000,
//   "8f5a4a8a93cacc55da974d0c6a5512a3e7bc320b3131a5940f78be4aae191c2f",
//   "NYqnIp_6QD"
// );
// simulateDiceRolls(
//   10000,
//   "0fe4bb7345ba2524df829bbe82598abc7152f75e46098a76e56eec05b91fd4cd",
//   "TzSi6p9EPy"
// );
simulateDiceRolls(
  10000,
  "061bb8bc2bf803f9ce756cc4afbf868c7bc89667ef02462e7fa35a6134800644",
  "L8cdf9Tg3e"
);
