import { Player, PlayerStats } from '../hooks/useGame';
import { useSounds } from '../hooks/useSounds';

interface PlayerInfoProps {
  player: Player | null;
  onRegister: () => void;
  stats?: PlayerStats;
}

export function PlayerInfo({ player, onRegister, stats }: PlayerInfoProps) {
  const { isMuted, toggleMute } = useSounds();

  if (!player) {
    return (
      <div className="flex items-center justify-between bg-slate-900/90 px-4 py-3 rounded-lg border border-slate-700">
        <span className="text-gray-400 text-sm">Register to start playing</span>
        <button
          onClick={onRegister}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg font-semibold text-sm transition-colors"
        >
          Register
        </button>
      </div>
    );
  }

  const totalRounds = stats?.totalRounds || 0;
  const winRate = totalRounds > 0 ? Math.round((stats?.totalWins || 0) / totalRounds * 100) : 0;
  const netProfit = (stats?.totalWinAmount || 0) - (stats?.totalLossAmount || 0);
  const totalWagered = stats?.totalWagered || 0;
  const bestWin = stats?.bestWin || 0;

  return (
    <div
      className="flex items-center justify-between bg-slate-900/90 px-3 py-2 rounded-lg"
      style={{ border: '1px solid rgba(212, 175, 55, 0.15)' }}
    >
      {/* Left: Name + Balance + Mute */}
      <div className="flex items-center gap-3">
        {/* Player name box */}
        <div className="player-box" style={{ border: '1px solid rgba(212, 175, 55, 0.1)', borderRadius: '8px' }}>
          <span className="text-white font-bold" style={{ fontFamily: "'Cinzel', 'Times New Roman', serif" }}>{player.name}</span>
        </div>

        {/* Balance box with label */}
        <div className="player-box" style={{ border: '1px solid rgba(212, 175, 55, 0.1)', borderRadius: '8px' }}>
          <div className="text-[9px] text-slate-400 uppercase" style={{ fontFamily: "'Cinzel', 'Times New Roman', serif", letterSpacing: '0.5px' }}>Balance</div>
          <div className="text-yellow-400 font-bold text-lg leading-tight" style={{ fontFamily: "'JetBrains Mono', monospace" }}>${player.balance}</div>
        </div>

        {/* Mute button */}
        <button
          onClick={toggleMute}
          className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors border border-slate-600"
          title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
        >
          {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          )}
        </button>
      </div>

      {/* Right: Stats in dark boxes */}
      {stats && (
        <div className="flex items-center gap-2">
          {/* Rounds */}
          <div className="stat-box" style={{ border: '1px solid rgba(212, 175, 55, 0.1)', borderRadius: '8px' }}>
            <div className="stat-box-value text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{totalRounds}</div>
            <div className="stat-box-label" style={{ fontFamily: "'Cinzel', 'Times New Roman', serif", letterSpacing: '0.5px' }}>Rounds</div>
          </div>

          {/* Wagered */}
          <div className="stat-box" style={{ border: '1px solid rgba(212, 175, 55, 0.1)', borderRadius: '8px' }}>
            <div className="stat-box-value text-yellow-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>${totalWagered}</div>
            <div className="stat-box-label" style={{ fontFamily: "'Cinzel', 'Times New Roman', serif", letterSpacing: '0.5px' }}>Wagered</div>
          </div>

          {/* Net */}
          <div className="stat-box" style={{ border: '1px solid rgba(212, 175, 55, 0.1)', borderRadius: '8px' }}>
            <div className={`stat-box-value ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {netProfit >= 0 ? '+' : ''}{netProfit}
            </div>
            <div className="stat-box-label" style={{ fontFamily: "'Cinzel', 'Times New Roman', serif", letterSpacing: '0.5px' }}>Net</div>
          </div>

          {/* Best Win */}
          <div className="stat-box" style={{ border: '1px solid rgba(212, 175, 55, 0.1)', borderRadius: '8px' }}>
            <div className="stat-box-value text-green-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>${bestWin}</div>
            <div className="stat-box-label" style={{ fontFamily: "'Cinzel', 'Times New Roman', serif", letterSpacing: '0.5px' }}>Best</div>
          </div>

          {/* Win Rate */}
          <div className="stat-box" style={{ border: '1px solid rgba(212, 175, 55, 0.1)', borderRadius: '8px' }}>
            <div className="stat-box-value text-yellow-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{winRate}%</div>
            <div className="stat-box-label" style={{ fontFamily: "'Cinzel', 'Times New Roman', serif", letterSpacing: '0.5px' }}>Win%</div>
          </div>
        </div>
      )}
    </div>
  );
}
