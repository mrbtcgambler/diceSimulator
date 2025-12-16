import { unlink, access, constants } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import StakeApi from './StakeApi.mjs';

/**
 * =================================================================================
 * CONFIGURATION & INITIALIZATION
 * =================================================================================
 */
const clientConfig = JSON.parse(
  await readFile(new URL('../client_config.json', import.meta.url))
);
const serverConfig = JSON.parse(
  await readFile(new URL('../server_config.json', import.meta.url))
);
const config = {
  apiKey: process.env.CLIENT_API_KEY || clientConfig.apiKey,
  password: process.env.CLIENT_PASSWORD || clientConfig.password,
  currency: process.env.CLIENT_CURRENCY || clientConfig.currency,
  recoverThreshold: process.env.CLIENT_RECOVER_THRESHOLD || clientConfig.recoverThreshold,
};
const apiClient = new StakeApi(config.apiKey);

// Continuous retry mechanism for funds check
let fundsCheckAttempt = 0;
let fundsFetched = false;

while (!fundsFetched) {
    try {
        config.funds = await apiClient.getFunds(config.currency);
        
        if (config.funds) {
            console.log(`Funds: ${config.funds.available} ${config.currency}`);
            fundsFetched = true;
            break;
        } else {
            throw new Error('Funds check returned null');
        }
    } catch (error) {
        fundsCheckAttempt++;
        console.warn(`Funds check attempt #${fundsCheckAttempt}: ${error.message}`);
        console.log('External issue detected (VPN/session). Retrying in 3 seconds...');
        
        // Continuous retry - no maximum attempts
        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds before retry
    }
}

/**
 * =================================================================================
 * STATE MANAGEMENT
 * =================================================================================
 */
const state = {
  baseBet: 0.002,
  currentBet: 0.002,
  profit: 0,
  bets: 0,
  wager: 0,
  winCount: 0,
  currentLosingStreak: 0,
  highestLosingStreak: 0,
  paused: false,
  pauseLogged: false,
  lastHourBets: [],
  version: 42.8,
  stage: 1, 
  vaulted: config.funds.vault || 0,
};

/**
 * =================================================================================
 * BLACKJACK "PERFECT STRATEGY" TABLES
 * =================================================================================
 */
const pairsTable = [
    // Dealer:     2, 3, 4, 5, 6, 7, 8, 9, 10, A
    /* 2-2 */   ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
    /* 3-3 */   ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
    /* 4-4 */   ['H', 'H', 'H', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
    /* 5-5 */   ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
    /* 6-6 */   ['P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H', 'H'],
    /* 7-7 */   ['P', 'P', 'P', 'P', 'P', 'P', 'H', 'H', 'H', 'H'],
    /* 8-8 */   ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    /* 9-9 */   ['P', 'P', 'P', 'P', 'P', 'S', 'P', 'P', 'S', 'S'],
    /* 10-10 */ ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
    /* A-A */   ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P']
];
const softTable = [
    // Dealer:            2,    3,    4,    5,    6,    7,    8,    9,   10,    A
    /* A,2 (Soft 13) */ ['H',  'H',  'D',  'D',  'D',  'H',  'H',  'H',  'H',  'H'],
    /* A,3 (Soft 14) */ ['H',  'H',  'D',  'D',  'D',  'H',  'H',  'H',  'H',  'H'],
    /* A,4 (Soft 15) */ ['H',  'D',  'D',  'D',  'D',  'H',  'H',  'H',  'H',  'H'],
    /* A,5 (Soft 16) */ ['H',  'D',  'D',  'D',  'D',  'H',  'H',  'H',  'H',  'H'],
    /* A,6 (Soft 17) */ ['D', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    /* A,7 (Soft 18) */ ['S', 'Ds', 'Ds', 'Ds', 'Ds',  'S',  'S',  'H',  'H',  'H'],
    /* A,8 (Soft 19) */ ['S',  'S',  'S',  'S',  'S',  'S',  'S',  'S',  'S',  'S'],
    /* A,9 (Soft 20) */ ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S']
];
const hardTable = [
    // Dealer:        2,   3,   4,   5,   6,   7,   8,   9,  10,   A
    /* 8 or less */['H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H', 'H'],
    /* 9 */        ['H', 'D', 'D', 'D', 'D', 'H', 'H', 'H', 'H', 'H'],
    /* 10 */       ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H', 'H'],
    /* 11 */       ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'H'],
    /* 12 */       ['H', 'H', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
    /* 13 */       ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
    /* 14 */       ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
    /* 15 */       ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
    /* 16 */       ['S', 'S', 'S', 'S', 'S', 'H', 'H', 'H', 'H', 'H'],
    /* 17+ */      ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S']
];
const actionMapping = { H:'hit', S:'stand', D:'double', P:'split', Ds:'double' };

/**
 * =================================================================================
 * HELPER FUNCTIONS
 * =================================================================================
 */
async function writeStatsFile() {
  const stats = {
    bets: state.bets,
    stage: state.stage,
    wager: state.wager,
    vaulted: state.vaulted,
    profit: state.profit,
    betSize: state.currentBet,
    currentStreak: state.currentLosingStreak,
    highestLosingStreak: state.highestLosingStreak,
    betsPerHour: getBetsPerHour(),
    lastBet: new Date().toISOString(),
    wins: state.winCount,
    losses: (state.bets - state.winCount),
    version: state.version,
    paused: state.paused,
  };
  try {
    await writeFile(new URL('/mnt/ramdrive/dicebot_state.json', import.meta.url), JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to write stats:', e);
  }
}

function getCardValue(rank) {
  if (rank === 'A') return 1;
  if (['K','Q','J'].includes(rank)) return 10;
  return +rank;
}

function getTotal(cards) {
  let total = 0, aces = 0;
  for (const c of cards) {
    total += getCardValue(c.rank);
    if (c.rank === 'A') aces++;
  }
  while (aces > 0 && total + 10 <= 21) { total += 10; aces--; }
  return total;
}

function formatCards(cards) {
    return cards.map(c => c.rank).join(', ');
}

function getBetsPerHour() {
    const now = +new Date();
    const oneHourAgo = now - 3600000; // 1 hour in milliseconds
    
    // Create a filtered copy instead of modifying the original array
    const recentBets = state.lastHourBets.filter((timestamp) => timestamp >= oneHourAgo);
    
    // Periodic cleanup: remove timestamps older than 2 hours to prevent memory growth
    const twoHoursAgo = now - (2 * 3600000);
    state.lastHourBets = state.lastHourBets.filter((timestamp) => timestamp >= twoHoursAgo);
    
    return recentBets.length;
}

function determineBestAction(player, dealerUp, hasSplit = false) {
  const pv = getTotal(player);
  const dvRaw = getCardValue(dealerUp.rank);
  const dv = dvRaw === 1 ? 11 : dvRaw;
  const di = Math.max(0, Math.min(dv === 11 ? 9 : dv - 2, 9));

  const canDouble = player.length === 2;
  
  let strategicActionCode = 'S'; // Default to Stand

  if (player.length === 2 && player[0].rank === player[1].rank && !hasSplit) {
    const pi = Math.max(0, Math.min(getCardValue(player[0].rank) - 2, 9));
    strategicActionCode = pairsTable[pi][di];
  } else if (player.some(c => c.rank === 'A') && pv <= 21) {
    const si = Math.max(0, Math.min(pv - 13, softTable.length - 1));
    strategicActionCode = softTable[si][di];
  } else { // Hard hand
    const hi = pv <= 8 ? 0 : Math.max(0, Math.min(pv - 8, hardTable.length - 1));
    strategicActionCode = hardTable[hi][di];
  }
  
  let preferredApiAction = actionMapping[strategicActionCode];
  
  // FIX: This is the key change. If the strategy says to double but the rules don't allow it, fall back to the correct action.
  if ((preferredApiAction === 'double' || strategicActionCode === 'Ds') && !canDouble) {
      console.log(`Strategy suggests double, but not allowed with ${player.length} cards. Re-evaluating...`);
      if (strategicActionCode === 'Ds') {
          preferredApiAction = 'stand';
      } else {
          preferredApiAction = 'hit';
      }
  }

  return preferredApiAction;
}

/**
 * =================================================================================
 * GAME FLOW
 * =================================================================================
 */
async function playHand(betData) {
    let gameState = betData.state;
    const gameId = betData.id;
    let hasSplit = false; 

    console.log(`--- Playing Hand ID: ${gameId} ---`);
    console.log(`Initial Hand: Player has ${formatCards(gameState.player[0].cards)} vs Dealer's ${formatCards([gameState.dealer[0].cards[0]])}`);
    
    // Track insurance state for debugging
    const dealerCard = gameState.dealer[0].cards[0];
    const dealerHasAce = String(dealerCard.rank).toUpperCase() === 'A';
    const playerHasTwoCards = gameState.player[0].cards.length === 2;
    
    if (dealerHasAce && playerHasTwoCards) {
        console.log(`🎯 INSURANCE TRIGGER: Dealer Ace + Player has ${playerHasTwoCards ? 2 : gameState.player[0].cards.length} cards`);
    }

    // Handle insurance decision when dealer shows Ace
    const dealerShowsAce = String(gameState.dealer[0].cards[0].rank).toUpperCase() === 'A';
    
    if (dealerShowsAce && gameState.player[0].cards.length === 2) {
        console.log('🂡 Dealer shows Ace - declining insurance...');
        
        try {
            // Simply decline insurance and continue with normal play
            const insuranceResponse = await apiClient.BlackjackNextBet("noInsurance", gameId);
            const insuranceData = JSON.parse(insuranceResponse);
            
            if (insuranceData?.data?.blackjackNext?.state) {
                gameState = insuranceData.data.blackjackNext.state;
                console.log('✅ Insurance declined, continuing with hand...');
            } else {
                console.log('⚠️ Insurance response received, continuing...');
            }
        } catch (error) {
            console.log('Insurance handling complete, continuing with game...');
        }
    }

    let handIndex = 0;
    while(handIndex < gameState.player.length) {
        let currentHand = gameState.player[handIndex];
        console.log(`\nPlaying hand #${handIndex + 1}: ${formatCards(currentHand.cards)} (Value: ${getTotal(currentHand.cards)})`);

        while (true) {
            const playerValue = getTotal(currentHand.cards);
            if (playerValue >= 21) {
                console.log(`Hand #${handIndex + 1} has ${playerValue}. Turn for this hand is over.`);
                break;
            }

            let apiAction = determineBestAction(currentHand.cards, gameState.dealer[0].cards[0], hasSplit);
            
            try {
                console.log(`Player has ${playerValue}, attempting action: ${apiAction.toUpperCase()}`);
                const nextResponse = await apiClient.BlackjackNextBet(apiAction, gameId);
                const nextData = JSON.parse(nextResponse);

                if (!nextData?.data?.blackjackNext) {
                    console.log("No further game state returned. Assuming hand is complete.");
                    break;
                }
                
                gameState = nextData.data.blackjackNext.state;
                currentHand = gameState.player[handIndex]; 

                if (apiAction === 'split') {
                    hasSplit = true;
                    console.log("Split successful. Re-evaluating hands from the start.");
                    handIndex = -1; 
                    break;
                }

                if (apiAction === 'stand' || apiAction === 'double') {
                    console.log(`Player stands or doubles on hand #${handIndex + 1}. Turn for this hand is over.`);
                    break;
                }

            } catch (e) {
                console.log(`Action '${apiAction}' failed, likely because it's not allowed or hand is over. Ending turn.`);
                break; 
            }
        }
        handIndex++;
    }
    
    console.log("All hands played.");
    return gameState;
}


(async () => {
  console.log(`Blackjack Bot V${state.version} Initialized.`);
  console.log('====================================================');
  
  let lastGameId = null;
  let staleGameCounter = 0; 

  while (true) {
    try {
        access(new URL('pause', import.meta.url), constants.F_OK, (error) => { state.paused = !error; });
        if (state.paused) {
            if (!state.pauseLogged) { console.log('[INFO] Paused...'); state.pauseLogged = true; }
            await writeStatsFile();
            await new Promise(r => setTimeout(r, 1000));
            continue;
        }
        state.pauseLogged = false;

        // CRITICAL FIX: Enhanced synchronization to prevent race conditions
        let activeGame = (await apiClient.BlackjackActiveBet().then(res => JSON.parse(res)))?.data?.user?.activeCasinoBet;
        
        // Let normal game flow handle insurance decisions
        // Insurance responses are handled within the playHand function
        
        if (activeGame && activeGame.id === lastGameId) {
            staleGameCounter++;
            console.log(`Waiting for server to clear stale game (${lastGameId})... (${staleGameCounter})`);
            
            if (staleGameCounter > 5) {
                console.log("Stale game detected for too long. Forcing a logic restart.");
                lastGameId = null;
                staleGameCounter = 0;
            }
            
            await new Promise(r => setTimeout(r, 2000)); 
            continue;
        }
        
        staleGameCounter = 0; 
        
        let betAmount = state.currentBet;
        
        if (!activeGame) {
            console.log(`No active game. Placing new bet: ${state.currentBet}`);
            
            // Double-check no active game before placing bet
            const finalCheck = await apiClient.BlackjackActiveBet();
            const finalData = JSON.parse(finalCheck);
            
            if (finalData?.data?.user?.activeCasinoBet) {
                console.log('⚠️ Active game detected during bet placement - skipping');
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }
            
            const betResponse = await apiClient.BlackjackBet(state.currentBet, config.currency);
            const parsedBet = JSON.parse(betResponse);
            if (!parsedBet?.data?.blackjackBet) {
                console.error("Failed to place new bet:", parsedBet);
                await new Promise(r => setTimeout(r, 1500));
                continue;
            }
            activeGame = parsedBet.data.blackjackBet;
        } else {
            console.log("Found a new, active game. Resolving it...");
            betAmount = activeGame.amount; 
        }
        
        lastGameId = activeGame.id; 
        const finalState = await playHand(activeGame);

        if (!finalState) {
            console.log('Could not resolve game state. Skipping result processing.');
            await new Promise(r => setTimeout(r, 1500));
            continue;
        }

        // FIX: Replaced API profit with manual calculation
        const finalProfit = finalState.player.reduce((total, hand) => {
            const playerValue = getTotal(hand.cards);
            const dealerValue = getTotal(finalState.dealer[0].cards);
            const playerHasBlackjack = playerValue === 21 && hand.cards.length === 2;

            if (playerValue > 21) return total - betAmount; // Player busts
            if (dealerValue > 21) return total + (playerHasBlackjack ? betAmount * 1.5 : betAmount); // Dealer busts
            if (playerValue > dealerValue) return total + (playerHasBlackjack ? betAmount * 1.5 : betAmount); // Player wins
            if (playerValue < dealerValue) return total - betAmount; // Dealer wins
            return total; // Push
        }, 0);

        const win = finalProfit > 0;
        const push = finalProfit === 0;

        state.profit += finalProfit;
        state.bets++;
        state.lastHourBets.push(Date.now()); // Track bet timestamp for bets per hour calculation
        state.wager += betAmount;
        state.winCount += win ? 1 : 0;
        state.currentBet = state.baseBet;
        
        if (win) {
            state.currentLosingStreak = 0;
        } else if (!push) {
            state.currentLosingStreak++;
            if (state.currentLosingStreak > state.highestLosingStreak) {
                state.highestLosingStreak = state.currentLosingStreak;
            }
        }

        console.log(`Game Over. Dealer: ${formatCards(finalState.dealer[0].cards)} (Value: ${getTotal(finalState.dealer[0].cards)})`);
        console.log(`Round Result: ${push ? 'PUSH' : (win ? 'WIN' : 'LOSS')}. Profit: ${finalProfit.toFixed(8)}`);
        console.log(`Total Profit: ${state.profit.toFixed(8)}`);
        console.log('----------------------------------------------------');

    } catch (e) {
        console.error("An error occurred in the main loop:", e);
    }

    await writeStatsFile();
    await new Promise(r => setTimeout(r, 1));
  }
})();
