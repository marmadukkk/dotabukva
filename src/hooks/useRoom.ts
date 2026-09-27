import { useRef, useCallback, useState } from 'react';
import { Language, t } from '../i18n';
import {
  MpTransport,
  generateRoomCode,
  DEFAULT_LAN_PORT,
  FREE_ELIMS_INITIAL,
  isElectronDesktop,
  getApiBase,
  getPreferredTransport,
  isOnlineMultiplayerConfigured,
  buildRoomWsUrl,
  remainingElimCd,
  sanitizeNick,
} from '../multiplayer';

export interface RoomSeat {
  id: string;
  name: string;
  role: 'leader' | 'guesser';
  ready?: boolean;
}

export interface RoomTurn {
  id: string;
  name: string;
  deadline: number;
}

export interface RoomReel {
  winnerId: string;
  winnerIndex: number;
  endsAt: number;
  names: string[];
}

interface UseRoomProps {
  language: Language;
  currentMode: 'heroes' | 'items' | 'abilities';
  API_BASE: string;
  loadData: (mode: 'heroes' | 'items' | 'abilities') => Promise<any[]>;
  setCurrentRoom: (room: string | null) => void;
  setIsRoomLeader: (leader: boolean) => void;
  setRoomPlayers: (players: number) => void;
  setLobbyStatus: (status: string) => void;
  setGameStarted: (started: boolean) => void;
  setLastResult: (result: any) => void;
  setEliminatedHeroes: (elim: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setMyFreeElims: (elims: number) => void;
  setMyLastElim: (time: number) => void;
  setCurrentRole: (role: 'leader' | 'guesser' | null) => void;
  stopElimCD: () => void;
  startElimCD: (secs: number) => void;
  handleGameStartedFromWS: () => void;
  landReelResult?: (result: any) => void;
  /** Optional: animate spin for remote results (leader view) */
  onRemoteSpinResult?: (result: any) => void;
  nick?: string;
  onAssignRole?: (role: 'leader' | 'guesser') => void;
  onRoundWon?: (info: { winnerName: string; hero: string; role: 'leader' | 'guesser' }) => void;
}

export function useRoom(props: UseRoomProps) {
  const {
    language,
    API_BASE,
    setCurrentRoom,
    setIsRoomLeader,
    setRoomPlayers,
    setLobbyStatus,
    setGameStarted,
    setLastResult,
    setEliminatedHeroes,
    setMyFreeElims,
    setMyLastElim,
    stopElimCD,
    startElimCD,
    handleGameStartedFromWS,
    landReelResult,
    onRemoteSpinResult,
    nick,
    onAssignRole,
    onRoundWon,
  } = props;

  const [roster, setRoster] = useState<RoomSeat[]>([]);
  const [countdownEndsAt, setCountdownEndsAt] = useState<number | null>(null);
  const [reel, setReel] = useState<RoomReel | null>(null);
  const [turn, setTurn] = useState<RoomTurn | null>(null);
  const [selfId, setSelfId] = useState<string | null>(null);
  const selfIdRef = useRef<string | null>(null);
  const reelWinnerRef = useRef<string>('');
  const nickRef = useRef(nick || '');
  nickRef.current = nick || '';

  const roomSocketRef = useRef<WebSocket | null>(null);
  const handleRoomMessageRef = useRef<(msg: any) => void>(() => {});
  /** Active transport for this session (lan | online | local). */
  const [transport, setTransport] = useState<MpTransport>('none');
  const transportRef = useRef<MpTransport>('none');
  const [lanHost, setLanHost] = useState<string | null>(null);
  const [lanPort, setLanPort] = useState<number | null>(null);
  const [lanAddresses, setLanAddresses] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const setTransportBoth = useCallback((t: MpTransport) => {
    transportRef.current = t;
    setTransport(t);
  }, []);

  const sendRoomMessage = useCallback((data: any) => {
    if (roomSocketRef.current && roomSocketRef.current.readyState === WebSocket.OPEN) {
      roomSocketRef.current.send(JSON.stringify(data));
    }
  }, []);

  /** True when messages can leave this client (LAN/online socket open). */
  const isNetworkRoom = useCallback(() => {
    const t = transportRef.current;
    return (
      (t === 'lan' || t === 'online') &&
      !!roomSocketRef.current &&
      roomSocketRef.current.readyState === WebSocket.OPEN
    );
  }, []);

  const applyElimPersonal = useCallback(
    (free: number, last: number) => {
      setMyFreeElims(free);
      setMyLastElim(last);
      stopElimCD();
      const rem = remainingElimCd({ freeElims: free, lastElimTime: last });
      if (rem > 0) startElimCD(Math.ceil(rem));
    },
    [setMyFreeElims, setMyLastElim, stopElimCD, startElimCD]
  );

  const handleRoomMessage = useCallback(
    (msg: any) => {
      if (msg.type === 'spin_result' && msg.result) {
        if (onRemoteSpinResult) {
          onRemoteSpinResult(msg.result);
        } else if (landReelResult) {
          landReelResult(msg.result);
        } else {
          setLastResult(msg.result);
        }
      }
      if (msg.type === 'state' && msg.current_spin) {
        setLastResult(msg.current_spin);
      }
      if ((msg.type === 'state' || msg.type === 'eliminated_update') && msg.eliminated) {
        setEliminatedHeroes(new Set<string>(msg.eliminated));
      }
      if (msg.type === 'elim_personal') {
        applyElimPersonal(msg.free_elims || 0, msg.last_elim_time || 0);
      }
      if (Array.isArray(msg.roster)) {
        setRoster(msg.roster);
      }
      if (msg.type === 'countdown' && typeof msg.endsAt === 'number') {
        setCountdownEndsAt(msg.endsAt);
        setReel(null);
      }
      if (msg.type === 'countdown_cancel') {
        setCountdownEndsAt(null);
      }
      if (msg.type === 'reel') {
        const winnerId = String(msg.winnerId || '');
        const seats = Array.isArray(msg.roster) ? (msg.roster as RoomSeat[]) : [];
        const names = seats.length
          ? seats.map((seat) => seat.name)
          : Array.isArray(msg.names)
            ? msg.names.map(String)
            : [];
        const found = seats.findIndex((seat) => seat.id === winnerId);
        reelWinnerRef.current = winnerId;
        setCountdownEndsAt(null);
        setReel({
          winnerId,
          winnerIndex: found >= 0 ? found : 0,
          endsAt: typeof msg.endsAt === 'number' ? msg.endsAt : Date.now() + 3200,
          names,
        });
      }
      if (msg.type === 'turn') {
        setTurn(
          msg.playerId
            ? {
                id: String(msg.playerId),
                name: String(msg.name || ''),
                deadline: typeof msg.deadline === 'number' ? msg.deadline : 0,
              }
            : null
        );
      }
      if (msg.type === 'round_won') {
        setTurn(null);
      }
      if (msg.type === 'state') {
        if (msg.phase === 'lobby') {
          setCountdownEndsAt(null);
          setReel(null);
        }
        if (typeof msg.countdownEndsAt === 'number' && msg.countdownEndsAt > 0) {
          setCountdownEndsAt(msg.countdownEndsAt);
        }
        if (msg.phase === 'playing') setReel(null);
        if (msg.turnPlayerId && typeof msg.turnDeadline === 'number' && msg.turnDeadline > 0) {
          const seat = Array.isArray(msg.roster)
            ? msg.roster.find((item: RoomSeat) => item.id === msg.turnPlayerId)
            : null;
          setTurn({
            id: String(msg.turnPlayerId),
            name: seat?.name || '',
            deadline: msg.turnDeadline,
          });
        }
        if (!msg.turnDeadline) setTurn(null);
      }
      if (typeof msg.you === 'string' && msg.you) {
        selfIdRef.current = msg.you;
        setSelfId(msg.you);
      }
      if (msg.type === 'game_started') {
        const you = (typeof msg.you === 'string' && msg.you) || selfIdRef.current;
        const winner = reelWinnerRef.current;
        const role: 'leader' | 'guesser' | '' =
          winner && you
            ? winner === you
              ? 'leader'
              : 'guesser'
            : msg.role === 'leader' || msg.role === 'guesser'
              ? msg.role
              : '';
        if (role) onAssignRole?.(role);
        handleGameStartedFromWS();
      } else if (msg.role === 'leader' || msg.role === 'guesser') {
        onAssignRole?.(msg.role);
      }
      if (msg.type === 'round_won') {
        const you = selfIdRef.current;
        const seat = Array.isArray(msg.roster)
          ? msg.roster.find((item: RoomSeat) => item.id === you)
          : null;
        const role: 'leader' | 'guesser' =
          seat?.role || (msg.winnerId && msg.winnerId === you ? 'leader' : 'guesser');
        onAssignRole?.(role);
        onRoundWon?.({
          winnerName: String(msg.winnerName || ''),
          hero: String(msg.hero || ''),
          role,
        });
      }
      if (msg.players !== undefined) {
        setRoomPlayers(msg.players);
      }
      if (msg.type === 'error' && msg.message === 'wrong_room') {
        setLobbyStatus('Неверный код комнаты.');
      }
    },
    [
      setLastResult,
      setEliminatedHeroes,
      handleGameStartedFromWS,
      applyElimPersonal,
      setRoomPlayers,
      landReelResult,
      onRemoteSpinResult,
      onAssignRole,
      onRoundWon,
      setLobbyStatus,
    ]
  );

  handleRoomMessageRef.current = handleRoomMessage;

  const connectToRoomWS = useCallback(
    (opts: {
      code: string;
      role?: string;
      host?: string;
      port?: number;
      transport?: MpTransport;
      nick?: string;
    }) => {
      const code = opts.code.toUpperCase();
      const role = opts.role || 'guesser';
      const mode: MpTransport =
        opts.transport ||
        (isElectronDesktop() ? 'lan' : isOnlineMultiplayerConfigured() ? 'online' : 'local');

      setTransportBoth(mode);

      // Local session: full client mechanics, no socket (web until online backend)
      if (mode === 'local' || mode === 'none') {
        setIsConnected(false);
        setLobbyStatus(
          role === 'leader'
            ? t(language, 'room.statusLocalLeader')
            : t(language, 'room.statusLocalGuesser')
        );
        applyElimPersonal(FREE_ELIMS_INITIAL, 0);
        return;
      }

      const url = buildRoomWsUrl({
        code,
        role,
        transport: mode,
        host: opts.host,
        port: opts.port,
        nick: opts.nick || nickRef.current,
      });

      if (!url) {
        setIsConnected(false);
        setLobbyStatus(t(language, 'room.errUrl'));
        return;
      }

      if (mode === 'lan') {
        setLanHost(opts.host || '127.0.0.1');
        setLanPort(opts.port || DEFAULT_LAN_PORT);
      }

      if (roomSocketRef.current) {
        try {
          roomSocketRef.current.close();
        } catch {}
      }

      const ws = new WebSocket(url);
      roomSocketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setLobbyStatus(
          role === 'leader'
            ? t(language, 'room.statusLeaderReady')
            : t(language, 'room.statusGuesserReady')
        );
      };
      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          handleRoomMessageRef.current(msg);
        } catch {}
      };
      ws.onerror = () => {
        setIsConnected(false);
        setLobbyStatus(t(language, mode === 'lan' ? 'room.errLan' : 'room.errOnline'));
      };
      ws.onclose = () => {
        if (roomSocketRef.current === ws) {
          roomSocketRef.current = null;
          setIsConnected(false);
        }
      };
    },
    [language, setLobbyStatus, setTransportBoth, applyElimPersonal]
  );

  const rememberRoomCode = (code: string) => {
    try {
      const my = JSON.parse(localStorage.getItem('dota_bukva_my_rooms') || '[]');
      if (!my.includes(code)) {
        my.push(code);
        localStorage.setItem('dota_bukva_my_rooms', JSON.stringify(my));
      }
    } catch {}
  };

  const createRoom = useCallback(async () => {
    // ── Desktop: LAN host ──────────────────────────────────────────
    if (isElectronDesktop() && window.dotaDesktop?.lan) {
      setLobbyStatus('Запускаем хост в локальной сети...');
      const info = await window.dotaDesktop.lan.startHost({});
      if (!info || 'error' in info) {
        setLobbyStatus(`Не удалось запустить LAN-хост: ${(info as any)?.error || 'unknown'}`);
        return null;
      }
      const code = info.room;
      setCurrentRoom(code);
      setIsRoomLeader(true);
      setLanAddresses(info.addresses || []);
      setLanHost(info.primaryAddress);
      setLanPort(info.port);
      rememberRoomCode(code);
      setLobbyStatus('Вы ведущий. Подключаемся к комнате...');
      connectToRoomWS({
        code,
        role: 'leader',
        host: '127.0.0.1',
        port: info.port,
        transport: 'lan',
        nick: nickRef.current,
      });
      return { code, lan: info, transport: 'lan' as const };
    }

    // ── Web online (Cloudflare worker, or any host that speaks this protocol)
    if (!isElectronDesktop() && isOnlineMultiplayerConfigured()) {
      const api = API_BASE || getApiBase();
      let code = '';
      if (api) {
        try {
          const res = await fetch(`${api}/api/rooms/create`, { method: 'POST' });
          if (res.ok) {
            const data = await res.json();
            if (data?.code) code = String(data.code).toUpperCase();
          }
        } catch {}
      }
      if (!code) code = generateRoomCode();
      setCurrentRoom(code);
      setIsRoomLeader(true);
      setRoomPlayers(1);
      try {
        let roomsL = JSON.parse(localStorage.getItem('dota_bukva_rooms') || '[]');
        roomsL = roomsL.filter((r: any) => r.code !== code);
        roomsL.unshift({ code, created: Date.now() });
        localStorage.setItem('dota_bukva_rooms', JSON.stringify(roomsL));
      } catch {}
      rememberRoomCode(code);
      setLobbyStatus(t(language, 'room.statusLeaderConnect'));
      connectToRoomWS({ code, role: 'leader', transport: 'online', nick: nickRef.current });
      return { code, transport: 'online' as const };
    }

    // ── Web local session: full MP client mechanics, no network ────
    // Online multiplayer will replace this; not LAN.
    const code = generateRoomCode();
    setCurrentRoom(code);
    setIsRoomLeader(true);
    setRoomPlayers(1);
    try {
      let roomsL = JSON.parse(localStorage.getItem('dota_bukva_rooms') || '[]');
      roomsL = roomsL.filter((r: any) => r.code !== code);
      roomsL.unshift({ code, created: Date.now() });
      localStorage.setItem('dota_bukva_rooms', JSON.stringify(roomsL));
    } catch {}
    rememberRoomCode(code);
    setLobbyStatus(
      'Локальная сессия (веб). Онлайн-мультиплеер скоро — не LAN. Все механики комнаты доступны.'
    );
    connectToRoomWS({ code, role: 'leader', transport: 'local', nick: nickRef.current });
    return { code, transport: 'local' as const, local: true };
  }, [
    API_BASE,
    setCurrentRoom,
    setIsRoomLeader,
    language,
    setLobbyStatus,
    setRoomPlayers,
    connectToRoomWS,
  ]);

  const showRoomList = useCallback(
    async (
      setRoomsList: (rooms: any[]) => void,
      setJoinCodeInput: (val: string) => void,
      setShowModal: (show: boolean) => void
    ) => {
      let rooms: any[] = [];
      // LAN has no public room list — host IP join only
      if (!isElectronDesktop()) {
        const api = API_BASE || getApiBase();
        if (api) {
          try {
            const res = await fetch(`${api}/api/rooms`);
            if (res.ok) {
              const data = await res.json();
              rooms = data.rooms || [];
            }
          } catch {}
        }
        let localRooms: any[] = [];
        try {
          localRooms = JSON.parse(localStorage.getItem('dota_bukva_rooms') || '[]');
        } catch {
          localRooms = [];
        }
        const seen = new Set(rooms.map((room: { code?: string }) => room.code));
        for (const room of localRooms) {
          if (room?.code && !seen.has(room.code)) rooms.push(room);
        }
      }
      setRoomsList(rooms);
      setJoinCodeInput('');
      setShowModal(true);
    },
    [API_BASE]
  );

  const joinRoom = useCallback(
    (
      opts: { code: string; host?: string; port?: number },
      onCloseModal?: () => void
    ) => {
      const c = opts.code.toUpperCase();
      const electron = isElectronDesktop();
      const mode: MpTransport = electron
        ? 'lan'
        : isOnlineMultiplayerConfigured()
          ? 'online'
          : 'local';

      const host = opts.host || lanHost || '127.0.0.1';
      const port = opts.port || lanPort || DEFAULT_LAN_PORT;

      setCurrentRoom(c);

      let leader = false;
      try {
        const my = JSON.parse(localStorage.getItem('dota_bukva_my_rooms') || '[]');
        leader = electron
          ? my.includes(c) && host === '127.0.0.1'
          : my.includes(c);
      } catch {}
      setIsRoomLeader(leader);

      if (electron) {
        setLanHost(host);
        setLanPort(port);
      }

      setLobbyStatus(
        leader
          ? 'Вы ведущий. Подключаемся к комнате...'
          : 'Вы отгадывающий. Подключаемся к комнате...'
      );

      connectToRoomWS({
        code: c,
        role: leader ? 'leader' : 'guesser',
        host: electron ? host : undefined,
        port: electron ? port : undefined,
        transport: mode,
        nick: nickRef.current,
      });

      if (onCloseModal) onCloseModal();
    },
    [
      setCurrentRoom,
      setIsRoomLeader,
      setLobbyStatus,
      connectToRoomWS,
      lanHost,
      lanPort,
    ]
  );

  const showRoomLobby = useCallback(
    (code: string, leader: boolean) => {
      setCurrentRoom(code);
      setIsRoomLeader(leader);
      setLobbyStatus(
        leader
          ? 'Вы ведущий. Подключаемся к комнате...'
          : 'Вы отгадывающий. Подключаемся к комнате...'
      );
    },
    [setCurrentRoom, setIsRoomLeader, setLobbyStatus]
  );

  const startGameFromLobby = useCallback(() => {
    // Network rooms: notify peers. Local: client-only start (same mechanics).
    sendRoomMessage({ type: 'start_game' });
    handleGameStartedFromWS();
  }, [sendRoomMessage, handleGameStartedFromWS]);

  const leaveRoom = useCallback(async () => {
    if (roomSocketRef.current) {
      try {
        roomSocketRef.current.close();
      } catch {}
      roomSocketRef.current = null;
    }
    if (isElectronDesktop() && window.dotaDesktop?.lan) {
      try {
        await window.dotaDesktop.lan.stopHost();
      } catch {}
    }
    setCurrentRoom(null);
    setIsRoomLeader(false);
    setGameStarted(false);
    setLobbyStatus('');
    setLanHost(null);
    setLanPort(null);
    setLanAddresses([]);
    setRoomPlayers(1);
    setIsConnected(false);
    setTransportBoth('none');
    stopElimCD();
  }, [
    setCurrentRoom,
    setIsRoomLeader,
    setGameStarted,
    setLobbyStatus,
    setRoomPlayers,
    setTransportBoth,
    stopElimCD,
  ]);

  return {
    roomSocketRef,
    connectToRoomWS,
    sendRoomMessage,
    handleRoomMessage,
    createRoom,
    showRoomList,
    joinRoom,
    showRoomLobby,
    startGameFromLobby,
    leaveRoom,
    generateClientRoomCode: generateRoomCode,
    lanHost,
    lanPort,
    lanAddresses,
    setLanHost,
    setLanPort,
    transport,
    isConnected,
    isNetworkRoom,
    preferredTransport: getPreferredTransport(),
    isOnlineConfigured: isOnlineMultiplayerConfigured(),
    applyElimPersonal,
    roster,
    selfId,
    countdownEndsAt,
    reel,
    turn,
    sendNick: (name: string) => {
      sendRoomMessage({ type: 'set_nick', name: sanitizeNick(name) });
    },
    sendReady: (ready: boolean) => {
      sendRoomMessage({ type: 'ready', ready });
    },
  };
}
