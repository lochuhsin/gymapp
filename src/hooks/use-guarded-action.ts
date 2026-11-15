import { useRef } from 'react';

/** How long after an action finishes a repeated tap is still ignored. */
const COOL_DOWN_MS = 400;

/**
 * Returns a function that runs an action unless one it ran is still going, or
 * finished only a moment ago. It keeps a double tap from doing something
 * twice: logging a set twice, or deleting the set that moved into the place of
 * the one just deleted.
 */
export function useGuardedAction(): (action: () => Promise<void>) => Promise<void> {
  const blockedUntil = useRef(0);

  return async function guarded(action) {
    if (Date.now() < blockedUntil.current) return;
    blockedUntil.current = Infinity;
    try {
      await action();
    } finally {
      blockedUntil.current = Date.now() + COOL_DOWN_MS;
    }
  };
}
