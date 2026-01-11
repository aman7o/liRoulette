import { useState } from 'react';
import { useSounds } from '../hooks/useSounds';

interface BettingTableProps {
  onPlaceBet: (betType: string, numbers: number[], amount: number) => void;
  isSpinning: boolean;
  playerBalance: number;
  selectedChip: number;
}

const isRed = (num: number) =>
  [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(num);

const getNumberColorClass = (num: number): string => {
  if (num === 0) return 'number-green text-white';
  return isRed(num)
    ? 'number-red text-white'
    : 'number-black text-white';
};

const getNumberShadow = (num: number): string => {
  if (num === 0) return 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3)';
  return isRed(num)
    ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3)'
    : 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.3)';
};

export function BettingTable({
  onPlaceBet,
  isSpinning,
  playerBalance,
  selectedChip,
}: BettingTableProps) {
  const [bets, setBets] = useState<Map<string, { amount: number; display: string }>>(
    new Map()
  );
  const { playBetPlace } = useSounds();

  const handleNumberClick = (num: number) => {
    if (isSpinning || selectedChip > playerBalance) return;

    playBetPlace();
    const betKey = `straight-${num}`;
    const existing = bets.get(betKey);
    const newAmount = (existing?.amount || 0) + selectedChip;

    const newBets = new Map(bets);
    newBets.set(betKey, { amount: newAmount, display: `${num}` });
    setBets(newBets);
  };

  const handleOutsideBet = (betType: string, display: string) => {
    if (isSpinning || selectedChip > playerBalance) return;

    playBetPlace();
    const betKey = betType;
    const existing = bets.get(betKey);
    const newAmount = (existing?.amount || 0) + selectedChip;

    const newBets = new Map(bets);
    newBets.set(betKey, { amount: newAmount, display });
    setBets(newBets);
  };

  const confirmBets = () => {
    bets.forEach((bet, key) => {
      const parts = key.split('-');
      const betType = parts[0];

      if (betType === 'straight') {
        onPlaceBet('STRAIGHT', [parseInt(parts[1])], bet.amount);
      } else if (betType === 'red') {
        onPlaceBet('RED', [], bet.amount);
      } else if (betType === 'black') {
        onPlaceBet('BLACK', [], bet.amount);
      } else if (betType === 'even') {
        onPlaceBet('EVEN', [], bet.amount);
      } else if (betType === 'odd') {
        onPlaceBet('ODD', [], bet.amount);
      } else if (betType === 'low') {
        onPlaceBet('LOW', [], bet.amount);
      } else if (betType === 'high') {
        onPlaceBet('HIGH', [], bet.amount);
      } else if (betType === 'dozen1') {
        onPlaceBet('FIRST_DOZEN', [], bet.amount);
      } else if (betType === 'dozen2') {
        onPlaceBet('SECOND_DOZEN', [], bet.amount);
      } else if (betType === 'dozen3') {
        onPlaceBet('THIRD_DOZEN', [], bet.amount);
      } else if (betType === 'col1') {
        onPlaceBet('FIRST_COLUMN', [], bet.amount);
      } else if (betType === 'col2') {
        onPlaceBet('SECOND_COLUMN', [], bet.amount);
      } else if (betType === 'col3') {
        onPlaceBet('THIRD_COLUMN', [], bet.amount);
      }
    });

    setBets(new Map());
  };

  const clearBets = () => {
    setBets(new Map());
  };

  const totalBetAmount = Array.from(bets.values()).reduce(
    (sum, bet) => sum + bet.amount,
    0
  );

  // Create number grid (3 rows x 12 columns)
  const rows = [
    [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
    [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
    [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Betting Table */}
      <div
        className="betting-felt p-6 shadow-inner"
        style={{
          border: '1px solid rgba(212, 175, 55, 0.15)',
          borderRadius: '12px'
        }}
      >
        {/* Zero */}
        <div className="flex justify-center mb-2">
          <button
            onClick={() => handleNumberClick(0)}
            disabled={isSpinning}
            className={`w-40 h-14 number-cell ${getNumberColorClass(0)} rounded-lg font-bold text-2xl disabled:opacity-50 disabled:cursor-not-allowed ${
              bets.has('straight-0') ? 'has-bet' : ''
            }`}
            style={{ boxShadow: getNumberShadow(0) }}
          >
            0
            {bets.has('straight-0') && (
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center bet-indicator">
                ${bets.get('straight-0')?.amount}
              </span>
            )}
          </button>
        </div>

        {/* Main Grid */}
        <div className="flex gap-2">
          {/* Numbers Grid */}
          <div className="flex flex-col gap-2">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-2">
                {row.map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumberClick(num)}
                    disabled={isSpinning}
                    className={`w-[76px] h-14 number-cell ${getNumberColorClass(num)} rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed relative ${
                      bets.has(`straight-${num}`) ? 'has-bet' : ''
                    }`}
                    style={{ boxShadow: getNumberShadow(num) }}
                  >
                    {num}
                    {bets.has(`straight-${num}`) && (
                      <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center bet-indicator">
                        ${bets.get(`straight-${num}`)?.amount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Column Bets */}
          <div className="flex flex-col gap-2">
            {['col3', 'col2', 'col1'].map((col, idx) => (
              <button
                key={col}
                onClick={() =>
                  handleOutsideBet(col, `Column ${3 - idx}`)
                }
                disabled={isSpinning}
                className={`w-[76px] h-14 bg-gray-700 text-white rounded-lg font-semibold text-base outside-bet disabled:opacity-50 disabled:cursor-not-allowed relative ${
                  bets.has(col) ? 'has-bet' : ''
                }`}
                style={{ border: '1px solid rgba(212, 175, 55, 0.1)' }}
              >
                2:1
                {bets.has(col) && (
                  <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center bet-indicator">
                    ${bets.get(col)?.amount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Dozen Bets */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => handleOutsideBet('dozen1', '1st Dozen (1-12)')}
            disabled={isSpinning}
            className={`flex-1 h-14 bg-gray-700 text-white rounded-lg font-semibold text-lg outside-bet disabled:opacity-50 disabled:cursor-not-allowed relative ${
              bets.has('dozen1') ? 'has-bet' : ''
            }`}
            style={{ border: '1px solid rgba(212, 175, 55, 0.1)' }}
          >
            1st 12
            {bets.has('dozen1') && (
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center bet-indicator">
                ${bets.get('dozen1')?.amount}
              </span>
            )}
          </button>
          <button
            onClick={() => handleOutsideBet('dozen2', '2nd Dozen (13-24)')}
            disabled={isSpinning}
            className={`flex-1 h-14 bg-gray-700 text-white rounded-lg font-semibold text-lg outside-bet disabled:opacity-50 disabled:cursor-not-allowed relative ${
              bets.has('dozen2') ? 'has-bet' : ''
            }`}
            style={{ border: '1px solid rgba(212, 175, 55, 0.1)' }}
          >
            2nd 12
            {bets.has('dozen2') && (
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center bet-indicator">
                ${bets.get('dozen2')?.amount}
              </span>
            )}
          </button>
          <button
            onClick={() => handleOutsideBet('dozen3', '3rd Dozen (25-36)')}
            disabled={isSpinning}
            className={`flex-1 h-14 bg-gray-700 text-white rounded-lg font-semibold text-lg outside-bet disabled:opacity-50 disabled:cursor-not-allowed relative ${
              bets.has('dozen3') ? 'has-bet' : ''
            }`}
            style={{ border: '1px solid rgba(212, 175, 55, 0.1)' }}
          >
            3rd 12
            {bets.has('dozen3') && (
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center bet-indicator">
                ${bets.get('dozen3')?.amount}
              </span>
            )}
          </button>
        </div>

        {/* Outside Bets */}
        <div className="grid grid-cols-6 gap-2 mt-3">
          {[
            { key: 'low', label: '1-18' },
            { key: 'even', label: 'EVEN' },
            { key: 'red', label: 'RED', bg: 'number-red' },
            { key: 'black', label: 'BLACK', bg: 'number-black' },
            { key: 'odd', label: 'ODD' },
            { key: 'high', label: '19-36' },
          ].map((bet) => (
            <button
              key={bet.key}
              onClick={() => handleOutsideBet(bet.key, bet.label)}
              disabled={isSpinning}
              className={`h-14 ${
                bet.bg || 'bg-gray-700'
              } text-white rounded-lg font-semibold text-base outside-bet disabled:opacity-50 disabled:cursor-not-allowed relative ${
                bets.has(bet.key) ? 'has-bet' : ''
              }`}
            >
              {bet.label}
              {bets.has(bet.key) && (
                <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center bet-indicator">
                  ${bets.get(bet.key)?.amount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Bet Controls */}
      <div className="flex gap-4">
        <button
          onClick={clearBets}
          disabled={bets.size === 0 || isSpinning}
          className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl font-bold text-lg uppercase transition-all duration-200 hover:from-red-500 hover:to-red-600 shadow-md hover:shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
          style={{ fontFamily: "'Cinzel', 'Times New Roman', serif", letterSpacing: '2px' }}
        >
          CLEAR
        </button>
        <button
          onClick={confirmBets}
          disabled={bets.size === 0 || isSpinning || totalBetAmount > playerBalance}
          className="flex-1 text-white py-4 rounded-xl font-bold text-lg uppercase transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            fontFamily: "'Cinzel', 'Times New Roman', serif",
            letterSpacing: '2px',
            background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
            boxShadow: '0 4px 15px rgba(13, 148, 136, 0.3)'
          }}
        >
          CONFIRM (${totalBetAmount})
        </button>
      </div>
    </div>
  );
}
