import { useLinera } from '../hooks/useLinera';

export function WalletConnect() {
  const { isConnected, isLoading, error, connect, disconnect, chainId } = useLinera();

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-emerald-600/80 px-3 py-1.5 rounded-lg">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span
            className="text-white text-xs truncate max-w-[100px]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {chainId?.slice(0, 8)}...
          </span>
        </div>
        <button
          onClick={disconnect}
          className="bg-red-500/80 hover:bg-red-500 px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-red-400 text-xs truncate max-w-[150px]" title={error}>
          Error
        </span>
      )}
      <button
        onClick={connect}
        disabled={isLoading}
        className="bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Connecting...' : 'Connect'}
      </button>
    </div>
  );
}
