import { useRef, useCallback } from 'react';
import { getEntryImage, getAttrColor } from '../utils';

interface UseReelsProps {
  heroesData: any[];
  language: 'ru' | 'en';
  currentMode: 'heroes' | 'items' | 'abilities';
}

export function useReels({ heroesData, language, currentMode }: UseReelsProps) {
  const heroStripRef = useRef<HTMLDivElement>(null);
  const letterStripRef = useRef<HTMLDivElement>(null);
  const heroReelRef = useRef<HTMLDivElement>(null);
  const letterReelRef = useRef<HTMLDivElement>(null);

  const getAlphabet = () => {
    return language === 'ru'
      ? 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЮЯ'
      : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  };

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
    const letters = getAlphabet().split('');
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
  }, [language]);

  const animateReel = async (strip: HTMLDivElement, targetIndex: number, duration: number, isLetter: boolean): Promise<void> => {
    return new Promise((resolve) => {
      const items = Array.from(strip.children) as HTMLElement[];
      if (!items.length) {
        resolve();
        return;
      }
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
  };

  const findHeroIndexInStrip = (strip: HTMLDivElement, targetName: string): number => {
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
  };

  const findLetterIndexInStrip = (strip: HTMLDivElement, targetLetter: string): number => {
    const items = Array.from(strip.children) as HTMLElement[];
    const itemCount = parseInt((strip as any).dataset.itemCount || '26');
    const dups = parseInt((strip as any).dataset.duplicates || '20');
    const mid = Math.floor(dups / 2);
    for (let i = 0; i < items.length; i++) {
      if (items[i].dataset.letter === targetLetter) {
        const d = Math.floor(i / itemCount);
        if (d >= mid-1) return i;
      }
    }
    for (let i = 0; i < items.length; i++) if (items[i].dataset.letter === targetLetter) return i;
    return 0;
  };

  return {
    heroStripRef,
    letterStripRef,
    heroReelRef,
    letterReelRef,
    buildHeroStrip,
    buildLetterStrip,
    animateReel,
    findHeroIndexInStrip,
    findLetterIndexInStrip,
  };
}
