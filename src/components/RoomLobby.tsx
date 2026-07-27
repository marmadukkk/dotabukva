import React from 'react';
import { Language, t } from '../i18n';

interface RoomLobbyProps {
  language: Language;
  roomCode: string;
  roomPlayers: number;
  isLeader: boolean;
  lobbyStatus: string;
  lanHost?: string | null;
  lanPort?: number | null;
  lanAddresses?: string[];
  onStartGame: () => void;
  onLeave: () => void;
}

const RoomLobby: React.FC<RoomLobbyProps> = ({
  language,
  roomCode,
  roomPlayers,
  isLeader,
  lobbyStatus,
  lanHost,
  lanPort,
  lanAddresses = [],
  onStartGame,
  onLeave,
}) => {
  const port = lanPort || 17432;
  const primary = lanHost && lanHost !== '127.0.0.1' ? lanHost : (lanAddresses[0] || lanHost || '127.0.0.1');
  const joinHint = `${primary}:${port}`;
  const allIps = lanAddresses.length ? lanAddresses : (primary ? [primary] : []);

  const copyText = (text: string) => {
    try {
      navigator.clipboard?.writeText(text);
    } catch {}
  };

  return (
    <div id="room-lobby" className="max-w-3xl mx-auto px-5 pt-8 pb-12">
      <div className="text-center mb-6">
        <div className="text-[#d4af37] text-xs tracking-[3px] mb-1">{t(language, 'room.code')}</div>
        <div
          className="font-mono text-4xl text-[#f0c060] tracking-[4px] cursor-pointer"
          data-sfx="button"
          title={t(language, 'room.copyCode')}
          onClick={() => copyText(roomCode)}
        >
          {roomCode}
        </div>

        {isLeader && allIps.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-[10px] tracking-[2px] text-zinc-500 uppercase">
              {t(language, 'room.lanHint')}
            </div>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#4a3728] bg-black/40 cursor-pointer hover:border-[#d4af37] transition-colors"
              data-sfx="button"
              onClick={() => copyText(joinHint)}
              title={t(language, 'room.copyLan')}
            >
              <i className="fa-solid fa-network-wired text-[#d4af37]"></i>
              <span className="font-mono text-lg text-[#f0c060] tracking-wide">{joinHint}</span>
              <i className="fa-solid fa-copy text-xs text-zinc-500"></i>
            </div>
            {allIps.length > 1 && (
              <div className="text-[11px] text-zinc-500">
                {t(language, 'room.lanAlso')}: {allIps.map((ip) => `${ip}:${port}`).join(' · ')}
              </div>
            )}
            <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
              {t(language, 'room.lanHowTo')}
            </p>
          </div>
        )}
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
            data-sfx="button"
            className="w-full h-11 bg-[#c23c2a] hover:bg-[#e04a38] text-white font-semibold rounded-xl border border-[#d4af37]"
          >
            {t(language, 'room.start')}
          </button>
        )}
        {!isLeader && (
          <div className="text-center text-xs text-zinc-500">{t(language, 'room.waitLeader')}</div>
        )}

        <button
          onClick={onLeave}
          data-sfx="button"
          className="mt-3 w-full h-10 text-sm text-zinc-400 hover:text-white border border-[#333] hover:border-[#666] rounded-xl transition-colors"
        >
          {t(language, 'room.leave')}
        </button>
      </div>
    </div>
  );
};

export default RoomLobby;
