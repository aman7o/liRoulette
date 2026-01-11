import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';
import type { Room, RoomsConfig } from '../types/rooms';
import type { PooledChain, ChainPool } from '../types/chainPool';

const LOCAL_NODE = import.meta.env.VITE_NODE_URL || 'http://localhost:8080';
const LOCAL_FAUCET = import.meta.env.VITE_FAUCET_URL || 'http://localhost:8079';
const DEFAULT_CHAIN = import.meta.env.VITE_DEFAULT_CHAIN || '';
const HOST_CHAIN = import.meta.env.VITE_HOST_CHAIN || DEFAULT_CHAIN;

type GameMode = 'selecting' | 'solo' | 'host' | 'join';

interface LineraContextType {
  chainId: string;
  hostChainId: string;
  playerId: string;
  appId: string;
  setAppId: (id: string) => void;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  joinHostChainId: string;
  setJoinHostChainId: (id: string) => void;
  isHost: boolean;
  rooms: Room[];
  selectedRoom: Room | null;
  setSelectedRoom: (room: Room | null) => void;
  roomsLoading: boolean;
  chainPool: PooledChain[];
  poolLoading: boolean;
  hostedChainId: string | null;
  joinedChainId: string | null;
  hostGame: () => Promise<string | null>;
  joinGame: (chainId: string) => boolean;
  leaveGame: () => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  query: <T = any>(graphqlQuery: string, variables?: Record<string, unknown>) => Promise<T>;
  queryHost: <T = any>(graphqlQuery: string, variables?: Record<string, unknown>) => Promise<T>;
  mutate: <T = any>(mutation: string, variables?: Record<string, unknown>) => Promise<T>;
  subscribe: (callback: (data: unknown) => void) => () => void;
}

const LineraContext = createContext<LineraContextType | null>(null);

export function LineraProvider({ children }: { children: ReactNode }) {
  const [chainId, setChainId] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [appId, setAppId] = useState<string>(import.meta.env.VITE_APP_ID || '');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('selecting');
  const [joinHostChainId, setJoinHostChainId] = useState<string>('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [chainPool, setChainPool] = useState<PooledChain[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);
  const [hostedChainId, setHostedChainId] = useState<string | null>(null);
  const [joinedChainId, setJoinedChainId] = useState<string | null>(null);

  const query = useCallback(async (graphqlQuery: string, variables?: Record<string, unknown>) => {
    if (!chainId || !appId) throw new Error('Not connected');
    const res = await fetch(`${LOCAL_NODE}/chains/${chainId}/applications/${appId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: graphqlQuery, variables }),
    });
    if (!res.ok) throw new Error(`Request failed: ${res.statusText}`);
    const result = await res.json();
    if (result.errors) throw new Error(result.errors[0]?.message || 'GraphQL error');
    return result.data;
  }, [chainId, appId]);

  useEffect(() => {
    const loadRooms = async () => {
      try {
        const res = await fetch('/rooms.json');
        if (!res.ok) {
          if (HOST_CHAIN) setRooms([{ id: 1, name: 'Default Room', chainId: HOST_CHAIN }]);
          return;
        }
        const config: RoomsConfig = await res.json();
        setRooms(config.rooms.filter(r => r.chainId?.length === 64));
      } catch {
        if (HOST_CHAIN) setRooms([{ id: 1, name: 'Default Room', chainId: HOST_CHAIN }]);
      } finally {
        setRoomsLoading(false);
      }
    };
    loadRooms();
  }, []);

  useEffect(() => {
    const loadPool = async () => {
      try {
        const res = await fetch('/chainPool.json');
        if (!res.ok) { setPoolLoading(false); return; }
        const data: ChainPool = await res.json();
        setChainPool(data.chains.filter(c => c.chainId?.length === 64));
      } catch {}
      finally { setPoolLoading(false); }
    };
    loadPool();
  }, []);

  const queryHost = useCallback(async (graphqlQuery: string, variables?: Record<string, unknown>) => {
    if (!appId) throw new Error('Not connected');
    const hostId = gameMode === 'join' && joinHostChainId ? joinHostChainId : (HOST_CHAIN || chainId);
    const res = await fetch(`${LOCAL_NODE}/chains/${hostId}/applications/${appId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: graphqlQuery, variables }),
    });
    if (!res.ok) throw new Error(`Request failed: ${res.statusText}`);
    const result = await res.json();
    if (result.errors) throw new Error(result.errors[0]?.message || 'GraphQL error');
    return result.data;
  }, [chainId, appId, gameMode, joinHostChainId]);

  const mutate = useCallback(async (mutation: string, variables?: Record<string, unknown>) => {
    return queryHost(mutation, variables);
  }, [queryHost]);

  const generateOwner = useCallback(() => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }, []);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let owner = localStorage.getItem('linera_owner');
      if (!owner) { owner = generateOwner(); localStorage.setItem('linera_owner', owner); }
      setPlayerId(owner);

      const chainQuery = await fetch(LOCAL_FAUCET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `query { chainId(owner: "${owner}") }` }),
      });
      const chainResult = await chainQuery.json();

      if (chainResult.data?.chainId) {
        setChainId(chainResult.data.chainId);
        setIsConnected(true);
        return;
      }

      const claimRes = await fetch(LOCAL_FAUCET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `mutation { claim(owner: "${owner}") }` }),
      });
      if (!claimRes.ok) throw new Error(`Claim failed: ${claimRes.statusText}`);
      const claimResult = await claimRes.json();
      if (claimResult.errors) throw new Error(claimResult.errors[0]?.message || 'Claim error');

      const finalQuery = await fetch(LOCAL_FAUCET, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `query { chainId(owner: "${owner}") }` }),
      });
      const finalResult = await finalQuery.json();
      if (finalResult.data?.chainId) {
        setChainId(finalResult.data.chainId);
        setIsConnected(true);
      } else {
        throw new Error('No chainId returned');
      }
    } catch (err) {
      if (DEFAULT_CHAIN) {
        setChainId(DEFAULT_CHAIN);
        setIsConnected(true);
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsLoading(false);
    }
  }, [generateOwner]);

  const disconnect = useCallback(() => {
    setChainId('');
    setIsConnected(false);
    setError(null);
  }, []);

  const hostGame = useCallback(async (): Promise<string | null> => {
    const available = chainPool.find(c => !c.inUse);
    if (!available) return null;
    setChainPool(prev => prev.map(c => c.id === available.id ? { ...c, inUse: true } : c));
    setHostedChainId(available.chainId);
    setGameMode('host');
    return available.chainId;
  }, [chainPool]);

  const joinGame = useCallback((chainId: string): boolean => {
    if (!chainId || chainId.length !== 64 || !/^[a-f0-9]+$/.test(chainId)) return false;
    setJoinedChainId(chainId);
    setJoinHostChainId(chainId);
    setGameMode('join');
    return true;
  }, []);

  const leaveGame = useCallback(() => {
    if (hostedChainId) setChainPool(prev => prev.map(c => c.chainId === hostedChainId ? { ...c, inUse: false } : c));
    setHostedChainId(null);
    setJoinedChainId(null);
    setJoinHostChainId('');
    setGameMode('selecting');
  }, [hostedChainId]);

  const subscribe = useCallback((callback: (data: unknown) => void) => {
    if (!chainId || !appId) return () => {};
    const wsUrl = `ws://${LOCAL_NODE.replace('http://', '').replace('https://', '')}/ws`;
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', chainId, appId, stream: 'roulette_events' }));
    ws.onmessage = (e) => { try { callback(JSON.parse(e.data)); } catch {} };
    return () => { if (ws.readyState === WebSocket.OPEN) ws.close(); };
  }, [chainId, appId]);

  const effectiveHostChainId = useMemo(() => {
    if (gameMode === 'solo') return chainId;
    if (gameMode === 'host' && hostedChainId) return hostedChainId;
    if (gameMode === 'join' && joinedChainId) return joinedChainId;
    if (selectedRoom) return selectedRoom.chainId;
    if (gameMode === 'join' && joinHostChainId) return joinHostChainId;
    return HOST_CHAIN || chainId;
  }, [gameMode, chainId, hostedChainId, joinedChainId, selectedRoom, joinHostChainId]);

  const isHost = gameMode === 'solo' || gameMode === 'host';

  return (
    <LineraContext.Provider value={{
      chainId, hostChainId: effectiveHostChainId, playerId, appId, setAppId, isConnected, isLoading, error,
      gameMode, setGameMode, joinHostChainId, setJoinHostChainId, isHost, rooms, selectedRoom, setSelectedRoom,
      roomsLoading, chainPool, poolLoading, hostedChainId, joinedChainId, hostGame, joinGame, leaveGame,
      connect, disconnect, query, queryHost, mutate, subscribe,
    }}>
      {children}
    </LineraContext.Provider>
  );
}

export function useLinera() {
  const context = useContext(LineraContext);
  if (!context) throw new Error('useLinera must be used within LineraProvider');
  return context;
}
