// Poker chip component with realistic styling
export function PokerChip({
  value,
  isSelected,
  disabled,
  onClick
}: {
  value: number;
  isSelected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  // Chip colors based on value
  const getChipColors = (val: number) => {
    switch(val) {
      case 1: return { bg: '#e8e8e8', edge: '#c0c0c0', text: '#333' };
      case 5: return { bg: '#e63946', edge: '#c1121f', text: '#fff' };
      case 10: return { bg: '#2563eb', edge: '#1d4ed8', text: '#fff' };
      case 25: return { bg: '#16a34a', edge: '#15803d', text: '#fff' };
      case 50: return { bg: '#7c3aed', edge: '#6d28d9', text: '#fff' };
      case 100: return { bg: '#1f2937', edge: '#111827', text: '#fff' };
      default: return { bg: '#e8e8e8', edge: '#c0c0c0', text: '#333' };
    }
  };

  const colors = getChipColors(value);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative transition-all duration-200 ${
        isSelected ? 'scale-110 z-20' : 'hover:scale-105'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
      style={{
        width: '70px',
        height: '70px',
      }}
    >
      {/* Outer ring with notches */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `
            repeating-conic-gradient(
              from 0deg,
              ${colors.edge} 0deg 6deg,
              ${colors.bg} 6deg 12deg
            )
          `,
          boxShadow: isSelected
            ? `0 0 20px rgba(251, 191, 36, 0.8), 0 4px 12px rgba(0,0,0,0.4)`
            : `0 4px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.1)`,
        }}
      />
      {/* Inner circle */}
      <div
        className="absolute rounded-full flex items-center justify-center"
        style={{
          top: '6px',
          left: '6px',
          right: '6px',
          bottom: '6px',
          background: `radial-gradient(circle at 30% 30%, ${colors.bg}, ${colors.edge})`,
          border: `3px solid ${colors.edge}`,
        }}
      >
        {/* Center design */}
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: '40px',
            height: '40px',
            background: colors.bg,
            border: `2px dashed ${colors.edge}`,
          }}
        >
          <span
            className="font-black text-base"
            style={{ color: colors.text, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
          >
            {value}
          </span>
        </div>
      </div>
      {/* Selection ring */}
      {isSelected && (
        <div
          className="absolute inset-[-4px] rounded-full animate-pulse"
          style={{
            border: '3px solid #d4af37',
            boxShadow: '0 0 15px rgba(212, 175, 55, 0.4)'
          }}
        />
      )}
    </button>
  );
}
