import React from 'react';
import { Language, t } from '../i18n';

interface RoomLobbyProps {
  language: Language;
  roomCode: string;
  roomPlayers: number;
  isLeader: boolean;
  lobbyStatus: string;
  onStartGame: () => void;
  onLeave: () => void;
}

const RoomLobby: React.FC<RoomLobbyProps> = ({ 
  language,
  roomCode, 
  roomPlayers, 
  isLeader, 
  lobbyStatus, 
  onStartGame, 
  onLeave 
}) => {
  return (
    <div id="room-lobby" className="max-w-3xl mx-auto px-5 pt-8 pb-12">
      <div className="text-center mb-6">
        <div className="text-[#d4af37] text-xs tracking-[3px] mb-1">{t(language, 'room.code')}</div>
        <div 
          className="font-mono text-4xl text-[#f0c060] tracking-[4px] cursor-pointer" 
          onClick={() => { 
            const l = `${location.origin}/?room=${roomCode}`; 
            navigator.clipboard.writeText(l); 
          }}
        >
          {roomCode}
        </div>
      </div>

      <div className="dota-card rounded-2xl p-6 border-2 border-[#4a3728] max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-zinc-400">{t(language, 'room.players')}</div>
            <div className="text-2xl font-semibold text-white">{roomPlayers}</div>
          </div>
          <div className={`px-3 py-1 text-xs rounded-full border font-medium ${isLeader ? 'border-[#c23c2a] text-[#f0c060]' : 'border-emerald-400 text-emerald-400'}`}>
            {isLeader ? t(language, 'room.leader') : t(language, 'room.guesser')}
          </div>
        </div>

        <div className="text-[#e0d2b0] text-sm mb-6 min-h-[40px]">{lobbyStatus}</div>

        {isLeader && (
          <button 
            id="lobby-start-btn" 
            onClick={onStartGame} 
            className="w-full h-11 bg-[#c23c2a] hover:bg-[#e04a38] text-white font-semibold rounded-xl border border-[#d4af37]"
          >
            {t(language, 'room.start')}
          </button>
        )}
        {!isLeader && <div className="text-center text-xs text-zinc-500">{t(language, 'room.waitLeader')}</div>}
      </div>
    </div>
  );
};

export default RoomLobby;
