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

/** Cooldown is gone: every cross-out is allowed. */
export function remainingElimCd(_state: ElimState, _nowSec = Date.now() / 1000): number {
  return 0;
}

export function canEliminate(_state: ElimState, _nowSec = Date.now() / 1000): boolean {
  return true;
}

/** Kept so older call sites still compile. Does not start a cooldown. */
export function applySuccessfulElim(state: ElimState, _nowSec = Date.now() / 1000): ElimState {
  return { freeElims: state.freeElims, lastElimTime: state.lastElimTime };
}
