import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { getCurrentSession, startSession, type CurrentSession } from '@/db/sessions';
import {
  deleteWorkout,
  getWorkout,
  isTemplate,
  moveEntry,
  removeEntry,
  type Workout,
} from '@/db/workouts';
import { useGuardedAction } from '@/hooks/use-guarded-action';
import { colors } from '@/theme';
import { confirmNewWorkout } from '@/utils/confirm-new-workout';
import { formatTime } from '@/utils/format-time';

/** Shows one workout or template: its exercises in order, and the way to start it. */
export function WorkoutDetail({ workoutId }: { workoutId: number }) {
  const db = useSQLiteContext();
  const router = useRouter();
  const guarded = useGuardedAction();
  // undefined while loading, null when there is no such workout.
  const [workout, setWorkout] = useState<Workout | null | undefined>(undefined);
  const [current, setCurrent] = useState<CurrentSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Read again whenever the screen comes back into view: exercises are added
  // on another page, and a workout can be started elsewhere.
  useFocusEffect(
    useCallback(() => {
      let isStale = false;
      Promise.all([getWorkout(db, workoutId), getCurrentSession(db)])
        .then(([found, session]) => {
          if (isStale) return;
          setWorkout(found);
          setCurrent(session);
        })
        .catch((reason) => {
          if (!isStale) setError(messageOf(reason));
        });
      return () => {
        isStale = true;
      };
    }, [db, workoutId]),
  );

  /** Runs a change, then shows the workout and the session as they now are. */
  function change(action: () => Promise<unknown>) {
    void guarded(async () => {
      try {
        await action();
        const [found, session] = await Promise.all([
          getWorkout(db, workoutId),
          getCurrentSession(db),
        ]);
        setWorkout(found);
        setCurrent(session);
        setError(null);
      } catch (reason) {
        setError(messageOf(reason));
      }
    });
  }

  function confirmDelete() {
    Alert.alert(
      'Delete this template?',
      'Workouts already logged from it are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            void guarded(async () => {
              try {
                await deleteWorkout(db, workoutId);
                router.back();
              } catch (reason) {
                setError(messageOf(reason));
              }
            }),
        },
      ],
    );
  }

  if (!workout) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        <ScreenHeader title={workout === null ? 'Not found' : ''} />
        {error ? <Text style={[styles.error, styles.content]}>{error}</Text> : null}
      </SafeAreaView>
    );
  }

  // Whether the current session was started from this workout.
  const isFollowed = current?.workoutId === workout.id;
  const lastIndex = workout.entries.length - 1;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <ScreenHeader title={workout.name} />
      <ScrollView contentContainerStyle={styles.content} indicatorStyle="white">
        <Text style={styles.detail}>{isTemplate(workout) ? 'Template' : 'Workout'}</Text>

        {workout.entries.length === 0 ? (
          <Text style={styles.empty}>No exercises yet</Text>
        ) : null}
        {workout.entries.map((entry, index) => (
          <View key={entry.entryId} style={styles.row}>
            <Text style={styles.number}>{index + 1}</Text>
            <Pressable
              style={({ pressed }) => [styles.exercise, pressed && styles.pressed]}
              onPress={() =>
                router.push({ pathname: '/exercise/[id]', params: { id: entry.exercise.id } })
              }
              accessibilityRole="button">
              <Text style={styles.name}>{entry.exercise.name}</Text>
              <Text style={styles.detailInRow}>
                {[entry.exercise.category, entry.exercise.trainingType, ...entry.exercise.equipment]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </Pressable>
            <IconButton
              symbol="chevron.up"
              label={`Move ${entry.exercise.name} up`}
              disabled={index === 0}
              onPress={() => change(() => moveEntry(db, entry.entryId, 'up'))}
            />
            <IconButton
              symbol="chevron.down"
              label={`Move ${entry.exercise.name} down`}
              disabled={index === lastIndex}
              onPress={() => change(() => moveEntry(db, entry.entryId, 'down'))}
            />
            <IconButton
              symbol="xmark"
              label={`Remove ${entry.exercise.name}`}
              onPress={() => change(() => removeEntry(db, entry.entryId))}
            />
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [styles.button, styles.secondaryButton, pressed && styles.pressed]}
          onPress={() => router.push({ pathname: '/workout/[id]/add', params: { id: workout.id } })}
          accessibilityRole="button">
          <Text style={[styles.buttonLabel, styles.secondaryLabel]}>Add exercises</Text>
        </Pressable>

        <View style={styles.session}>
          {current && isFollowed ? (
            <Text style={styles.status}>
              Started {formatTime(current.startedAt)}. Tap an exercise to log it.
            </Text>
          ) : null}
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPress={() =>
              confirmNewWorkout(current, () => change(() => startSession(db, workout.id)))
            }
            accessibilityRole="button">
            <Text style={styles.buttonLabel}>{isFollowed ? 'Start again' : 'Start workout'}</Text>
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {isTemplate(workout) ? (
          <Pressable
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
            onPress={confirmDelete}
            accessibilityRole="button">
            <Text style={styles.deleteLabel}>Delete template</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function IconButton({
  symbol,
  label,
  disabled = false,
  onPress,
}: {
  symbol: 'chevron.up' | 'chevron.down' | 'xmark';
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.iconButton}
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <SymbolView
        name={symbol}
        size={15}
        tintColor={disabled ? colors.border : colors.secondaryText}
      />
    </Pressable>
  );
}

function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  detail: {
    marginBottom: 8,
    color: colors.secondaryText,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  number: {
    width: 28,
    color: colors.secondaryText,
    fontSize: 17,
  },
  exercise: {
    flex: 1,
    paddingVertical: 12,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: 17,
  },
  detailInRow: {
    color: colors.secondaryText,
    fontSize: 13,
  },
  iconButton: {
    width: 32,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingVertical: 16,
    color: colors.secondaryText,
    fontSize: 15,
  },
  button: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
  },
  buttonLabel: {
    color: colors.background,
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryLabel: {
    color: colors.text,
  },
  session: {
    marginTop: 24,
    gap: 12,
  },
  status: {
    color: colors.secondaryText,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.5,
  },
  deleteButton: {
    marginTop: 32,
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  deleteLabel: {
    color: colors.worse,
    fontSize: 15,
  },
  error: {
    marginTop: 12,
    color: colors.worse,
    fontSize: 15,
  },
});
