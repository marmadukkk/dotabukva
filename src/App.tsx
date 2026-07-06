import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { createGlobalStyle } from 'styled-components';

import { SpinResult, HistoryEntry } from './types';
import { getEntryImage, getAttrColor } from './utils';
import { Language, t, getAlphabet, getModeWord, getModePlural, getAttrLabel } from './i18n';

// Components
import MainMenu from './components/MainMenu';
import RoleMenu from './components/RoleMenu';
import RoomLobby from './components/RoomLobby';
import LeaderView from './components/LeaderView';
import GuesserView from './components/GuesserView';
import HowToModal from './components/HowToModal';
import ConfirmModal from './components/ConfirmModal';
import RoomListModal from './components/RoomListModal';
import Background from './components/Background';
import Nav from './components/Nav';
import LoadingOverlay from './components/LoadingOverlay';

// Hooks
import { useAudio } from './hooks/useAudio';
import { useReels } from './hooks/useReels';
import { useData } from './hooks/useData';
import { useRoom } from './hooks/useRoom';
import { useElimination } from './hooks/useElimination';
import { useHistory } from './hooks/useHistory';
import { useMulticast } from './hooks/useMulticast';
import { useModals } from './hooks/useModals';
import { useSpin } from './hooks/useSpin';

// Global styles (minimal - most in index.html)
const GlobalStyle = createGlobalStyle``;

const App: React.FC = () => {
  // All state first
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('dota_bukva_lang') as Language;
      return saved === 'en' || saved === 'ru' ? saved : 'ru';
    } catch {
      return 'ru';
    }
  });
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Core states
  const [currentRole, setCurrentRole] = useState<'leader' | 'guesser' | null>(null);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [isRoomLeader, setIsRoomLeader] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [currentGuesserSort, setCurrentGuesserSort] = useState<'az' | 'za' | 'str' | 'agi' | 'int' | 'uni'>('az');
  const [guesserSearch, setGuesserSearch] = useState('');
  const [roomPlayers, setRoomPlayers] = useState(1);
  const [lobbyStatus, setLobbyStatus] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  // Background and screen state (kept minimal)

  const languageRef = useRef(language);
  useEffect(() => { languageRef.current = language; }, [language]);

  const loadingTimeoutRef = React.useRef<number | null>(null);

  // Data
  const data = useData();
  const { 
    heroesData, 
    currentMode,
    isLoadingData, 
    isTableImagesLoading, 
    pendingTableImagesRef, 
    setIsTableImagesLoading,
    setIsLoadingData,
    loadData: loadDataHook,
    setHeroesData,
    setCurrentMode 
  } = data;

  // Hooks (state provided by hooks)
  const audio = useAudio();
  const { playSpinSounds, playDing, playMulticastSound } = audio;
  const reels = useReels({ heroesData, language, currentMode });



  const multicast = useMulticast(playMulticastSound);
  const { 
    multicastLevel, setMulticastLevel, 
    currentMultiplier, setCurrentMultiplier, 
    sparks, setSparks,
    triggerMulticastSequence, resetMulticast 
  } = multicast;



  const historyHook = useHistory();
  const { history, setHistory, logSpin, clearHistory: clearHistoryHook } = historyHook;

  const spinHook = useSpin({
    language,
    currentMode,
    heroesData,
    currentRoom,
    isRoomLeader,
    reels,
    audio,
    setIsSpinning,
    setLastResult,
    setCurrentMultiplier,
    setMulticastLevel,
    setSparks,
    setHistory,
    launchConfetti: () => {},
  });
  const { spin: spinFromHook } = spinHook;

  const modals = useModals();
  const { 
    showHowto, setShowHowto,
    confirmModal, setConfirmModal,
    showRoomListModal, setShowRoomListModal,
    roomsList, setRoomsList,
    joinCodeInput, setJoinCodeInput,
    showConfirm, hideConfirm, showHostingDonation, showRoomInvite, closeRoomListModal 
  } = modals;

  // room declared earlier


  // elimination after room


  const BG_STORAGE_KEY = 'dota_bukva_background_index';

  const backgroundVideos = [
    '/videos/background.mp4',
    '/videos/background2.mp4',
    '/videos/background3.mp4',
    '/videos/background4.mp4',
    '/videos/background5.mp4',
  ];

  const [currentBgIndex, setCurrentBgIndex] = useState(() => {
    try {
      const saved = localStorage.getItem(BG_STORAGE_KEY);
      if (saved !== null) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < backgroundVideos.length) {
          return parsed;
        }
      }
    } catch {}
    return 0;
  });
  const [activeVideo, setActiveVideo] = useState(0); // 0 or 1 for which video element is currently visible
  const [isTransitioning, setIsTransitioning] = useState(false);

  const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

  const room = useRoom({
    language,
    currentMode,
    API_BASE: API_BASE,
    loadData: loadDataHook,
    setCurrentRoom,
    setIsRoomLeader,
    setRoomPlayers,
    setLobbyStatus,
    setGameStarted,
    setLastResult,
    setEliminatedHeroes: () => {},
    setMyFreeElims: () => {},
    setMyLastElim: () => {},
    setCurrentRole,
    stopElimCD: () => {},
    startElimCD: () => {},
    handleGameStartedFromWS: () => {
      setGameStarted(true);
      if (isRoomLeader) {
        setCurrentRole('leader');
      } else {
        setCurrentRole('guesser');
        setMyFreeElims(3);
        setMyLastElim(0);
      }
      loadDataHook(currentMode);
    },
    landReelResult: (result: any) => setLastResult(result),
  });

  // Persist background index to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(BG_STORAGE_KEY, currentBgIndex.toString());
    } catch {}
  }, [currentBgIndex]);

  // Persist language
  useEffect(() => {
    try {
      localStorage.setItem('dota_bukva_lang', language);
    } catch {}
  }, [language]);

  // Background init is now handled inside Background component

  // Room list modal state
  // modals state in hook


  const roomSocketRef = useRef<WebSocket | null>(null);
  const elimCDIntervalRef = useRef<number | null>(null);

  function getFallbackHeroes() {
    return [
      {"en":"Pudge","ru":"Pudge","short":"pudge","attr":"str"},
      {"en":"Invoker","ru":"Invoker","short":"invoker","attr":"int"},
      {"en":"Anti-Mage","ru":"Anti-Mage","short":"antimage","attr":"agi"},
      {"en":"Crystal Maiden","ru":"Crystal Maiden","short":"crystal_maiden","attr":"int"},
      {"en":"Juggernaut","ru":"Juggernaut","short":"juggernaut","attr":"agi"}
    ];
  }

  const changeBackground = () => {
    if (isTransitioning) return;
    const nextIndex = (currentBgIndex + 1) % backgroundVideos.length;
    setIsTransitioning(true);
    setActiveVideo(1 - activeVideo);
    setCurrentBgIndex(nextIndex);
    setTimeout(() => setIsTransitioning(false), 700);
  };

  // Filter abilities to only those whose icon actually loads (prevents pudge_lg.png placeholder in table)
  async function filterValidAbilityIcons(abilities: any[]): Promise<any[]> {
    if (!abilities || abilities.length === 0) return abilities;

    const CACHE_KEY = 'dota_valid_ability_shorts_v1';
    const allShorts = abilities.map(a => a.short);

    // Try cache first for instant filtering
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const validShorts: string[] = JSON.parse(cached);
        const cachedSet = new Set(validShorts);
        // If most of current list is covered by cache, use it (fast path)
        const fromCache = abilities.filter(a => cachedSet.has(a.short));
        if (fromCache.length > 0 && fromCache.length >= Math.floor(allShorts.length * 0.7)) {
          return fromCache;
        }
      }
    } catch {}

    const valid: any[] = [];
    const CONCURRENCY = 10;

    const checkIcon = (item: any): Promise<boolean> =>
      new Promise((resolve) => {
        const url = getEntryImage(item.short, 'abilities');
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });

    for (let i = 0; i < abilities.length; i += CONCURRENCY) {
      const batch = abilities.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(checkIcon));
      batch.forEach((item, idx) => {
        if (results[idx]) valid.push(item);
      });
    }

    // Save shorts to cache for next time
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(valid.map(v => v.short)));
    } catch {}

    return valid;
  }

  // Rebuild strips when data, mode or language changes (delegated to useReels hook)
  useEffect(() => {
    if (heroesData.length > 0) {
      setTimeout(() => {
        reels.buildHeroStrip();
        reels.buildLetterStrip();
      }, 30);
    }
  }, [heroesData, reels.buildHeroStrip, reels.buildLetterStrip, language]);

  // Init: load data, history, URL room
  useEffect(() => {
    (async () => {
      const list = await loadDataHook('heroes');
      if (!list.length) {
        const fb = getFallbackHeroes();
        setHeroesData(fb);
      }
      // Initial random transform for strips (like original)
      setTimeout(() => {
        const h = reels.heroStripRef.current; const l = reels.letterStripRef.current;
        if (h) h.style.transition = 'none';
        if (l) l.style.transition = 'none';
        if (h) h.style.transform = `translateY(-${Math.floor(Math.random()*9)*78 + 30}px)`;
        if (l) l.style.transform = `translateY(-${Math.floor(Math.random()*9)*110 + 40}px)`;
        setTimeout(() => {
          if (h) h.style.transition = 'transform 420ms cubic-bezier(0.23, 1, 0.32, 1)';
          if (l) l.style.transition = 'transform 420ms cubic-bezier(0.23, 1, 0.32, 1)';
        }, 60);
      }, 120);

      // history
      try {
        const savedH = JSON.parse(localStorage.getItem('dota_bukva_history') || '[]');
        setHistory(savedH);
      } catch {}

      // eliminated
      try {
        const savedE = JSON.parse(localStorage.getItem('dota_bukva_eliminated') || '[]');
        setEliminatedHeroes(new Set(savedE));
      } catch {}

      // URL room support
      const params = new URLSearchParams(window.location.search);
      const roomFromUrl = params.get('room');
      if (roomFromUrl) {
        const code = roomFromUrl.toUpperCase();
        setCurrentRoom(code);
        const myRooms = JSON.parse(localStorage.getItem('dota_bukva_my_rooms') || '[]');
        const leader = myRooms.includes(code);
        setIsRoomLeader(leader);
        if (!leader) {
          setMyFreeElims(3); setMyLastElim(0);
        }
        // connect later after render
        setTimeout(() => {
          showRoomLobby(code, leader);
          connectToRoomWS(code, leader ? 'leader' : 'guesser');
        }, 200);
      }
      updateNavRoomVisual();
    })();
  }, []);

  // Audio from hook (declared above)


  // Yellow sparks effect - more intense for higher multipliers
  function emitSparks(count = 8, intensity = 1) {
    const newSparks: {id: string, tx: number, ty: number, delay: number, size: number}[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 25 + Math.random() * 55 * intensity;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist * 0.7 - 15; // upward bias
      newSparks.push({
        id: Date.now() + '-' + i + Math.random(),
        tx: tx,
        ty: ty,
        delay: Math.random() * 120,
        size: 3 + Math.random() * 5 * intensity
      });
    }
    setSparks(prev => [...prev, ...newSparks].slice(-35));
    setTimeout(() => {
      setSparks(current => current.filter(s => !newSparks.some(ns => ns.id === s.id)));
    }, 900);
  }

  // triggerMulticastSequence from useMulticast hook


  // Confetti (exact)
  function launchConfetti(count = 40) {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed'; canvas.style.left = '0'; canvas.style.top = '0';
    canvas.style.pointerEvents = 'none'; canvas.style.zIndex = '99999';
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;
    const particles: any[] = [];
    const colors = ['#c23c2a', '#d4af37', '#f4f4f5', '#22c55e'];
    for (let i = 0; i < count; i++) {
      particles.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height*0.6-40, size: 4+Math.random()*7, speed: 2.5+Math.random()*3.5, angle: Math.random()*Math.PI*2, color: colors[Math.floor(Math.random()*colors.length)], rot: Math.random()*6-3 });
    }
    let frame = 0; const max = 92;
    function draw() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      let alive=0;
      particles.forEach(p => {
        p.y += p.speed; p.x += Math.sin(p.angle)*1.6; p.angle += 0.08; p.rot += 0.1;
        if (p.y < canvas.height + 30) alive++;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6); ctx.restore();
      });
      frame++;
      if (frame < max && alive > 0) requestAnimationFrame(draw); else canvas.remove();
    }
    draw();
  }

  // Spin logic moved to useSpin hook
  const spin = spinFromHook;

  function getSortedHeroes() {
    let list = [...heroesData];
    const m = currentMode;
    if (currentGuesserSort === 'az') list.sort((a,b)=>a.en.localeCompare(b.en));
    else if (currentGuesserSort === 'za') list.sort((a,b)=>b.en.localeCompare(a.en));
    else if (['str','agi','int','uni'].includes(currentGuesserSort) && m === 'heroes') {
      list = list.filter(h => h.attr === currentGuesserSort);
      list.sort((a,b)=>a.en.localeCompare(b.en));
    }
    return list;
  }

  // Elimination logic moved to useElimination hook
  const handleTableImageLoad = (short: string) => {
    const pending = pendingTableImagesRef.current;
    if (pending.has(short)) {
      pending.delete(short);
      if (pending.size === 0) {
        setIsTableImagesLoading(false);
      }
    }
  };

  const setGuesserSort = (s: any) => {
    setCurrentGuesserSort(s);
  };

  // startElimCD defined earlier
  // stopElimCD and startElimCD defined earlier for useRoom hook

  const connectToRoomWS = room.connectToRoomWS || (() => {});
  const sendRoomMessage = room.sendRoomMessage || (() => {});
  const handleRoomMessage = room.handleRoomMessage || (() => {});
  const handleGameStartedFromWS = room.handleGameStartedFromWS || (() => {});

  // Navigation / screen switching (exact hide/show + history)
  const [screen, setScreen] = useState<'main-menu' | 'role-menu' | 'room-lobby' | 'leader-view' | 'guesser-view'>('main-menu');

  const [myFreeElims, setMyFreeElims] = useState(3);
  const [myLastElim, setMyLastElim] = useState(0);
  const [eliminatedHeroes, setEliminatedHeroes] = useState<Set<string>>(new Set());
  const [elimCD, setElimCD] = useState(0);

  const toggleEliminated = (short: string) => {
    setEliminatedHeroes(prev => {
      const next = new Set(prev);
      if (next.has(short)) next.delete(short); else next.add(short);
      return next;
    });
  };

  const resetEliminatedFn = () => {
    setEliminatedHeroes(new Set());
  };

  // Refresh translated lobby status when language changes
  useEffect(() => {
    if (screen === 'room-lobby' && currentRoom) {
      const leader = isRoomLeader;
      const newStatus = leader 
        ? t(language, 'room.statusLeaderConnect') 
        : t(language, 'room.statusGuesserConnect');
      setLobbyStatus(newStatus);
    }
  }, [language, screen, currentRoom, isRoomLeader]);

  // Ensure correct data for the reel when mode or leader context changes
  useEffect(() => {
    if ((screen === 'leader-view' || currentRole === 'leader') && currentMode) {
      loadDataHook(currentMode).then(() => {
        setTimeout(() => {
          reels.buildHeroStrip();
          reels.buildLetterStrip();
        }, 20);
      });
    }
  }, [currentMode, screen, currentRole]);

  function switchToScreen(s: any, push = true) {
    setScreen(s);
    if (push) {
      try { window.history.pushState({ screen: s }, '', window.location.pathname); } catch {}
    }
    if (s === 'leader-view') {
      // rebuild reels
      setTimeout(() => { reels.buildHeroStrip(); reels.buildLetterStrip(); }, 60);
    }
  }

  window.onpopstate = (ev: any) => {
    if (ev.state?.screen) switchToScreen(ev.state.screen, false);
    else switchToScreen('main-menu', false);
  };

  // Role / mode
  async function enterLeader() {
    setCurrentRole('leader');
    localStorage.setItem('dota_bukva_role', 'leader');
    switchToScreen('leader-view');
    await loadDataHook(currentMode);
    setTimeout(() => {
      reels.buildHeroStrip(); reels.buildLetterStrip();
    }, 50);
    updateNavRoleVisual();
    if (currentRoom) connectToRoomWS(currentRoom, 'leader');
  }
  async function enterGuesser() {
    setCurrentRole('guesser');
    localStorage.setItem('dota_bukva_role', 'guesser');
    switchToScreen('guesser-view');
    await loadDataHook(currentMode);
    updateNavRoleVisual();
    if (currentRoom) {
      connectToRoomWS(currentRoom, 'guesser');
    }
  }

  function showRoleMenu() {
    switchToScreen('role-menu');
    setCurrentRole(null);
    updateNavRoleVisual();
  }

  function startNormalMode() {
    setCurrentRoom(null);
    setIsRoomLeader(false);
    switchToScreen('role-menu');
  }

  // Room flows now from hook
  const createRoom = room.createRoom;
  const generateClientRoomCode = room.generateClientRoomCode;
  const showRoomList = () => room.showRoomList(setRoomsList, setJoinCodeInput, setShowRoomListModal);
  // close from modals

  const joinRoom = (code: string) => room.joinRoom(code, closeRoomListModal);
  const showRoomLobby = room.showRoomLobby;
  const startGameFromLobby = room.startGameFromLobby;
  const leaveRoom = room.leaveRoom;

  function updateNavRoomVisual() {
    // The nav room badge is rendered in JSX below
  }
  function updateNavRoleVisual() { /* handled in render */ }

  // modals functions from hook


  // Render helpers for grid
  const filteredSorted = React.useMemo(() => {
    const list = getSortedHeroes();
    const q = guesserSearch.trim().toLowerCase();
    return list.map(h => ({
      ...h,
      _match: !q || h.ru.toLowerCase().includes(q) || h.en.toLowerCase().includes(q)
    }));
  }, [heroesData, currentGuesserSort, guesserSearch, currentMode]);

  // Track table image loading for guesser view - reset pending only when actual data changes (not on search/sort)
  React.useEffect(() => {
    if (screen !== 'guesser-view') {
      pendingTableImagesRef.current.clear();
      setIsTableImagesLoading(false);
      return;
    }
    if (filteredSorted.length === 0) {
      pendingTableImagesRef.current.clear();
      setIsTableImagesLoading(false);
      return;
    }
    // New batch
    pendingTableImagesRef.current = new Set(filteredSorted.map(h => h.short));
    setIsTableImagesLoading(true);
  }, [screen, heroesData, currentMode]);  // only on data/mode change, not search/sort

  // Update nav on room change
  useEffect(() => { updateNavRoomVisual(); }, [currentRoom]);

  // After render, mark any already-complete (cached) images as loaded
  React.useEffect(() => {
    if (screen !== 'guesser-view' || !isTableImagesLoading) return;
    const id = setTimeout(() => {
      const grid = document.getElementById('hero-grid');
      if (!grid) return;
      const imgs = grid.querySelectorAll('img');
      const pending = pendingTableImagesRef.current;
      imgs.forEach((imgEl) => {
        const cell = (imgEl as HTMLElement).closest('.hero-cell');
        const short = cell?.getAttribute('data-short');
        const img = imgEl as HTMLImageElement;
        if (short && pending.has(short) && img.complete) {
          pending.delete(short);
        }
      });
      if (pending.size === 0) {
        setIsTableImagesLoading(false);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [screen, filteredSorted, isTableImagesLoading]);

  // Safety timeout: hide loading overlay after 2 seconds no matter what
  React.useEffect(() => {
    const shouldShowLoading = (isLoadingData && screen === 'leader-view') || 
                              (screen === 'guesser-view' && (isLoadingData || isTableImagesLoading));

    if (shouldShowLoading) {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      loadingTimeoutRef.current = window.setTimeout(() => {
        setIsLoadingData(false);
        setIsTableImagesLoading(false);
        pendingTableImagesRef.current.clear();
        loadingTimeoutRef.current = null;
      }, 2000);
    } else {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    };
  }, [isLoadingData, isTableImagesLoading, screen]);

  // Keyboard space to spin (leader)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === ' ' || e.key === 'Spacebar') && !isSpinning && currentRole === 'leader') {
        e.preventDefault();
        spin();
      }
      if (e.key.toLowerCase() === '?' ) setShowHowto(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isSpinning, currentRole]);

  // The JSX: EXACT structure from original HTML
  return (
    <>
      <GlobalStyle />

      {/* Background videos component */}
      <Background
        currentBgIndex={currentBgIndex}
        activeVideo={activeVideo}
        isTransitioning={isTransitioning}
        backgroundVideos={backgroundVideos}
        onChangeBackground={changeBackground}
      />

      {/* NAV */}
      <Nav
        language={language}
        currentRole={currentRole}
        currentRoom={currentRoom}
        showLangMenu={showLangMenu}
        onShowRoleMenu={showRoleMenu}
        onShowHowto={() => setShowHowto(true)}
        onLeaveRoom={leaveRoom}
        onToggleLangMenu={() => setShowLangMenu(!showLangMenu)}
        onChangeLanguage={(lang) => {
          setLanguage(lang);
          setShowLangMenu(false);
        }}
        onLogoClick={() => {
          setCurrentRoom(null);
          setIsRoomLeader(false);
          setCurrentRole(null);
          setGameStarted(false);
          setLastResult(null);
          setScreen('main-menu');
        }}
      />

      {/* MAIN MENU */}
      {screen === 'main-menu' && (
        <MainMenu
          language={language}
          onStartNormal={startNormalMode}
          onCreateRoom={() => showHostingDonation((key) => t(language, key))}
          onShowRooms={showRoomList}
        />
      )}

      {/* ROLE MENU */}
      {screen === 'role-menu' && (
        <RoleMenu
          language={language}
          currentMode={currentMode}
          onLoadMode={(mode) => loadDataHook(mode)}
          onEnterLeader={enterLeader}
          onEnterGuesser={enterGuesser}
        />
      )}

      {/* ROOM LOBBY */}
      {screen === 'room-lobby' && currentRoom && (
        <RoomLobby
          language={language}
          roomCode={currentRoom}
          roomPlayers={roomPlayers}
          isLeader={isRoomLeader}
          lobbyStatus={lobbyStatus}
          onStartGame={startGameFromLobby}
          onLeave={leaveRoom}
        />
      )}

      {/* LEADER VIEW */}
      {screen === 'leader-view' && (
        <LeaderView
          language={language}
          heroReelRef={reels.heroReelRef}
          letterReelRef={reels.letterReelRef}
          heroStripRef={reels.heroStripRef}
          letterStripRef={reels.letterStripRef}
          currentMode={currentMode}
          isSpinning={isSpinning}
          lastResult={lastResult}
          history={history}
          multicastLevel={multicastLevel}
          sparks={sparks}
          currentRoom={currentRoom}
          isRoomLeader={isRoomLeader}
          eliminatedHeroes={eliminatedHeroes}
          filteredSorted={filteredSorted}
          onSpin={spin}
          onClearHistory={() => clearHistoryHook(showConfirm)}
          onSelectHistory={(r) => setLastResult(r)}
        />
      )}

      {/* GUESSER VIEW */}
      {screen === 'guesser-view' && (
        <GuesserView
          language={language}
          currentMode={currentMode}
          eliminatedHeroes={eliminatedHeroes}
          currentGuesserSort={currentGuesserSort}
          guesserSearch={guesserSearch}
          myFreeElims={myFreeElims}
          elimCD={elimCD || 0}
          currentRoom={currentRoom}
          filteredSorted={filteredSorted}
          totalCount={heroesData.length}
          onSetGuesserSort={(s) => setGuesserSort(s)}
          onSearchChange={setGuesserSearch}
          onToggleEliminated={toggleEliminated}
          onResetEliminated={resetEliminatedFn}
          onImageLoad={handleTableImageLoad}
        />
      )}

      {/* Loading Overlay */}
      <LoadingOverlay
        language={language}
        isLoadingData={isLoadingData}
        isTableImagesLoading={isTableImagesLoading}
        screen={screen}
      />

      {/* HOW TO MODAL */}
      <HowToModal language={language} open={showHowto} onClose={() => setShowHowto(false)} />

      {/* CONFIRM MODAL */}
      <ConfirmModal 
        language={language}
        show={confirmModal.show} 
        title={confirmModal.title} 
        message={confirmModal.message} 
        onConfirm={hideConfirm} 
      />

      {/* ROOM LIST MODAL */}
      <RoomListModal 
        language={language}
        open={showRoomListModal} 
        rooms={roomsList} 
        onClose={closeRoomListModal} 
        onJoin={joinRoom} 
      />

    </>
  );
};

export default App;
