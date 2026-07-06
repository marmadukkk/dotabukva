import { useRef, useCallback } from 'react';
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
  setMyFreeElimsOnJoin?: (elims: number) => void;
  stopElimCD: () => void;
  startElimCD: (secs: number) => void;
  handleGameStartedFromWS: () => void;
  landReelResult?: (result: any) => void;
}

export function useRoom(props: UseRoomProps) {
  const {
    language,
    currentMode,
    API_BASE,
    loadData,
    setCurrentRoom,
    setIsRoomLeader,
    setRoomPlayers,
    setLobbyStatus,
    setGameStarted,
    setLastResult,
    setEliminatedHeroes,
    setMyFreeElims,
    setMyLastElim,
    setCurrentRole,
    stopElimCD,
    startElimCD,
    handleGameStartedFromWS,
    landReelResult,
  } = props;

  const roomSocketRef = useRef<WebSocket | null>(null);

  const connectToRoomWS = useCallback((code: string, role = 'guesser') => {
    // WebSocket disabled for Vercel deployment (no persistent server)
    if (API_BASE || window.location.hostname.includes('vercel.app') || import.meta.env.PROD) {
      return;
    }
    if (roomSocketRef.current) {
      try { roomSocketRef.current.close(); } catch {}
    }
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${location.host}/ws/room/${code}?role=${role}`;
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
        handleRoomMessage(msg);
      } catch {}
    };
    ws.onclose = () => {
      roomSocketRef.current = null;
    };
  }, [API_BASE, setLobbyStatus]);

  const sendRoomMessage = useCallback((data: any) => {
    if (roomSocketRef.current && roomSocketRef.current.readyState === WebSocket.OPEN) {
      roomSocketRef.current.send(JSON.stringify(data));
    }
  }, []);

  const handleRoomMessage = useCallback((msg: any) => {
    if (msg.type === 'spin_result' && msg.result) {
      // This would need access to isRoomLeader / currentRole
      // For now, delegate to parent via props if needed
      if (landReelResult) {
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
        const rem = Math.max(0, 25 - (Date.now()/1000 - msg.last_elim_time));
        if (rem > 0) startElimCD(rem);
      }
    }
    if (msg.players !== undefined) {
      setRoomPlayers(msg.players);
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
    landReelResult
  ]);

  const handleGameStartedFromWSLocal = useCallback(() => {
    setGameStarted(true);
    // The actual role setting and loadData is handled in parent
  }, [setGameStarted]);

  function generateClientRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = ''; 
    for(let i = 0; i < 6; i++) c += chars[Math.floor(Math.random()*chars.length)]; 
    return c;
  }

  const createRoom = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/rooms/create`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setCurrentRoom(data.code);
        setIsRoomLeader(true);
        
        // Update local rooms list
        const my = JSON.parse(localStorage.getItem('dota_bukva_my_rooms') || '[]');
        if (!my.includes(data.code)) { 
          my.push(data.code); 
          localStorage.setItem('dota_bukva_my_rooms', JSON.stringify(my)); 
        }
        
        // Show lobby
        setLobbyStatus('Вы ведущий. Подключаемся к комнате...');
        
        connectToRoomWS(data.code, 'leader');
      }
    } catch {
      // fallback client demo room
      const code = generateClientRoomCode();
      setCurrentRoom(code); 
      setIsRoomLeader(true);
      
      let roomsL = JSON.parse(localStorage.getItem('dota_bukva_rooms') || '[]');
      roomsL = roomsL.filter((r: any) => r.code !== code); 
      roomsL.unshift({code, created: Date.now()});
      localStorage.setItem('dota_bukva_rooms', JSON.stringify(roomsL));
      
      const my = JSON.parse(localStorage.getItem('dota_bukva_my_rooms') || '[]'); 
      if(!my.includes(code)) {
        my.push(code);
        localStorage.setItem('dota_bukva_my_rooms', JSON.stringify(my));
      }
      
      setLobbyStatus('Вы ведущий. Подключаемся к комнате...');
    }
  }, [API_BASE, setCurrentRoom, setIsRoomLeader, setLobbyStatus, connectToRoomWS]);

  const showRoomList = useCallback(async (setRoomsList: (rooms: any[]) => void, setJoinCodeInput: (val: string) => void, setShowModal: (show: boolean) => void) => {
    let rooms: any[] = [];
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
    setRoomsList(rooms);
    setJoinCodeInput('');
    setShowModal(true);
  }, [API_BASE]);

  const joinRoom = useCallback((code: string, onCloseModal?: () => void) => {
    const c = code.toUpperCase();
    setCurrentRoom(c);
    
    const my = JSON.parse(localStorage.getItem('dota_bukva_my_rooms') || '[]');
    const leader = my.includes(c);
    setIsRoomLeader(leader);
    
    if (!leader) { 
      // Reset personal elims for guesser
    }
    
    setLobbyStatus(leader ? 'Вы ведущий. Подключаемся к комнате...' : 'Вы отгадывающий. Подключаемся к комнате...');
    
    connectToRoomWS(c, leader ? 'leader' : 'guesser');

    if (onCloseModal) onCloseModal();
  }, [setCurrentRoom, setIsRoomLeader, setLobbyStatus, connectToRoomWS]);

  const showRoomLobby = useCallback((code: string, leader: boolean) => {
    setCurrentRoom(code);
    setIsRoomLeader(leader);
    setLobbyStatus(leader ? 'Вы ведущий. Подключаемся к комнате...' : 'Вы отгадывающий. Подключаемся к комнате...');
  }, [setCurrentRoom, setIsRoomLeader, setLobbyStatus]);

  const startGameFromLobby = useCallback(() => {
    sendRoomMessage({ type: 'start_game' });
    handleGameStartedFromWS();
  }, [sendRoomMessage, handleGameStartedFromWS]);

  const leaveRoom = useCallback(() => {
    if (roomSocketRef.current) { 
      try { roomSocketRef.current.close(); } catch {}
      roomSocketRef.current = null; 
    }
    setCurrentRoom(null); 
    setIsRoomLeader(false); 
    setGameStarted(false);
    setLobbyStatus('');
  }, [setCurrentRoom, setIsRoomLeader, setGameStarted, setLobbyStatus]);

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
    handleGameStartedFromWS: handleGameStartedFromWSLocal,
    generateClientRoomCode,
  };
}
