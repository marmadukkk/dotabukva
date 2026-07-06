export interface SpinResult {
  hero: string;
  hero_ru?: string;
  hero_en?: string;
  short: string;
  attr: string;
  attr_label: string;
  color: string;
  image: string;
  letter: string;
  multiplier?: number;   // 1 | 2 | 3 | 4  (Ogre Magi Multicast style)
}

export interface HistoryEntry {
  hero: string;
  letter: string;
  text?: string;
  short?: string;
  attr?: string;
  color?: string;
  image?: string;
  ts: number;
}

export interface RoomInfo {
  code: string;
  created?: number;
  players?: number;
}
