import { useState, useEffect } from 'react';
import { useLinera } from './hooks/useLinera';
import { useGame } from './hooks/useGame';
import { useSounds } from './hooks/useSounds';
import { WalletConnect } from './components/WalletConnect';
import { PlayerInfo } from './components/PlayerInfo';
import { RealisticWheel } from './components/RealisticWheel';
import { BettingTable } from './components/BettingTable';
import { GameHistory } from './components/GameHistory';
import { ResultPopup } from './components/ResultPopup';
import { PokerChip } from './components/PokerChip';
import ModeSelection from './components/ModeSelection';

function App() {
  const {
    isConnected,
    playerId,
    gameMode,
    setGameMode,
    chainPool,
    poolLoading,
    hostedChainId,
    joinedChainId,
    hostGame,
    joinGame,
    leaveGame,
  } = useLinera();
  const {
    gameState,
    currentPlayer,
    isLoading,
    error,
    registerPlayer,
    placeBet,
    spinWheel,
    isWheelSpinning,
    pendingResult,
    showResultPopup,
    onWheelAnimationComplete,
    dismissResultPopup,
    playerStats,
    roundPhase,
    bettingTimeLeft,
    startRound,
  } = useGame();
  const { startSpinSound, stopSpinSound, playBallLand, playWin, playLose } = useSounds();

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [initialBalance, setInitialBalance] = useState(1000);
  const [selectedChip, setSelectedChip] = useState(10);
  const { playChipSelect } = useSounds();

  const chipValues = [1, 5, 10, 25, 50, 100];

  const handleChipSelect = (value: number) => {
    setSelectedChip(value);
    playChipSelect();
  };

  const handleRegister = async () => {
    if (!playerName.trim()) {
      alert('Please enter a player name');
      return;
    }

    await registerPlayer(playerName, initialBalance);
    setShowRegisterModal(false);
    setPlayerName('');
  };

  const handlePlaceBet = async (betType: string, numbers: number[], amount: number) => {
    await placeBet(betType, numbers, amount);
  };

  // Start spin sound when wheel begins spinning
  useEffect(() => {
    if (isWheelSpinning) {
      startSpinSound();
    }
  }, [isWheelSpinning, startSpinSound]);

  const handleWheelAnimationComplete = () => {
    stopSpinSound();
    playBallLand();
    onWheelAnimationComplete();
  };

  const handleResultPopupShown = (isWin: boolean) => {
    if (isWin) {
      playWin();
    } else {
      playLose();
    }
  };

  // Handle mode selection
  const handleSelectSolo = () => {
    setGameMode('solo');
  };

  const handleSelectHost = async () => {
    const chainId = await hostGame();
    if (!chainId) {
      alert('No rooms available! Try again later.');
    }
  };

  const handleSelectJoin = (chainId: string) => {
    if (!joinGame(chainId)) {
      alert('Invalid room code!');
    }
  };

  // Copy chain ID to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Room code copied to clipboard!');
  };

  return (
    <div className="min-h-screen py-4 px-2">
      <div className="max-w-[2000px] mx-auto" style={{ transform: 'scale(1.3)', transformOrigin: 'top center' }}>
        {/* Header Row - Title + Wallet inline */}
        <div className="flex items-center justify-between mb-3 bg-black/30 backdrop-blur-sm px-5 py-3 rounded-lg">
          <h1
            className="text-3xl font-black"
            style={{
              fontFamily: "'Cinzel', 'Times New Roman', serif",
              color: '#d4af37',
              textShadow: '0 0 30px rgba(212, 175, 55, 0.5)',
              letterSpacing: '2px'
            }}
          >
            LINERA ROULETTE
          </h1>
          <WalletConnect />
        </div>

        {!isConnected ? (
          <div className="text-center text-white/80 py-20 bg-black/30 backdrop-blur-sm rounded-lg">
            Connect to the local Linera network to start playing
          </div>
        ) : gameMode === 'selecting' ? (
          /* Mode Selection Screen - shown after connect, before game */
          <ModeSelection
            poolLoading={poolLoading}
            availableChains={chainPool.filter(c => !c.inUse).length}
            onSelectSolo={handleSelectSolo}
            onSelectHost={handleSelectHost}
            onSelectJoin={handleSelectJoin}
          />
        ) : (
          <>
            {/* HOST MODE - Show chain ID to share */}
            {gameMode === 'host' && hostedChainId && (
              <div className="mb-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👑</span>
                    <span className="text-amber-400 font-medium">You're Hosting!</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(hostedChainId)}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded transition-colors"
                    >
                      📋 Copy Code
                    </button>
                    <button
                      onClick={leaveGame}
                      className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs font-semibold rounded transition-colors"
                    >
                      Leave
                    </button>
                  </div>
                </div>
                <div className="mt-2 font-mono text-xs text-amber-300/70 truncate">
                  {hostedChainId}
                </div>
              </div>
            )}

            {/* JOIN MODE - Show connected status */}
            {gameMode === 'join' && joinedChainId && (
              <div className="mb-3 bg-purple-500/10 border border-purple-500/30 rounded-lg px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎮</span>
                    <span className="text-purple-400 font-medium">Joined Game</span>
                  </div>
                  <button
                    onClick={leaveGame}
                    className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs font-semibold rounded transition-colors"
                  >
                    Leave
                  </button>
                </div>
                <div className="mt-1 font-mono text-xs text-purple-300/70 truncate">
                  {joinedChainId.slice(0, 20)}...
                </div>
              </div>
            )}

            {/* SOLO MODE - Compact indicator */}
            {gameMode === 'solo' && (
              <div
                className="mb-3 rounded-lg px-4 py-2 flex items-center justify-between"
                style={{
                  background: 'rgba(212, 175, 55, 0.1)',
                  border: '1px solid rgba(212, 175, 55, 0.3)'
                }}
              >
                <span
                  className="text-sm font-medium"
                  style={{
                    fontFamily: "'Cinzel', 'Times New Roman', serif",
                    color: '#d4af37',
                    letterSpacing: '1px'
                  }}
                >
                  🎯 Solo Mode
                </span>
                <button
                  onClick={leaveGame}
                  className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs font-semibold rounded transition-colors"
                  style={{ fontFamily: "'Cinzel', 'Times New Roman', serif", letterSpacing: '1px' }}
                >
                  Leave
                </button>
              </div>
            )}

            {/* Player Info */}
            <div className="mb-3">
              <PlayerInfo
                player={currentPlayer}
                onRegister={() => setShowRegisterModal(true)}
                stats={playerStats}
              />
            </div>

            {currentPlayer && (
              <div className="space-y-3">
                {/* Betting Timer - shown during betting phase (NOT for solo mode) */}
                {roundPhase === 'betting' && gameMode !== 'solo' && (
                  <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-yellow-500/40 rounded-xl p-4 text-center">
                    {gameMode === 'host' ? (
                      <>
                        <div className="text-5xl font-black text-yellow-400 tabular-nums">
                          {bettingTimeLeft}
                        </div>
                        <div className="text-white/80 text-sm uppercase tracking-wider mt-1 font-semibold">
                          Place your bets!
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-5xl font-black text-yellow-400 tabular-nums">
                          {bettingTimeLeft}
                        </div>
                        <div className="text-white/80 text-sm uppercase tracking-wider mt-1 font-semibold">
                          🎲 Place your bets!
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* History Bar */}
                <GameHistory history={gameState.history} />

                {/* Main Content with Chips on Left */}
                <div className="flex gap-4">
                  {/* Vertical Chip Stack - Left Side */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className="flex flex-col gap-2">
                      {chipValues.map((value) => (
                        <PokerChip
                          key={value}
                          value={value}
                          isSelected={selectedChip === value}
                          disabled={value > currentPlayer.balance}
                          onClick={() => handleChipSelect(value)}
                        />
                      ))}
                    </div>
                    {/* Selected chip display */}
                    <div className="mt-3 text-center">
                      <div
                        className="font-bold text-xl"
                        style={{ fontFamily: "'JetBrains Mono', monospace", color: '#d4af37' }}
                      >
                        ${selectedChip}
                      </div>
                      <div
                        className="text-xs uppercase"
                        style={{ fontFamily: "'Cinzel', 'Times New Roman', serif", color: '#d4af37', opacity: 0.7 }}
                      >
                        SELECTED
                      </div>
                    </div>
                  </div>

                  {/* Main Grid - Betting Table + Wheel */}
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Betting Table */}
                    <div className="lg:col-span-8">
                      <BettingTable
                        onPlaceBet={handlePlaceBet}
                        isSpinning={isWheelSpinning}
                        playerBalance={currentPlayer.balance}
                        selectedChip={selectedChip}
                      />
                    </div>

                  {/* Right Column - Wheel, Last Result, Current Bets & SPIN */}
                  <div className="lg:col-span-4 space-y-3">
                    {/* Realistic Roulette Wheel - Always Visible */}
                    <div
                      className="bg-black/40 backdrop-blur-sm p-3 rounded-lg shadow-lg"
                      style={{ border: '1px solid rgba(212, 175, 55, 0.2)' }}
                    >
                      <RealisticWheel
                        isSpinning={isWheelSpinning}
                        targetNumber={pendingResult?.number ?? null}
                        onAnimationComplete={handleWheelAnimationComplete}
                      />
                    </div>

                    {/* Last Result - Compact */}
                    {gameState.lastResult && (
                      <div
                        className="bg-black/40 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg"
                        style={{ border: '1px solid rgba(212, 175, 55, 0.15)' }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-semibold"
                            style={{ color: '#9ca3af', letterSpacing: '0.5px' }}
                          >
                            Last Result
                          </span>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md ${
                            gameState.lastResult.number === 0 ? 'bg-green-600' :
                            gameState.lastResult.color === 'red' ? 'bg-red-600' : 'bg-gray-800 border border-gray-600'
                          }`}>
                            {gameState.lastResult.number}
                          </div>
                          <span className="text-white font-bold text-sm">{gameState.lastResult.color?.toUpperCase()}</span>
                          {gameState.lastResult.winners.length > 0 && (
                            <span className="text-green-400 text-xs ml-auto">
                              {gameState.lastResult.winners.length} winner(s)
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Current Bets */}
                    {gameState.currentBets.length > 0 && (
                      <div className="bg-black/40 backdrop-blur-sm p-4 rounded-lg shadow-lg">
                        <h3 className="text-white text-base font-bold mb-2">
                          Current Bets ({gameState.currentBets.length})
                        </h3>
                        <div className="space-y-1.5 max-h-28 overflow-y-auto">
                          {gameState.currentBets.map((bet, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center bg-black/30 px-2 py-1 rounded text-xs"
                            >
                              <div className="text-white">
                                <span className="font-semibold">{bet.playerName}</span>
                                <span className="text-gray-300 ml-1">
                                  {bet.betType}
                                  {bet.numbers.length > 0 && ` (${bet.numbers.join(', ')})`}
                                </span>
                              </div>
                              <div className="text-yellow-400 font-bold">${bet.amount}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SPIN/START ROUND Button */}
                    {gameMode === 'solo' ? (
                      // Solo mode - direct spin, no timer
                      <button
                        onClick={spinWheel}
                        disabled={isLoading || isWheelSpinning || gameState.currentBets.length === 0}
                        className={`w-full py-5 rounded-xl font-black text-xl tracking-wide uppercase transition-all duration-300 ${
                          isWheelSpinning
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : gameState.currentBets.length === 0
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-white hover:from-amber-500 hover:via-yellow-400 hover:to-amber-500 shadow-lg shadow-amber-500/30 hover:shadow-amber-400/50 transform hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                      >
                        {isWheelSpinning ? 'SPINNING...' : gameState.currentBets.length === 0 ? 'PLACE BETS FIRST' : 'SPIN THE WHEEL'}
                      </button>
                    ) : gameMode === 'host' ? (
                      // Host mode - timer-based rounds
                      roundPhase === 'waiting' ? (
                        <button
                          onClick={startRound}
                          disabled={isLoading}
                          className="w-full py-5 rounded-xl font-black text-xl tracking-wide uppercase transition-all duration-300 bg-gradient-to-r from-green-600 via-emerald-500 to-green-600 text-white hover:from-green-500 hover:via-emerald-400 hover:to-green-500 shadow-lg shadow-green-500/30 hover:shadow-green-400/50 transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                          START ROUND
                        </button>
                      ) : roundPhase === 'betting' ? (
                        <div className="w-full py-5 rounded-xl font-black text-xl tracking-wide uppercase text-center bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          BETTING OPEN - {bettingTimeLeft}s
                        </div>
                      ) : (
                        <div className="w-full py-5 rounded-xl font-black text-xl tracking-wide uppercase text-center bg-gray-700 text-gray-400">
                          SPINNING...
                        </div>
                      )
                    ) : (
                      // Joined player - cannot control spin
                      roundPhase === 'waiting' ? (
                        <div className="w-full py-5 rounded-xl font-bold text-lg text-center bg-slate-700/50 text-slate-400 border border-slate-600/30">
                          Waiting for host to start round...
                        </div>
                      ) : roundPhase === 'betting' ? (
                        <div className="w-full py-5 rounded-xl font-black text-xl tracking-wide uppercase text-center bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse">
                          🎲 BETTING OPEN - {bettingTimeLeft}s
                        </div>
                      ) : (
                        <div className="w-full py-5 rounded-xl font-black text-xl tracking-wide uppercase text-center bg-gray-700 text-gray-400">
                          SPINNING...
                        </div>
                      )
                    )}
                  </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Error Display */}
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg max-w-md">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-black/80 p-8 rounded-2xl border border-white/10 shadow-2xl">
              <div className="animate-spin w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto"></div>
              <div className="text-white mt-4 font-semibold tracking-wide">Processing...</div>
            </div>
          </div>
        )}

        {/* Register Modal */}
        {showRegisterModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-2xl max-w-md w-full border border-white/10 shadow-2xl">
              <h2 className="text-white text-2xl font-bold mb-6">Register as Player</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-gray-400 text-sm block mb-2">Player Name</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="w-full bg-gray-700 text-white p-3 rounded"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-2">
                    Initial Balance
                  </label>
                  <input
                    type="number"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(parseInt(e.target.value))}
                    className="w-full bg-gray-700 text-white p-3 rounded"
                    min="100"
                    max="10000"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowRegisterModal(false)}
                    className="flex-1 bg-gray-600 text-white py-3 rounded font-semibold hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRegister}
                    className="flex-1 bg-green-600 text-white py-3 rounded font-semibold hover:bg-green-700"
                  >
                    Register
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Result Popup - Shows after wheel animation completes */}
        {showResultPopup && pendingResult && playerId && (
          <ResultPopup
            result={pendingResult}
            playerChainId={playerId}
            onClose={dismissResultPopup}
            onShown={handleResultPopupShown}
          />
        )}
      </div>
    </div>
  );
}

export default App;
