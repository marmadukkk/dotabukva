import React from 'react';
import { SpinResult, HistoryEntry } from '../types';
import { Language, t } from '../i18n';
import LeaderReels from './LeaderReels';
import ResultCard from './ResultCard';
import HistoryList from './HistoryList';
import HeroGrid from './HeroGrid';

interface LeaderViewProps {
  language: Language;
  // Reels
  heroReelRef: React.RefObject<HTMLDivElement | null>;
  letterReelRef: React.RefObject<HTMLDivElement | null>;
  heroStripRef: React.RefObject<HTMLDivElement | null>;
  letterStripRef: React.RefObject<HTMLDivElement | null>;
  
  // State
  currentMode: 'heroes' | 'items' | 'abilities';
  isSpinning: boolean;
  lastResult: SpinResult | null;
  history: HistoryEntry[];
  multicastLevel: number;
  sparks: Array<{id: string, tx: number, ty: number, delay: number, size: number}>;
  
  // Room / leader table
  currentRoom: string | null;
  isRoomLeader: boolean;
  eliminatedHeroes: Set<string>;
  filteredSorted: any[];
  
  // Handlers
  onSpin: () => void;
  onClearHistory: () => void;
  onSelectHistory: (r: SpinResult) => void;
}

const LeaderView: React.FC<LeaderViewProps> = (props) => {
  const {
    language,
    heroReelRef, letterReelRef, heroStripRef, letterStripRef,
    currentMode, isSpinning, lastResult, history, multicastLevel, sparks,
    currentRoom, isRoomLeader, eliminatedHeroes, filteredSorted,
    onSpin, onClearHistory, onSelectHistory
  } = props;

  return (
    <div id="leader-view">
      <div className="max-w-5xl mx-auto px-5 pt-4 pb-4">
        <div className="max-w-[860px] mx-auto">
          <LeaderReels
            language={language}
            heroReelRef={heroReelRef}
            letterReelRef={letterReelRef}
            heroStripRef={heroStripRef}
            letterStripRef={letterStripRef}
            isSpinning={isSpinning}
            onSpin={onSpin}
            multicastLevel={multicastLevel}
            sparks={sparks}
            currentMode={currentMode}
          />

          <div className="flex justify-center mb-1">
            <button 
              id="spin-btn" 
              onClick={onSpin} 
              disabled={isSpinning} 
              className="spin-button group flex items-center justify-center gap-x-2 px-8 h-9 text-base font-semibold tracking-tighter bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-2xl shadow-xl shadow-red-950/50 border border-red-500/30 disabled:opacity-70"
            >
              <i className={`fa-solid fa-dice text-lg ${isSpinning ? 'fa-spin' : ''}`}></i>
              <span className="font-display tracking-[3px]">{isSpinning ? t(language, 'leader.spinning') : (lastResult ? t(language, 'leader.spinAgain') : t(language, 'leader.spin'))}</span>
            </button>
          </div>

          {/* RESULT CARD */}
          <ResultCard language={language} result={lastResult} />

          {/* HISTORY */}
          <HistoryList 
            language={language}
            history={history} 
            onClear={onClearHistory} 
            onSelect={onSelectHistory} 
          />
        </div>

        {/* Leader read-only table */}
        {currentRoom && isRoomLeader && (
          <div className="mt-8">
            <div className="section-title flex items-center gap-x-2 mb-2">
              <i className="fa-solid fa-th-large"></i>
              <span>{t(language, 'leader.table')}</span>
            </div>
            <HeroGrid 
              heroes={filteredSorted} 
              mode={currentMode} 
              eliminated={eliminatedHeroes} 
              readonly 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaderView;
