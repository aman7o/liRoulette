import { useEffect, useRef } from 'react';
import { SpinResult } from '../hooks/useGame';

interface ResultPopupProps {
  result: SpinResult;
  playerChainId: string;
  onClose: () => void;
  onShown?: (isWin: boolean) => void;
}

const isRed = (num: number) =>
  [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(num);

const getColorClass = (num: number) => {
  if (num === 0) return 'bg-green-600';
  return isRed(num) ? 'bg-red-600' : 'bg-gray-800';
};

const getColorName = (num: number) => {
  if (num === 0) return 'Green';
  return isRed(num) ? 'Red' : 'Black';
};

export function ResultPopup({ result, playerChainId, onClose, onShown }: ResultPopupProps) {
  const myWin = result.winners.find(w => w.playerChainId === playerChainId);
  const isWin = !!myWin;
  const totalBetAmount = result.totalBetAmount || 0;
  const hasCalledOnShown = useRef(false);

  useEffect(() => {
    if (!hasCalledOnShown.current && onShown) {
      hasCalledOnShown.current = true;
      onShown(isWin);
    }
  }, [onShown, isWin]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 animate-fadeIn">
      <div
        className={`relative max-w-md w-full mx-4 rounded-2xl shadow-2xl overflow-hidden transform animate-scaleIn ${
          isWin ? 'bg-gradient-to-br from-green-900 to-green-700' : 'bg-gradient-to-br from-red-900 to-red-700'
        }`}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className={`absolute -top-20 -left-20 w-40 h-40 rounded-full ${isWin ? 'bg-green-500' : 'bg-red-500'} opacity-20 blur-3xl`} />
          <div className={`absolute -bottom-20 -right-20 w-40 h-40 rounded-full ${isWin ? 'bg-yellow-500' : 'bg-red-400'} opacity-20 blur-3xl`} />
        </div>

        <div className="relative p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className={`text-6xl mb-2 ${isWin ? 'animate-bounce' : 'animate-pulse'}`}>
              {isWin ? '🎉' : '😔'}
            </div>
            <h2 className={`text-3xl font-bold ${isWin ? 'text-green-200' : 'text-red-200'}`}>
              {isWin ? 'YOU WON!' : 'YOU LOST'}
            </h2>
          </div>

          {/* Winning Number */}
          <div className="flex justify-center mb-6">
            <div
              className={`${getColorClass(result.number)} winner-number winner-number-idle w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-4xl shadow-lg border-4 border-yellow-400 transform hover:scale-105 transition-transform`}
            >
              {result.number}
            </div>
          </div>
          <div className="text-center text-white text-lg mb-6">
            {getColorName(result.number)} • {result.number === 0 ? 'Zero' : result.number % 2 === 0 ? 'Even' : 'Odd'}
          </div>

          {/* Result Details */}
          <div className="bg-black bg-opacity-30 rounded-xl p-4 mb-6">
            {isWin ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Bet Type:</span>
                  <span className="text-white font-semibold">{myWin.betType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Bet Amount:</span>
                  <span className="text-white font-semibold">${myWin.betAmount}</span>
                </div>
                <div className="h-px bg-white bg-opacity-20 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-yellow-300 font-semibold">Payout:</span>
                  <span className="text-yellow-300 font-bold text-2xl">+${myWin.payout}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Bet:</span>
                  <span className="text-white font-semibold">${totalBetAmount}</span>
                </div>
                <div className="h-px bg-white bg-opacity-20 my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-red-300 font-semibold">Lost:</span>
                  <span className="text-red-300 font-bold text-2xl">-${totalBetAmount}</span>
                </div>
              </div>
            )}
          </div>

          {/* Other Winners */}
          {result.winners.length > 0 && !isWin && (
            <div className="mb-6">
              <div className="text-gray-300 text-sm mb-2">Winners this round:</div>
              <div className="space-y-1">
                {result.winners.map((winner, idx) => (
                  <div key={idx} className="text-sm text-gray-400">
                    {winner.playerName}: <span className="text-yellow-400">${winner.payout}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 ${
              isWin
                ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-500 hover:to-yellow-600'
                : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-500 hover:to-gray-600'
            }`}
          >
            {isWin ? 'Collect Winnings!' : 'Try Again'}
          </button>
        </div>
      </div>
    </div>
  );
}
