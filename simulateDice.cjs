// Importing the crypto module for cryptographic operations
const crypto = require('crypto');

// Global boolean to control the use of random seeds
const useRandomSeed = false;
const debugMode = true;
// If useRandomSeed is false, use predefined values, otherwise generate random seeds
const randomServerSeed = useRandomSeed ? generateRandomServerSeed(64) : 'd83729554eeed8965116385e0486dab8a1f6634ae1a9e8139e849ab75f17341d';
const randomClientSeed = useRandomSeed ? generateRandomClientSeed(10) : 'wcvqnIM521';
const startNonce = useRandomSeed ? Math.floor(Math.random() * 1000000) + 1 : 1;

// Setting initial parameters for the simulation
const startTime = Date.now();
let chance = 18,
    baseBet = 0.0003,
    nextBet = baseBet,
    balance = 1000000,
    totalBets = 1680000,
    houseEdge = 1,
    payOut = ((100 - houseEdge) / (chance / 100) / 100),
    increaseOnLoss = 1.2230,
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

        if (currentStreak === 82) {
            betHigh = !betHigh;
        }  
        
        //if (currentStreak === 39) {
        //   betHigh = !betHigh;
        //} 
          
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
                        'Server Seed: ' + serverSeed,
                        'Client Seed: ' + clientSeed,
                        'Nonce: ' + nonce,
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

// analyzeBets function
const result = analyzeBets(
    randomServerSeed, // Server Seed
    randomClientSeed, // Client Seed
    startNonce, // Starting nonce position
    totalBets // Total number of bets to analyze
);


// Calculating and displaying the results
result.then((result) => {
    const endTime = Date.now();
    const runTimeSeconds = (endTime - startTime) / 1000;
    const betsPerSecond = result.betCount / runTimeSeconds;
    console.log('Complete!');
});