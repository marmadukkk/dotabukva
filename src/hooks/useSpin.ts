import { useCallback } from 'react';
import { SpinResult, HistoryEntry } from '../types';
import { getEntryImage, getAttrColor } from '../utils';
import { Language, getAlphabet, getAttrLabel } from '../i18n';

interface UseSpinProps {
  language: Language;
  currentMode: 'heroes' | 'items' | 'abilities';
  heroesData: any[];
  currentRoom: string | null;
  isRoomLeader: boolean;
  reels: ReturnType<typeof import('./useReels').useReels>;
  audio: ReturnType<typeof import('./useAudio').useAudio>;
  setIsSpinning: (val: boolean) => void;
  setLastResult: (result: SpinResult | null) => void;
  setCurrentMultiplier: (val: number) => void;
  setMulticastLevel: (val: number) => void;
  setSparks: (val: any[]) => void;
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
  launchConfetti: (count?: number) => void;
  logSpinExternal?: (result: SpinResult) => void;
  /** When false, spins never roll x2/x3/x4 and multicast FX are skipped. */
  multicastEnabled?: boolean;
}

export function useSpin({
  language,
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
  launchConfetti,
  currentMode = 'heroes',
  heroesData = [],
  multicastEnabled = true,
}: UseSpinProps & { currentMode?: any; heroesData?: any[] }) {
  const { playSpinSounds, playDing, playMulticastSound } = audio;

  // Sparks effect
  function emitSparks(count = 8, intensity = 1) {
    const newSparks: {id: string, tx: number, ty: number, delay: number, size: number}[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 25 + Math.random() * 55 * intensity;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist * 0.7 - 15;
      newSparks.push({
        id: Date.now() + '-' + i + Math.random(),
        tx: tx,
        ty: ty,
        delay: Math.random() * 120,
        size: 3 + Math.random() * 5 * intensity
      });
    }
    setSparks(((prev: any) => [...(prev || []), ...newSparks].slice(-35)) as any);
    setTimeout(() => {
      setSparks(((current: any) => (current || []).filter((s: any) => !newSparks.some(ns => ns.id === s.id))) as any);
    }, 900);
  }

  function triggerMulticastSequence(multi: number) {
    if (!multi || multi < 1) multi = 1;

    setMulticastLevel(0);
    setSparks([]);

    setTimeout(() => {
      setMulticastLevel(1);
      playMulticastSound(1);
      emitSparks(6, 0.8);
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
        emitSparks(22, 1.8);
      }, 480 * 2);
    }
    if (multi >= 4) {
      setTimeout(() => {
        setMulticastLevel(4);
        playMulticastSound(4);
        emitSparks(32, 2.5);
        setTimeout(() => emitSparks(18, 2.0), 120);
        setTimeout(() => emitSparks(14, 1.7), 280);
      }, 480 * 3);
    }
  }

  // Confetti
  function launchConfettiLocal(count = 40) {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed'; canvas.style.left = '0'; canvas.style.top = '0';
    canvas.style.pointerEvents = 'none'; canvas.style.zIndex = '99999';
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;
    const particles: any[] = [];
    const colors = ['#c23c2a', '#d4af37', '#f4f4f5', '#22c55e'];
    for (let i = 0; i < count; i++) {
      particles.push({ 
        x: Math.random()*canvas.width, 
        y: Math.random()*canvas.height*0.6-40, 
        size: 4+Math.random()*7, 
        speed: 2.5+Math.random()*3.5, 
        angle: Math.random()*Math.PI*2, 
        color: colors[Math.floor(Math.random()*colors.length)], 
        rot: Math.random()*6-3 
      });
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

  const showResult = (result: SpinResult) => {
    setLastResult(result);
  };

  const logSpin = (result: SpinResult) => {
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
  };

  const spin = useCallback(async () => {
    // Note: full integration requires passing isSpinning and other setters properly
    setMulticastLevel(0);
    setCurrentMultiplier(1);

    // ROOM LEADER SPIN
    if (currentRoom) {
      setIsSpinning(true);
      const hReel = reels.heroReelRef.current; 
      const lReel = reels.letterReelRef.current;
      if (hReel) hReel.classList.add('reel-waiting-spin');
      if (lReel) lReel.classList.add('reel-waiting-spin');
      return;
    }

    setIsSpinning(true);
    setLastResult(null);

    let result: SpinResult;
    try {
      const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
      const res = await fetch(`${API_BASE}/api/spin?mode=${encodeURIComponent(currentMode)}`);
      result = await res.json();
    } catch {
      const fb = heroesData.length ? heroesData : getFallbackHeroes();
      const entry = fb[Math.floor(Math.random() * fb.length)];
      const letters = getAlphabet(language).split('');
      const fimg = getEntryImage(entry.short, currentMode);

      const r = Math.random();
      const fbMulti = !multicastEnabled
        ? 1
        : (r < 0.40 ? 1 : (r < 0.70 ? 2 : (r < 0.85 ? 3 : 4)));

      result = {
        hero: entry.en, hero_ru: entry.ru, hero_en: entry.en,
        short: entry.short,
        attr: entry.attr || (currentMode === 'abilities' ? 'ability' : 'item'),
        attr_label: currentMode === 'items' ? 'ITEM' : (currentMode === 'abilities' ? 'ABILITY' : getAttrLabel(language, entry.attr)),
        color: getAttrColor(entry.attr || 'str'),
        image: fimg,
        letter: letters[Math.floor(Math.random()*letters.length)],
        multiplier: fbMulti
      };
    }

    // Honour the settings toggle even if API returned a higher multiplier
    const multi = multicastEnabled ? (result.multiplier || 1) : 1;
    if (!multicastEnabled) result = { ...result, multiplier: 1 };
    setCurrentMultiplier(multi);

    const hs = reels.heroStripRef.current;
    const ls = reels.letterStripRef.current;
    const hT = reels.findHeroIndexInStrip(hs!, result.hero || result.hero_en || '');
    const lT = reels.findLetterIndexInStrip(ls!, result.letter);

    let hd = 2650 + Math.random() * 400;
    let ld = 1950 + Math.random() * 300;
    if (multi === 2) { hd += 1350; ld += 1100; }
    else if (multi === 3) { hd += 2600; ld += 2100; }
    else if (multi === 4) { hd += 4200; ld += 3400; }

    if (multicastEnabled) {
      triggerMulticastSequence(multi);
    }
    playSpinSounds(Math.max(hd, ld));

    await Promise.all([reels.animateReel(hs!, hT, hd, false), reels.animateReel(ls!, lT, ld, true)]);
    await new Promise(r => setTimeout(r, 180));

    showResult(result);
    logSpin(result);

    setIsSpinning(false);
    if (Math.random() > 0.65) launchConfettiLocal(28);
    playDing();

    setTimeout(() => {
      setMulticastLevel(0);
      setSparks([]);
    }, 1400);
  }, [language, currentMode, heroesData, currentRoom, reels, audio, multicastEnabled]);

  // Helper for fallback (duplicated from useData for independence)
  function getFallbackHeroes() {
    return [
      {"en":"Pudge","ru":"Pudge","short":"pudge","attr":"str"},
      {"en":"Invoker","ru":"Invoker","short":"invoker","attr":"int"},
      {"en":"Anti-Mage","ru":"Anti-Mage","short":"antimage","attr":"agi"},
      {"en":"Crystal Maiden","ru":"Crystal Maiden","short":"crystal_maiden","attr":"int"},
      {"en":"Juggernaut","ru":"Juggernaut","short":"juggernaut","attr":"agi"}
    ];
  }

  function getAttrColor(attr: string): string {
    const colors: Record<string, string> = {
      'str': '#f97316', 'agi': '#22c55e', 'int': '#a855f7', 'uni': '#eab308',
      'item': '#60a5fa', 'neutral': '#a78bfa', 'ability': '#67e8f9'
    };
    return colors[attr] || '#71717a';
  }

  return {
    spin,
    triggerMulticastSequence,
    emitSparks,
    launchConfetti: launchConfettiLocal,
    logSpin,
    showResult,
  };
}
