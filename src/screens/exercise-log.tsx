import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { getExercise, type ExerciseWithLinks } from '@/db/exercises';
import {
  addSet,
  amountOf,
  compareSets,
  deleteSet,
  getCurrentSession,
  getExerciseLog,
  startSession,
  type CurrentSession,
  type ExerciseLog as Log,
  type LoggedSet,
} from '@/db/sessions';
import { useGuardedAction } from '@/hooks/use-guarded-action';
import { colors } from '@/theme';
import { formatDay, formatTime } from '@/utils/format-time';

/** Logs sets of one exercise in the current session, next to the time before. */
export function ExerciseLog({ exerciseId }: { exerciseId: number }) {
  const db = useSQLiteContext();
  const guarded = useGuardedAction();
  // undefined while loading, null when there is no such exercise.
  const [exercise, setExercise] = useState<ExerciseWithLinks | null | undefined>(undefined);
  const [log, setLog] = useState<Log>({ current: [], previous: null });
  const [workout, setWorkout] = useState<CurrentSession | null>(null);
  const [weight, setWeight] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const timed = exercise?.measure === 'seconds';
  const unit = timed ? 'seconds' : 'reps';

  useEffect(() => {
    let isStale = false;
    Promise.all([
      getExercise(db, exerciseId),
      getExerciseLog(db, exerciseId),
      getCurrentSession(db),
    ])
      .then(([found, loaded, session]) => {
        if (isStale) return;
        const inputs = inputsFor(loaded);
        setExercise(found);
        setLog(loaded);
        setWorkout(session);
        setWeight(inputs.weight);
        setAmount(inputs.amount);
      })
      .catch((reason) => {
        if (!isStale) setError(messageOf(reason));
      });
    return () => {
      isStale = true;
    };
  }, [db, exerciseId]);

  /** Runs a change, then shows the resulting log and the next set to aim for. */
  function change(action: () => Promise<unknown>) {
    void guarded(async () => {
      try {
        await action();
        const [updated, session] = await Promise.all([
          getExerciseLog(db, exerciseId),
          getCurrentSession(db),
        ]);
        const inputs = inputsFor(updated);
        setLog(updated);
        setWorkout(session);
        setWeight(inputs.weight);
        setAmount(inputs.amount);
        setError(null);
      } catch (reason) {
        setError(messageOf(reason));
      }
    });
  }

  function handleAdd() {
    const parsedWeight = parseWeight(weight);
    const parsedAmount = parseAmount(amount);
    if (parsedWeight === null) {
      setError('Weight must be a number, or empty for none.');
      return;
    }
    if (parsedAmount === null) {
      setError(`Enter the ${unit} as a whole number above zero.`);
      return;
    }
    change(() => addSet(db, exerciseId, parsedWeight, parsedAmount));
  }

  const previous = log.previous?.sets ?? [];
  const rows = Math.max(previous.length, log.current.length);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <ScreenHeader title={exercise?.name ?? (exercise === null ? 'Exercise not found' : '')} />

      {exercise ? (
        <ScrollView
          contentContainerStyle={styles.content}
          indicatorStyle="white"
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets>
          <Text style={styles.detail}>{describeKind(exercise)}</Text>
          {workout ? (
            <Text style={styles.detail}>
              {workout.workoutName ?? 'Workout'} · started {formatTime(workout.startedAt)}
            </Text>
          ) : null}

          <View style={[styles.row, styles.headingRow]}>
            <Text style={[styles.setColumn, styles.heading]}>Set</Text>
            <Text style={[styles.column, styles.heading]}>
              {log.previous ? `Last time · ${describeWhen(log.previous.startedAt)}` : 'Last time'}
            </Text>
            <Text style={[styles.column, styles.heading]}>This workout</Text>
            <View style={styles.actionColumn} />
          </View>

          {rows === 0 ? <Text style={styles.empty}>No sets logged yet</Text> : null}
          {Array.from({ length: rows }, (_, index) => {
            const before = previous[index];
            const now = log.current[index];
            return (
              <View key={index} style={styles.row}>
                <Text style={[styles.setColumn, styles.dim]}>{index + 1}</Text>
                <Text style={[styles.column, styles.dim]}>{before ? describeSet(before) : '–'}</Text>
                <Text style={styles.column}>
                  {now ? describeSet(now) : ''}
                  {now && before ? <ProgressMark now={now} before={before} /> : null}
                </Text>
                <View style={styles.actionColumn}>
                  {now ? (
                    <Pressable
                      onPress={() => change(() => deleteSet(db, now.id))}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete set ${index + 1}`}>
                      <SymbolView name="xmark" size={14} tintColor={colors.secondaryText} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}

          {workout ? (
            <View style={styles.entry}>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="0"
                placeholderTextColor={colors.secondaryText}
                selectionColor={colors.text}
                keyboardAppearance="dark"
                keyboardType="decimal-pad"
                accessibilityLabel="Weight in kilograms"
              />
              <Text style={styles.dim}>kg ×</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={colors.secondaryText}
                selectionColor={colors.text}
                keyboardAppearance="dark"
                keyboardType="number-pad"
                accessibilityLabel={timed ? 'Seconds' : 'Reps'}
              />
              <Text style={styles.dim}>{timed ? 'sec' : 'reps'}</Text>
              <Pressable
                style={({ pressed }) => [styles.button, styles.addButton, pressed && styles.pressed]}
                onPress={handleAdd}
                accessibilityRole="button"
                accessibilityLabel={`Add set ${log.current.length + 1}`}>
                <Text style={styles.buttonLabel}>Add set</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.start}>
              <Text style={styles.empty}>Start a workout to log sets.</Text>
              <Pressable
                style={({ pressed }) => [styles.button, pressed && styles.pressed]}
                onPress={() => change(() => startSession(db))}
                accessibilityRole="button">
                <Text style={styles.buttonLabel}>Start workout</Text>
              </Pressable>
            </View>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      ) : error ? (
        <Text style={[styles.error, styles.content]}>{error}</Text>
      ) : null}
    </SafeAreaView>
  );
}

/** A mark after a set of this workout when the same set of last time exists to compare with. */
function ProgressMark({ now, before }: { now: LoggedSet; before: LoggedSet }) {
  const progress = compareSets(now, before);
  if (progress === 'same') return <Text style={styles.dim}> =</Text>;
  return progress === 'better' ? (
    <Text style={styles.better}> ▲</Text>
  ) : (
    <Text style={styles.worse}> ▼</Text>
  );
}

/**
 * What to put in the inputs for the next set: the matching set of last time,
 * otherwise a repeat of the set just done. Empty when there is nothing to go on.
 */
function inputsFor(log: Log): { weight: string; amount: string } {
  const previous = log.previous?.sets ?? [];
  const target = previous[log.current.length] ?? log.current.at(-1) ?? previous.at(-1);
  return {
    weight: target && target.weight > 0 ? String(target.weight) : '',
    amount: target ? String(amountOf(target)) : '',
  };
}

function describeKind(exercise: ExerciseWithLinks): string {
  return [exercise.category, exercise.trainingType, ...exercise.equipment]
    .filter(Boolean)
    .join(' · ');
}

/**
 * When the previous workout was: the day, and the time as well when it was
 * today, since there can be several workouts in a day.
 */
function describeWhen(isoTimestamp: string): string {
  const day = formatDay(isoTimestamp);
  return day === formatDay(new Date().toISOString()) ? formatTime(isoTimestamp) : day;
}

/** "60 kg × 10", "10 kg × 30 s", or just "12 reps" and "1:30" when there is no weight. */
function describeSet(set: LoggedSet): string {
  const timed = set.seconds !== null;
  const amount = timed ? formatSeconds(amountOf(set)) : String(amountOf(set));
  if (set.weight > 0) return `${set.weight} kg × ${amount}`;
  return timed ? amount : `${amount} reps`;
}

/** "45 s" below a minute, "1:30" from a minute up. */
function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Reads a weight as typed, with a dot or a comma; empty means no weight. Null when invalid. */
function parseWeight(text: string): number | null {
  const cleaned = text.trim().replace(',', '.');
  if (cleaned === '') return 0;
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

/** Reads reps or seconds as typed. Null unless it is a whole number above zero. */
function parseAmount(text: string): number | null {
  const cleaned = text.trim();
  if (!/^\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return value >= 1 ? value : null;
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
    paddingBottom: 32,
  },
  detail: {
    marginBottom: 4,
    color: colors.secondaryText,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  headingRow: {
    minHeight: 32,
    marginTop: 12,
  },
  heading: {
    color: colors.secondaryText,
    fontSize: 13,
  },
  setColumn: {
    width: 36,
    fontSize: 17,
  },
  column: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
  },
  actionColumn: {
    width: 28,
    alignItems: 'flex-end',
  },
  dim: {
    color: colors.secondaryText,
    fontSize: 17,
  },
  better: {
    color: colors.better,
  },
  worse: {
    color: colors.worse,
  },
  empty: {
    paddingVertical: 16,
    color: colors.secondaryText,
    fontSize: 15,
  },
  // The row wraps, so on a narrow phone or with large text the button moves to
  // a second line instead of running off the edge.
  entry: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  start: {
    marginTop: 4,
    alignItems: 'flex-start',
  },
  input: {
    width: 72,
    height: 44,
    paddingHorizontal: 12,
    paddingVertical: 0,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 17,
    textAlign: 'center',
  },
  button: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    backgroundColor: colors.text,
  },
  addButton: {
    marginLeft: 'auto',
  },
  buttonLabel: {
    color: colors.background,
    fontSize: 17,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
  error: {
    marginTop: 12,
    color: colors.worse,
    fontSize: 15,
  },
});
