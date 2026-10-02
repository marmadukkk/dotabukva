import React, { useEffect, useState } from 'react';
import { Language, t, getSortLabel } from '../i18n';
import HeroGrid from './HeroGrid';

interface GuesserViewProps {
  language: Language;
  currentMode: 'heroes' | 'items' | 'abilities';
  eliminatedHeroes: Set<string>;
  currentGuesserSort: string;
  guesserSearch: string;
  myFreeElims: number;
  elimCD: number;
  turnLabel?: string | null;
  turnDeadline?: number | null;
  isMyTurn?: boolean;
  currentRoom: string | null;
  filteredSorted: any[];
  totalCount: number;
  
  onSetGuesserSort: (s: any) => void;
  onSearchChange: (val: string) => void;
  onToggleEliminated: (short: string) => void;
  onResetEliminated: () => void;
  onImageLoad?: (short: string) => void;
}

const GuesserView: React.FC<GuesserViewProps> = ({
  language,
  currentMode,
  eliminatedHeroes,
  currentGuesserSort,
  guesserSearch,
  myFreeElims,
  elimCD,
  turnLabel,
  turnDeadline,
  isMyTurn,
  currentRoom,
  filteredSorted,
  totalCount,
  onSetGuesserSort,
  onSearchChange,
  onToggleEliminated,
  onResetEliminated,
  onImageLoad,
}) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!turnDeadline) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [turnDeadline]);
  const turnSeconds = turnDeadline ? Math.max(0, Math.ceil((turnDeadline - now) / 1000)) : null;

  const title = currentMode === 'items' 
    ? t(language, 'guesser.tableItems') 
    : currentMode === 'abilities' 
      ? t(language, 'guesser.tableAbilities') 
      : t(language, 'guesser.tableHeroes');

  return (
    <div id="guesser-view" className="max-w-6xl mx-auto px-4 pt-3 pb-8">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="section-title flex items-center gap-x-2">
          <i className="fa-solid fa-th-large"></i>
          <span>{title}</span>
        </div>
        <div className="flex items-center gap-x-3 text-sm">
          <div className="ui-btn text-xs px-3 py-1 rounded-lg tabular-nums pointer-events-none">
            <span>{Math.max(0, totalCount - eliminatedHeroes.size)}</span> / <span>{totalCount}</span>
          </div>
          <button 
            onClick={onResetEliminated} 
            className="ui-btn text-xs px-3 py-1 rounded-lg flex items-center gap-x-1"
          >
            <i className="fa-solid fa-undo text-[10px]"></i><span>{t(language, 'guesser.reset')}</span>
          </button>
        </div>
      </div>

      {/* Free / CD */}
      {currentRoom && (
        <div className="px-1 mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <div className={isMyTurn ? 'text-[#f0c060] font-semibold' : 'text-zinc-300'}>
            {turnLabel || t(language, 'room.waitingSpin')}
            {turnSeconds != null && turnLabel && (
              <span key={turnSeconds} className="count-tick ml-2 font-mono tabular-nums">{turnSeconds}с</span>
            )}
          </div>
          <div className="text-zinc-500">{t(language, 'room.guesserHint')}</div>
        </div>
      )}

      {/* Search */}
      <div className="mb-3 px-1">
        <div className="relative max-w-md">
          <i className="fa-solid fa-search absolute left-3 top-2.5 text-zinc-500"></i>
          <input 
            value={guesserSearch} 
            onChange={e => onSearchChange(e.target.value)} 
            placeholder={t(language, 'guesser.search')} 
            className="ui-field w-full text-sm pl-9 pr-3 py-2 rounded-xl" 
          />
        </div>
      </div>

      {/* Sorts */}
      <div className="mb-3 px-1 flex items-center gap-x-2 flex-wrap">
        <span className="text-[#d4af37] text-xs font-semibold tracking-[1.5px] mr-1">{t(language, 'guesser.sort')}</span>
        {currentMode === 'heroes' && ['az','za','str','agi','int','uni'].map(s => (
          <button 
            key={s} 
            onClick={() => onSetGuesserSort(s)} 
            className={`sort-btn px-2.5 py-0.5 text-[11px] border border-[#4a3728] rounded ${currentGuesserSort===s ? 'active' : ''}`}
          >
            {getSortLabel(language, s, currentMode === 'heroes')}
          </button>
        ))}
        {(currentMode !== 'heroes') && ['az','za'].map(s => (
          <button 
            key={s} 
            onClick={() => onSetGuesserSort(s)} 
            className={`sort-btn px-2.5 py-0.5 text-[11px] border border-[#4a3728] rounded ${currentGuesserSort===s ? 'active' : ''}`}
          >
            {s==='az'?'А → Я':'Я → А'}
          </button>
        ))}
      </div>

      <HeroGrid 
        heroes={filteredSorted} 
        mode={currentMode} 
        eliminated={eliminatedHeroes} 
        onToggleEliminated={onToggleEliminated} 
        onImageLoad={onImageLoad}
      />
    </div>
  );
};

export default GuesserView;
