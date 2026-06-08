// Adaptive difficulty (spec §5): if the user gets 3 correct in a row, the
// next question's difficulty bumps up by one (capped at 3). A wrong answer
// resets the streak.
//
// This is a pure-function tracker so it's easy to test and easy to advance
// state during the quiz without coupling to React.

import type { Difficulty } from "../types";

export interface AdaptiveState {
  /** Consecutive-correct counter, resets to 0 on a wrong answer. */
  inARow: number;
  /** Difficulty the NEXT question should be drawn at (1, 2, or 3). */
  nextDifficulty: Difficulty;
}

export function createAdaptiveState(initial: Difficulty = 1): AdaptiveState {
  return { inARow: 0, nextDifficulty: initial };
}

export function adaptiveAdvance(state: AdaptiveState, lastCorrect: boolean): AdaptiveState {
  if (!lastCorrect) {
    return { inARow: 0, nextDifficulty: 1 };
  }
  const inARow = state.inARow + 1;
  // Every 3-in-a-row bumps difficulty by one.
  let nextDifficulty = state.nextDifficulty;
  if (inARow > 0 && inARow % 3 === 0 && nextDifficulty < 3) {
    nextDifficulty = ((nextDifficulty + 1) as Difficulty);
  }
  return { inARow, nextDifficulty };
}
