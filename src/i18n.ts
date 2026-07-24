export type Language = 'ru' | 'en';

export const languages = [
  { code: 'ru' as const, label: 'Русский' },
  { code: 'en' as const, label: 'English' },
];

const dict: Record<Language, Record<string, string>> = {
  ru: {
    // Nav
    'nav.howto': 'КАК ИГРАТЬ',
    'nav.change': 'СМЕНИТЬ',
    'nav.loading': 'ЗАГРУЗКА',
    'nav.settings': 'Настройки',
    'nav.volume': 'Громкость',
    'nav.multicast': 'Multicast',
    'nav.multicastDesc': 'Шанс x2 / x3 / x4 при спине',
    'nav.changeBg': 'Сменить фон',

    // Main Menu
    'main.tagline': 'Крути. Описывай. Отгадывай.',
    'main.normal': 'Обычный режим',
    'main.normalDesc': 'Играть без комнаты (классика)',
    'main.create': 'Создать комнату',
    'main.createDesc': 'Сгенерировать код и пригнать друзей',
    'main.rooms': 'Список комнат',
    'main.roomsDesc': 'Присоединиться к существующей комнате',
    'main.version': 'VERSION 1.1 • МУЛЬТИПЛЕЕР ГОТОВ К РЕЛИЗУ',

    // Role Menu
    'role.title': 'Выбери роль',
    'role.subtitle': 'Один ведущий крутит и даёт подсказки. Остальные вычёркивают героев.',
    'role.mode': 'РЕЖИМ',
    'role.heroes': 'Герои',
    'role.items': 'Предметы',
    'role.abilities': 'Способности',
    'role.leaderBadge': 'ДЛЯ ВЕДУЩЕГО',
    'role.leaderTitle': 'Ведущий',
    'role.leaderDesc': 'Открывается барабан с {mode} и буквой.\nТы видишь комбинацию и даёшь описание остальным.',
    'role.leaderCta': 'ОТКРЫТЬ БАРАБАН',
    'role.guesserBadge': 'ДЛЯ ОТГАДЫВАЮЩИХ',
    'role.guesserTitle': 'Отгадывающий',
    'role.guesserDesc': 'Большая таблица всех {mode} Dota 2.\nКликай по иконкам — они становятся серыми (вычеркнуты).',
    'role.guesserCta': 'ОТКРЫТЬ ТАБЛИЦУ',
    'role.company': 'ИГРА В КОМПАНИИ',

    // Room
    'room.code': 'КОМНАТА',
    'room.players': 'Игроков подключено',
    'room.leader': 'Ведущий',
    'room.guesser': 'Отгадывающий',
    'room.start': 'НАЧАТЬ ИГРУ',
    'room.waitLeader': 'Ожидайте, пока ведущий начнёт игру...',
    'room.statusLeaderConnect': 'Вы ведущий. Подключаемся к комнате...',
    'room.statusGuesserConnect': 'Вы отгадывающий. Подключаемся к комнате...',
    'room.statusLeaderReady': 'Вы ведущий. Соединение установлено. Нажмите «Начать игру», когда все подключатся.',
    'room.statusGuesserReady': 'Вы отгадывающий. Соединение установлено. Ожидайте, пока ведущий начнёт игру.',

    // Leader view
    'leader.spin': 'КРУТИТЬ',
    'leader.spinAgain': 'КРУТИТЬ ЕЩЁ',
    'leader.spinning': 'КРУТИМ...',
    'leader.letter': 'БУКВА',
    'leader.history': 'ИСТОРИЯ СПИНОВ',
    'leader.clear': 'ОЧИСТИТЬ',
    'leader.empty': 'ПУСТО. КРУТИ — РЕЗУЛЬТАТЫ ЗДЕСЬ.',
    'leader.table': 'ТАБЛИЦА ОТГАДЫВАЮЩИХ (просмотр)',
    'leader.onLetter': 'НА БУКВУ',

    // Guesser view
    'guesser.tableHeroes': 'ТАБЛИЦА ГЕРОЕВ — ВЫЧЁРКИВАЙ',
    'guesser.tableItems': 'ТАБЛИЦА ПРЕДМЕТОВ — ВЫЧЁРКИВАЙ',
    'guesser.tableAbilities': 'ТАБЛИЦА СПОСОБНОСТЕЙ — ВЫЧЁРКИВАЙ',
    'guesser.reset': 'СБРОСИТЬ',
    'guesser.free': 'Бесплатных вычёркиваний:',
    'guesser.cd': 'КД до следующего:',
    'guesser.search': 'Поиск...',
    'guesser.sort': 'СОРТИРОВКА:',
    'guesser.az': 'А → Я',
    'guesser.za': 'Я → А',
    'guesser.str': 'СИЛА',
    'guesser.agi': 'ЛОВКОСТЬ',
    'guesser.int': 'ИНТЕЛЛЕКТ',
    'guesser.uni': 'УНИВ.',

    // Modals
    'modal.howto': 'КАК ИГРАТЬ',
    'modal.howto1': 'В начале игры каждый выбирает роль: {leader} или {guesser}.',
    'modal.howto2': 'Ведущий крутит барабан и получает {heroLetter}. Даёт описание, начиная с этой буквы.',
    'modal.howto3': 'Отгадывающие в таблице кликают по иконкам — они становятся серыми (вычеркиваются).',
    'modal.howtoBtn': 'ПОНЯТНО, ПОГНАЛИ!',
    'modal.confirmCancel': 'ОТМЕНА',
    'modal.confirmYes': 'ДА',

    'modal.donationTitle': 'Мультиплеер в разработке',
    'modal.donationMsg': 'СОБИРАЮ ДОНАТЫ НА ХОСТ @mrmdkkkk',
    'modal.roomCreated': 'Комната создана',
    'modal.roomCode': 'Код:',
    'modal.copyLink': 'Ссылка скопирована',

    'modal.clearHistoryTitle': 'Очистить историю',
    'modal.clearHistoryMsg': 'Очистить всю историю?',
    'modal.resetElimTitle': 'Сброс вычеркнутых',
    'modal.resetElimHeroes': 'Сбросить все вычеркнутые герои?',
    'modal.resetElimItems': 'Сбросить все вычеркнутые предметы?',
    'modal.resetElimAbilities': 'Сбросить все вычеркнутые способности?',

    'roomList.title': 'Список комнат',
    'roomList.empty': 'Пока нет комнат. Создайте свою или введите код.',
    'roomList.orEnter': 'Или введи код комнаты:',
    'roomList.placeholder': 'ABCDEF',
    'roomList.join': 'Войти',

    // Misc
    'misc.loading': 'ЗАГРУЗКА',
    'misc.hero': 'героем',
    'misc.item': 'предметом',
    'misc.ability': 'способностью',
    'misc.heroes': 'героев',
    'misc.items': 'предметов',
    'misc.abilities': 'способностей',
  },

  en: {
    // Nav
    'nav.howto': 'HOW TO PLAY',
    'nav.change': 'CHANGE',
    'nav.loading': 'LOADING',
    'nav.settings': 'Settings',
    'nav.volume': 'Volume',
    'nav.multicast': 'Multicast',
    'nav.multicastDesc': 'Chance of x2 / x3 / x4 on spin',
    'nav.changeBg': 'Change background',

    // Main Menu
    'main.tagline': 'Spin. Describe. Guess.',
    'main.normal': 'Normal Mode',
    'main.normalDesc': 'Play without a room (classic)',
    'main.create': 'Create Room',
    'main.createDesc': 'Generate a code and invite friends',
    'main.rooms': 'Room List',
    'main.roomsDesc': 'Join an existing room',
    'main.version': 'VERSION 1.1 • MULTIPLAYER READY FOR RELEASE',

    // Role Menu
    'role.title': 'Choose your role',
    'role.subtitle': 'One leader spins and gives hints. Others cross out heroes.',
    'role.mode': 'MODE',
    'role.heroes': 'Heroes',
    'role.items': 'Items',
    'role.abilities': 'Abilities',
    'role.leaderBadge': 'FOR LEADER',
    'role.leaderTitle': 'Leader',
    'role.leaderDesc': 'The reel opens with a {mode} and a letter.\nYou see the combo and give descriptions to the others.',
    'role.leaderCta': 'OPEN THE REEL',
    'role.guesserBadge': 'FOR GUESSERS',
    'role.guesserTitle': 'Guesser',
    'role.guesserDesc': 'A large table of all {mode} in Dota 2.\nClick icons — they turn gray (crossed out).',
    'role.guesserCta': 'OPEN THE TABLE',
    'role.company': 'PLAY WITH FRIENDS',

    // Room
    'room.code': 'ROOM',
    'room.players': 'Players connected',
    'room.leader': 'Leader',
    'room.guesser': 'Guesser',
    'room.start': 'START GAME',
    'room.waitLeader': 'Wait for the leader to start the game...',
    'room.statusLeaderConnect': 'You are the leader. Connecting to room...',
    'room.statusGuesserConnect': 'You are a guesser. Connecting to room...',
    'room.statusLeaderReady': 'You are the leader. Connection established. Press "Start game" when everyone has joined.',
    'room.statusGuesserReady': 'You are a guesser. Connection established. Wait for the leader to start the game.',

    // Leader view
    'leader.spin': 'SPIN',
    'leader.spinAgain': 'SPIN AGAIN',
    'leader.spinning': 'SPINNING...',
    'leader.letter': 'LETTER',
    'leader.history': 'SPIN HISTORY',
    'leader.clear': 'CLEAR',
    'leader.empty': 'EMPTY. SPIN — RESULTS WILL APPEAR HERE.',
    'leader.table': 'GUESSERS TABLE (read-only)',
    'leader.onLetter': 'ON LETTER',

    // Guesser view
    'guesser.tableHeroes': 'HEROES TABLE — CROSS OUT',
    'guesser.tableItems': 'ITEMS TABLE — CROSS OUT',
    'guesser.tableAbilities': 'ABILITIES TABLE — CROSS OUT',
    'guesser.reset': 'RESET',
    'guesser.free': 'Free crosses left:',
    'guesser.cd': 'Cooldown:',
    'guesser.search': 'Search...',
    'guesser.sort': 'SORT:',
    'guesser.az': 'A → Z',
    'guesser.za': 'Z → A',
    'guesser.str': 'STR',
    'guesser.agi': 'AGI',
    'guesser.int': 'INT',
    'guesser.uni': 'UNI',

    // Modals
    'modal.howto': 'HOW TO PLAY',
    'modal.howto1': 'At the start, everyone picks a role: {leader} or {guesser}.',
    'modal.howto2': 'The leader spins the reels and gets a {heroLetter}. Gives a description starting with that letter.',
    'modal.howto3': 'Guessers click icons in the table — they become gray (crossed out).',
    'modal.howtoBtn': 'GOT IT, LET\'S GO!',
    'modal.confirmCancel': 'CANCEL',
    'modal.confirmYes': 'YES',

    'modal.donationTitle': 'Multiplayer in development',
    'modal.donationMsg': 'COLLECTING DONATIONS FOR HOST @mrmdkkkk',
    'modal.roomCreated': 'Room created',
    'modal.roomCode': 'Code:',
    'modal.copyLink': 'Link copied',

    'modal.clearHistoryTitle': 'Clear history',
    'modal.clearHistoryMsg': 'Clear all spin history?',
    'modal.resetElimTitle': 'Reset crossed out',
    'modal.resetElimHeroes': 'Reset all crossed out heroes?',
    'modal.resetElimItems': 'Reset all crossed out items?',
    'modal.resetElimAbilities': 'Reset all crossed out abilities?',

    'roomList.title': 'Room list',
    'roomList.empty': 'No rooms yet. Create one or enter a code.',
    'roomList.orEnter': 'Or enter room code:',
    'roomList.placeholder': 'ABCDEF',
    'roomList.join': 'Join',

    // Misc
    'misc.loading': 'LOADING',
    'misc.hero': 'hero',
    'misc.item': 'item',
    'misc.ability': 'ability',
    'misc.heroes': 'heroes',
    'misc.items': 'items',
    'misc.abilities': 'abilities',
  },
};

export function t(lang: Language, key: string): string {
  return dict[lang]?.[key] ?? key;
}

// Dynamic mode word (for descriptions)
export function getModeWord(lang: Language, mode: 'heroes' | 'items' | 'abilities', capitalized = false): string {
  const key = mode === 'heroes' ? 'misc.hero' : mode === 'items' ? 'misc.item' : 'misc.ability';
  let word = t(lang, key);
  if (capitalized) word = word.charAt(0).toUpperCase() + word.slice(1);
  return word;
}

export function getModePlural(lang: Language, mode: 'heroes' | 'items' | 'abilities'): string {
  if (mode === 'heroes') return t(lang, 'misc.heroes');
  if (mode === 'items') return t(lang, 'misc.items');
  return t(lang, 'misc.abilities');
}

export function getAlphabet(lang: Language): string {
  return lang === 'ru'
    ? 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЮЯ'
    : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
}

export function getSortLabel(lang: Language, sort: string, isHeroMode: boolean): string {
  if (sort === 'az') return t(lang, 'guesser.az');
  if (sort === 'za') return t(lang, 'guesser.za');
  if (!isHeroMode) return sort.toUpperCase();

  const map: Record<string, string> = {
    str: t(lang, 'guesser.str'),
    agi: t(lang, 'guesser.agi'),
    int: t(lang, 'guesser.int'),
    uni: t(lang, 'guesser.uni'),
  };
  return map[sort] || sort.toUpperCase();
}

export function getAttrLabel(lang: Language, attr: string): string {
  if (lang === 'en') {
    const en: Record<string, string> = {
      str: 'STRENGTH',
      agi: 'AGILITY',
      int: 'INTELLIGENCE',
      uni: 'UNIVERSAL',
    };
    return en[attr] || 'ATTRIBUTE';
  }
  const ru: Record<string, string> = {
    str: 'СИЛА',
    agi: 'ЛОВКОСТЬ',
    int: 'ИНТЕЛЛЕКТ',
    uni: 'УНИВЕРСАЛ',
  };
  return ru[attr] || 'АТРИБУТ';
}
