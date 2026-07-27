import { Language } from '../i18n';

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
    id: '1.1.2-desktop',
    date: '2026-07-27',
    version: '1.1.2',
    tag: { ru: 'Десктоп', en: 'Desktop' },
    title: {
      ru: 'Скоро альфа десктоп-версии',
      en: 'Desktop alpha coming soon',
    },
    body: {
      ru: 'Electron-сборка для Linux и Windows. Игра переносится на десктоп целиком.',
      en: 'Electron build for Linux and Windows. The full game is moving to desktop.',
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
