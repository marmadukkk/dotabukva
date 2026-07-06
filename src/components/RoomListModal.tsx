import React, { useState } from 'react';
import { Language, t } from '../i18n';

interface Room {
  code: string;
  created?: number;
}

interface RoomListModalProps {
  language: Language;
  open: boolean;
  rooms: Room[];
  onClose: () => void;
  onJoin: (code: string) => void;
}

const RoomListModal: React.FC<RoomListModalProps> = ({ language, open, rooms, onClose, onJoin }) => {
  const [joinCodeInput, setJoinCodeInput] = useState('');

  if (!open) return null;

  const handleJoin = () => {
    const code = joinCodeInput.trim();
    if (code.length >= 4) {
      onJoin(code);
      setJoinCodeInput('');
    }
  };

  const handleRoomClick = (code: string) => {
    onJoin(code);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[130] flex items-center justify-center p-5"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="dota-card max-w-md w-full rounded-2xl p-6 border-2 border-[#4a3728]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="font-display text-xl tracking-[2px] text-[#d4af37]">{t(language, 'roomList.title')}</div>
          <button onClick={onClose} className="text-2xl leading-none text-[#d4af37] hover:text-white">×</button>
        </div>

        {rooms.length === 0 ? (
          <div className="text-zinc-400 text-sm py-4">{t(language, 'roomList.empty')}</div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-auto">
            {rooms.map((room, idx) => {
              const time = room.created 
                ? new Date(room.created * 1000 || room.created).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) 
                : '';
              return (
                <div 
                  key={idx}
                  onClick={() => handleRoomClick(room.code)}
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
          <div className="text-xs text-zinc-400 mb-2">{t(language, 'roomList.orEnter')}</div>
          <div className="flex gap-2">
            <input 
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              maxLength={8} 
              placeholder={t(language, 'roomList.placeholder')} 
              className="flex-1 bg-[#111] border border-[#4a3728] px-3 py-2 rounded text-center font-mono tracking-widest uppercase"
            />
            <button 
              onClick={handleJoin} 
              className="px-4 bg-[#c23c2a] hover:bg-[#e04a38] border border-[#d4af37] rounded text-sm"
            >
              {t(language, 'roomList.join')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomListModal;
