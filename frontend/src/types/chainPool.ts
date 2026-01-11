export interface PooledChain {
  id: number;
  chainId: string;
  inUse: boolean;
}

export interface ChainPool {
  chains: PooledChain[];
}

export interface HostedGame {
  chainId: string;
  hostName?: string;
  createdAt: number;
}
