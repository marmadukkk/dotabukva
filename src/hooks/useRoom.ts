import { useRef, useCallback, useState } from 'react';
import { Language } from '../i18n';

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
}

function isElectronDesktop(): boolean {
  return !!(typeof window !== 'undefined' && window.dotaDesktop?.isElectron);
}

function generateClientRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

export function useRoom(props: UseRoomProps) {
  const {
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
  } = props;

  const roomSocketRef = useRef<WebSocket | null>(null);
  const handleRoomMessageRef = useRef<(msg: any) => void>(() => {});
  const [lanHost, setLanHost] = useState<string | null>(null);
  const [lanPort, setLanPort] = useState<number | null>(null);
  const [lanAddresses, setLanAddresses] = useState<string[]>([]);

  const sendRoomMessage = useCallback((data: any) => {
    if (roomSocketRef.current && roomSocketRef.current.readyState === WebSocket.OPEN) {
      roomSocketRef.current.send(JSON.stringify(data));
    }
  }, []);

  const handleRoomMessage = useCallback((msg: any) => {
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
      const newElim = new Set<string>(msg.eliminated);
      setEliminatedHeroes(newElim);
    }
    if (msg.type === 'game_started') {
      handleGameStartedFromWS();
    }
    if (msg.type === 'state' && msg.game_started) {
      handleGameStartedFromWS();
    }
    if (msg.type === 'elim_personal') {
      setMyFreeElims(msg.free_elims || 0);
      setMyLastElim(msg.last_elim_time || 0);
      stopElimCD();
      if ((msg.free_elims || 0) <= 0 && msg.last_elim_time) {
        const rem = Math.max(0, 25 - (Date.now() / 1000 - msg.last_elim_time));
        if (rem > 0) startElimCD(rem);
      }
    }
    if (msg.players !== undefined) {
      setRoomPlayers(msg.players);
    }
    if (msg.type === 'error' && msg.message === 'wrong_room') {
      setLobbyStatus('Неверный код комнаты.');
    }
  }, [
    setLastResult,
    setEliminatedHeroes,
    handleGameStartedFromWS,
    setMyFreeElims,
    setMyLastElim,
    stopElimCD,
    startElimCD,
    setRoomPlayers,
    landReelResult,
    onRemoteSpinResult,
    setLobbyStatus,
  ]);

  handleRoomMessageRef.current = handleRoomMessage;

  const connectToRoomWS = useCallback((opts: {
    code: string;
    role?: string;
    host?: string;
    port?: number;
  }) => {
    const code = opts.code.toUpperCase();
    const role = opts.role || 'guesser';
    const electron = isElectronDesktop();

    // Cloud / Vercel: WS disabled (no persistent server) — desktop LAN only for real sync
    if (!electron && (API_BASE || window.location.hostname.includes('vercel.app') || import.meta.env.PROD)) {
      setLobbyStatus('Мультиплеер по сети доступен в десктоп-версии (LAN).');
      return;
    }

    if (roomSocketRef.current) {
      try { roomSocketRef.current.close(); } catch {}
    }

    let url: string;
    if (electron) {
      const host = opts.host || '127.0.0.1';
      const port = opts.port || 17432;
      url = `ws://${host}:${port}/ws?role=${encodeURIComponent(role)}&room=${encodeURIComponent(code)}`;
      setLanHost(host);
      setLanPort(port);
    } else {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      url = `${proto}//${location.host}/ws/room/${code}?role=${role}`;
    }

    const ws = new WebSocket(url);
    roomSocketRef.current = ws;

    ws.onopen = () => {
      const status = role === 'leader'
        ? 'Вы ведущий. Соединение установлено. Нажмите «Начать игру», когда все подключатся.'
        : 'Вы отгадывающий. Соединение установлено. Ожидайте, пока ведущий начнёт игру.';
      setLobbyStatus(status);
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        handleRoomMessageRef.current(msg);
      } catch {}
    };
    ws.onerror = () => {
      setLobbyStatus('Ошибка соединения. Проверьте IP хоста и что комната запущена.');
    };
    ws.onclose = () => {
      roomSocketRef.current = null;
    };
  }, [API_BASE, setLobbyStatus]);

  const createRoom = useCallback(async () => {
    // Desktop LAN host
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

      const my = JSON.parse(localStorage.getItem('dota_bukva_my_rooms') || '[]');
      if (!my.includes(code)) {
        my.push(code);
        localStorage.setItem('dota_bukva_my_rooms', JSON.stringify(my));
      }

      setLobbyStatus('Вы ведущий. Подключаемся к комнате...');
      connectToRoomWS({
        code,
        role: 'leader',
        host: '127.0.0.1',
        port: info.port,
      });
      return { code, lan: info };
    }

    // Remote API (if available)
    try {
      const res = await fetch(`${API_BASE}/api/rooms/create`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setCurrentRoom(data.code);
        setIsRoomLeader(true);
        const my = JSON.parse(localStorage.getItem('dota_bukva_my_rooms') || '[]');
        if (!my.includes(data.code)) {
          my.push(data.code);
          localStorage.setItem('dota_bukva_my_rooms', JSON.stringify(my));
        }
        setLobbyStatus('Вы ведущий. Подключаемся к комнате...');
        connectToRoomWS({ code: data.code, role: 'leader' });
        return { code: data.code };
      }
    } catch {}

    // Web fallback demo (local only, no real sync)
    const code = generateClientRoomCode();
    setCurrentRoom(code);
    setIsRoomLeader(true);
    let roomsL = JSON.parse(localStorage.getItem('dota_bukva_rooms') || '[]');
    roomsL = roomsL.filter((r: any) => r.code !== code);
    roomsL.unshift({ code, created: Date.now() });
    localStorage.setItem('dota_bukva_rooms', JSON.stringify(roomsL));
    const my = JSON.parse(localStorage.getItem('dota_bukva_my_rooms') || '[]');
    if (!my.includes(code)) {
      my.push(code);
      localStorage.setItem('dota_bukva_my_rooms', JSON.stringify(my));
    }
    setLobbyStatus('Демо-комната (без сети). Для LAN используйте десктоп-версию.');
    return { code, demo: true };
  }, [API_BASE, setCurrentRoom, setIsRoomLeader, setLobbyStatus, connectToRoomWS]);

  const showRoomList = useCallback(async (
    setRoomsList: (rooms: any[]) => void,
    setJoinCodeInput: (val: string) => void,
    setShowModal: (show: boolean) => void
  ) => {
    let rooms: any[] = [];
    if (!isElectronDesktop()) {
      try {
        const res = await fetch(`${API_BASE}/api/rooms`);
        if (res.ok) {
          const data = await res.json();
          rooms = data.rooms || [];
        } else {
          throw new Error('backend not available');
        }
      } catch {
        rooms = JSON.parse(localStorage.getItem('dota_bukva_rooms') || '[]');
      }
    }
    setRoomsList(rooms);
    setJoinCodeInput('');
    setShowModal(true);
  }, [API_BASE]);

  const joinRoom = useCallback((opts: { code: string; host?: string; port?: number }, onCloseModal?: () => void) => {
    const c = opts.code.toUpperCase();
    const electron = isElectronDesktop();
    const host = opts.host || lanHost || '127.0.0.1';
    const port = opts.port || lanPort || 17432;

    setCurrentRoom(c);

    const my = JSON.parse(localStorage.getItem('dota_bukva_my_rooms') || '[]');
    const leader = my.includes(c) && host === '127.0.0.1';
    setIsRoomLeader(leader);

    if (electron) {
      setLanHost(host);
      setLanPort(port);
    }

    setLobbyStatus(leader
      ? 'Вы ведущий. Подключаемся к комнате...'
      : 'Вы отгадывающий. Подключаемся к комнате...');

    connectToRoomWS({
      code: c,
      role: leader ? 'leader' : 'guesser',
      host: electron ? host : undefined,
      port: electron ? port : undefined,
    });

    if (onCloseModal) onCloseModal();
  }, [setCurrentRoom, setIsRoomLeader, setLobbyStatus, connectToRoomWS, lanHost, lanPort]);

  const showRoomLobby = useCallback((code: string, leader: boolean) => {
    setCurrentRoom(code);
    setIsRoomLeader(leader);
    setLobbyStatus(leader
      ? 'Вы ведущий. Подключаемся к комнате...'
      : 'Вы отгадывающий. Подключаемся к комнате...');
  }, [setCurrentRoom, setIsRoomLeader, setLobbyStatus]);

  const startGameFromLobby = useCallback(() => {
    sendRoomMessage({ type: 'start_game' });
    handleGameStartedFromWS();
  }, [sendRoomMessage, handleGameStartedFromWS]);

  const leaveRoom = useCallback(async () => {
    if (roomSocketRef.current) {
      try { roomSocketRef.current.close(); } catch {}
      roomSocketRef.current = null;
    }
    if (isElectronDesktop() && window.dotaDesktop?.lan) {
      try { await window.dotaDesktop.lan.stopHost(); } catch {}
    }
    setCurrentRoom(null);
    setIsRoomLeader(false);
    setGameStarted(false);
    setLobbyStatus('');
    setLanHost(null);
    setLanPort(null);
    setLanAddresses([]);
    setRoomPlayers(1);
  }, [setCurrentRoom, setIsRoomLeader, setGameStarted, setLobbyStatus, setRoomPlayers]);

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
    generateClientRoomCode,
    lanHost,
    lanPort,
    lanAddresses,
    setLanHost,
    setLanPort,
  };
}
