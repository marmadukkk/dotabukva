import React, { useEffect, useState } from 'react';
import { Language, t } from '../i18n';
import type { MpTransport } from '../multiplayer';
import type { RoomReel, RoomSeat } from '../hooks/useRoom';
import NickReel from './NickReel';

interface RoomLobbyProps {
  language: Language;
  roomCode: string;
  roomPlayers: number;
  isLeader: boolean;
  lobbyStatus: string;
  nick: string;
  roster: RoomSeat[];
  selfId?: string | null;
  onNickChange: (name: string) => void;
  countdownEndsAt?: number | null;
  reel?: RoomReel | null;
  onToggleReady: () => void;
  lanHost?: string | null;
  lanPort?: number | null;
  lanAddresses?: string[];
  /** lan | online | local — web never uses LAN */
  transport?: MpTransport;
  onLeave: () => void;
}

const RoomLobby: React.FC<RoomLobbyProps> = ({
  language,
  roomCode,
  roomPlayers,
  isLeader,
  lobbyStatus,
  nick,
  roster,
  selfId,
  onNickChange,
  countdownEndsAt,
  reel,
  onToggleReady,
  lanHost,
  lanPort,
  lanAddresses = [],
  transport = 'none',
  onLeave,
}) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!countdownEndsAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [countdownEndsAt]);
  const secondsLeft = countdownEndsAt ? Math.max(0, Math.ceil((countdownEndsAt - now) / 1000)) : 0;
  const me = roster.find((seat) => seat.id === selfId);
  const iAmReady = !!me?.ready;
  const winnerName = reel ? roster.find((seat) => seat.id === reel.winnerId)?.name || '' : '';
  const port = lanPort || 17432;
  const primary = lanHost && lanHost !== '127.0.0.1' ? lanHost : (lanAddresses[0] || lanHost || '127.0.0.1');
  const joinHint = `${primary}:${port}`;
  const allIps = lanAddresses.length ? lanAddresses : (primary ? [primary] : []);
  const showLan = transport === 'lan' && isLeader && allIps.length > 0;
  const showOnlineHint = transport === 'online' || transport === 'local';

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

        {showLan && (
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

        {showOnlineHint && (
          <div className="mt-4 space-y-1 max-w-md mx-auto">
            <div className="text-[10px] tracking-[2px] text-zinc-500 uppercase">
              {t(language, transport === 'online' ? 'room.onlineHint' : 'room.localHint')}
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {t(language, transport === 'online' ? 'room.onlineHowTo' : 'room.localHowTo')}
            </p>
            {typeof window !== 'undefined' && (
              <button
                type="button"
                data-sfx="button"
                className="text-[11px] text-[#d4af37]/80 hover:text-[#d4af37] underline underline-offset-2"
                onClick={() => copyText(`${window.location.origin}/?room=${roomCode}`)}
              >
                {t(language, 'room.copyLink')}
              </button>
            )}
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

        <label className="block mb-4">
          <div className="text-[10px] tracking-[2px] text-zinc-500 mb-1">{t(language, 'room.nick')}</div>
          <input
            value={nick}
            maxLength={16}
            placeholder={t(language, 'room.nickPh')}
            onChange={(e) => onNickChange(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-black/40 border border-[#4a3728] text-white outline-none focus:border-[#d4af37]"
          />
        </label>

        <div className="mb-4">
          <div className="text-[10px] tracking-[2px] text-zinc-500 mb-2">{t(language, 'room.players')}</div>
          <ul className="space-y-1.5">
            {(roster.length ? roster : [{ id: 'me', name: nick || 'Player', role: isLeader ? 'leader' as const : 'guesser' as const }]).map((seat) => (
              <li key={seat.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-white truncate">
                  {seat.name || 'Player'}
                  {(seat.id === selfId || seat.id === 'me') && (
                    <span className="text-zinc-500"> · {t(language, 'room.you')}</span>
                  )}
                </span>
                <span className={`text-[10px] tracking-wider ${seat.ready ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {seat.ready ? t(language, 'room.ready') : t(language, 'room.unready')}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-zinc-500 leading-relaxed">{t(language, 'room.rosterHint')}</p>
        </div>

        <div className="text-[#e0d2b0] text-sm mb-4 min-h-[40px]">{lobbyStatus}</div>

        {reel && winnerName && (
          <div className="mb-4 text-center">
            <div className="text-[10px] tracking-[2px] text-[#d4af37] mb-1">{t(language, 'room.countdown')}</div>
            <NickReel names={reel.names.length ? reel.names : roster.map((seat) => seat.name)} winnerName={winnerName} />
          </div>
        )}

        {countdownEndsAt && !reel && (
          <div className="mb-4 text-center">
            <div className="text-[10px] tracking-[2px] text-[#d4af37]">{t(language, 'room.countdown')}</div>
            <div className="font-display text-6xl text-white tabular-nums">{secondsLeft}</div>
          </div>
        )}

        {!reel && (
          <button
            id="lobby-ready-btn"
            type="button"
            onClick={onToggleReady}
            data-sfx="button"
            className={`w-full h-11 font-semibold rounded-xl border ${
              iAmReady
                ? 'bg-[#1f3a2a] border-emerald-400 text-emerald-300'
                : 'bg-[#c23c2a] hover:bg-[#e04a38] border-[#d4af37] text-white'
            }`}
          >
            {iAmReady ? t(language, 'room.unready') : t(language, 'room.ready')}
          </button>
        )}
        {!reel && roster.filter((seat) => seat.ready).length < roster.length && (
          <div className="mt-2 text-center text-xs text-zinc-500">{t(language, 'room.waitReady')}</div>
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
