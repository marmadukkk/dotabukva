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
    id: '1.3-rounds',
    date: '2026-09-27',
    version: '1.3',
    tag: { ru: 'Ход', en: 'Rounds' },
    title: {
      ru: 'Ники и смена хода',
      en: 'Nicks and turn rotation',
    },
    body: {
      ru: 'В лобби ник и список игроков. При старте ведущий выбирается случайно. Верный герой заканчивает раунд, и этот игрок загадывает следующим.',
      en: 'Lobby shows a nick and the player list. The leader is picked at random when the game starts. The right hero ends the round, and that player describes the next one.',
    },
  },
  {
    id: '1.3-online',
    date: '2026-09-27',
    version: '1.3',
    tag: { ru: 'Онлайн', en: 'Online' },
    title: {
      ru: 'Онлайн-комнаты',
      en: 'Online rooms',
    },
    body: {
      ru: 'Веб-комнаты идут через сервер. Друзья заходят по коду или ссылке.',
      en: 'Web rooms go through a server. Friends join by code or link.',
    },
  },
  {
    id: '1.3-phone',
    date: '2026-09-27',
    version: '1.3',
    tag: { ru: 'Телефон', en: 'Phone' },
    title: {
      ru: 'Шапка на узком экране',
      en: 'Header on a narrow screen',
    },
    body: {
      ru: 'Ниже 640px код комнаты убран из шапки. Код и выход остаются в лобби.',
      en: 'Below 640px the room code leaves the header. The code and leave button stay in the lobby.',
    },
  },
  {
    id: '1.3-load',
    date: '2026-09-27',
    version: '1.3',
    tag: { ru: 'Загрузка', en: 'Load' },
    title: {
      ru: 'Фон не держит открытие страницы',
      en: 'Background no longer blocks page open',
    },
    body: {
      ru: 'Ролик стартует после того, как меню уже открыто. Сам файл фона не менялся.',
      en: 'The clip starts after the menu is already open. The background file itself is unchanged.',
    },
  },
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
