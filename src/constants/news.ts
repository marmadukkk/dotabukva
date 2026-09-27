import type { Language } from '../i18n';

export interface NewsItem {
  id: string;
  date: string;
  version?: string;
  title: Record<Language, string>;
  body: Record<Language, string>;
  tag?: Record<Language, string>;
}

/** Latest updates shown on the main menu (newest first). */
export const NEWS_ITEMS: NewsItem[] = [
  {
    id: '1.1-lan',
    date: '2026-07-27',
    version: '1.1-desktop',
    tag: { ru: 'LAN', en: 'LAN' },
    title: {
      ru: 'Мультиплеер по локальной сети',
      en: 'Local network multiplayer',
    },
    body: {
      ru: 'Хост создаёт комнату, гости вводят IP (Wi‑Fi / Radmin). Общий спин и вычёркивания. Win + Linux.',
      en: 'Host creates a room, guests enter IP (Wi‑Fi / Radmin). Shared spins and eliminations. Win + Linux.',
    },
  },
  {
    id: '1.0-desktop',
    date: '2026-07-27',
    version: '1.0-desktop',
    tag: { ru: 'Десктоп', en: 'Desktop' },
    title: {
      ru: 'Первый десктоп-релиз',
      en: 'First desktop release',
    },
    body: {
      ru: 'Electron для Linux и Windows. Базовая игра без LAN-мультиплеера.',
      en: 'Electron for Linux and Windows. Base game without LAN multiplayer.',
    },
  },
  {
    id: 'audio-pack',
    date: '2026-07-27',
    version: '1.1.2',
    tag: { ru: 'Звук', en: 'Audio' },
    title: {
      ru: 'Новые звуки интерфейса',
      en: 'New UI sounds',
    },
    body: {
      ru: 'Клики, логотип, выбор роли, ban/unban в таблице, spin music и EN-варианты yess/noo.',
      en: 'Clicks, logo, role pick, table ban/unban, spin music, and EN yess/noo variants.',
    },
  },
  {
    id: 'settings',
    date: '2026-07-24',
    version: '1.1',
    tag: { ru: 'Настройки', en: 'Settings' },
    title: {
      ru: 'Меню настроек',
      en: 'Settings menu',
    },
    body: {
      ru: 'Громкость музыки и эффектов раздельно, саундтреки, Multicast, дисклеймер при запуске, смена фона.',
      en: 'Separate music/SFX volume, soundtracks, Multicast, startup disclaimer, background switch.',
    },
  },
  {
    id: 'mp-ready',
    date: '2026-07-24',
    version: '1.1',
    tag: { ru: 'Мультиплеер', en: 'Multiplayer' },
    title: {
      ru: 'Мультиплеер готов к релизу',
      en: 'Multiplayer ready for release',
    },
    body: {
      ru: 'Комнаты, роли ведущего и отгадывающего, синхронизация спинов.',
      en: 'Rooms, leader and guesser roles, spin sync.',
    },
  },
];
