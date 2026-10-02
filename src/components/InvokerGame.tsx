import React, { useCallback } from 'react';
import { Language, t } from '../i18n';
import { useInvokerGame } from '../minigames/invoker/useInvokerGame';
import {
  ORB_COLORS,
  ORB_ICONS,
  abilityIcon,
  keyCodeLabel,
  type Orb,
  type InvokerSpell,
  type KeybindMap,
} from '../minigames/invoker/spells';

interface InvokerGameProps {
  language: Language;
  onBack: () => void;
}

function sfxVolume(): number {
  try {
    const raw = localStorage.getItem('dota_bukva_sfx_volume');
    if (raw != null) {
      const n = parseFloat(raw);
      if (!isNaN(n)) return Math.max(0, Math.min(1, n));
    }
  } catch {}
  return 0.7;
}

function playSfx(src: string, peak = 0.95) {
  try {
    const master = sfxVolume();
    if (master <= 0) return;
    const el = new Audio(src);
    el.volume = Math.max(0, Math.min(1, master * peak));
    void el.play().catch(() => {});
  } catch {}
}

/** Random voice line for needed / wrong invoke (RU packs in /public/sounds). */
const INVOKE_SUCCS = [
  '/sounds/InvokeSuccsRU1.mp3',
  '/sounds/InvokeSuccsRU2.mp3',
  '/sounds/InvokeSuccsRU3.mp3',
  '/sounds/InvokeSuccsRU4.mp3',
] as const;

const INVOKE_FAIL = [
  '/sounds/InvokeFailRU1.mp3',
  '/sounds/InvokeFailRU2.mp3',
  '/sounds/InvokeFailRU3.mp3',
  '/sounds/InvokeFailRU4.mp3',
] as const;

function pickRandom(list: readonly string[]): string {
  return list[Math.floor(Math.random() * list.length)] || list[0];
}

/**
 * Invoke cast:
 * 1) Invoke.mp3 always
 * 2) random Succs if needed ability, random Fail if wrong
 */
function playInvokeOutcome(outcome: 'needed' | 'wrong') {
  playSfx('/sounds/Invoke.mp3', 0.95);
  // slight delay so cast SFX is not fully masked by voice
  window.setTimeout(() => {
    playSfx(pickRandom(outcome === 'needed' ? INVOKE_SUCCS : INVOKE_FAIL), 1);
  }, 80);
}

function OrbSlot({ orb }: { orb: Orb | '' }) {
  if (!orb) {
    return (
      <div
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-[#4a3728] bg-black/50"
        style={{ boxShadow: 'inset 0 0 12px rgba(0,0,0,0.6)' }}
      />
    );
  }
  return (
    <div
      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 overflow-hidden relative"
      style={{
        borderColor: ORB_COLORS[orb],
        boxShadow: `0 0 16px ${ORB_COLORS[orb]}66`,
      }}
    >
      <img src={ORB_ICONS[orb]} alt={orb} className="w-full h-full object-cover" draggable={false} />
    </div>
  );
}

/** Same footprint as Q/W/E/Invoke ability buttons. */
const ABILITY_BOX = 'w-14 h-14 sm:w-16 sm:h-16';

function SpellIcon({
  spell,
  size = 'md',
  empty,
  label,
}: {
  spell?: InvokerSpell | null;
  size?: 'md' | 'lg';
  empty?: boolean;
  /** Optional key label under the slot (D / F) — matches AbilityKey layout */
  label?: string;
}) {
  const dim = size === 'lg' ? 'w-20 h-20 sm:w-24 sm:h-24' : ABILITY_BOX;
  const box = (
    empty || !spell ? (
      <div
        className={`${dim} rounded-lg border-2 border-[#4a3728] bg-[#14120e] flex items-center justify-center`}
      >
        <i className="fa-solid fa-ban text-zinc-700 text-sm"></i>
      </div>
    ) : (
      <div
        className={`${dim} rounded-lg border-2 border-[#c89b3c]/70 overflow-hidden bg-black/60 relative`}
        title={spell.title}
      >
        {spell.ability ? (
          <img
            src={abilityIcon(spell.ability)}
            alt={spell.title}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-center px-1 text-[#f0c060] leading-tight">
            {spell.title}
          </div>
        )}
      </div>
    )
  );

  if (!label) return box;

  return (
    <div className="flex flex-col items-center gap-1">
      {box}
      <span className="text-[10px] font-mono tracking-wider text-zinc-600 px-1.5 py-0.5 min-h-[1.4rem] flex items-center">
        {label}
      </span>
    </div>
  );
}

function AbilityKey({
  label,
  keyLabel,
  icon,
  color,
  onClick,
  onBind,
  isBinding,
}: {
  label: string;
  keyLabel: string;
  icon?: string;
  color?: string;
  onClick?: () => void;
  onBind?: () => void;
  isBinding?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        data-sfx="none"
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg border-2 border-[#4a3728] bg-[#14120e] hover:border-[#c89b3c] overflow-hidden relative transition-colors"
        style={color ? { boxShadow: `inset 0 0 20px ${color}33` } : undefined}
      >
        {icon ? (
          <img src={icon} alt={label} className="w-full h-full object-cover" draggable={false} />
        ) : (
          <span className="text-xs text-zinc-500">{label}</span>
        )}
      </button>
      <button
        type="button"
        onClick={onBind}
        data-sfx="button"
        className={`text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded border transition-colors ${
          isBinding
            ? 'text-[#f0c060] border-[#d4af37] bg-[#d4af37]/15 animate-pulse'
            : 'text-[#c89b3c] hover:text-[#f0c060] border-[#4a3728]/60 bg-black/40'
        }`}
        title={label}
      >
        {keyLabel}
      </button>
    </div>
  );
}

const BIND_ROWS: { id: keyof KeybindMap; nameKey: string; icon: string; color: string }[] = [
  { id: 'q', nameKey: 'invoker.bindQuas', icon: ORB_ICONS.q, color: ORB_COLORS.q },
  { id: 'w', nameKey: 'invoker.bindWex', icon: ORB_ICONS.w, color: ORB_COLORS.w },
  { id: 'e', nameKey: 'invoker.bindExort', icon: ORB_ICONS.e, color: ORB_COLORS.e },
  { id: 'invoke', nameKey: 'invoker.bindInvoke', icon: ORB_ICONS.invoke, color: '#c89b3c' },
];

const InvokerGame: React.FC<InvokerGameProps> = ({ language, onBack }) => {
  const onInvoke = useCallback((outcome: 'needed' | 'wrong') => {
    playInvokeOutcome(outcome);
  }, []);
  const g = useInvokerGame({ onInvoke });

  return (
    <div id="invoker-game" className="max-w-6xl mx-auto px-4 pt-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <div className="text-[10px] tracking-[3px] text-[#d4af37] uppercase mb-1">
            {t(language, 'minigames.invoker')}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Invoker Game
          </h1>
        </div>
        <button
          type="button"
          onClick={onBack}
          data-sfx="button"
          className="h-10 px-4 ui-btn text-sm rounded-xl"
        >
          {t(language, 'minigames.back')}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
      {/* Left: leaderboard */}
      <aside className="w-full lg:w-48 xl:w-52 flex-shrink-0 lg:sticky lg:top-20 order-2 lg:order-1">
        <div className="dota-card rounded-2xl border-2 border-[#4a3728] overflow-hidden bg-black/40">
          <div className="px-3 py-2.5 border-b border-[#4a3728]/70 bg-black/30 flex items-center gap-2">
            <i className="fa-solid fa-trophy text-[#d4af37] text-xs"></i>
            <div className="text-[11px] tracking-[2px] text-[#d4af37] uppercase font-semibold">
              {t(language, 'invoker.leaderboard')}
            </div>
          </div>
          {g.leaderboard.length === 0 ? (
            <p className="px-3 py-4 text-xs text-zinc-500 leading-relaxed">
              {t(language, 'invoker.lbEmpty')}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] tracking-wider text-zinc-500 uppercase border-b border-[#4a3728]/50">
                  <th className="py-2 pl-2 pr-0.5 text-left font-medium w-8">{t(language, 'invoker.lbRank')}</th>
                  <th className="py-2 px-1 text-left font-medium">{t(language, 'invoker.lbName')}</th>
                  <th className="py-2 pl-1 pr-2 text-right font-medium">{t(language, 'invoker.lbTime')}</th>
                </tr>
              </thead>
              <tbody>
                {g.leaderboard.map((entry, i) => (
                  <tr
                    key={`${entry.at}-${entry.time}-${i}`}
                    className={`border-b border-white/5 last:border-0 ${
                      i === 0 ? 'bg-[#d4af37]/08' : ''
                    }`}
                  >
                    <td className="py-2 pl-2 pr-0.5 font-mono text-zinc-400 tabular-nums text-xs">
                      {i === 0 ? (
                        <span className="text-[#f0c060]">#{i + 1}</span>
                      ) : (
                        `#${i + 1}`
                      )}
                    </td>
                    <td
                      className={`py-2 px-1 text-xs truncate max-w-[5.5rem] ${
                        i === 0 ? 'text-[#f0c060]' : 'text-zinc-300'
                      }`}
                      title={entry.name}
                    >
                      {entry.name}
                    </td>
                    <td
                      className={`py-2 pl-1 pr-2 text-right font-mono tabular-nums text-xs ${
                        i === 0 ? 'text-emerald-400 font-semibold' : 'text-[#e0d2b0]'
                      }`}
                    >
                      {entry.time.toFixed(2)}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </aside>

      {/* Main game column */}
      <div className="flex-1 min-w-0 w-full order-1 lg:order-2">
      {/* Stats */}
      <div className="dota-card rounded-2xl border-2 border-[#4a3728] p-4 sm:p-5 mb-4">
        <div className="flex flex-wrap items-center justify-center gap-6 mb-4">
          <div className="text-center font-mono text-sm">
            <div className="text-[10px] text-zinc-500 tracking-wider uppercase">
              {t(language, 'invoker.time')}
            </div>
            <div className="text-[#f0c060] text-lg tabular-nums">{g.elapsedLabel}</div>
          </div>
          <div className="text-center font-mono text-sm">
            <div className="text-[10px] text-zinc-500 tracking-wider uppercase">
              {t(language, 'invoker.best')}
            </div>
            <div className="text-emerald-400 text-lg tabular-nums">{g.recordLabel}</div>
          </div>
          <div className="text-center font-mono text-sm">
            <div className="text-[10px] text-zinc-500 tracking-wider uppercase">
              {t(language, 'invoker.progress')}
            </div>
            <div className="text-white text-lg tabular-nums">
              {g.progress}/{g.totalSpells}
            </div>
          </div>
        </div>

        {/* Target spell */}
        <div className="flex flex-col items-center py-6 min-h-[160px] justify-center border border-[#4a3728]/50 rounded-xl bg-black/30 mb-4">
          {g.phase === 'waiting' && (
            <div className="text-center space-y-3">
              <p className="text-zinc-400 text-sm max-w-sm">{t(language, 'invoker.howto')}</p>
              <button
                type="button"
                data-sfx="button"
                onClick={g.startGame}
                className="h-11 px-8 rounded-xl ui-btn-primary font-semibold tracking-wide"
              >
                {t(language, 'invoker.start')}{' '}
                <span className="text-white/70 font-mono text-xs ml-1">ENTER</span>
              </button>
            </div>
          )}

          {g.phase === 'playing' && g.targetMeta && (
            <div className="flex flex-col items-center gap-3">
              <SpellIcon spell={g.targetMeta} size="lg" />
              <div className="font-display text-2xl text-[#f0c060] tracking-tight">{g.targetMeta.title}</div>
              <div className="flex gap-1.5">
                {g.targetMeta.combo.map((o, i) => (
                  <span
                    key={i}
                    className="w-3 h-3 rounded-full"
                    style={{ background: ORB_COLORS[o], boxShadow: `0 0 8px ${ORB_COLORS[o]}` }}
                  />
                ))}
              </div>
            </div>
          )}

          {g.phase === 'finished' && (
            <div className="text-center space-y-2 w-full max-w-xs mx-auto">
              <div className="text-emerald-400 text-sm tracking-[2px] uppercase">
                {t(language, 'invoker.finished')}
              </div>
              <div className="font-mono text-4xl text-[#f0c060] tabular-nums">{g.resultLabel}s</div>
              {g.namePrompt?.isRecord && (
                <div className="text-xs text-emerald-400/90">{t(language, 'invoker.newRecord')}</div>
              )}

              {g.namePrompt ? (
                <form
                  className="mt-3 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    g.submitNickname(g.nicknameDraft);
                  }}
                >
                  <label className="block text-[11px] text-zinc-400 tracking-wider uppercase">
                    {g.namePrompt.isRecord
                      ? t(language, 'invoker.nickRecord')
                      : t(language, 'invoker.nickPlace')}
                  </label>
                  <input
                    type="text"
                    value={g.nicknameDraft}
                    onChange={(e) => g.setNicknameDraft(e.target.value.slice(0, 16))}
                    maxLength={16}
                    autoFocus
                    placeholder={t(language, 'invoker.nickPlaceholder')}
                    className="w-full ui-field px-3 py-2 rounded-xl text-center font-mono text-[#f0c060] tracking-wide"
                  />
                  <button
                    type="submit"
                    data-sfx="button"
                    className="w-full h-10 rounded-xl ui-btn-primary text-sm font-semibold"
                  >
                    {t(language, 'invoker.nickSave')}
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  data-sfx="button"
                  onClick={g.endGame}
                  className="mt-2 h-10 px-6 rounded-xl border border-[#4a3728] hover:border-[#d4af37] text-sm text-zinc-300"
                >
                  {t(language, 'invoker.reset')}{' '}
                  <span className="font-mono text-xs text-zinc-500">ENTER</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Orbs */}
        <div className="flex justify-center gap-3 sm:gap-4 mb-5">
          {g.orbs.map((orb, i) => (
            <OrbSlot key={i} orb={orb} />
          ))}
        </div>

        {/* Ability bar */}
        <div className="flex flex-wrap justify-center items-end gap-2 sm:gap-3">
          <AbilityKey
            label="Q"
            keyLabel={keyCodeLabel(g.keys.q)}
            icon={ORB_ICONS.q}
            color={ORB_COLORS.q}
            onClick={() => g.phase === 'playing' && g.pushOrb('q')}
            onBind={() => g.startKeybind('q')}
            isBinding={g.bindingKey === 'q'}
          />
          <AbilityKey
            label="W"
            keyLabel={keyCodeLabel(g.keys.w)}
            icon={ORB_ICONS.w}
            color={ORB_COLORS.w}
            onClick={() => g.phase === 'playing' && g.pushOrb('w')}
            onBind={() => g.startKeybind('w')}
            isBinding={g.bindingKey === 'w'}
          />
          <AbilityKey
            label="E"
            keyLabel={keyCodeLabel(g.keys.e)}
            icon={ORB_ICONS.e}
            color={ORB_COLORS.e}
            onClick={() => g.phase === 'playing' && g.pushOrb('e')}
            onBind={() => g.startKeybind('e')}
            isBinding={g.bindingKey === 'e'}
          />

          <div className="w-px h-14 sm:h-16 bg-[#4a3728] mx-1 hidden sm:block self-start mt-0" />

          <SpellIcon spell={g.spell2Meta} empty={!g.spell2} label="D" />
          <SpellIcon spell={g.spell1Meta} empty={!g.spell1} label="F" />

          <div className="w-px h-14 sm:h-16 bg-[#4a3728] mx-1 hidden sm:block self-start" />

          <AbilityKey
            label="R"
            keyLabel={keyCodeLabel(g.keys.invoke)}
            icon={ORB_ICONS.invoke}
            color="#c89b3c"
            onClick={() => g.phase === 'playing' && g.doInvoke()}
            onBind={() => g.startKeybind('invoke')}
            isBinding={g.bindingKey === 'invoke'}
          />
        </div>

        {g.phase === 'playing' && (
          <p className="text-center text-[11px] text-zinc-500 mt-4">
            {t(language, 'invoker.playingHint')
              .replace('{q}', keyCodeLabel(g.keys.q))
              .replace('{w}', keyCodeLabel(g.keys.w))
              .replace('{e}', keyCodeLabel(g.keys.e))
              .replace('{r}', keyCodeLabel(g.keys.invoke))}
          </p>
        )}
      </div>

      {/* Keybinds panel */}
      <div className="dota-card rounded-2xl border-2 border-[#4a3728] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <div className="font-display text-lg text-[#f0c060] tracking-tight">
              {t(language, 'invoker.bindsTitle')}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{t(language, 'invoker.bindsHint')}</p>
          </div>
          <button
            type="button"
            data-sfx="button"
            onClick={g.resetKeybinds}
            className="h-9 px-3 ui-btn text-xs rounded-lg"
          >
            {t(language, 'invoker.bindsReset')}
          </button>
        </div>

        <div className="space-y-2">
          {BIND_ROWS.map((row) => {
            const active = g.bindingKey === row.id;
            return (
              <button
                key={row.id}
                type="button"
                data-sfx="button"
                onClick={() => g.startKeybind(row.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left ${
                  active
                    ? 'border-[#d4af37] bg-[#d4af37]/10'
                    : 'border-[#4a3728] bg-black/30 hover:border-[#c89b3c]/70'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-lg overflow-hidden border border-[#4a3728] flex-shrink-0"
                  style={{ boxShadow: `inset 0 0 12px ${row.color}44` }}
                >
                  <img src={row.icon} alt="" className="w-full h-full object-cover" draggable={false} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium">{t(language, row.nameKey)}</div>
                  <div className="text-[11px] text-zinc-500">
                    {active ? t(language, 'invoker.pressKey') : t(language, 'invoker.clickToRebind')}
                  </div>
                </div>
                <span
                  className={`font-mono text-sm tracking-wider px-2.5 py-1 rounded border min-w-[3.5rem] text-center ${
                    active
                      ? 'text-[#f0c060] border-[#d4af37] animate-pulse'
                      : 'text-[#c89b3c] border-[#4a3728] bg-black/40'
                  }`}
                >
                  {keyCodeLabel(g.keys[row.id])}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      </div>

      {/* Right: Invoker portrait gif */}
      <aside className="w-full lg:w-44 xl:w-48 flex-shrink-0 lg:sticky lg:top-20 order-3">
        <div className="dota-card rounded-2xl border-2 border-[#4a3728] overflow-hidden bg-black/40 p-2">
          <div className="rounded-xl overflow-hidden border border-[#4a3728]/60 bg-black/50 aspect-[3/4] flex items-center justify-center">
            <img
              src="/videos/invoker.gif"
              alt="Invoker"
              className="w-full h-full object-cover object-center"
              draggable={false}
            />
          </div>
        </div>
      </aside>
      </div>

      {/* Keybind overlay */}
      {g.bindingKey && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/75 backdrop-blur-sm"
          onClick={g.cancelKeybind}
        >
          <div
            className="bg-[#14120ef2] border border-[#c89b3c66] rounded-2xl px-14 py-10 flex flex-col items-center gap-4 shadow-[0_0_40px_#c89b3c26]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white/50 text-sm tracking-[0.1em] uppercase">
              {t(language, 'invoker.pressKey')}
            </p>
            <span className="text-white text-3xl tracking-[0.15em] uppercase font-display">
              {g.bindingKey === 'invoke' ? 'INVOKE' : g.bindingKey.toUpperCase()}
            </span>
            <p className="text-zinc-500 text-xs">{t(language, 'invoker.escCancel')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvokerGame;
