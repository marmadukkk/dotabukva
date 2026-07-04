export interface Hero {
  en: string;
  ru: string;
  short: string;
  attr: string;
}

export interface SpinResult {
  hero: string;
  hero_ru: string;
  hero_en: string;
  short: string;
  attr: string;
  attr_label: string;
  color: string;
  image: string;
  letter: string;
}

export interface Room {
  code: string;
  is_private: boolean;
  created: number;
  current_spin: SpinResult | null;
  eliminated: Set<string>;
  game_started: boolean;
  player_data: Map<any, { free_elims: number; last_elim_time: number }>;
}

export interface PublicRoom {
  code: string;
  created: number;
  players: number;
}
