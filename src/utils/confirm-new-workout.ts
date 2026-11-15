import { Alert } from 'react-native';

import type { CurrentSession } from '@/db/sessions';

import { formatTime } from './format-time';

/**
 * Starts a workout, asking first when the current session already holds sets.
 * Starting begins a new session, and from then on new sets go to that one, so
 * it must not happen by a stray tap in the middle of a workout.
 */
export function confirmNewWorkout(current: CurrentSession | null, start: () => void): void {
  if (!current || current.setCount === 0) {
    start();
    return;
  }
  Alert.alert(
    'Start a new workout?',
    `Sets you log from now on go to the new one. The workout started at ${formatTime(current.startedAt)} stays in your history.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start new', onPress: start },
    ],
  );
}
