import React from 'react';
import { SpinResult } from '../types';
import { Language, t } from '../i18n';

interface ResultCardProps {
  language: Language;
  result: SpinResult | null;
  onClickHistoryItem?: (entry: any) => void; // for history reuse
}

const ResultCard: React.FC<ResultCardProps> = ({ language, result }) => {
  if (!result) return null;

  return (
    <div id="result-card" className="flex-shrink-0 dota-card rounded p-3 border-2 border-[#4a3728] text-sm">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="flex items-center gap-x-4 flex-1">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#d4af37] flex-shrink-0">
            <img src={result.image} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-[#f0c060] text-4xl leading-none tracking-tighter">{result.hero}</div>
          </div>
        </div>
        <div className="flex-shrink-0 text-center md:text-right">
          <div className="text-[10px] tracking-[3px] font-bold text-[#d4af37] mb-1">{t(language, 'leader.onLetter')}</div>
          <div className="font-display text-4xl leading-none text-[#f0c060]">{result.letter}</div>
        </div>
      </div>
    </div>
  );
};

export default ResultCard;
