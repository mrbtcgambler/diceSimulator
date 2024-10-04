//********************************************************************************************
//** Cycling Bet Progression Video:  TBD                                                    **
//** Version: 0.1                                                                           ** 
//** Date:04/10/2024                                                                       **
//** Authour: MrBtcGambler                                                                  **
//** Start Balance: 40 TRX                                                                  **
//** Recovery Pot: 25,000 TRX                                                               **
//** Bust Threshold: 9 TRX                                                                  **
//**                                                                                        **
//** Overview:                                                                              **
//** The Cycling Bet Progression is a dynamic betting strategy designed to cycle through a  **
//** fixed number of bets, progressively adjusting the wager based on win/loss outcomes.    **
//** The strategy revolves around a sequence of predefined betting slots (m1 to m50), each  **
//** representing an individual betting round. When a bet is won, the wager is reset to a   **
//** base value. On a loss, the bet amount is doubled, as long as it remains within a set   **
//** maximum threshold. Once the sequence reaches the 50th bet (m50), it wraps back to the  **
//** first bet (m1), creating a continuous loop of progressively managed bets.              ** 
//**                                                                                        **
//** This cyclical nature allows for risk management over a large number of bets, with loss **
//** recovery mechanisms built in (via bet doubling on losses), while ensuring that after   **
//** every cycle, the betting sequence resets. This strategy is particularly useful for     ** 
//** those aiming to control their bet sizing and exposure over a long series of wagers,    **
//** while maintaining structured risk management.                                          **
//**                                                                                        **
//** Key Features:                                                                          **
//** Progressive Betting: Bets double on losses but reset on wins.                          **
//** Cyclic Mechanism: The strategy cycles through 50 betting rounds and wraps back to the  **
//** first after completing the cycle.                                                      **    
//** Risk Control: A maximum bet threshold ensures that the doubling mechanic doesn't result**
//** in unsustainable bet sizes.                                                            **
//** Long-term Focus: Ideal for managing risk and potential recovery over extended betting  **
//** sessions.                                                                               **    
//** This strategy is well-suited for scenarios where consistent, methodical bet management **
//** is required over many rounds, with controlled risk escalation and a focus on loss      **
//** recovery.                                                                              **
//********************************************************************************************

// Importing the crypto module for cryptographic operations
const crypto = require('crypto');

// Global boolean to control the use of random seeds
const useRandomSeed = true;
const debugMode = false;
const debugDelay = 10;
// If useRandomSeed is false, use predefined values, otherwise generate random seeds
const randomServerSeed = useRandomSeed ? generateRandomServerSeed(64) : 'd83729554eeed8965116385e0486dab8a1f6634ae1a9e8139e849ab75f17341d';
const randomClientSeed = useRandomSeed ? generateRandomClientSeed(10) : 'wcvqnIM521';
const startNonce = useRandomSeed ? Math.floor(Math.random() * 1000000) + 1 : 1;

// Setting initial parameters for the simulation
const startTime = Date.now();
let baseChance = 50,
    chance = baseChance,
    baseBet = 0.001,
    vault = 0,
    nextBet = baseBet,
    largestBetPlaced = baseBet,
    balance = 25040,
    vaultThreshold = 4,
    startBalance = balance,
    lowestBalance = balance,
    recoveryPotUsed = 0,
    totalBets = 7200000, //1 day = 240000, 1 week = 1680000, 1 Month = 7200000, 1 year = 86400000
    houseEdge = 1,
    wager = 0,
    payOut = ((100 - houseEdge) / (chance / 100) / 100),
    increaseOnLoss = 2.021,
    maxBet = 100000,
    betHigh = false,
    win = false,
    profit = 0,
    roundProfit = 0,
    winCount = 0,
    winRatio = 0,
    betCount = 0,
    roundProfitTarget = (startBalance + baseBet),
    lastBet = 0,
    MbaseBet = baseBet * 5,
    numberMartingales = 1000,
    nextM = 0;

    let progress = (betCount  / totalBets) * 100;  // update progress
    let mArray = new Array(numberMartingales).fill(MbaseBet); // Create an array to hold 50 m values, all initialized to MbaseBet
    let skip = false;


// Byte generator for cryptographic randomness
function* byteGenerator(serverSeed, clientSeed, nonce, cursor) {
    let currentRound = Math.floor(cursor / 32);
    let currentRoundCursor = cursor % 32;

function resetMArray() {
    mArray = new Array(numberMartingales).fill(MbaseBet);
    betCycleCount = 0; // Reset the bet cycle counter
    if(debugMode = true){
        console.log("mArray has been reset to MbaseBet, and betCycleCount has been reset to 0.");
    }
}
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
        wager += nextBet;
        profit -= nextBet;
        balance -= nextBet;
        nonce ++;
        betCount++ 
        skip = false;
        const roll = getDiceRoll(serverSeed, clientSeed, nonce, 0);
        
        if (betHigh) {
            win = roll >= (100 - chance);
        } else {
            win = roll <= chance;
        }

        progress = (betCount  / totalBets) * 100;  // update progress

        if (win) {
            payOut = ((100 - houseEdge) / (chance / 100) / 100);
            roundProfit = nextBet * payOut;
            balance += roundProfit;
            profit += roundProfit;
            winCount++;
            currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1;
        } else {
            roundProfit = (0 - nextBet);			
            payOut = 0;
            winStreak = 0;
            //profit += roundProfit; // Update profit
            currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1;
            if (currentStreak < maxStreak) {
                maxStreak = currentStreak;
                maxStreakNonce = nonce;
            }
            if (nextBet > largestBetPlaced) {
                largestBetPlaced = nextBet;
            }        
        }

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
                        'profit: ' + (profit + vault.toFixed(2)),
                        'Wins Count: ' + winCount,
                        'Win Ratio: ' + winRatio.toFixed(2),
                        'Total Wagered: ' + wager.toFixed(8),
                        'Worst Loss Streak: ' + maxStreak,
                        'Max Recovery Pot Used: ' + recoveryPotUsed,
                        'Vault Balance: ' + vault,
                        'Bets per Second: ' + betsPerSecond,
                    ].join(' | ')
                    );
            }
        }   else {
                 console.log (mArray);
                 console.log(
                    win ? '\x1b[32m%s\x1b[0m' : '\x1b[37m%s\x1b[0m',
                    [
                        //'Server Seed: ' + serverSeed,
                        //'Client Seed: ' + clientSeed,
                        //'Nonce: ' + nonce,
                        //'Progress %: ' + progress.toFixed(2),
                        //'Bet Count ' + betCount,
                        'Result: ' + roll,
                        'Bet: ' + nextM,
                        'Balance: ' + balance.toFixed(4),
                        'Bet High: ' + betHigh,
                        'Next Bet Amount: ' + nextBet.toFixed(4),
                        //'Chance: ' + chance,
                        'Wagered: ' + wager.toFixed(4),
                        //'Round Profit Target: ' + roundProfitTarget.toFixed(2),
                        'Round Profit: ' +roundProfit.toFixed(4),
                        'profit: ' + (profit.toFixed(4)),
                        //'Wins: ' + winCount.toFixed(2),
                        //'Balance: ' + balance.toFixed(2),
                        //'Win Ratio: ' + winRatio.toFixed(2),
                        'Current Streak: ' + currentStreak,
                        //'RP Used: ' + recoveryPotUsed,
                        'Vault Balance: ' + vault.toFixed(4),
                        'Skip:' + skip,
                        //'Worst Streak: ' + maxStreak,
                        
                    ].join(' | ')
                    );
                    await betDelay(debugDelay); // Wait for 100ms before the next iteration
            
            }

  
            if (win) {
                mArray[nextM] = MbaseBet; // Reset to base bet on win
            } else {
                //mArray[nextM] = (mArray[nextM] * increaseOnLoss);
                if (profit <= 0) {
                    mArray[nextM] = (mArray[nextM] * increaseOnLoss); // Double on loss
                } else {
                    mArray[nextM] = MbaseBet; // Reset if profit is positive
                }
            }
    
            // Ensure m value doesn't exceed maxBet
            if (mArray[nextM] >= maxBet) {
                mArray[nextM] = MbaseBet;
            }
    
            // Move to the next m (cycle back to m1 when reaching m50)
            nextM = (nextM + 1) % mArray.length; // This wraps the index back to 0 after 49 
            nextBet = mArray[nextM];           

        //if (balance >= (startBalance + vaultThreshold)){
        //    vault += (balance - startBalance);
        //    balance = startBalance;
        //} 

        if (nextBet > balance) {
            console.log (mArray);
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
                    'Bet: ' + nextBet.toFixed(8),
                    'Balance: ' + balance.toFixed(8),
                    'Profit: ' + profit + vault.toFixed(8),
                    'Total Wagered: ' + wager.toFixed(8),
                    'Current Streak: ' + currentStreak,
                    'Bet High: ' + betHigh,
                    'Vault Balance: ' + vault,
                    'Worst Streak: ' + maxStreak
                ].join(' | ')
                );
            process.exit();
        }

        winRatio = (winCount / betCount) * 100;

        //balance = (startBalance + profit); //update balance	

        //if (balance < lowestBalance){
        //    lowestBalance = balance;
        //}

        recoveryPotUsed = (startBalance - lowestBalance);
        
           
    }

    return {
        betCount: betCount,
        maxLossStreak: maxStreak,
        maxStreakNonce: maxStreakNonce,
        finalNonce: nonce, // Add nonce to return the final nonce value
        finalServerSeed: serverSeed,
        finalClientSeed: clientSeed,
        finalProfit: profit,
        finalBalance: balance,
        finalVault: vault,
        finalRecoveryPotUsed: recoveryPotUsed,
        finalLargestBetPlaced: largestBetPlaced,
        finalWager: wager
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
    console.log ('Run Time: ' + runTimeSeconds + ' Seconds.');
    console.log ('Bets Per Second: ' + betsPerSecond);

    const redText = '\x1b[31m'; // ANSI escape code for red text
    const greenText = '\x1b[32m'; // ANSI escape code for green text
    const resetText = '\x1b[0m'; // ANSI escape code to reset text color

    console.log(`${greenText}##########################################${resetText}`);
    console.log(`${greenText}# Bet Summary:${resetText}`);
    console.log(`${greenText}# Total Bets: ${result.betCount}${resetText}`);
    console.log(`${greenText}# Total Profits: ${(result.finalProfit + result.finalVault).toFixed(4)}${resetText}`);
    console.log(`${greenText}# Balance: ${(result.finalBalance).toFixed(4)}${resetText}`);
    console.log(`${greenText}# Vault Balance: ${(result.finalVault).toFixed(4)}${resetText}`);
    console.log(`${greenText}# Total Wager: ${result.finalWager.toFixed(4)}${resetText}`);
    console.log(`${redText}# Max Balance Draw Down: ${result.finalRecoveryPotUsed.toFixed(4)}${resetText}`);
    console.log(`${greenText}# Largest Bet placed: ${result.finalLargestBetPlaced.toFixed(4)}${resetText}`);
    console.log(`${greenText}# Highest Losing Streak: ${result.maxLossStreak}${resetText}`);
    console.log(`${greenText}# Closing Server Seed: ${result.finalServerSeed}${resetText}`);
    console.log(`${greenText}# Closing Client Seed: ${result.finalClientSeed}${resetText}`);
    console.log(`${greenText}# Closing Nonce: ${result.finalNonce}${resetText}`);
    console.log(`${greenText}##########################################${resetText}`);
});
