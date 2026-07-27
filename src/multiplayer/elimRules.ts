/**
 * Guesser eliminate rules — same on LAN host, future online host, and local web session.
 */
import { ELIM_COOLDOWN_SEC, FREE_ELIMS_INITIAL } from './protocol';

export { ELIM_COOLDOWN_SEC, FREE_ELIMS_INITIAL };

export interface ElimState {
  freeElims: number;
  lastElimTime: number; // unix seconds
}

export function initialElimState(): ElimState {
  return { freeElims: FREE_ELIMS_INITIAL, lastElimTime: 0 };
}

/** Remaining CD seconds (0 if free elims left or CD expired). */
export function remainingElimCd(state: ElimState, nowSec = Date.now() / 1000): number {
  if (state.freeElims > 0) return 0;
  if (!state.lastElimTime) return 0;
  return Math.max(0, ELIM_COOLDOWN_SEC - (nowSec - state.lastElimTime));
}

export function canEliminate(state: ElimState, nowSec = Date.now() / 1000): boolean {
  return remainingElimCd(state, nowSec) <= 0;
}

/**
 * Apply a successful eliminate on the guesser.
 * Free elims first; then each elim starts a cooldown from lastElimTime.
 */
export function applySuccessfulElim(state: ElimState, nowSec = Date.now() / 1000): ElimState {
  // Match host (lanServer): free stack first; only paid elims stamp lastElimTime
  if (state.freeElims > 0) {
    return { freeElims: state.freeElims - 1, lastElimTime: state.lastElimTime };
  }
  return { freeElims: 0, lastElimTime: nowSec };
}
