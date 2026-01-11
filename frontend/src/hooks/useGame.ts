import { useState, useEffect, useCallback, useRef } from 'react';
import { useLinera } from '../contexts/LineraContext';

export interface Bet {
  playerChainId: string;
  playerName: string;
  betType: string;
  numbers: number[];
  amount: number;
}

export interface SpinResult {
  number: number;
  color: string;
  timestamp: string;
  winners: Array<{
    playerChainId: string;
    playerName: string;
    betType: string;
    betAmount: number;
    payout: number;
  }>;
  totalBetAmount?: number;
}

export interface GameState {
  isSpinning: boolean;
  currentBets: Bet[];
  lastResult: SpinResult | null;
  history: number[];
  bettingEndTime?: number | null; // Timestamp (ms) when betting ends - for syncing timer
}

export interface Player {
  chainId: string;
  name: string;
  balance: number;
}

export interface PlayerStats {
  totalWins: number;
  totalLosses: number;
  totalWinAmount: number;
  totalLossAmount: number;
  totalRounds: number;
  totalWagered: number;
  bestWin: number;
}

export function useGame() {
  const { queryHost, mutate, subscribe, isConnected, chainId, playerId, gameMode, isHost, hostedChainId, joinedChainId } = useLinera();
  const [gameState, setGameState] = useState<GameState>({
    isSpinning: false,
    currentBets: [],
    lastResult: null,
    history: [],
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local spinning state - controls UI animation independent of backend state
  const [isWheelSpinning, setIsWheelSpinning] = useState(false);
  const [pendingResult, setPendingResult] = useState<SpinResult | null>(null);
  const [showResultPopup, setShowResultPopup] = useState(false);

  // Stats tracking (stored in localStorage for persistence)
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    totalWins: 0,
    totalLosses: 0,
    totalWinAmount: 0,
    totalLossAmount: 0,
    totalRounds: 0,
    totalWagered: 0,
    bestWin: 0,
  });

  // Track bets placed before spin to calculate loss
  const betsBeforeSpinRef = useRef<Bet[]>([]);
  // Store pending players update until wheel animation completes
  const pendingPlayersRef = useRef<Player[] | null>(null);
  // Store pending history update until wheel animation completes
  const pendingHistoryRef = useRef<number[] | null>(null);
  // Track if wheel is spinning (ref for use in subscription callback)
  const isSpinningRef = useRef(false);
  // Track last known result timestamp to detect new spins (for joined players)
  const lastResultTimestampRef = useRef<string | null>(null);

  // Round management for multiplayer sync
  const [roundPhase, setRoundPhase] = useState<'waiting' | 'betting' | 'spinning'>('waiting');
  const [bettingTimeLeft, setBettingTimeLeft] = useState(0);
  const [bettingEndTime, setBettingEndTime] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset game state when chain changes (host/join/leave)
  useEffect(() => {
    const activeChain = hostedChainId || joinedChainId;
    if (activeChain || gameMode === 'solo') {
      console.log('[useGame] Chain changed - resetting state. Mode:', gameMode, 'Chain:', activeChain?.slice(0, 16));
      setGameState({
        isSpinning: false,
        currentBets: [],
        lastResult: null,
        history: [],
      });
      setPlayers([]);
      setRoundPhase('waiting');
      setBettingTimeLeft(0);
      setBettingEndTime(null);
      setIsWheelSpinning(false);
      setPendingResult(null);
      setShowResultPopup(false);
      lastResultTimestampRef.current = null;
      betsBeforeSpinRef.current = [];
    }
  }, [hostedChainId, joinedChainId, gameMode]);

  // Fetch game state from GraphQL (queries HOST chain for game state)
  const fetchGameState = useCallback(async () => {
    if (!isConnected) return;

    try {
      // Query HOST chain for game state (game state lives on host)
      const data = await queryHost(`
        query {
          gameState {
            isSpinning
            currentBets {
              playerChainId
              playerName
              betType
              numbers
              amount
            }
            lastResult {
              number
              color
              timestamp
              winners {
                playerChainId
                playerName
                betType
                betAmount
                payout
              }
            }
            history
          }
          players {
            chainId
            name
            balance
          }
        }
      `);

      setGameState(data.gameState);
      setPlayers(data.players);
    } catch (err) {
      console.error('[GAME] Failed to fetch game state:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch game state');
    }
  }, [queryHost, isConnected]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe((event: any) => {
      console.log('[GAME] Event received:', event);
      // Skip fetching during spin to avoid duplicate updates
      if (isSpinningRef.current) {
        console.log('[GAME] Skipping fetch during spin');
        return;
      }
      // Refresh game state on any event
      fetchGameState();
    });

    // Initial fetch
    fetchGameState();

    return unsubscribe;
  }, [isConnected, subscribe, fetchGameState]);

  // Polling for ALL modes to keep game state fresh (bets, players, etc.)
  useEffect(() => {
    if (!isConnected) return;
    // Skip polling during spin animation to avoid state conflicts
    if (isSpinningRef.current) return;

    const pollInterval = setInterval(async () => {
      try {
        // Don't poll during spinning
        if (isSpinningRef.current) return;

        await fetchGameState();
      } catch (err) {
        console.error('[POLL] Error refreshing game state:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [isConnected, fetchGameState]);

  // Sync with host chain (for joined players only) - detect new results and betting
  useEffect(() => {
    // Must be connected, in join mode, AND have a playerId (for bet filtering)
    if (!isConnected || gameMode !== 'join' || !playerId) return;

    const pollInterval = setInterval(async () => {
      // Skip polling while wheel is spinning locally
      if (isSpinningRef.current) return;

      try {
        const data = await queryHost(`
          query {
            gameState {
              currentBets { playerChainId amount }
              bettingEndTime
              lastResult {
                number
                color
                timestamp
                winners {
                  playerChainId
                  playerName
                  betType
                  betAmount
                  payout
                }
              }
            }
            players {
              chainId
              name
              balance
            }
          }
        `);

        const currentTimestamp = data.gameState.lastResult?.timestamp || null;

        // Detect NEW result (timestamp changed) - this means host spun the wheel
        if (currentTimestamp && currentTimestamp !== lastResultTimestampRef.current && !isWheelSpinning) {
          console.log('[SYNC] New result detected! Timestamp:', currentTimestamp);
          console.log('[SYNC] Previous timestamp:', lastResultTimestampRef.current);

          // Trigger wheel animation (even for first result if we're in betting phase)
          // This handles: 1) subsequent spins, 2) first spin if joined player was waiting
          const shouldTriggerWheel = lastResultTimestampRef.current !== null || roundPhase === 'betting';

          if (shouldTriggerWheel) {
            console.log('[SYNC] Triggering wheel animation for joined player');

            // Clear any betting timer
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            setBettingTimeLeft(0);

            // Use bets saved during betting phase (betsBeforeSpinRef was updated during polling)
            const myBets = betsBeforeSpinRef.current.filter(b => b.playerChainId === playerId);
            const myTotalBet = myBets.reduce((sum, b) => sum + b.amount, 0);
            console.log('[SYNC] Joined player bets from saved ref:', myTotalBet);

            // Set result with totalBetAmount for stats calculation
            const resultWithBets = {
              ...data.gameState.lastResult,
              totalBetAmount: myTotalBet,
            };
            console.log('[SYNC] Setting pendingResult with number:', resultWithBets.number);
            setPendingResult(resultWithBets);
            pendingPlayersRef.current = data.players;

            // Start wheel animation
            setRoundPhase('spinning');
            setIsWheelSpinning(true);
            isSpinningRef.current = true;
          } else {
            console.log('[SYNC] Skipping wheel - first load, not in betting phase');
          }

          // Update the stored timestamp
          lastResultTimestampRef.current = currentTimestamp;
        }

        // Initialize timestamp if null and no result yet (fresh game)
        if (!currentTimestamp && lastResultTimestampRef.current === null) {
          // Mark as initialized with empty string so we detect first result
          lastResultTimestampRef.current = '';
          console.log('[SYNC] Fresh game - initialized timestamp ref as empty');
        }

        // Sync timer from host's bettingEndTime (for joined players)
        if (data.gameState.bettingEndTime) {
          const now = Date.now();
          const remaining = Math.max(0, Math.ceil((data.gameState.bettingEndTime - now) / 1000));

          if (remaining > 0) {
            // Betting is active - sync the timer
            if (roundPhase !== 'betting') {
              console.log('[SYNC] Betting phase started from host, remaining:', remaining);
              setRoundPhase('betting');
            }
            setBettingTimeLeft(remaining);
          } else {
            // Timer expired - will soon spin
            console.log('[SYNC] Betting timer expired');
          }
        } else if (data.gameState.currentBets.length > 0 && roundPhase === 'waiting') {
          // Fallback: Detect betting phase from bets if no bettingEndTime
          console.log('[SYNC] Detected bets - betting phase active (no timer)');
          setRoundPhase('betting');
        }

        // During betting phase, continuously save bets so we have them when spin happens
        if (data.gameState.currentBets.length > 0) {
          betsBeforeSpinRef.current = [...data.gameState.currentBets];
        }

        // Note: Don't reset to waiting here - wheel animation will reset it when complete
      } catch (err) {
        console.error('[SYNC] Polling error:', err);
      }
    }, 1000); // Poll every 1 second for faster sync

    return () => clearInterval(pollInterval);
  }, [isConnected, gameMode, isWheelSpinning, roundPhase, queryHost, playerId]);

  // Load stats when playerId changes
  useEffect(() => {
    if (playerId) {
      const saved = localStorage.getItem(`roulette_stats_${playerId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure all fields exist (for backwards compatibility)
        setPlayerStats({
          totalWins: parsed.totalWins || 0,
          totalLosses: parsed.totalLosses || 0,
          totalWinAmount: parsed.totalWinAmount || 0,
          totalLossAmount: parsed.totalLossAmount || 0,
          totalRounds: parsed.totalRounds || 0,
          totalWagered: parsed.totalWagered || 0,
          bestWin: parsed.bestWin || 0,
        });
      } else {
        setPlayerStats({ totalWins: 0, totalLosses: 0, totalWinAmount: 0, totalLossAmount: 0, totalRounds: 0, totalWagered: 0, bestWin: 0 });
      }
    }
  }, [playerId]);

  // Save stats whenever they change
  useEffect(() => {
    if (playerId) {
      localStorage.setItem(`roulette_stats_${playerId}`, JSON.stringify(playerStats));
    }
  }, [playerStats, playerId]);

  // Debug: Log when showResultPopup changes
  useEffect(() => {
    console.log('[useGame] showResultPopup changed to:', showResultPopup, 'pendingResult:', !!pendingResult);
  }, [showResultPopup, pendingResult]);

  // Register player
  const registerPlayer = useCallback(
    async (name: string, initialBalance: number) => {
      setIsLoading(true);
      setError(null);

      try {
        // Pass playerId to uniquely identify this player (allows multiple players on same chain)
        await mutate(`
          mutation RegisterPlayer($playerId: String!, $name: String!, $initialBalance: Int!) {
            registerPlayer(playerId: $playerId, name: $name, initialBalance: $initialBalance)
          }
        `, { playerId, name, initialBalance });

        // Refresh state
        await fetchGameState();
      } catch (err) {
        console.error('[GAME] Failed to register player:', err);
        setError(err instanceof Error ? err.message : 'Failed to register');
      } finally {
        setIsLoading(false);
      }
    },
    [mutate, fetchGameState, playerId]
  );

  // Place bet
  const placeBet = useCallback(
    async (betType: string, numbers: number[], amount: number) => {
      setIsLoading(true);
      setError(null);

      try {
        // Pass playerId to identify which player is placing the bet
        await mutate(`
          mutation PlaceBet($playerId: String!, $betType: BetType!, $numbers: [Int!]!, $amount: Int!) {
            placeBet(playerId: $playerId, betType: $betType, numbers: $numbers, amount: $amount)
          }
        `, { playerId, betType, numbers, amount });

        // Refresh state
        await fetchGameState();
      } catch (err) {
        console.error('[GAME] Failed to place bet:', err);
        setError(err instanceof Error ? err.message : 'Failed to place bet');
      } finally {
        setIsLoading(false);
      }
    },
    [mutate, fetchGameState, playerId]
  );

  // Spin wheel - properly manages animation timing
  const spinWheel = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setShowResultPopup(false);

    // Store current bets before spinning to calculate total bet amount
    betsBeforeSpinRef.current = [...gameState.currentBets];
    const totalBetAmount = gameState.currentBets
      .filter(bet => bet.playerChainId === playerId)
      .reduce((sum, bet) => sum + bet.amount, 0);

    try {
      // Start the wheel animation BEFORE the mutation
      setIsWheelSpinning(true);
      isSpinningRef.current = true;

      // Execute the spin mutation (goes to player chain, forwarded to host)
      await mutate(`
        mutation {
          spinWheel
        }
      `);

      // Fetch the result from HOST chain but DON'T show it yet
      const data = await queryHost(`
        query {
          gameState {
            isSpinning
            currentBets {
              playerChainId
              playerName
              betType
              numbers
              amount
            }
            lastResult {
              number
              color
              timestamp
              winners {
                playerChainId
                playerName
                betType
                betAmount
                payout
              }
            }
            history
          }
          players {
            chainId
            name
            balance
          }
        }
      `);

      // Store the result with total bet amount for later display
      const result = data.gameState.lastResult;
      console.log('[HOST] spinWheel - Got result number:', result?.number);
      if (result) {
        result.totalBetAmount = totalBetAmount;
      }
      console.log('[HOST] Setting pendingResult with number:', result?.number);
      setPendingResult(result);

      // Store players update for AFTER wheel animation completes (don't update balance yet)
      pendingPlayersRef.current = data.players;

      // Store history update for AFTER wheel animation completes
      pendingHistoryRef.current = data.gameState.history;

      // Clear bets after spin (but don't update history yet)
      setGameState(prev => ({
        ...prev,
        currentBets: [], // Clear bets after spin
      }));

    } catch (err) {
      console.error('[GAME] Failed to spin wheel:', err);
      setError(err instanceof Error ? err.message : 'Failed to spin wheel');
      setIsWheelSpinning(false);
      isSpinningRef.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [mutate, queryHost, gameState.currentBets, playerId]);

  // Start a new betting round (HOST ONLY) - starts 30 sec timer then auto-spins
  const startRound = useCallback(async () => {
    if (roundPhase !== 'waiting') return;
    if (!isHost) return; // Safety check

    // Call contract mutation to set betting_end_time on-chain (for joined players to sync)
    try {
      await mutate(`mutation { startRound }`);
    } catch (err) {
      console.error('[startRound] Failed to call startRound mutation:', err);
    }

    const endTime = Date.now() + 30000; // 30 seconds from now
    setBettingEndTime(endTime);
    setRoundPhase('betting');
    setBettingTimeLeft(30);

    // Clear any existing timer
    if (timerRef.current) clearInterval(timerRef.current);

    // Start countdown using timestamp (immune to background tab throttling)
    timerRef.current = setInterval(() => {
      const remaining = Math.ceil((endTime - Date.now()) / 1000);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setBettingEndTime(null);
        setBettingTimeLeft(0);
        setRoundPhase('spinning');
        spinWheel();
      } else {
        setBettingTimeLeft(remaining);
      }
    }, 1000);
  }, [roundPhase, isHost, spinWheel, mutate]);

  // Recalculate timer when tab becomes visible (fixes background tab throttling)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && bettingEndTime) {
        const remaining = Math.ceil((bettingEndTime - Date.now()) / 1000);
        if (remaining > 0) {
          setBettingTimeLeft(remaining);
        } else if (roundPhase === 'betting') {
          // Timer expired while tab was hidden
          setBettingTimeLeft(0);
          setBettingEndTime(null);
          if (isHost) {
            setRoundPhase('spinning');
            spinWheel();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [bettingEndTime, roundPhase, isHost, spinWheel]);

  // Called when wheel animation completes
  const onWheelAnimationComplete = useCallback(() => {
    console.log('[useGame] onWheelAnimationComplete called');
    console.log('[useGame] pendingResult:', pendingResult);
    console.log('[useGame] chainId:', chainId);

    setIsWheelSpinning(false);

    // NOW update the players (balance) - only after wheel stops
    if (pendingPlayersRef.current) {
      setPlayers(pendingPlayersRef.current);
      pendingPlayersRef.current = null;
    }

    // NOW update the history - only after wheel stops
    if (pendingHistoryRef.current) {
      setGameState(prev => ({
        ...prev,
        history: pendingHistoryRef.current!,
      }));
      pendingHistoryRef.current = null;
    }

    if (pendingResult) {
      console.log('[useGame] pendingResult exists, updating state and showing popup');

      // Update game state with the result
      setGameState(prev => ({
        ...prev,
        lastResult: pendingResult,
        isSpinning: false,
      }));

      // Calculate if current player won or lost
      const myWin = pendingResult.winners.find(w => w.playerChainId === playerId);
      const totalBetAmount = pendingResult.totalBetAmount || 0;

      // Always increment rounds and wagered if player had bets
      if (totalBetAmount > 0) {
        if (myWin) {
          // Player won
          console.log('[useGame] Player WON! Payout:', myWin.payout);
          const netProfit = myWin.payout; // payout is the net profit (winnings)
          setPlayerStats(prev => ({
            ...prev,
            totalWins: prev.totalWins + 1,
            totalWinAmount: prev.totalWinAmount + netProfit,
            totalRounds: prev.totalRounds + 1,
            totalWagered: prev.totalWagered + totalBetAmount,
            bestWin: Math.max(prev.bestWin, netProfit),
          }));
        } else {
          // Player lost (had bets but no win)
          console.log('[useGame] Player LOST! Lost amount:', totalBetAmount);
          setPlayerStats(prev => ({
            ...prev,
            totalLosses: prev.totalLosses + 1,
            totalLossAmount: prev.totalLossAmount + totalBetAmount,
            totalRounds: prev.totalRounds + 1,
            totalWagered: prev.totalWagered + totalBetAmount,
          }));
        }
      }

      // Show the result popup
      console.log('[useGame] Setting showResultPopup to true');
      setShowResultPopup(true);
    } else {
      console.log('[useGame] WARNING: pendingResult is null/undefined!');
    }

    // Only now allow subscription to fetch again (after all updates done)
    isSpinningRef.current = false;

    // Reset round phase to waiting for next round
    setRoundPhase('waiting');
  }, [pendingResult, playerId]);

  // Dismiss the result popup
  const dismissResultPopup = useCallback(() => {
    setShowResultPopup(false);
    setPendingResult(null);
    // Refresh game state to ensure everything is in sync
    fetchGameState();
  }, [fetchGameState]);

  // Get current player (match by playerId since contract stores player_id in chain_id field)
  const currentPlayer = players.find((p) => p.chainId === playerId) || null;

  return {
    gameState,
    players,
    currentPlayer,
    isLoading,
    error,
    registerPlayer,
    placeBet,
    spinWheel,
    fetchGameState,
    // New exports for proper animation timing
    isWheelSpinning,
    pendingResult,
    showResultPopup,
    onWheelAnimationComplete,
    dismissResultPopup,
    playerStats,
    // Multiplayer sync exports
    roundPhase,
    bettingTimeLeft,
    startRound,
  };
}
