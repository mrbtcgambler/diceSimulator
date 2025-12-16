// Importing the crypto module for cryptographic operations
const crypto = require('crypto');

// Global boolean to control the use of random seeds
const useRandomSeed = true;
const debugMode = true;
// If useRandomSeed is false, use predefined values, otherwise generate random seeds
const randomServerSeed = useRandomSeed ? generateRandomServerSeed(64) : 'd437ff723a79eac4df9cb482fe26c17648fecb621d4b61c6ad7a5b7a33b9c04a';
// const randomServerSeed = useRandomSeed ? generateRandomServerSeed(64) : '664215b82cdc4de92f351bf54022425661dac1a6c1bc1a3d26c5b3f7a505bc62';
const randomClientSeed = useRandomSeed ? generateRandomClientSeed(10) : '2UvhERpUjd';
// const startNonce = useRandomSeed ? Math.floor(Math.random() * 1000000) + 1 : 1;
const startNonce = 1;

// Setting initial parameters for the simulation
const startTime = Date.now();
let chance = 50,
    baseBet = 1, // Initial bet amount (configurable parameter)
    unit = 1, // Unit size for D'Alembert increase/decrease (configurable)
    nextBet = baseBet,
    balance = 1000000,
    // totalBets = 1680000,
    totalBets = 50000,
    houseEdge = 2,
    payOut = ((100 - houseEdge) / (chance / 100) / 100),
    trackZScoreAfterTrialsCnt = 1000, // Start tracking z-score and p-value after this many bets
    betHigh = false,
    win = false,
    bet = 0,
    profit = 0,
    totalWagered = 0,
    winCount = 0,
    winRatio = 0,
    betCount = 0,
    lastBet = 0,
    progress;


// Byte generator for cryptographic randomness
function* byteGenerator(serverSeed, clientSeed, nonce, cursor) {
    let currentRound = Math.floor(cursor / 32);
    let currentRoundCursor = cursor % 32;

    while (true) {
        const hmac = crypto.createHmac('sha256', serverSeed);
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

// Utility function to introduce a delay
function betDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to simulate a dice roll using server and client seeds, nonce, and cursor
function getDiceRoll(serverSeed, clientSeed, nonce, cursor) {
    const rng = byteGenerator(serverSeed, clientSeed, nonce, cursor);
    const bytes = [];
    for (let i = 0; i < 4; i++) {
        bytes.push(rng.next().value);
    }

    const floatResult = bytes.reduce((acc, value, i) => acc + value / Math.pow(256, i + 1), 0);
    const roll = Math.floor(floatResult * 10001) / 100;
    return roll;
}

// Utility functions to generate random seeds
function generateRandomClientSeed(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}
function generateRandomServerSeed(length) {
    let result = [];
    const hexRef = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];
    
    for (let n = 0; n < length; n++) {
        result.push(hexRef[Math.floor(Math.random() * 16)]);
    }
    
    return result.join('');
};

// Approximate standard normal CDF for p-value calculation
function normalCDF(z) {
    // Using the Abramowitz and Stegun approximation for standard normal CDF
    const b1 = 0.319381530;
    const b2 = -0.356563782;
    const b3 = 1.781477937;
    const b4 = -1.821255978;
    const b5 = 1.330274429;
    const p = 0.2316419;
    const c = 0.39894228;

    const t = 1 / (1 + p * Math.abs(z));
    const poly = t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));
    let cdf = 1 - c * Math.exp(-z * z / 2) * poly;

    if (z < 0) {
        cdf = 1 - cdf;
    }

    return cdf;
}

// Calculate z-score and one-tailed p-value for a single roll
function calculateStats(roll) {
    const mean = 50; // Mean of uniform [0, 100]
    const stdDev = Math.sqrt((100 * 100) / 12); // ≈ 28.8675
    const z = (roll - mean) / stdDev; // Z-score
    let pValue;

    if (roll >= 50) {
        // Over: P(X >= roll)
        pValue = 1 - (roll / 100); // Linear CDF for uniform distribution
    } else {
        // Under: P(X <= roll)
        pValue = roll / 100; // Linear CDF for uniform distribution
    }

    return {
        outcome: roll >= 50 ? 'Over' : 'Under',
        zScore: z,
        pValue: pValue
    };
}

// Calculate cumulative z-score and one-tailed p-value for proportion of overs
function calculateCumulativeStats(overCount, totalRolls) {
    if (totalRolls === 0) {
        return { cumZScore: 0, cumPValue: 0.5 };
    }
    const p = 0.5; // Expected proportion of overs
    const pHat = overCount / totalRolls; // Observed proportion
    const stdError = Math.sqrt(p * (1 - p) / totalRolls); // sqrt(0.25 / n)
    const z = (pHat - p) / stdError; // Z-score = 2 * (pHat - 0.5) * sqrt(n)
    const pValue = 1 - normalCDF(z); // One-tailed: P(Z >= z) for more overs

    return {
        cumZScore: z,
        cumPValue: pValue
    };
}

// Main function to analyze bets with "follow-the-winner" strategy
async function analyzeBets(serverSeed, clientSeed, startNonce, numberOfBets, initialBet, unitSize) {
    let currentStreak = 0;
    let maxStreak = 0;
    let maxStreakNonce = 0;
    let nonce = startNonce;
    // Removed nextBet and unit as they are not needed; bet is fixed at 1 unit
    // const fixedBet = 1; // Fixed bet size for follow-the-winner strategy
    nextBet = initialBet; // Set initial bet from parameter

    // Initialize min/max z-score and p-value trackers
    let maxCumZScore = -Infinity;
    let minCumZScore = Infinity;
    let maxCumPValue = -Infinity;
    let minCumPValue = Infinity;
    let overCount = 0; // Track number of "over" outcomes

    // Initialize bet direction for the first roll (default to "under")
    betHigh = false; // false means bet on "under", true means bet on "over"
    let previousRoll = null; // Track the previous roll to determine next bet direction

    while (betCount < numberOfBets) {
        bet = nextBet; // Set bet to fixed 1 unit

        // Deduct bet from balance before the roll (like Stake.us)
        balance -= bet;
        totalWagered += bet; // Update total wagered
        
        const roll = getDiceRoll(serverSeed, clientSeed, nonce, 0);

        if (roll >= 50) {
            overCount++; // Increment for roll >= 50
        }
        const cumStats = calculateCumulativeStats(overCount, betCount + 1); // Cumulative stats

        // Update min/max z-score and p-value
        if (betCount > trackZScoreAfterTrialsCnt) { // Start tracking after trackZScoreAfterTrialsCnt bets
            maxCumZScore = Math.max(maxCumZScore, cumStats.cumZScore);
            minCumZScore = Math.min(minCumZScore, cumStats.cumZScore);
            maxCumPValue = Math.max(maxCumPValue, cumStats.cumPValue);
            minCumPValue = Math.min(minCumPValue, cumStats.cumPValue);
        }

        // Determine win based on current bet direction
        if (betHigh) {
            win = roll >= (100 - chance); // Betting "over" (≥ 50)
        } else {
            win = roll <= chance; // Betting "under" (< 50)
        }

        if (win) {
            lastBet = nextBet;
            nextBet -= unit; // Decrease bet by 1 unit on win (D'Alembert)
            if (nextBet <= 0) nextBet = unit; // Ensure bet doesn't go below 1 unit
            winCount++;
            profit += bet * (payOut - 1); // Update profit
            balance += bet * payOut; // Update balance
            currentStreak = 0;
        } else {
            lastBet = nextBet;
            nextBet += unit; // Increase bet by 1 unit on loss (D'Alembert)
            profit -= bet; // Update profit
            currentStreak++;
            if (currentStreak > maxStreak) {
                maxStreak = currentStreak;
                maxStreakNonce = nonce;
            }
        }

        progress = (betCount / numberOfBets) * 100; // Update progress

        if (bet > balance) {
            console.log("Busted!");
            console.log(
                win ? '\x1b[32m%s\x1b[0m' : '\x1b[37m%s\x1b[0m',
                [
                    'ProgressPct: ' + progress.toFixed(6),
                    'Bet Count: ' + betCount,
                    'Server Seed: ' + serverSeed,
                    'Client Seed: ' + clientSeed,
                    'Nonce: ' + nonce,
                    'Roll: ' + roll.toFixed(2),
                    'Cum Z-Score: ' + cumStats.cumZScore.toFixed(4),
                    'Cum P-Value: ' + cumStats.cumPValue.toFixed(6),                    
                    'Win: ' + win,
                    'Payout: ' + payOut,
                    'Bet: ' + bet.toFixed(8),
                    'Balance: ' + balance.toFixed(8),
                    'Profit: ' + profit.toFixed(8),
                    'Total Wagered: ' + totalWagered.toFixed(8),
                    'Current Streak: ' + currentStreak,
                    'Bet High: ' + betHigh,
                    'Worst Streak: ' + maxStreak
                ].join(' | ')
            );
            break;
        }

        winRatio = (winCount / betCount || 1) * 100; // Avoid division by zero

        if (!debugMode) {
            if (nonce % 100000 === 0) {
                const endTime = Date.now();
                const runTimeSeconds = (endTime - startTime) / 1000;
                const betsPerSecond = ((nonce - startNonce + 1) / runTimeSeconds).toLocaleString('en-US', { maximumFractionDigits: 2 });
                console.log(
                    [
                        'ProgressPct: ' + progress.toFixed(2),
                        'Bet Count: ' + betCount,
                        'Max Bets: ' + numberOfBets,
                        'Balance: ' + balance.toFixed(4),
                        'Profit: ' + profit.toFixed(2),
                        'Wins Count: ' + winCount,
                        'Win Ratio: ' + winRatio.toFixed(2),
                        'Total Wagered: ' + totalWagered.toFixed(8),
                        'Worst Loss Streak: ' + maxStreak,
                        'Bets per Second: ' + betsPerSecond,
                    ].join(' | ')
                );
            }
        } else {
            console.log(
                [
                    'BetCnt: ' + betCount,
                    'Result: ' + roll,
                    'CumZ: ' + cumStats.cumZScore.toFixed(2),
                    'CumP: ' + cumStats.cumPValue.toFixed(6),
                    'IsBetHigh: ' + betHigh,
                    'NextBetAmount: ' + lastBet.toFixed(1), // Fixed at 1
                    'Bet: ' + bet.toFixed(1),
                    'Profit: ' + profit.toFixed(0),
                    'Balance: ' + balance.toFixed(0),
                    'TotWagered: ' + totalWagered.toFixed(8),
                    'Wins: ' + winCount.toFixed(0),
                    'Win Ratio: ' + winRatio.toFixed(2),
                    'Current Streak: ' + currentStreak,
                    'Worst Streak: ' + maxStreak,
                    'Server Seed: ' + serverSeed,
                    'Client Seed: ' + clientSeed,
                    'Nonce: ' + nonce,
                    'ProgressPct: ' + progress.toFixed(4)
                ].join(' | ')
            );
            // await betDelay(100); // Uncomment if delay is needed
        }
        // Follow-the-winner strategy: Set next bet direction based on current roll
        betHigh = roll >= 50; // Bet "over" if current roll is ≥ 50, else bet "under"

        nonce++;
        betCount++;
        previousRoll = roll; // Update previous roll
    }

    return {
        betCount: betCount,
        maxLossStreak: maxStreak,
        maxStreakNonce: maxStreakNonce,
        maxCumZScore: maxCumZScore,
        minCumZScore: minCumZScore,
        maxCumPValue: maxCumPValue,
        minCumPValue: minCumPValue
    };
}

// Analyze bets with D'Alembert strategy
const result = analyzeBets(
    randomServerSeed, // Server Seed
    randomClientSeed, // Client Seed
    startNonce, // Starting nonce position
    totalBets, // Total number of bets to analyze
    baseBet, // Initial bet amount
    unit // Unit size for D'Alembert
);


// Calculating and displaying the results
result.then((result) => {
    const endTime = Date.now();
    const runTimeSeconds = (endTime - startTime) / 1000;
    const betsPerSecond = result.betCount / runTimeSeconds;
    console.log('Complete!');
    console.log(
        [
            'Total Profit: ' + profit.toFixed(8),
            'Win Ratio: ' + winRatio.toFixed(2) + '%',
            'Max Cum Z-Score: ' + result.maxCumZScore.toFixed(4),
            'Min Cum Z-Score: ' + result.minCumZScore.toFixed(4),
            'Max Cum P-Value: ' + result.maxCumPValue.toFixed(6),
            'Min Cum P-Value: ' + result.minCumPValue.toFixed(6),
            'Max Loss Streak: ' + result.maxLossStreak,
            'Final Balance: ' + balance.toFixed(8),
            'Total Bets: ' + result.betCount,
            'Total Wagered: ' + totalWagered.toFixed(8)
        ].join(' | ')
    );
});
