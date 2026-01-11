import { useState } from 'react';

interface ModeSelectionProps {
  poolLoading: boolean;
  availableChains: number;
  onSelectSolo: () => void;
  onSelectHost: () => Promise<void>;
  onSelectJoin: (chainId: string) => void;
}

export default function ModeSelection({
  poolLoading,
  availableChains,
  onSelectSolo,
  onSelectHost,
  onSelectJoin
}: ModeSelectionProps) {
  const [joinCode, setJoinCode] = useState('');
  const [isHosting, setIsHosting] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const handleHost = async () => {
    setIsHosting(true);
    try {
      await onSelectHost();
    } finally {
      setIsHosting(false);
    }
  };

  const handleJoin = () => {
    if (joinCode.length === 64) {
      onSelectJoin(joinCode);
    }
  };

  const isValidJoinCode = joinCode.length === 64 && /^[a-f0-9]+$/.test(joinCode);

  if (poolLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading game rooms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-start px-4 pt-16">
      {/* Title */}
      <div className="text-center mb-12">
        <h1
          className="text-5xl font-bold mb-3"
          style={{
            fontFamily: "'Cinzel', 'Times New Roman', serif",
            letterSpacing: '6px',
            color: '#d4af37',
            textShadow: '0 0 40px rgba(212, 175, 55, 0.6), 0 0 80px rgba(212, 175, 55, 0.3)'
          }}
        >
          LINERA ROULETTE
        </h1>
        <p
          className="text-sm uppercase"
          style={{
            fontFamily: "'Cinzel', 'Times New Roman', serif",
            letterSpacing: '5px',
            color: '#d4af37',
            opacity: 0.85
          }}
        >
          SELECT YOUR MODE
        </p>
      </div>

      {/* 3-Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">

        {/* SOLO Card */}
        <div
          className={`relative group cursor-pointer transition-all duration-300 ${
            hoveredCard === 'solo' ? 'scale-105 z-10' : hoveredCard ? 'scale-95 opacity-70' : ''
          }`}
          onMouseEnter={() => setHoveredCard('solo')}
          onMouseLeave={() => setHoveredCard(null)}
          onClick={onSelectSolo}
          style={{
            transform: hoveredCard === 'solo' ? 'translateY(-6px) scale(1.05)' : undefined,
            transition: 'all 0.3s ease'
          }}
        >
          <div
            className="relative bg-gradient-to-b from-slate-800/95 to-slate-900/95 rounded-2xl overflow-hidden transition-all duration-300 h-full"
            style={{
              border: '1px solid rgba(212, 175, 55, 0.15)',
              boxShadow: hoveredCard === 'solo' ? '0 15px 40px rgba(0, 0, 0, 0.5)' : '0 10px 30px rgba(0, 0, 0, 0.4)',
              minHeight: '420px'
            }}
          >
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500"></div>
            <div className="p-8 text-center flex flex-col h-full">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <span className="text-4xl">👤</span>
              </div>
              <h2
                className="text-2xl font-bold text-white mb-2"
                style={{ fontFamily: "'Cinzel', 'Times New Roman', serif", letterSpacing: '3px' }}
              >
                SOLO
              </h2>
              <p className="text-sm mb-6" style={{ color: '#a1a1aa' }}>Jump in solo</p>
              <div className="flex-grow"></div>
              <button
                className="w-full py-3 text-white font-semibold rounded-lg transition-all duration-300 hover:opacity-90 mt-auto"
                style={{
                  fontFamily: "'Cinzel', 'Times New Roman', serif",
                  letterSpacing: '2px',
                  background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)'
                }}
              >
                START SOLO
              </button>
            </div>
          </div>
        </div>

        {/* HOST Card */}
        <div
          className={`relative group cursor-pointer transition-all duration-300 ${
            hoveredCard === 'host' ? 'scale-105 z-10' : hoveredCard ? 'scale-95 opacity-70' : ''
          }`}
          onMouseEnter={() => setHoveredCard('host')}
          onMouseLeave={() => setHoveredCard(null)}
          onClick={!isHosting && availableChains > 0 ? handleHost : undefined}
          style={{
            transform: hoveredCard === 'host' ? 'translateY(-6px) scale(1.05)' : undefined,
            transition: 'all 0.3s ease'
          }}
        >
          <div
            className="relative bg-gradient-to-b from-slate-800/95 to-slate-900/95 rounded-2xl overflow-hidden transition-all duration-300 h-full"
            style={{
              border: '1px solid rgba(212, 175, 55, 0.15)',
              boxShadow: hoveredCard === 'host' ? '0 15px 40px rgba(0, 0, 0, 0.5)' : '0 10px 30px rgba(0, 0, 0, 0.4)',
              minHeight: '420px'
            }}
          >
            <div className="h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"></div>

            {/* Available rooms badge */}
            <div className="absolute top-4 right-4">
              <span
                className="text-white font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 600
                }}
              >
                {availableChains} available
              </span>
            </div>

            <div className="p-8 text-center flex flex-col h-full">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <span className="text-4xl">👑</span>
              </div>
              <h2
                className="text-2xl font-bold text-white mb-2"
                style={{ fontFamily: "'Cinzel', 'Times New Roman', serif", letterSpacing: '3px' }}
              >
                HOST
              </h2>
              <p className="text-sm mb-6" style={{ color: '#a1a1aa' }}>Create a game and invite friends</p>
              <div className="flex-grow"></div>
              <button
                disabled={isHosting || availableChains === 0}
                className="w-full py-3 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:opacity-90 mt-auto"
                style={{
                  fontFamily: "'Cinzel', 'Times New Roman', serif",
                  letterSpacing: '2px',
                  background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)'
                }}
              >
                {isHosting ? 'Creating...' : availableChains === 0 ? 'No Rooms Left' : 'HOST GAME'}
              </button>
            </div>
          </div>
        </div>

        {/* JOIN Card */}
        <div
          className={`relative group transition-all duration-300 ${
            hoveredCard === 'join' ? 'scale-105 z-10' : hoveredCard ? 'scale-95 opacity-70' : ''
          }`}
          onMouseEnter={() => setHoveredCard('join')}
          onMouseLeave={() => setHoveredCard(null)}
          style={{
            transform: hoveredCard === 'join' ? 'translateY(-6px) scale(1.05)' : undefined,
            transition: 'all 0.3s ease'
          }}
        >
          <div
            className="relative bg-gradient-to-b from-slate-800/95 to-slate-900/95 rounded-2xl overflow-hidden transition-all duration-300 h-full"
            style={{
              border: '1px solid rgba(212, 175, 55, 0.15)',
              boxShadow: hoveredCard === 'join' ? '0 15px 40px rgba(0, 0, 0, 0.5)' : '0 10px 30px rgba(0, 0, 0, 0.4)',
              minHeight: '420px'
            }}
          >
            <div className="h-1 bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500"></div>
            <div className="p-8 text-center flex flex-col h-full">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <span className="text-4xl">🚪</span>
              </div>
              <h2
                className="text-2xl font-bold text-white mb-2"
                style={{ fontFamily: "'Cinzel', 'Times New Roman', serif", letterSpacing: '3px' }}
              >
                JOIN
              </h2>
              <p className="text-sm mb-4" style={{ color: '#a1a1aa' }}>Enter a room code to join</p>
              <div className="flex-grow"></div>

              {/* Join Code Input */}
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toLowerCase().replace(/[^a-f0-9]/g, ''))}
                placeholder="Paste room code here..."
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm mb-4 focus:border-purple-500 outline-none font-mono placeholder:text-slate-500"
                maxLength={64}
                onClick={(e) => e.stopPropagation()}
              />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleJoin();
                }}
                disabled={!isValidJoinCode}
                className="w-full py-3 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:opacity-90"
                style={{
                  fontFamily: "'Cinzel', 'Times New Roman', serif",
                  letterSpacing: '2px',
                  background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)'
                }}
              >
                JOIN GAME
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hint text */}
      <p
        className="mt-8 text-sm text-center max-w-md"
        style={{ color: '#d4af37', opacity: 0.7 }}
      >
        Host a game to get a room code, then share it with friends so they can join!
      </p>
    </div>
  );
}
