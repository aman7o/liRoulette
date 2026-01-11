interface GameHistoryProps {
  history: number[];
}

const isRed = (num: number) =>
  [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].includes(num);

const getColorClass = (num: number) => {
  if (num === 0) return 'number-green';
  return isRed(num) ? 'number-red' : 'number-black';
};

export function GameHistory({ history }: GameHistoryProps) {
  if (!history || history.length === 0) {
    return (
      <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg">
        <span className="text-gray-400 text-xs">History:</span>
        <span className="text-gray-500 text-xs">No spins yet</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg">
      <span className="text-gray-400 text-xs whitespace-nowrap">History:</span>
      <div className="flex gap-1 flex-wrap">
        {history.slice(0, 12).map((num, index) => (
          <div
            key={index}
            className={`${getColorClass(num)} w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm cursor-pointer border border-white/10`}
            style={{ color: num === 0 ? '#4ade80' : isRed(num) ? '#fca5a5' : '#e5e7eb' }}
          >
            {num}
          </div>
        ))}
        {history.length > 12 && (
          <span className="text-gray-500 text-xs self-center">+{history.length - 12}</span>
        )}
      </div>
    </div>
  );
}
