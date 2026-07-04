import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { createGlobalStyle } from 'styled-components';

// Types
interface SpinResult {
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

interface HistoryEntry {
  hero: string;
  letter: string;
  text?: string;
  short?: string;
  attr?: string;
  color?: string;
  image?: string;
  ts: number;
}

interface RoomInfo {
  code: string;
  created?: number;
  players?: number;
}

// Global styles (minimal - most in index.html)
const GlobalStyle = createGlobalStyle``;

// Helper: get image url
function getEntryImage(short: string, mode: string): string {
  if (mode === 'items') return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/${short}_lg.png`;
  if (mode === 'abilities') return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/${short}.png`;
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/${short}_lg.png`;
}

function getAttrColor(attr: string): string {
  const colors: Record<string, string> = {
    'str': '#f97316', 'agi': '#22c55e', 'int': '#a855f7', 'uni': '#eab308',
    'item': '#60a5fa', 'neutral': '#a78bfa', 'ability': '#67e8f9'
  };
  return colors[attr] || '#71717a';
}

const App: React.FC = () => {
  // State mirroring original variables
  const [heroesData, setHeroesData] = useState<any[]>([]);
  const [currentMode, setCurrentMode] = useState<'heroes' | 'items' | 'abilities'>('heroes');
  const [currentRole, setCurrentRole] = useState<'leader' | 'guesser' | null>(null);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [isRoomLeader, setIsRoomLeader] = useState(false);

  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);

  // Multicast / multiplier display (Ogre Magi style)
  const [multicastLevel, setMulticastLevel] = useState(0); // current shown x level during sequence
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [sparks, setSparks] = useState<{id: string, tx: number, ty: number, delay: number, size: number}[]>([]); // yellow sparks for higher multipliers

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [eliminatedHeroes, setEliminatedHeroes] = useState<Set<string>>(new Set());

  const [currentGuesserSort, setCurrentGuesserSort] = useState<'az' | 'za' | 'str' | 'agi' | 'int' | 'uni'>('az');
  const [guesserSearch, setGuesserSearch] = useState('');

  // Room state
  const [roomPlayers, setRoomPlayers] = useState(1);
  const [lobbyStatus, setLobbyStatus] = useState('');
  const [gameStarted, setGameStarted] = useState(false);

  // Personal CD
  const [myFreeElims, setMyFreeElims] = useState(3);
  const [myLastElim, setMyLastElim] = useState(0);
  const [elimCD, setElimCD] = useState(0);

  // Modals
  const [showHowto, setShowHowto] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ show: boolean; title: string; message: string; onConfirm?: () => void }>({ show: false, title: '', message: '' });

  // Room list modal state
  const [showRoomListModal, setShowRoomListModal] = useState(false);
  const [roomsList, setRoomsList] = useState<any[]>([]);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // Refs for reels (DOM manipulation for animations to match original exactly)
  const heroStripRef = useRef<HTMLDivElement>(null);
  const letterStripRef = useRef<HTMLDivElement>(null);
  const heroReelRef = useRef<HTMLDivElement>(null);
  const letterReelRef = useRef<HTMLDivElement>(null);

  const roomSocketRef = useRef<WebSocket | null>(null);
  const elimCDIntervalRef = useRef<number | null>(null);

  // Load data (exact same endpoints)
  const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

  const loadData = useCallback(async (mode: string) => {
    // If API base is set, try backend first (for custom backend)
    if (API_BASE) {
      let endpoint = `${API_BASE}/api/heroes`;
      let key = 'heroes';
      if (mode === 'items') { endpoint = `${API_BASE}/api/items`; key = 'items'; }
      else if (mode === 'abilities') { endpoint = `${API_BASE}/api/abilities`; key = 'abilities'; }

      try {
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          const list = data[key] || data.heroes || data.items || data.abilities || [];
          setHeroesData(list);
          setCurrentMode(mode as any);
          return list;
        }
      } catch (e) {
        console.warn('Backend fetch failed, using client-side data');
      }
    }

    // Client-side data loading (works on Vercel without backend)
    if (mode === 'heroes') {
      try {
        const res = await fetch('/data/heroes.json');
        const d = await res.json();
        const list = d.heroes || [];
        setHeroesData(list);
        setCurrentMode(mode as any);
        return list;
      } catch {
        const fb = getFallbackHeroes();
        setHeroesData(fb);
        setCurrentMode(mode as any);
        return fb;
      }
    } else if (mode === 'items') {
      // Simple client fetch for items (no heavy filtering for Vercel simplicity)
      try {
        const res = await fetch('https://api.opendota.com/api/constants/items');
        const raw = await res.json();
        const list = Object.keys(raw)
          .filter(k => !k.startsWith('item_recipe_') && !k.startsWith('recipe_') && raw[k].dname)
          .slice(0, 100)
          .map(k => ({
            en: raw[k].dname,
            ru: raw[k].dname,
            short: k.replace('item_', ''),
            attr: 'item'
          }));
        setHeroesData(list);
        setCurrentMode(mode as any);
        return list;
      } catch {
        setHeroesData([]);
        setCurrentMode(mode as any);
        return [];
      }
    } else if (mode === 'abilities') {
      try {
        const res = await fetch('https://api.opendota.com/api/constants/abilities');
        const raw = await res.json();
        const list = Object.keys(raw)
          .filter(k => raw[k].dname && k.includes('_') && !k.includes('special_bonus'))
          .slice(0, 50)
          .map(k => ({
            en: raw[k].dname,
            ru: raw[k].dname,
            short: k,
            attr: 'ability'
          }));
        setHeroesData(list);
        setCurrentMode(mode as any);
        return list;
      } catch {
        const list = getFallbackAbilities();
        setHeroesData(list);
        setCurrentMode(mode as any);
        return list;
      }
    }

    const fb = getFallbackHeroes();
    setHeroesData(fb);
    setCurrentMode(mode as any);
    return fb;
  }, []);

  function getFallbackHeroes() {
    return [
      {"en":"Pudge","ru":"Pudge","short":"pudge","attr":"str"},
      {"en":"Invoker","ru":"Invoker","short":"invoker","attr":"int"},
      {"en":"Anti-Mage","ru":"Anti-Mage","short":"antimage","attr":"agi"},
      {"en":"Crystal Maiden","ru":"Crystal Maiden","short":"crystal_maiden","attr":"int"},
      {"en":"Juggernaut","ru":"Juggernaut","short":"juggernaut","attr":"agi"}
    ];
  }

  function getFallbackAbilities() {
    return [
      {"en":"Meat Hook","ru":"Meat Hook","short":"pudge_meat_hook","attr":"ability"},
      {"en":"Sun Strike","ru":"Sun Strike","short":"invoker_sun_strike","attr":"ability"},
      {"en":"Blink","ru":"Blink","short":"antimage_blink","attr":"ability"}
    ];
  }

  // Build strips (port of buildHeroStrip / buildLetterStrip)
  const buildHeroStrip = useCallback(() => {
    const strip = heroStripRef.current;
    if (!strip || !heroesData.length) return;
    strip.innerHTML = '';
    const duplicates = 15;
    for (let d = 0; d < duplicates; d++) {
      heroesData.forEach((hero, idx) => {
        const item = document.createElement('div');
        item.className = `slot-item text-white flex items-center gap-x-3`;
        item.dataset.heroRu = hero.ru;
        item.dataset.heroEn = hero.en;
        item.dataset.idx = String(idx);
        const color = getAttrColor(hero.attr);
        item.innerHTML = `
          <div class="flex items-center gap-x-3 w-full">
            <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${color}"></div>
            <span class="font-semibold truncate">${hero.en}</span>
          </div>`;
        strip.appendChild(item);
      });
    }
    (strip as any).dataset.itemCount = String(heroesData.length);
    (strip as any).dataset.duplicates = String(duplicates);
  }, [heroesData]);

  const buildLetterStrip = useCallback(() => {
    const strip = letterStripRef.current;
    if (!strip) return;
    strip.innerHTML = '';
    const letters = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЮЯ".split('');
    const duplicates = 20;
    for (let d = 0; d < duplicates; d++) {
      letters.forEach(letter => {
        const item = document.createElement('div');
        item.className = `slot-item text-white flex items-center justify-center font-display`;
        item.dataset.letter = letter;
        item.textContent = letter;
        strip.appendChild(item);
      });
    }
    (strip as any).dataset.itemCount = String(letters.length);
    (strip as any).dataset.duplicates = String(duplicates);
  }, []);

  // Rebuild strips when data or mode changes (for leader reels)
  useEffect(() => {
    if (heroesData.length > 0) {
      // Only rebuild when in leader view context
      setTimeout(() => {
        buildHeroStrip();
        buildLetterStrip();
      }, 30);
    }
  }, [heroesData, buildHeroStrip, buildLetterStrip]);

  // Init: load data, history, URL room
  useEffect(() => {
    (async () => {
      const list = await loadData('heroes');
      if (!list.length) {
        const fb = getFallbackHeroes();
        setHeroesData(fb);
      }
      // Initial random transform for strips (like original)
      setTimeout(() => {
        const h = heroStripRef.current; const l = letterStripRef.current;
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

  // Audio helpers (exact port)
  let audioCtx: AudioContext | null = null;
  function getAudioContext() {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioCtx;
  }
  function playTick(volume = 0.08) {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator(); const gain = ctx.createGain(); const filter = ctx.createBiquadFilter();
      osc.type = 'square'; osc.frequency.value = 620 + Math.random() * 80;
      filter.type = 'lowpass'; filter.frequency.value = 1400; gain.gain.value = volume;
      osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => { gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.035); setTimeout(() => osc.stop(), 50); }, 4);
    } catch {}
  }
  function playSpinSounds(totalDuration: number) {
    const tickInterval = 38; let elapsed = 0;
    const iv = setInterval(() => {
      if (elapsed > totalDuration + 80) { clearInterval(iv); return; }
      const progress = elapsed / totalDuration;
      const vol = Math.max(0.015, 0.09 * (1 - progress * 0.7));
      playTick(vol);
      elapsed += tickInterval;
    }, tickInterval);
  }
  function playDing() {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator(); const gain = ctx.createGain(); const filter = ctx.createBiquadFilter();
      osc.type = 'sine'; osc.frequency.value = 780; filter.type = 'lowpass'; filter.frequency.value = 2200;
      gain.gain.value = 0.35;
      osc.connect(filter); filter.connect(gain); gain.connect(ctx.destination); osc.start();
      setTimeout(() => { gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.65); setTimeout(() => osc.stop(), 720); }, 90);
    } catch {}
  }

  // Multicast sounds (Ogre Magi style)
  function playMulticastSound(level: number) {
    try {
      const audio = new Audio(`/sounds/x${level}.mp3`);
      audio.volume = 0.9;
      audio.play().catch(() => {});
    } catch (e) {}
  }

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

  // Show the flashy multicast text with sequential animation (like Ogre Magi)
  function triggerMulticastSequence(multi: number) {
    if (!multi || multi < 1) multi = 1;

    setMulticastLevel(0);
    setSparks([]); // clear previous sparks

    // x1 always shows first
    setTimeout(() => {
      setMulticastLevel(1);
      playMulticastSound(1);
      emitSparks(6, 0.8); // more noticeable even on x1
    }, 50);

    if (multi >= 2) {
      setTimeout(() => {
        setMulticastLevel(2);
        playMulticastSound(2);
        emitSparks(14, 1.3);
      }, 480);
    }
    if (multi >= 3) {
      setTimeout(() => {
        setMulticastLevel(3);
        playMulticastSound(3);
        emitSparks(22, 1.8); // intense
      }, 480 * 2);
    }
    if (multi >= 4) {
      setTimeout(() => {
        setMulticastLevel(4);
        playMulticastSound(4);
        emitSparks(32, 2.5); // very intense
        // extra bursts for x4
        setTimeout(() => emitSparks(18, 2.0), 120);
        setTimeout(() => emitSparks(14, 1.7), 280);
      }, 480 * 3);
    }

    // Keep the final level visible for a moment, then optionally hide or leave
    const keepTime = multi >= 3 ? 1600 : 900;
    setTimeout(() => {
      // We leave it visible until next spin or result is shown
    }, 480 * (multi - 1) + keepTime);
  }

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

  // Animate reel (core fidelity - ported from original animateReel)
  async function animateReel(strip: HTMLDivElement, targetIndex: number, duration: number, isLetter: boolean): Promise<void> {
    return new Promise((resolve) => {
      const items = Array.from(strip.children) as HTMLElement[];
      if (!items.length) { resolve(); return; }
      let safeIndex = Math.max(0, Math.min(targetIndex, items.length - 1));
      const targetItem = items[safeIndex];
      const itemHeightActual = targetItem.offsetHeight || (isLetter ? 110 : 78);
      const windowEl = strip.parentElement as HTMLElement;
      const windowHeightActual = windowEl.clientHeight || 236;

      const leftC = windowEl.querySelector('.reel-cylinder.left .cylinder-strip') as HTMLElement;
      const rightC = windowEl.querySelector('.reel-cylinder.right .cylinder-strip') as HTMLElement;

      let currentY = 0;
      const ct = strip.style.transform;
      const m = ct && ct.match(/translateY\(-?([\d.]+)px\)/);
      if (m) currentY = parseFloat(m[1]);

      const contentCenter = targetItem.offsetTop + itemHeightActual / 2;
      const targetOffset = contentCenter - windowHeightActual / 2;

      const originalCount = parseInt((strip as any).dataset.itemCount || (isLetter ? '26' : '126'));
      const cycleHeight = originalCount * itemHeightActual;
      const fullRotations = isLetter ? 8 : 6;
      const rotationDistance = fullRotations * cycleHeight;
      const finalTranslate = targetOffset + rotationDistance;

      items.forEach(it => it.classList.add('spinning'));

      const anim = strip.animate([
        { transform: `translateY(-${currentY}px)` },
        { transform: `translateY(-${finalTranslate}px)` }
      ], { duration, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'forwards' });

      if (leftC) leftC.animate([{transform:`translateY(-${currentY}px)`},{transform:`translateY(-${finalTranslate}px)`}], {duration, easing:'cubic-bezier(0.22, 1, 0.36, 1)', fill:'forwards'});
      if (rightC) rightC.animate([{transform:`translateY(-${currentY}px)`},{transform:`translateY(-${finalTranslate}px)`}], {duration, easing:'cubic-bezier(0.22, 1, 0.36, 1)', fill:'forwards'});

      anim.onfinish = () => {
        items.forEach(it => it.classList.remove('spinning'));
        const baseDuplicate = 2;
        const relativeIdx = safeIndex % originalCount;
        const baseItemIdx = relativeIdx + baseDuplicate * originalCount;
        const baseItem = items[baseItemIdx] || targetItem;
        const baseContentCenter = baseItem.offsetTop + (baseItem.offsetHeight || itemHeightActual) / 2;
        const snapY = baseContentCenter - windowHeightActual / 2;

        strip.style.transition = 'none';
        strip.style.transform = `translateY(-${snapY}px)`;
        if (leftC) { leftC.style.transition = 'none'; leftC.style.transform = `translateY(-${snapY}px)`; }
        if (rightC) { rightC.style.transition = 'none'; rightC.style.transform = `translateY(-${snapY}px)`; }

        void strip.offsetWidth;
        strip.style.transition = 'transform 420ms cubic-bezier(0.23, 1, 0.32, 1)';

        items.forEach(it => it.classList.remove('reel-landed'));
        const landed = items[baseItemIdx] || baseItem;
        if (landed) {
          landed.classList.add('reel-landed');
          setTimeout(() => landed.classList.remove('reel-landed'), 850);
        }
        resolve();
      };
    });
  }

  function findHeroIndexInStrip(strip: HTMLDivElement, targetName: string): number {
    const items = Array.from(strip.children) as HTMLElement[];
    const itemCount = parseInt((strip as any).dataset.itemCount || '0');
    const dups = parseInt((strip as any).dataset.duplicates || '15');
    const mid = Math.floor(dups / 2);
    for (let i = 0; i < items.length; i++) {
      if (items[i].dataset.heroEn === targetName || items[i].dataset.heroRu === targetName) {
        const dupIdx = Math.floor(i / itemCount);
        if (dupIdx === mid || dupIdx === mid-1) return i;
      }
    }
    for (let i = 0; i < items.length; i++) {
      if (items[i].dataset.heroEn === targetName || items[i].dataset.heroRu === targetName) return i;
    }
    return 0;
  }
  function findLetterIndexInStrip(strip: HTMLDivElement, targetLetter: string): number {
    const items = Array.from(strip.children) as HTMLElement[];
    const itemCount = parseInt((strip as any).dataset.itemCount || '26');
    const dups = parseInt((strip as any).dataset.duplicates || '20');
    const mid = Math.floor(dups / 2);
    for (let i=0; i<items.length; i++) {
      if (items[i].dataset.letter === targetLetter) {
        const d = Math.floor(i / itemCount);
        if (d >= mid-1) return i;
      }
    }
    for (let i=0; i<items.length; i++) if (items[i].dataset.letter === targetLetter) return i;
    return 0;
  }

  // landReelResult + showResult
  async function landReelResult(result: SpinResult) {
    setIsSpinning(true);
    const heroStrip = heroStripRef.current;
    const letterStrip = letterStripRef.current;
    const hReel = heroReelRef.current;
    const lReel = letterReelRef.current;

    if (hReel) hReel.classList.remove('reel-waiting-spin');
    if (lReel) lReel.classList.remove('reel-waiting-spin');

    const multi = result.multiplier || 1;
    setCurrentMultiplier(multi);

    if (!heroStrip || !letterStrip) {
      showResult(result);
      setIsSpinning(false);
      return;
    }

    const hIdx = findHeroIndexInStrip(heroStrip, result.hero || result.hero_en || '');
    const lIdx = findLetterIndexInStrip(letterStrip, result.letter);

    // Base durations + extra time for higher multipliers (x2/x3/x4 feel much longer)
    let hd = 2650 + Math.random() * 400;
    let ld = 1950 + Math.random() * 300;

    if (multi === 2) {
      hd += 1350;
      ld += 1100;
    } else if (multi === 3) {
      hd += 2600;
      ld += 2100;
    } else if (multi === 4) {
      hd += 4200;
      ld += 3400;
    }

    // Trigger the multicast visual + sounds BEFORE or as reels slow down
    triggerMulticastSequence(multi);

    playSpinSounds(Math.max(hd, ld));

    await Promise.all([
      animateReel(heroStrip, hIdx, hd, false),
      animateReel(letterStrip, lIdx, ld, true)
    ]);
    await new Promise(r => setTimeout(r, 180));

    showResult(result);

    if (!currentRoom || isRoomLeader) {
      logSpin(result);
    }

    setIsSpinning(false);
    if (Math.random() > 0.65) launchConfetti(28);
    playDing();

    // Hide multicast display after result is shown
    setTimeout(() => {
      setMulticastLevel(0);
      setSparks([]);
    }, 1400);
  }

  function showResult(result: SpinResult) {
    setLastResult(result);
    logSpin(result);
  }

  function logSpin(result: SpinResult) {
    const heroName = result.hero || result.hero_en || result.hero_ru || '';
    if (!heroName || !result.letter) return;
    const entry: HistoryEntry = {
      hero: heroName, letter: result.letter, short: result.short,
      attr: result.attr, color: result.color, image: result.image, ts: Date.now()
    };
    setHistory(prev => {
      const next = [entry, ...prev.filter(h => !(h.hero === entry.hero && h.letter === entry.letter))].slice(0, 30);
      localStorage.setItem('dota_bukva_history', JSON.stringify(next));
      return next;
    });
  }

  function clearHistory() {
    showConfirm('Очистить всю историю?', 'Очистить историю', () => {
      localStorage.removeItem('dota_bukva_history');
      setHistory([]);
    });
  }

  // Spin function (exact behavior)
  async function spin() {
    if (isSpinning) return;

    setMulticastLevel(0);
    setCurrentMultiplier(1);

    // ROOM LEADER SPIN: send via WS, start waiting visual
    if (currentRoom && roomSocketRef.current) {
      setIsSpinning(true);
      const hReel = heroReelRef.current; const lReel = letterReelRef.current;
      if (hReel) hReel.classList.add('reel-waiting-spin');
      if (lReel) lReel.classList.add('reel-waiting-spin');
      sendRoomMessage({ type: 'spin', mode: currentMode });
      return;
    }

    setIsSpinning(true);

    // hide result card
    setLastResult(null);

    let result: SpinResult;
    try {
      const res = await fetch(`${API_BASE}/api/spin?mode=${encodeURIComponent(currentMode)}`);
      result = await res.json();
    } catch {
      const fb = heroesData.length ? heroesData : getFallbackHeroes();
      const entry = fb[Math.floor(Math.random() * fb.length)];
      const letters = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЮЯ".split('');
      const fimg = (currentMode === 'items')
        ? `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/${entry.short}_lg.png`
        : (currentMode === 'abilities')
          ? `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/${entry.short}.png`
          : `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/${entry.short}_lg.png`;

      // Client fallback multiplier
      const r = Math.random();
      const fbMulti = r < 0.40 ? 1 : (r < 0.70 ? 2 : (r < 0.85 ? 3 : 4));

      result = {
        hero: entry.en, hero_ru: entry.ru, hero_en: entry.en,
        short: entry.short,
        attr: entry.attr || (currentMode === 'abilities' ? 'ability' : 'item'),
        attr_label: currentMode === 'items' ? 'ПРЕДМЕТ' : (currentMode === 'abilities' ? 'СПОСОБНОСТЬ' : (entry.attr === 'str' ? 'СИЛА' : entry.attr === 'agi' ? 'ЛОВКОСТЬ' : 'ИНТЕЛЛЕКТ')),
        color: getAttrColor(entry.attr || 'str'),
        image: fimg,
        letter: letters[Math.floor(Math.random()*letters.length)],
        multiplier: fbMulti
      };
    }

    const multi = result.multiplier || 1;
    setCurrentMultiplier(multi);

    const hs = heroStripRef.current; const ls = letterStripRef.current;
    const hT = findHeroIndexInStrip(hs!, result.hero || result.hero_en || '');
    const lT = findLetterIndexInStrip(ls!, result.letter);

    let hd = 2650 + Math.random() * 400;
    let ld = 1950 + Math.random() * 300;
    if (multi === 2) { hd += 1350; ld += 1100; }
    else if (multi === 3) { hd += 2600; ld += 2100; }
    else if (multi === 4) { hd += 4200; ld += 3400; }

    triggerMulticastSequence(multi);
    playSpinSounds(Math.max(hd, ld));

    await Promise.all([animateReel(hs!, hT, hd, false), animateReel(ls!, lT, ld, true)]);
    await new Promise(r => setTimeout(r, 180));

    showResult(result);

    setTimeout(() => {
      setMulticastLevel(0);
      setSparks([]);
    }, 1400);
    logSpin(result);

    setIsSpinning(false);
    if (Math.random() > 0.65) launchConfetti(28);
    playDing();
  }

  // Guesser grid logic (exact)
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

  function renderGuesserGrid(filter = '', target = 'hero-grid', readonly = false) {
    // We render in JSX below, this function is used for imperative update in some cases
    // For React we will use derived state.
  }

  const toggleEliminated = (short: string) => {
    if (currentRoom && roomSocketRef.current) {
      if (currentRole !== 'guesser') return;
      const now = Date.now() / 1000;
      if (myFreeElims <= 0 && now - myLastElim < 25) return;

      sendRoomMessage({ type: 'eliminate', short });

      setEliminatedHeroes(prev => {
        const n = new Set(prev);
        n.add(short);
        return n;
      });

      let newFree = myFreeElims;
      let newLast = myLastElim;
      if (myFreeElims > 0) newFree--;
      else newLast = now;
      setMyFreeElims(newFree);
      setMyLastElim(newLast);
      updateFreeElimsVisual(newFree);
      if (newFree <= 0) {
        const rem = Math.max(0, 25 - (Date.now()/1000 - newLast));
        if (rem > 0) startElimCD(rem);
      }
      return;
    }

    setEliminatedHeroes(prev => {
      const next = new Set(prev);
      if (next.has(short)) next.delete(short); else next.add(short);
      localStorage.setItem('dota_bukva_eliminated', JSON.stringify(Array.from(next)));
      return next;
    });
  };

  function updateGuesserStatsLocal(total: number, elim: number) {
    // handled in render
  }

  function resetEliminated() {
    const msg = currentMode === 'items' ? 'Сбросить все вычеркнутые предметы?' : (currentMode === 'abilities' ? 'Сбросить все вычеркнутые способности?' : 'Сбросить все вычеркнутые герои?');
    showConfirm(msg, 'Сброс вычеркнутых', () => {
      setEliminatedHeroes(new Set());
      localStorage.setItem('dota_bukva_eliminated', '[]');
    });
  }

  function setGuesserSort(s: any) {
    setCurrentGuesserSort(s);
  }

  // Free elims UI
  function updateFreeElimsVisual(free: number) {
    // React state driven
  }

  function startElimCD(secs: number) {
    if (elimCDIntervalRef.current) clearInterval(elimCDIntervalRef.current);
    setElimCD(Math.ceil(secs));
    elimCDIntervalRef.current = window.setInterval(() => {
      setElimCD(prev => {
        const n = prev - 1;
        if (n <= 0) {
          if (elimCDIntervalRef.current) { clearInterval(elimCDIntervalRef.current); elimCDIntervalRef.current = null; }
          return 0;
        }
        return n;
      });
    }, 1000);
  }
  function stopElimCD() {
    if (elimCDIntervalRef.current) clearInterval(elimCDIntervalRef.current);
    elimCDIntervalRef.current = null;
    setElimCD(0);
  }

  // WS room - exact replication of connect + handle
  function connectToRoomWS(code: string, role = 'guesser') {
    // WebSocket disabled for Vercel deployment (no persistent server)
    if (API_BASE || window.location.hostname.includes('vercel.app') || import.meta.env.PROD) {
      // WebSocket / real-time rooms disabled for Vercel / production
      // Client-side demo mode (localStorage rooms) is used instead.
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
      setLobbyStatus(role === 'leader' ? 'Вы ведущий. Соединение установлено. Нажмите «Начать игру», когда все подключатся.' : 'Вы отгадывающий. Соединение установлено. Ожидайте, пока ведущий начнёт игру.');
    };
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        handleRoomMessage(msg);
      } catch {}
    };
    ws.onclose = () => {
      roomSocketRef.current = null;
      // simple retry omitted for brevity, matches original retry logic can be added
    };
  }

  function sendRoomMessage(data: any) {
    if (roomSocketRef.current && roomSocketRef.current.readyState === WebSocket.OPEN) {
      roomSocketRef.current.send(JSON.stringify(data));
    }
  }

  function handleRoomMessage(msg: any) {
    if (msg.type === 'spin_result' && msg.result) {
      if (isRoomLeader || currentRole === 'leader') {
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
  }

  function handleGameStartedFromWS() {
    setGameStarted(true);
    if (isRoomLeader) {
      setCurrentRole('leader');
      // load data + build
      loadData(currentMode).then(() => {});
    } else {
      setCurrentRole('guesser');
      setMyFreeElims(3); setMyLastElim(0);
      loadData(currentMode).then(() => {});
    }
  }

  // Navigation / screen switching (exact hide/show + history)
  const [screen, setScreen] = useState<'main-menu' | 'role-menu' | 'room-lobby' | 'leader-view' | 'guesser-view'>('main-menu');

  // Ensure correct data for the reel when mode or leader context changes
  useEffect(() => {
    if ((screen === 'leader-view' || currentRole === 'leader') && currentMode) {
      loadData(currentMode).then(() => {
        setTimeout(() => {
          buildHeroStrip();
          buildLetterStrip();
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
      setTimeout(() => { buildHeroStrip(); buildLetterStrip(); }, 60);
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
    await loadData(currentMode);
    setTimeout(() => {
      buildHeroStrip(); buildLetterStrip();
    }, 50);
    updateNavRoleVisual();
    if (currentRoom) connectToRoomWS(currentRoom, 'leader');
  }
  async function enterGuesser() {
    setCurrentRole('guesser');
    localStorage.setItem('dota_bukva_role', 'guesser');
    switchToScreen('guesser-view');
    await loadData(currentMode);
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

  // Room flows
  async function createRoom() {
    try {
      const res = await fetch(`${API_BASE}/api/rooms/create`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setCurrentRoom(data.code);
        setIsRoomLeader(true);
        const my = JSON.parse(localStorage.getItem('dota_bukva_my_rooms') || '[]');
        if (!my.includes(data.code)) { my.push(data.code); localStorage.setItem('dota_bukva_my_rooms', JSON.stringify(my)); }
        updateNavRoomVisual();
        showRoomLobby(data.code, true);
        connectToRoomWS(data.code, 'leader');
        // invite popup
        setTimeout(() => showRoomInvite(data.code), 600);
      }
    } catch {
      // fallback client demo room
      const code = generateClientRoomCode();
      setCurrentRoom(code); setIsRoomLeader(true);
      let roomsL = JSON.parse(localStorage.getItem('dota_bukva_rooms') || '[]');
      roomsL = roomsL.filter((r:any)=>r.code!==code); roomsL.unshift({code, created: Date.now()});
      localStorage.setItem('dota_bukva_rooms', JSON.stringify(roomsL));
      const my = JSON.parse(localStorage.getItem('dota_bukva_my_rooms')||'[]'); if(!my.includes(code)){my.push(code);localStorage.setItem('dota_bukva_my_rooms',JSON.stringify(my));}
      showRoomLobby(code, true);
    }
  }

  function generateClientRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c = ''; for(let i=0;i<6;i++) c += chars[Math.floor(Math.random()*chars.length)]; return c;
  }

  async function showRoomList() {
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
    setShowRoomListModal(true);
  }

  function closeRoomListModal() {
    setShowRoomListModal(false);
    setJoinCodeInput('');
  }

  function joinRoom(code: string) {
    const c = code.toUpperCase();
    setCurrentRoom(c);
    const my = JSON.parse(localStorage.getItem('dota_bukva_my_rooms') || '[]');
    const leader = my.includes(c);
    setIsRoomLeader(leader);
    if (!leader) { setMyFreeElims(3); setMyLastElim(0); }
    showRoomLobby(c, leader);
    connectToRoomWS(c, leader ? 'leader' : 'guesser');

    // Close room list modal if it's open
    closeRoomListModal();
  }

  function showRoomLobby(code: string, leader: boolean) {
    setCurrentRoom(code);
    setIsRoomLeader(leader);
    setScreen('room-lobby');
    setLobbyStatus(leader ? 'Вы ведущий. Подключаемся к комнате...' : 'Вы отгадывающий. Подключаемся к комнате...');
  }

  function startGameFromLobby() {
    if (!isRoomLeader) return;
    sendRoomMessage({ type: 'start_game' });
    handleGameStartedFromWS();
  }

  function handleGameStartedFromLobby() {
    // called from state
  }

  function leaveRoom() {
    if (roomSocketRef.current) { try { roomSocketRef.current.close(); } catch{} roomSocketRef.current = null; }
    setCurrentRoom(null); setIsRoomLeader(false); setScreen('main-menu');
  }

  function updateNavRoomVisual() {
    // The nav room badge is rendered in JSX below
  }
  function updateNavRoleVisual() { /* handled in render */ }

  function showHostingDonation() {
    setConfirmModal({
      show: true,
      title: 'Мультиплеер в разработке',
      message: 'СОБИРАЮ ДОНАТЫ НА ХОСТ @mrmdkkkk',
      onConfirm: () => setConfirmModal({show:false, title:'', message:''})
    });
  }

  function showRoomInvite(code: string) {
    const link = `${window.location.origin}/?room=${code}`;
    setConfirmModal({
      show: true,
      title: 'Комната создана',
      message: `Код: ${code}\n\nСсылка: ${link}`,
      onConfirm: () => { navigator.clipboard?.writeText(link); setConfirmModal({show:false,title:'',message:''}); }
    });
  }

  function showConfirm(message: string, title: string, onYes?: () => void) {
    setConfirmModal({ show: true, title, message, onConfirm: onYes });
  }

  function hideConfirm(confirmed: boolean) {
    const cb = confirmModal.onConfirm;
    setConfirmModal({ show: false, title: '', message: '' });
    if (confirmed && cb) cb();
  }

  // Render helpers for grid
  const filteredSorted = React.useMemo(() => {
    const list = getSortedHeroes();
    const q = guesserSearch.trim().toLowerCase();
    return list.map(h => ({
      ...h,
      _match: !q || h.ru.toLowerCase().includes(q) || h.en.toLowerCase().includes(q)
    }));
  }, [heroesData, currentGuesserSort, guesserSearch, currentMode]);

  // Update nav on room change
  useEffect(() => { updateNavRoomVisual(); }, [currentRoom]);

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

      {/* Background looped video */}
      <video
        className="fixed inset-0 w-full h-full object-cover z-[-2]"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/videos/background.mp4" type="video/mp4" />
      </video>

      {/* Subtle dark overlay to keep readability and Dota tavern feel */}
      <div className="fixed inset-0 bg-black/50 z-[-1]" />

      {/* Wooden sides - exact */}
      <div className="wood-side wood-left hidden lg:block" aria-hidden="true">
        <div className="wood-rivet" style={{top:'18%'}}></div>
        <div className="wood-rivet" style={{top:'42%'}}></div>
        <div className="wood-rivet" style={{top:'66%'}}></div>
        <div className="wood-rivet" style={{top:'89%'}}></div>
      </div>
      <div className="wood-side wood-right hidden lg:block" aria-hidden="true">
        <div className="wood-rivet" style={{top:'18%'}}></div>
        <div className="wood-rivet" style={{top:'42%'}}></div>
        <div className="wood-rivet" style={{top:'66%'}}></div>
        <div className="wood-rivet" style={{top:'89%'}}></div>
      </div>

      {/* NAV - exact */}
      <nav className="tavern-header sticky top-0 z-50 shadow-lg relative">
        <div className="header-rivet" style={{left:'28px',top:'26px'}}></div>
        <div className="header-rivet" style={{left:'64px',top:'26px'}}></div>
        <div className="header-rivet" style={{right:'28px',top:'26px'}}></div>
        <div className="header-rivet" style={{right:'64px',top:'26px'}}></div>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Left logo area - Dota style frame with orange accent */}
          <div className="flex items-center">
            <div 
              onClick={() => { setScreen('main-menu'); }} 
              className="logo-frame flex items-center gap-x-2.5 cursor-pointer px-3 py-1.5 rounded-sm"
            >
              <div className="w-8 h-8 rounded bg-gradient-to-br from-[#c23c2a] to-orange-600 flex items-center justify-center shadow-[0_0_8px_rgba(194,60,42,0.6)] border border-[#8b2a1f]">
                <i className="fa-solid fa-dice text-white text-xl"></i>
              </div>
              <span className="font-display text-xl font-semibold tracking-tighter text-[#f0c060]">DOTA-BUKVA</span>
            </div>
          </div>

          {/* Right side controls in Dota-like frame */}
          <div className="controls-frame flex items-center gap-x-1 px-2 py-1 rounded-sm text-sm">
            {currentRole && (
              <div 
                id="nav-role" 
                onClick={showRoleMenu} 
                className="flex items-center gap-x-1.5 px-3 py-0.5 rounded border border-[#444] hover:border-[#c23c2a] cursor-pointer text-xs bg-[#1f1f1f] hover:bg-[#2a2a2a] transition-colors"
              >
                <span className="font-medium text-[#e0d2b0]">{currentRole === 'leader' ? 'ВЕДУЩИЙ' : 'ОТГАДЫВАЮЩИЙ'}</span>
                <span className="text-[#c23c2a] text-[10px] tracking-widest">СМЕНИТЬ</span>
              </div>
            )}
            
            <div 
              onClick={() => setShowHowto(true)} 
              className="flex items-center gap-x-1.5 px-3 py-0.5 rounded border border-[#444] hover:border-[#c23c2a] cursor-pointer text-xs bg-[#1f1f1f] hover:bg-[#2a2a2a] transition-colors text-[#d4af37]"
            >
              <i className="fa-solid fa-question-circle text-sm"></i>
              <span className="hidden sm:inline font-medium tracking-widest">КАК ИГРАТЬ</span>
            </div>

            {currentRoom && (
              <div 
                id="nav-room-badge" 
                onClick={() => { const l = `${window.location.origin}/?room=${currentRoom}`; navigator.clipboard?.writeText(l); }} 
                className="flex items-center gap-x-1.5 px-3 py-0.5 text-xs rounded border border-[#444] bg-[#1f1f1f] cursor-pointer hover:bg-[#2a2a2a]"
              >
                <span className="font-mono text-[#f0c060] tracking-[2px]">{currentRoom}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); leaveRoom(); }} 
                  className="text-[#888] hover:text-white ml-1 text-[10px] leading-none"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* MAIN MENU */}
      {screen === 'main-menu' && (
        <div id="main-menu" className="max-w-5xl mx-auto px-5 pt-12 pb-12">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center shadow-inner">
                <i className="fa-solid fa-dice text-white text-5xl"></i>
              </div>
            </div>
            <h1 className="font-display text-6xl sm:text-7xl font-bold tracking-tighter text-white">DOTA-BUKVA</h1>
            <p className="mt-2 text-zinc-400 text-lg">Крути. Описывай. Отгадывай.</p>
          </div>

          <div className="max-w-md mx-auto space-y-4">
            <div onClick={startNormalMode} className="dota-card group cursor-pointer rounded-2xl p-6 border-2 border-[#4a3728] hover:border-[#d4af37] transition-all active:scale-[0.985]">
              <div className="flex items-center gap-4">
                <i className="fa-solid fa-gamepad text-3xl text-[#d4af37]"></i>
                <div>
                  <div className="font-display text-2xl tracking-tight text-white">Обычный режим</div>
                  <div className="text-sm text-zinc-400 mt-0.5">Играть без комнаты (классика)</div>
                </div>
              </div>
            </div>

            <div onClick={showHostingDonation} className="dota-card group cursor-pointer rounded-2xl p-6 border-2 border-[#4a3728] hover:border-[#d4af37] transition-all active:scale-[0.985]">
              <div className="flex items-center gap-4">
                <i className="fa-solid fa-plus text-3xl text-[#d4af37] group-hover:rotate-90 transition-transform"></i>
                <div>
                  <div className="font-display text-2xl tracking-tight text-white">Создать комнату</div>
                  <div className="text-sm text-zinc-400 mt-0.5">Сгенерировать код и пригласить друзей</div>
                </div>
              </div>
            </div>

            <div onClick={showRoomList} className="dota-card group cursor-pointer rounded-2xl p-6 border-2 border-[#4a3728] hover:border-[#d4af37] transition-all active:scale-[0.985]">
              <div className="flex items-center gap-4">
                <i className="fa-solid fa-list text-3xl text-[#d4af37]"></i>
                <div>
                  <div className="font-display text-2xl tracking-tight text-white">Список комнат</div>
                  <div className="text-sm text-zinc-400 mt-0.5">Присоединиться к существующей комнате</div>
                </div>
              </div>
            </div>
          </div>

          <div id="papich-phrase" onClick={() => { /* random phrase load */ }} className="text-center mt-8 text-[11px] text-zinc-500 tracking-wider cursor-pointer">
            МУЛЬТИПЛЕЕР В РАЗРАБОТКЕ • КОМНАТЫ ДЛЯ ОБЩЕЙ ИГРЫ
          </div>
        </div>
      )}

      {/* ROLE MENU */}
      {screen === 'role-menu' && (
        <div id="role-menu" className="max-w-5xl mx-auto px-5 pt-8 pb-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-x-2 text-[#d4af37] text-xs tracking-[4px] font-semibold mb-3">
              <i className="fa-solid fa-users"></i>
              <span>ИГРА В КОМПАНИИ</span>
            </div>
            <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tighter text-white">Выбери роль</h1>
            <p className="mt-2 text-zinc-400 text-[15px]">Один ведущий крутит и даёт подсказки. Остальные вычёркивают героев.</p>

            {/* Mode switch exact */}
            <div className="mt-4 mb-2">
              <div className="text-[10px] text-zinc-500 tracking-[1.5px] mb-1">РЕЖИМ</div>
              <div className="inline-flex rounded-2xl border border-[#4a3728] overflow-hidden text-sm">
                <button onClick={() => loadData('heroes')} className={`px-4 py-1.5 font-medium ${currentMode==='heroes' ? 'bg-[#1f1f1f]' : 'hover:bg-[#2a2a2a]'}`}>Герои</button>
                <button onClick={() => loadData('items')} className={`px-4 py-1.5 font-medium ${currentMode==='items' ? 'bg-[#1f1f1f]' : 'hover:bg-[#2a2a2a]'} border-l border-[#4a3728]`}>Предметы</button>
                <button onClick={() => loadData('abilities')} className={`px-4 py-1.5 font-medium ${currentMode==='abilities' ? 'bg-[#1f1f1f]' : 'hover:bg-[#2a2a2a]'} border-l border-[#4a3728]`}>Способности</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div onClick={enterLeader} className="dota-card group cursor-pointer rounded-2xl p-6 border-2 border-[#4a3728] hover:border-[#d4af37] transition-all active:scale-[0.985]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs tracking-[2.5px] text-[#c23c2a] font-bold">ДЛЯ ВЕДУЩЕГО</div>
                  <div className="font-display text-4xl tracking-[-1.5px] mt-1 group-hover:text-[#f0c060] transition-colors text-white">Ведущий</div>
                </div>
                <i className="fa-solid fa-dice text-4xl text-[#d4af37] group-hover:rotate-12 transition-transform"></i>
              </div>
              <div className="mt-5 text-[15px] text-zinc-300">Открывается барабан с <span>{currentMode === 'items' ? 'предметом' : currentMode === 'abilities' ? 'способностью' : 'героем'}</span> и буквой.<br />Ты видишь комбинацию и даёшь описание остальным.</div>
              <div className="mt-5 inline-flex items-center text-xs font-semibold tracking-widest text-[#d4af37]">ОТКРЫТЬ БАРАБАН <i className="fa-solid fa-arrow-right ml-2"></i></div>
            </div>

            <div onClick={enterGuesser} className="dota-card group cursor-pointer rounded-2xl p-6 border-2 border-[#4a3728] hover:border-[#d4af37] transition-all active:scale-[0.985]">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs tracking-[2.5px] text-emerald-400 font-bold">ДЛЯ ОТГАДЫВАЮЩИХ</div>
                  <div className="font-display text-4xl tracking-[-1.5px] mt-1 group-hover:text-[#f0c060] transition-colors text-white">Отгадывающий</div>
                </div>
                <i className="fa-solid fa-th-large text-4xl text-[#d4af37] group-hover:scale-110 transition-transform"></i>
              </div>
              <div className="mt-5 text-[15px] text-zinc-300">Большая таблица всех <span>{currentMode==='items'?'предметов':currentMode==='abilities'?'способностей':'героев'}</span> Dota 2.<br />Кликай по иконкам — они становятся серыми (вычеркнуты).</div>
              <div className="mt-5 inline-flex items-center text-xs font-semibold tracking-widest text-[#d4af37]">ОТКРЫТЬ ТАБЛИЦУ <i className="fa-solid fa-arrow-right ml-2"></i></div>
            </div>
          </div>
        </div>
      )}

      {/* ROOM LOBBY */}
      {screen === 'room-lobby' && currentRoom && (
        <div id="room-lobby" className="max-w-3xl mx-auto px-5 pt-8 pb-12">
          <div className="text-center mb-6">
            <div className="text-[#d4af37] text-xs tracking-[3px] mb-1">КОМНАТА</div>
            <div className="font-mono text-4xl text-[#f0c060] tracking-[4px] cursor-pointer" onClick={() => { const l = `${location.origin}/?room=${currentRoom}`; navigator.clipboard.writeText(l); }}>{currentRoom}</div>
          </div>

          <div className="dota-card rounded-2xl p-6 border-2 border-[#4a3728] max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-zinc-400">Игроков подключено</div>
                <div className="text-2xl font-semibold text-white">{roomPlayers}</div>
              </div>
              <div className={`px-3 py-1 text-xs rounded-full border font-medium ${isRoomLeader ? 'border-[#c23c2a] text-[#f0c060]' : 'border-emerald-400 text-emerald-400'}`}>
                {isRoomLeader ? 'Ведущий' : 'Отгадывающий'}
              </div>
            </div>

            <div className="text-[#e0d2b0] text-sm mb-6 min-h-[40px]">{lobbyStatus}</div>

            {isRoomLeader && (
              <button id="lobby-start-btn" onClick={startGameFromLobby} className="w-full h-11 bg-[#c23c2a] hover:bg-[#e04a38] text-white font-semibold rounded-xl border border-[#d4af37]">
                НАЧАТЬ ИГРУ
              </button>
            )}
            {!isRoomLeader && <div className="text-center text-xs text-zinc-500">Ожидайте, пока ведущий начнёт игру...</div>}
          </div>
        </div>
      )}

      {/* LEADER VIEW - exact structure */}
      {screen === 'leader-view' && (
        <div id="leader-view">
          <div className="max-w-5xl mx-auto px-5 pt-4 pb-4">
            <div className="max-w-[860px] mx-auto">
              <div className="relative mb-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  {/* HERO / ITEM / ABILITY REEL */}
                  <div className="lg:col-span-3">
                    <div className="flex items-center mb-2 px-1">
                      <div className="section-title flex items-center gap-x-2">
                        <i className="fa-solid fa-user-ninja"></i>
                        <span>{currentMode === 'items' ? 'ПРЕДМЕТ' : currentMode === 'abilities' ? 'СПОСОБНОСТЬ' : 'ГЕРОЙ'}</span>
                      </div>
                    </div>
                    <div id="hero-reel" ref={heroReelRef} className="slot-window h-[236px] relative cursor-pointer" onClick={() => !isSpinning && spin()}>
                      <div id="hero-strip" ref={heroStripRef} className="slot-strip"></div>
                      <div className="reel-cylinder left"><div className="cylinder-strip"></div></div>
                      <div className="reel-cylinder right"><div className="cylinder-strip"></div></div>
                      <div className="reel-shadow"></div>
                      <div className="reel-lens absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-24px)] h-[78px] rounded-xl pointer-events-none z-20"></div>
                    </div>
                  </div>

                  {/* LETTER REEL */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <div className="section-title flex items-center gap-x-2"><i className="fa-solid fa-font"></i><span>БУКВА</span></div>
                    </div>
                    <div id="letter-reel" ref={letterReelRef} className="slot-window h-[236px] relative cursor-pointer" onClick={() => !isSpinning && spin()}>
                      <div id="letter-strip" ref={letterStripRef} className="slot-strip letter-strip"></div>
                      <div className="reel-cylinder left"><div className="cylinder-strip"></div></div>
                      <div className="reel-cylinder right"><div className="cylinder-strip"></div></div>
                      <div className="reel-shadow"></div>
                      <div className="reel-lens absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-32px)] h-[110px] rounded-2xl pointer-events-none z-20"></div>
                    </div>
                  </div>
                </div>

                {/* Multicast numbers overlaid directly IN FRONT OF the drums on a higher layer */}
                {multicastLevel > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[60]">
                    <div className="relative">
                      {/* The x text - plain, no box/border/background */}
                      <div 
                        className={`
                          multicast-text font-display text-[5.5rem] sm:text-[6rem] font-black tracking-[-5px] 
                          transition-all duration-100
                          ${multicastLevel >= 3 ? 'scale-125' : 'scale-100'}
                          level-${multicastLevel}
                        `}
                        style={{
                          color: multicastLevel >= 4 
                            ? '#ff6b6b' 
                            : (multicastLevel >= 3 ? '#ff9f43' : '#f0c060'),
                          textShadow: multicastLevel >= 4 
                            ? '0 0 12px #ff6b6b, 0 0 28px #ff4500, 0 0 45px #d4af37, 2px 3px 6px rgba(0,0,0,0.95)' 
                            : (multicastLevel >= 3 
                              ? '0 0 12px #ff9f43, 0 0 26px #ff6b00, 0 0 38px #d4af37, 2px 3px 6px rgba(0,0,0,0.9)' 
                              : '0 0 10px #d4af37, 0 0 22px #8b6914, 2px 3px 5px rgba(0,0,0,0.9)'),
                          animation: multicastLevel === 4 ? 'multicast-pop 0.18s ease, multicast-pulse 1.2s ease-in-out infinite' : 'multicast-pop 0.22s ease'
                        }}
                      >
                        x{multicastLevel}
                      </div>

                      {/* Dynamic sparks - more intense for higher x */}
                      {sparks.map((spark) => (
                        <div
                          key={spark.id}
                          className="spark"
                          style={{
                            '--tx': `${spark.tx}px` as any,
                            '--ty': `${spark.ty}px` as any,
                            left: '50%',
                            top: '50%',
                            width: `${spark.size * 1.2}px`,
                            height: `${spark.size * 1.2}px`,
                            animationDelay: `${spark.delay}ms`,
                            background: multicastLevel >= 4 ? '#ffeb3b' : (multicastLevel >= 3 ? '#ffd700' : '#f0c060'),
                            boxShadow: multicastLevel >= 3 
                              ? '0 0 10px #ff8c00, 0 0 18px #ff4500' 
                              : '0 0 8px #f0c060, 0 0 14px #d4af37'
                          } as any}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-center mb-1">
                <button id="spin-btn" onClick={spin} disabled={isSpinning} className="spin-button group flex items-center justify-center gap-x-2 px-8 h-9 text-base font-semibold tracking-tighter bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-2xl shadow-xl shadow-red-950/50 border border-red-500/30 disabled:opacity-70">
                  <i className={`fa-solid fa-dice text-lg ${isSpinning ? 'fa-spin' : ''}`}></i>
                  <span className="font-display tracking-[3px]">{isSpinning ? 'КРУТИМ...' : (lastResult ? 'КРУТИТЬ ЕЩЁ' : 'КРУТИТЬ')}</span>
                </button>
              </div>

              {/* RESULT CARD */}
              {lastResult && (
                <div id="result-card" className="flex-shrink-0 dota-card rounded p-3 border-2 border-[#4a3728] text-sm">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="flex items-center gap-x-4 flex-1">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#d4af37] flex-shrink-0">
                        <img src={lastResult.image} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-[#f0c060] text-4xl leading-none tracking-tighter">{lastResult.hero}</div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-center md:text-right">
                      <div className="text-[10px] tracking-[3px] font-bold text-[#d4af37] mb-1">НА БУКВУ</div>
                      <div className="font-display text-4xl leading-none text-[#f0c060]">{lastResult.letter}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* HISTORY */}
              <div className="flex-shrink-0 mt-1 text-xs">
                <div className="flex items-center justify-between mb-0.5 px-1 border-b border-[#4a3728] pb-1">
                  <div className="section-title text-[10px]">ИСТОРИЯ СПИНОВ</div>
                  <button onClick={clearHistory} className="text-[10px] text-[#d4af37] hover:text-white flex items-center gap-x-1 transition-colors border border-[#4a3728] px-2 py-0.5 rounded hover:bg-[#1a1a1a]">
                    <i className="fa-solid fa-trash text-[8px]"></i><span>ОЧИСТИТЬ</span>
                  </button>
                </div>
                <div id="history-list" className="dota-card rounded border border-[#4a3728] divide-y divide-[#4a3728] overflow-auto text-[10px] max-h-48">
                  {history.length === 0 && <div className="px-2 py-1 text-center text-[#d4af37]">ПУСТО. КРУТИ — РЕЗУЛЬТАТЫ ЗДЕСЬ.</div>}
                  {history.map((h, idx) => (
                    <div key={idx} onClick={() => setLastResult({ hero: h.hero, hero_en: h.hero, short: h.short || '', attr: h.attr || '', attr_label: '', color: h.color || '', image: h.image || '', letter: h.letter })} className="history-item px-5 py-[13px] flex items-start gap-3 text-sm cursor-pointer">
                      <div className="flex-1">
                        <div className="flex items-baseline gap-x-2">
                          <span className="font-semibold text-white">{h.hero}</span>
                          <span className="font-mono text-red-400 text-base leading-none pt-0.5">{h.letter}</span>
                          <span className="text-[10px] text-zinc-500 ml-auto">{new Date(h.ts).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Leader read-only table */}
            {currentRoom && isRoomLeader && (
              <div className="mt-8">
                <div className="section-title flex items-center gap-x-2 mb-2"><i className="fa-solid fa-th-large"></i><span>ТАБЛИЦА ОТГАДЫВАЮЩИХ (просмотр)</span></div>
                <div id="leader-guesser-grid" className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                  {filteredSorted.map((h: any) => (
                    <div key={h.short} className={`hero-cell readonly ${eliminatedHeroes.has(h.short) ? 'eliminated' : ''}`}>
                      <div className="img-wrap"><img src={getEntryImage(h.short, currentMode)} alt="" /></div>
                      <div className="hero-label">{h.en}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GUESSER VIEW - exact */}
      {screen === 'guesser-view' && (
        <div id="guesser-view" className="max-w-6xl mx-auto px-4 pt-3 pb-8">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="section-title flex items-center gap-x-2">
              <i className="fa-solid fa-th-large"></i>
              <span>{currentMode === 'items' ? 'ТАБЛИЦА ПРЕДМЕТОВ — ВЫЧЁРКИВАЙ' : currentMode === 'abilities' ? 'ТАБЛИЦА СПОСОБНОСТЕЙ — ВЫЧЁРКИВАЙ' : 'ТАБЛИЦА ГЕРОЕВ — ВЫЧЁРКИВАЙ'}</span>
            </div>
            <div className="flex items-center gap-x-3 text-sm">
              <div className="text-xs px-3 py-1 rounded bg-[#111] border border-[#4a3728] tabular-nums">
                <span>{Math.max(0, (heroesData.length||126) - eliminatedHeroes.size)}</span> / <span>{heroesData.length || 126}</span>
              </div>
              <button onClick={resetEliminated} className="text-xs px-3 py-1 rounded border border-[#4a3728] hover:border-red-500/60 hover:text-red-400 flex items-center gap-x-1">
                <i className="fa-solid fa-undo text-[10px]"></i><span>СБРОСИТЬ</span>
              </button>
            </div>
          </div>

          {/* Free / CD */}
          {currentRoom && (
            <div className="px-1 mb-1 flex gap-4 text-xs">
              <div className={myFreeElims > 0 ? 'text-emerald-400' : 'hidden'}>Бесплатных вычёркиваний: <span className="font-bold">{myFreeElims}</span></div>
              {elimCD > 0 && <div className="text-red-400"><i className="fa-solid fa-clock mr-1"></i> КД до следующего: <span className="font-mono font-bold">{elimCD}</span>с</div>}
            </div>
          )}

          {/* Search */}
          <div className="mb-3 px-1">
            <div className="relative max-w-md">
              <i className="fa-solid fa-search absolute left-3 top-2.5 text-zinc-500"></i>
              <input value={guesserSearch} onChange={e => setGuesserSearch(e.target.value)} placeholder="Поиск..." className="w-full bg-[#111111] border border-[#4a3728] focus:border-[#d4af37] text-sm pl-9 pr-3 py-2 rounded outline-none placeholder:text-zinc-600" />
            </div>
          </div>

          {/* Sorts */}
          <div className="mb-3 px-1 flex items-center gap-x-2 flex-wrap">
            <span className="text-[#d4af37] text-xs font-semibold tracking-[1.5px] mr-1">СОРТИРОВКА:</span>
            {currentMode === 'heroes' && ['az','za','str','agi','int','uni'].map(s => (
              <button key={s} onClick={() => setGuesserSort(s as any)} className={`sort-btn px-2.5 py-0.5 text-[11px] border border-[#4a3728] rounded ${currentGuesserSort===s ? 'active' : ''}`}>{s==='az'?'А → Я':s==='za'?'Я → А':s.toUpperCase()}</button>
            ))}
            {(currentMode !== 'heroes') && ['az','za'].map(s => (
              <button key={s} onClick={() => setGuesserSort(s as any)} className={`sort-btn px-2.5 py-0.5 text-[11px] border border-[#4a3728] rounded ${currentGuesserSort===s ? 'active' : ''}`}>{s==='az'?'А → Я':'Я → А'}</button>
            ))}
          </div>

          <div id="hero-grid" className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
            {filteredSorted.map((h: any) => (
              <div
                key={h.short}
                data-short={h.short}
                onClick={() => toggleEliminated(h.short)}
                className={`hero-cell ${eliminatedHeroes.has(h.short) ? 'eliminated' : ''} ${!h._match ? 'search-dimmed' : ''}`}
              >
                <div className="img-wrap">
                  <img src={getEntryImage(h.short, currentMode)} alt={h.en} loading="lazy" onError={(e:any)=> e.target.src='https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/pudge_lg.png'} />
                </div>
                <div className="hero-label" title={h.ru}>{h.en}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HOW TO MODAL - exact */}
      {showHowto && (
        <div id="howto-modal" onClick={() => setShowHowto(false)} className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-5">
          <div onClick={e=>e.stopPropagation()} className="dota-card max-w-lg w-full rounded p-7 border-2 border-[#4a3728]">
            <div className="flex justify-between items-center mb-4 border-b border-[#4a3728] pb-3">
              <div className="font-display text-xl tracking-[2px] text-[#d4af37]">КАК ИГРАТЬ</div>
              <button onClick={() => setShowHowto(false)} className="text-2xl leading-none text-[#d4af37] hover:text-white">×</button>
            </div>
            <div className="space-y-5 text-[15px] text-[#e0d2b0]">
              <div className="flex gap-4"><div className="w-6 h-6 rounded-full bg-[#c23c2a] flex-shrink-0 flex items-center justify-center text-xs font-bold border border-[#d4af37]">1</div><div>В начале игры каждый выбирает роль: <span className="font-medium text-[#d4af37]">Ведущий</span> или <span className="font-medium text-[#d4af37]">Отгадывающий</span>.</div></div>
              <div className="flex gap-4"><div className="w-6 h-6 rounded-full bg-[#c23c2a] flex-shrink-0 flex items-center justify-center text-xs font-bold border border-[#d4af37]">2</div><div>Ведущий крутит барабан и получает <span className="font-medium text-[#d4af37]">героя + букву</span>. Даёт описание, начиная с этой буквы.</div></div>
              <div className="flex gap-4"><div className="w-6 h-6 rounded-full bg-[#c23c2a] flex-shrink-0 flex items-center justify-center text-xs font-bold border border-[#d4af37]">3</div><div>Отгадывающие в таблице кликают по иконкам — они становятся <span className="font-medium text-[#d4af37]">серыми</span> (вычеркиваются).</div></div>
            </div>
            <button onClick={() => setShowHowto(false)} className="mt-6 w-full h-11 bg-[#c23c2a] hover:bg-[#e04a38] text-white font-semibold rounded border border-[#d4af37] tracking-widest">ПОНЯТНО, ПОГНАЛИ!</button>
          </div>
        </div>
      )}

      {/* CONFIRM MODAL - exact animated */}
      {confirmModal.show && (
        <div id="confirm-modal" onClick={() => hideConfirm(false)} className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[120] flex items-center justify-center p-5 show">
          <div onClick={e=>e.stopPropagation()} id="confirm-modal-card" className="dota-card max-w-sm w-full rounded-2xl p-6 border-2 border-[#4a3728] transition-all duration-200 scale-100 opacity-1">
            <div className="font-display text-xl tracking-[2px] text-[#d4af37] mb-3">{confirmModal.title}</div>
            <div className="text-[#e0d2b0] text-[15px] mb-6 leading-snug whitespace-pre-line">{confirmModal.message}</div>
            <div className="flex gap-3">
              <button onClick={() => hideConfirm(false)} className="flex-1 h-10 text-sm font-medium rounded-xl border border-[#4a3728] hover:bg-[#1a1a1a]">ОТМЕНА</button>
              <button onClick={() => hideConfirm(true)} className="flex-1 h-10 text-sm font-semibold rounded-xl bg-[#c23c2a] hover:bg-[#e04a38] border border-[#d4af37] text-white">ДА</button>
            </div>
          </div>
        </div>
      )}

      {/* ROOM LIST MODAL - exact replica of original */}
      {showRoomListModal && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[130] flex items-center justify-center p-5"
          onClick={(e) => { if (e.target === e.currentTarget) closeRoomListModal(); }}
        >
          <div 
            className="dota-card max-w-md w-full rounded-2xl p-6 border-2 border-[#4a3728]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="font-display text-xl tracking-[2px] text-[#d4af37]">Список комнат</div>
              <button onClick={closeRoomListModal} className="text-2xl leading-none text-[#d4af37] hover:text-white">×</button>
            </div>

            {roomsList.length === 0 ? (
              <div className="text-zinc-400 text-sm py-4">Пока нет комнат. Создайте свою или введите код.</div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-auto">
                {roomsList.map((room, idx) => {
                  const time = room.created 
                    ? new Date(room.created * 1000 || room.created).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) 
                    : '';
                  return (
                    <div 
                      key={idx}
                      onClick={() => joinRoom(room.code)}
                      className="flex justify-between items-center p-3 rounded-xl border border-[#4a3728] hover:border-[#d4af37] cursor-pointer"
                    >
                      <div>
                        <span className="font-mono text-lg text-[#f0c060]">{room.code}</span>
                      </div>
                      <div className="text-xs text-zinc-500">{time}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-[#4a3728]">
              <div className="text-xs text-zinc-400 mb-2">Или введи код комнаты:</div>
              <div className="flex gap-2">
                <input 
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  maxLength={8} 
                  placeholder="ABCDEF" 
                  className="flex-1 bg-[#111] border border-[#4a3728] px-3 py-2 rounded text-center font-mono tracking-widest uppercase"
                />
                <button 
                  onClick={() => {
                    const code = joinCodeInput.trim();
                    if (code.length >= 4) {
                      joinRoom(code);
                    }
                  }} 
                  className="px-4 bg-[#c23c2a] hover:bg-[#e04a38] border border-[#d4af37] rounded text-sm"
                >
                  Войти
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default App;
