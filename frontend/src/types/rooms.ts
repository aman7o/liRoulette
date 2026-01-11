export interface Room {
  id: number;
  name: string;
  chainId: string;
}

export interface RoomsConfig {
  rooms: Room[];
}
