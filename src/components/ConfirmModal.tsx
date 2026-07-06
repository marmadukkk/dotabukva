import React from 'react';
import { Language, t } from '../i18n';

interface ConfirmModalProps {
  language: Language;
  show: boolean;
  title: string;
  message: string;
  onConfirm: (confirmed: boolean) => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ language, show, title, message, onConfirm }) => {
  if (!show) return null;

  return (
    <div 
      id="confirm-modal" 
      onClick={() => onConfirm(false)} 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[120] flex items-center justify-center p-5 show"
    >
      <div 
        onClick={e => e.stopPropagation()} 
        id="confirm-modal-card" 
        className="dota-card max-w-sm w-full rounded-2xl p-6 border-2 border-[#4a3728] transition-all duration-200 scale-100 opacity-1"
      >
        <div className="font-display text-xl tracking-[2px] text-[#d4af37] mb-3">{title}</div>
        <div className="text-[#e0d2b0] text-[15px] mb-6 leading-snug whitespace-pre-line">{message}</div>
        <div className="flex gap-3">
          <button 
            onClick={() => onConfirm(false)} 
            className="flex-1 h-10 text-sm font-medium rounded-xl border border-[#4a3728] hover:bg-[#1a1a1a]"
          >
            {t(language, 'modal.confirmCancel')}
          </button>
          <button 
            onClick={() => onConfirm(true)} 
            className="flex-1 h-10 text-sm font-semibold rounded-xl bg-[#c23c2a] hover:bg-[#e04a38] border border-[#d4af37] text-white"
          >
            {t(language, 'modal.confirmYes')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
