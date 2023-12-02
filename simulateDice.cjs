// Importing the crypto module for cryptographic operations
const crypto = require('crypto');

// Setting initial parameters for the simulation
const startTime = Date.now();
const randomClientSeed = generateRandomClientSeed(10); // Generates a 10-character long client seed
const randomServerSeed = generateRandomServerSeed(64); // Generates a 64 hex character long server seed
let chance = 18, // Set winning chance
    debugMode = false, // Set to true to activate debug mode
    baseBet = 0.0003, // Base bet amount
    nextBet = baseBet,
    balance = 1000000, // Starting balance
    totalBets = 240000, // Total number of bets for the simulation
    houseEdge = 1, // House edge percentage
    payOut = ((100 - houseEdge) / (chance / 100) / 100), // Calculates the win payout automatically
    increaseOnLoss = 1.2230, // Multiplier for the bet amount on a loss
    betHigh = false, // Betting high or low
    win = false, // Win status
    bet = 0, // Current bet
    profit = 0, // Total profit
    totalWagered = 0, // Total amount wagered
    startNonce = Math.floor(Math.random() * 1000000) + 1, // Random starting nonce position
    winCount = 0,
    winRatio = 0,
    betCount = 0,
    lastBet = 0,
    progress


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

// Main function to analyze bets based on the given parameters
async function analyzeBets(serverSeed, clientSeed, startNonce, numberOfBets) {
    let currentStreak = 0;
    let maxStreak = 0;
    let maxStreakNonce = 0;
    let nonce = startNonce;

    while (betCount <= totalBets) {
        bet = nextBet; // Update the bet to the current bet value
        const roll = getDiceRoll(serverSeed, clientSeed, nonce, 0);

        if (betHigh) {
            win = roll >= (100 - chance);
        } else {
            win = roll <= chance;
        }

        if (win) {
            lastBet = nextBet;
            nextBet = baseBet;
            winCount++
            profit += bet * payOut; // Update profit
            balance += bet * payOut; // Update balance
            currentStreak = 0;
            // Reset current streak or update it as needed
        } else {
            lastBet = nextBet;
            nextBet *= increaseOnLoss;
            profit -= bet; // Update profit
            balance -= bet; // Update balance
            currentStreak++;
            if (currentStreak > maxStreak) {
                maxStreak = currentStreak;
                maxStreakNonce = nonce;
            }
        }
        progress = (betCount  / totalBets) * 100;  // update progress

        //if (currentStreak === 9) { // uncooment if you want delayed martingale and set baseBet to 0 or flip bet high and low
        //    nextBet = 0.0003; 
        //    //break;
        //}

        if (currentStreak === 19) {
            betHigh = !betHigh;
        }  
        
        if (currentStreak === 39) {
           betHigh = !betHigh;
        } 
          
        if (nextBet > balance) {
            console.log("Busted!");
            console.log(
                win ? '\x1b[32m%s\x1b[0m' : '\x1b[37m%s\x1b[0m',
                [
                    'Progress %: ' + progress.toFixed(6),
                    'Bet Count ' + betCount,
                    'Server Seed: ' + serverSeed,
                    'Client Seed: ' + clientSeed,
                    'Nonce: ' + nonce,
                    'Roll: ' + roll.toFixed(2),
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

        winRatio = (winCount / betCount) * 100;

        totalWagered += bet; // Update total wagered
        
        if (!debugMode) {
            if (nonce % 100000 === 0) {
                const endTime = Date.now();
                const runTimeSeconds = (endTime - startTime) / 1000;
                const betsPerSecond = ((nonce - startNonce + 1) / runTimeSeconds).toLocaleString('en-US', { maximumFractionDigits: 2 });
                const currentNonce = (nonce);
                const currentSeed = (serverSeed);
                
                    console.log(
                        [
                        'Progress %: ' + progress.toFixed(2),
                        'Bet Count ' + betCount,
                        'Max Bets: ' + totalBets,
                        'Balance: ' + balance.toFixed(4),
                        'profit: ' + profit.toFixed(2),
                        'Wins Count: ' + winCount,
                        'Win Ratio: ' + winRatio.toFixed(2),
                        'Total Wagered: ' + totalWagered.toFixed(8),
                        'Worst Loss Streak: ' + maxStreak,
                        'Bets per Second: ' + betsPerSecond,
                    ].join(' | ')
                    );
            }
        }   else {
                 console.log(
                    win ? '\x1b[32m%s\x1b[0m' : '\x1b[37m%s\x1b[0m',
                    [
                        //'Server Seed: ' + serverSeed,
                        //'Client Seed: ' + clientSeed,
                        //'Nonce: ' + nonce,
                        'Progress %: ' + progress.toFixed(4),
                        'Bet Count ' + betCount,
                        'Result: ' + roll,
                        'Bet High: ' + betHigh,
                        'Next Bet Amount: ' + lastBet.toFixed(5),
                        'Wagered: ' + totalWagered.toFixed(8),
                        'profit: ' + profit.toFixed(8),
                        'Wins: ' + winCount.toFixed(2),
                        'Balance: ' + balance.toFixed(2),
                        'Win Ratio: ' + winRatio.toFixed(2),
                        'Current Streak: ' + currentStreak,
                        'Worst Streak: ' + maxStreak,
                        
                    ].join(' | ')
                    );
                    await betDelay(100); // Wait for 100ms before the next iteration
            
            }
        nonce++    
        betCount++    
    }

    return {
        betCount: numberOfBets,
        maxLossStreak: maxStreak,
        maxStreakNonce: maxStreakNonce
    };
}

// Example usage of the analyzeBets function
const result = analyzeBets(
    randomServerSeed, // Server Seed
    randomClientSeed, // Client Seed
    startNonce, // Starting nonce position
    chance, // Bet threshold for a loss
    totalBets // Total number of bets to analyze
);

// Calculating and displaying the results
const endTime = Date.now();
const runTimeSeconds = (endTime - startTime) / 1000;
const betsPerSecond = result.betCount / runTimeSeconds;
console.log('Complete!');