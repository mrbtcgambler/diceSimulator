// Blackjack Simulator using Perfect Strategy
// (c) mrbtcgambler - Open Source Educational Tool

const { createHmac } = require("crypto");

// ---------------------------- Config & Global Control ----------------------------
const takeInsurance = false;
const useRandomSeed = true;
const debugMode = false;
const debugDelay = 1000;

const randomServerSeed = useRandomSeed
  ? generateRandomServerSeed(64)
  : "d83729554eeed8965116385e0486dab8a1f6634ae1a9e8139e849ab75f17341d";
const randomClientSeed = useRandomSeed
  ? generateRandomClientSeed(10)
  : "wcvqnIM521";
const startNonce = useRandomSeed ? Math.floor(Math.random() * 1000000) + 1 : 1;

// ---------------------------- Card Definitions ----------------------------
const CARDS = [
  "♦2",
  "♥2",
  "♠2",
  "♣2",
  "♦3",
  "♥3",
  "♠3",
  "♣3",
  "♦4",
  "♥4",
  "♠4",
  "♣4",
  "♦5",
  "♥5",
  "♠5",
  "♣5",
  "♦6",
  "♥6",
  "♠6",
  "♣6",
  "♦7",
  "♥7",
  "♠7",
  "♣7",
  "♦8",
  "♥8",
  "♠8",
  "♣8",
  "♦9",
  "♥9",
  "♠9",
  "♣9",
  "♦10",
  "♥10",
  "♠10",
  "♣10",
  "♦J",
  "♥J",
  "♠J",
  "♣J",
  "♦Q",
  "♥Q",
  "♠Q",
  "♣Q",
  "♦K",
  "♥K",
  "♠K",
  "♣K",
  "♦A",
  "♥A",
  "♠A",
  "♣A",
];

function generateRandomClientSeed(length) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function generateRandomServerSeed(length) {
  const hexRef = "0123456789abcdef";
  return Array.from(
    { length },
    () => hexRef[Math.floor(Math.random() * 16)]
  ).join("");
}

// ---------------------------- Hand Logic ----------------------------
function getCardValue(card) {
  const rank = card.slice(1);
  if (["J", "Q", "K"].includes(rank)) return 10;
  if (rank === "A") return 11;
  return parseInt(rank);
}

class BlackjackHand {
  constructor() {
    this.cards = [];
  }

  add(card) {
    this.cards.push(card);
  }

  get values() {
    return this.cards.map(getCardValue);
  }

  get total() {
    let total = this.values.reduce((a, b) => a + b, 0);
    let aces = this.values.filter((v) => v === 11).length;
    while (total > 21 && aces--) total -= 10;
    return total;
  }

  get isBlackjack() {
    return this.cards.length === 2 && this.total === 21;
  }

  get isBust() {
    return this.total > 21;
  }

  get isSoft() {
    return this.values.includes(11) && this.total <= 21;
  }

  toString() {
    return `${this.cards.join(", ")} (${this.total}${
      this.isSoft ? " soft" : ""
    })`;
  }
}

// ---------------------------- Provably Fair Draw Engine ----------------------------
function hmacSha256(seed, msg) {
  return createHmac("sha256", seed).update(msg).digest();
}

function getCardsFromSeed(serverSeed, clientSeed, nonce, count) {
  const floats = [];
  let cursor = 0;
  while (floats.length < count) {
    const hash = hmacSha256(serverSeed, `${clientSeed}:${nonce}:${cursor++}`);
    for (let i = 0; i < 32; i += 4) {
      if (floats.length >= count) break;
      const f =
        hash[i] / 256 +
        hash[i + 1] / 256 ** 2 +
        hash[i + 2] / 256 ** 3 +
        hash[i + 3] / 256 ** 4;
      floats.push(f);
    }
  }
  return floats.map((f) => CARDS[Math.floor(f * 52)]);
}

// ---------------------------- Multi-Round Simulation (High-Speed Engine) ----------------------------
async function simulateManyRounds(config) {
  const {
    serverSeed,
    clientSeed,
    startNonce,
    totalRounds,
    debugMode,
    debugDelay,
  } = config;

  let balance = config.startBalance;
  let betSize = config.baseBet;
  let wins = 0,
    losses = 0,
    pushes = 0,
    bjCount = 0;
  let winStreak = 0,
    lossStreak = 0;
  let highestWinStreak = 0,
    highestLossStreak = 0;
  let largestBet = betSize;
  let profit = 0,
    wager = 0;
  const increaseOnLoss = 2.0;
  const baseBet = betSize;
  const startTime = Date.now();

  for (let i = 0; i < totalRounds; i++) {
    if (!debugMode && (i + 1) % 100000 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const roundsSec = (i + 1) / elapsed;
      const progress = (((i + 1) / totalRounds) * 100).toFixed(2);
      console.log(
        [
          `Progress %: ${progress}`,
          `Rounds: ${i + 1}`,
          `Balance: ${(balance + profit).toFixed(2)}`,
          `Profit: ${profit.toFixed(2)}`,
          `Wagered: ${wager.toFixed(2)}`,
          `Wins: ${wins}`,
          `Losses: ${losses}`,
          `Pushes: ${pushes}`,
          `Win Rate: ${((wins / (i + 1)) * 100).toFixed(2)}%`,
          `Blackjacks: ${bjCount}`,
          `Highest Win Streak: ${highestWinStreak}`,
          `Highest Losing Streak: ${highestLossStreak}`,
          `Largest Bet Placed: ${largestBet.toFixed(2)}`,
          `Rounds/sec: ${roundsSec.toFixed(2)}`,
        ].join(" | ")
      );
    }
    const nonce = startNonce + i;
    const cards = getCardsFromSeed(serverSeed, clientSeed, nonce, 20);
    const player = new BlackjackHand();
    const dealer = new BlackjackHand();

    player.add(cards[0]);
    player.add(cards[1]);
    dealer.add(cards[2]);
    dealer.add(cards[3]);

    let drawIndex = 4;
    const dealerUpCard = dealer.cards[0];
    const playerBJ = player.isBlackjack;
    const dealerBJ = dealer.isBlackjack;

    if (dealerUpCard.endsWith("A")) {
      if (debugMode) console.log(`💡 Nonce ${nonce}: Insurance offered.`);
      if (takeInsurance && dealerBJ) {
        profit += betSize * 0.5 * 2; // 2:1 payout on half bet
        if (debugMode) console.log("🛡️ Insurance taken and paid out!");
      } else {
        if (debugMode && takeInsurance)
          console.log("🛡️ Insurance taken but not paid.");
        if (debugMode && !takeInsurance) console.log("🛡️ Insurance declined.");
      }
    }

    if (dealerBJ || playerBJ) {
      if (dealerBJ && playerBJ) {
        pushes++;
        continue;
      }
      if (dealerBJ) {
        losses++;
        profit -= betSize;
        betSize *= increaseOnLoss;
        wager += betSize;
        if (betSize > largestBet) largestBet = betSize;
        if (debugMode) console.log("❌ Dealer has Blackjack. Player loses.");
        continue;
      }
      if (playerBJ) {
        wins++;
        winStreak++;
        lossStreak = 0;
        highestWinStreak = Math.max(highestWinStreak, winStreak);
        profit += betSize * 1.5;
        betSize = baseBet;
        bjCount++;
        wager += betSize;
        if (betSize > largestBet) largestBet = betSize;
        if (debugMode) console.log("✅ Player has Blackjack! Paid 3:2");
        continue;
      }
    }

    while (player.total < 17) {
      player.add(cards[drawIndex++]);
      if (player.isBust) break;
    }

    if (!player.isBust) {
      while (dealer.total < 17 || (dealer.total === 17 && dealer.isSoft)) {
        dealer.add(cards[drawIndex++]);
      }
    }

    if (player.isBust) {
      losses++;
      lossStreak++;
      winStreak = 0;
      highestLossStreak = Math.max(highestLossStreak, lossStreak);
      profit -= betSize;
      betSize *= increaseOnLoss;
    } else if (dealer.isBust || player.total > dealer.total) {
      wins++;
      profit += betSize;
      betSize = baseBet;
      winStreak++;
      lossStreak = 0;
      highestWinStreak = Math.max(highestWinStreak, winStreak);
    } else if (player.total < dealer.total) {
      losses++;
      lossStreak++;
      winStreak = 0;
      highestLossStreak = Math.max(highestLossStreak, lossStreak);
      profit -= betSize;
      betSize *= increaseOnLoss;
    } else {
      pushes++;
      // Push: do not reset bet size, continue with current value
    }

    wager += betSize;

    if (debugMode) {
      console.log("┌────────────────────────────────────────────┐");
      console.log(`🧑 Player: ${player.toString()}`);
      console.log(`🃏 Dealer: ${dealer.toString()}`);
      console.log(`│ 🎰 Bet #${i + 1}`.padEnd(43) + "│");
      console.log("├────────────────────────────────────────────┤");
      console.log("│ 🔑 Server Seed:", serverSeed);
      console.log("🧬 Client Seed:", clientSeed);
      console.log("🔁 Current Nonce:", nonce);
      console.log("💰 Balance:", (balance + profit).toFixed(2));
      console.log("📈 Profit:", profit.toFixed(2));
      console.log("🧾 Wagered:", wager.toFixed(2));
      console.log("🎯 Current Bet Size:", betSize.toFixed(2));
      console.log("📉 Current Loss Streak:", lossStreak);
      console.log(
        player.isBust
          ? "❌ Player busts."
          : dealer.isBust
          ? "✅ Dealer busts. Player wins."
          : player.total > dealer.total
          ? "✅ Player wins."
          : player.total < dealer.total
          ? "❌ Dealer wins."
          : "🤝 Push."
      );
      console.log("└────────────────────────────────────────────┘");
      await new Promise((r) => setTimeout(r, debugDelay));
    }
  }

  const seconds = (Date.now() - startTime) / 1000;
  const rate = totalRounds / seconds;
  if (!debugMode) {
    const progress = ((totalRounds / totalRounds) * 100).toFixed(2);
    console.log(
      [
        `Progress %: ${progress}`,
        `Rounds: ${totalRounds}`,
        `Balance: ${(balance + profit).toFixed(2)}`,
        `Profit: ${profit.toFixed(2)}`,
        `Wagered: ${wager.toFixed(2)}`,
        `Wins: ${wins}`,
        `Losses: ${losses}`,
        `Pushes: ${pushes}`,
        `Win Rate: ${((wins / totalRounds) * 100).toFixed(2)}%`,
        `Blackjacks: ${bjCount}`,
        `Highest Win Streak: ${highestWinStreak}`,
        `Highest Losing Streak: ${highestLossStreak}`,
        `Largest Bet Placed: ${largestBet.toFixed(2)}`,
        `Rounds/sec: ${rate.toFixed(2)}`,
      ].join(" | ")
    );
  }

  console.log("\n✅ Simulation Complete");
  console.log("Rounds:", totalRounds);
  console.log("Wins:", wins);
  console.log("Losses:", losses);
  console.log("Pushes:", pushes);
  console.log("Blackjacks:", bjCount);
  console.log("Win Rate:", ((wins / totalRounds) * 100).toFixed(2) + "%");
  console.log("Profit:", profit.toFixed(2));
  console.log("Wager:", wager.toFixed(2));
  console.log("Time:", seconds.toFixed(2), "s");
  console.log("Speed:", rate.toFixed(2), "rounds/sec");
  console.log("Highest Win Streak:", highestWinStreak);
  console.log("Highest Losing Streak:", highestLossStreak);
  console.log("Largest Bet Placed:", largestBet.toFixed(2));
}

// ---------------------------- Start Batch Simulation ----------------------------
// Launch simulation with user-defined config values
simulateManyRounds({
  serverSeed: randomServerSeed, // Provably fair server seed (can be static or generated)
  clientSeed: randomClientSeed, // Player-controlled seed for fairness verification
  startNonce: startNonce, // Starting nonce for draw sequence
  totalRounds: 100000, //1 day = 240000, 1 week = 1680000, 1 Month = 7200000, 1 year = 86400000
  baseBet: 1, // Fixed bet size for each round
  startBalance: 100000, // Starting simulation balance (for future bust logic)
  debugMode: debugMode, // Enable detailed output per round
  debugDelay: debugDelay, // Delay between rounds (in ms) when debug is on
});
