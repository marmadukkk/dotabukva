import React from 'react';
import { Language, t } from '../i18n';

interface HowToModalProps {
  language: Language;
  open: boolean;
  onClose: () => void;
}

const HowToModal: React.FC<HowToModalProps> = ({ language, open, onClose }) => {
  if (!open) return null;

  return (
    <div 
      id="howto-modal" 
      onClick={onClose} 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex items-center justify-center p-5"
    >
      <div 
        onClick={e => e.stopPropagation()} 
        className="dota-card max-w-lg w-full rounded p-7 border-2 border-[#4a3728]"
      >
        <div className="flex justify-between items-center mb-4 border-b border-[#4a3728] pb-3">
          <div className="font-display text-xl tracking-[2px] text-[#d4af37]">{t(language, 'modal.howto')}</div>
          <button onClick={onClose} className="text-2xl leading-none text-[#d4af37] hover:text-white">×</button>
        </div>
        <div className="space-y-5 text-[15px] text-[#e0d2b0]">
          <div className="flex gap-4">
            <div className="w-6 h-6 rounded-full bg-[#c23c2a] flex-shrink-0 flex items-center justify-center text-xs font-bold border border-[#d4af37]">1</div>
            <div>{t(language, 'modal.howto1').replace('{leader}', t(language, 'role.leaderTitle')).replace('{guesser}', t(language, 'role.guesserTitle'))}</div>
          </div>
          <div className="flex gap-4">
            <div className="w-6 h-6 rounded-full bg-[#c23c2a] flex-shrink-0 flex items-center justify-center text-xs font-bold border border-[#d4af37]">2</div>
            <div>{t(language, 'modal.howto2').replace('{heroLetter}', t(language, 'misc.hero') + ' + ' + t(language, 'leader.letter').toLowerCase())}</div>
          </div>
          <div className="flex gap-4">
            <div className="w-6 h-6 rounded-full bg-[#c23c2a] flex-shrink-0 flex items-center justify-center text-xs font-bold border border-[#d4af37]">3</div>
            <div>{t(language, 'modal.howto3')}</div>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="mt-6 w-full h-11 bg-[#c23c2a] hover:bg-[#e04a38] text-white font-semibold rounded border border-[#d4af37] tracking-widest"
        >
          {t(language, 'modal.howtoBtn')}
        </button>
      </div>
    </div>
  );
};

export default HowToModal;
