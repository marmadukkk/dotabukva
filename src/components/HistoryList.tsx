import React from 'react';
import { HistoryEntry, SpinResult } from '../types';
import { Language, t } from '../i18n';

interface HistoryListProps {
  language: Language;
  history: HistoryEntry[];
  onClear: () => void;
  onSelect: (result: SpinResult) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ language, history, onClear, onSelect }) => {
  return (
    <div className="flex-shrink-0 mt-1 text-xs">
      <div className="flex items-center justify-between mb-0.5 px-1 border-b border-[#4a3728] pb-1">
        <div className="section-title text-[10px]">{t(language, 'leader.history')}</div>
        <button 
          onClick={onClear} 
          className="text-[10px] text-[#d4af37] hover:text-white flex items-center gap-x-1 transition-colors border border-[#4a3728] px-2 py-0.5 rounded hover:bg-[#1a1a1a]"
        >
          <i className="fa-solid fa-trash text-[8px]"></i><span>{t(language, 'leader.clear')}</span>
        </button>
      </div>
      <div id="history-list" className="dota-card rounded border border-[#4a3728] divide-y divide-[#4a3728] overflow-auto text-[10px] max-h-48">
        {history.length === 0 && (
          <div className="px-2 py-1 text-center text-[#d4af37]">{t(language, 'leader.empty')}</div>
        )}
        {history.map((h, idx) => (
          <div 
            key={idx} 
            onClick={() => onSelect({ 
              hero: h.hero, 
              hero_en: h.hero, 
              short: h.short || '', 
              attr: h.attr || '', 
              attr_label: '', 
              color: h.color || '', 
              image: h.image || '', 
              letter: h.letter 
            })} 
            className="history-item px-5 py-[13px] flex items-start gap-3 text-sm cursor-pointer"
          >
            <div className="flex-1">
              <div className="flex items-baseline gap-x-2">
                <span className="font-semibold text-white">{h.hero}</span>
                <span className="font-mono text-red-400 text-base leading-none pt-0.5">{h.letter}</span>
                <span className="text-[10px] text-zinc-500 ml-auto">
                  {new Date(h.ts).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryList;
