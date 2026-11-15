import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { searchExercises, type ExerciseWithLinks } from '@/db/exercises';
import { getCurrentSession, startSession, type CurrentSession } from '@/db/sessions';
import { addExercise, getWorkout, removeExercise } from '@/db/workouts';
import { useGuardedAction } from '@/hooks/use-guarded-action';
import { colors } from '@/theme';
import { confirmNewWorkout } from '@/utils/confirm-new-workout';
import { formatTime } from '@/utils/format-time';

type Props = {
  /**
   * When given, the screen picks exercises for this workout: tapping a result
   * adds it to the workout, or removes it again, instead of opening it.
   */
  pickForWorkoutId?: number;
};

type SearchResults = {
  /** The query these exercises were found for. */
  query: string;
  exercises: ExerciseWithLinks[];
};

/**
 * Searches the exercises by name. On its own it is the app's first screen,
 * with the way into the templates and today's workout at the bottom.
 */
export function ExerciseSearch({ pickForWorkoutId }: Props) {
  const db = useSQLiteContext();
  const router = useRouter();
  const guarded = useGuardedAction();
  const isPicking = pickForWorkoutId !== undefined;

  const [text, setText] = useState('');
  const [results, setResults] = useState<SearchResults>({ query: '', exercises: [] });
  const listRef = useRef<FlatList<ExerciseWithLinks>>(null);
  const [workout, setWorkout] = useState<CurrentSession | null>(null);
  const [pickedIds, setPickedIds] = useState<ReadonlySet<number>>(new Set());

  // A workout can also be started on other screens, and sets are logged on
  // others, so this is read again every time the screen comes back into view.
  useFocusEffect(
    useCallback(() => {
      let isStale = false;
      getCurrentSession(db)
        .then((current) => {
          if (!isStale) setWorkout(current);
        })
        .catch((error) => {
          console.error('Reading the current workout failed', error);
        });
      return () => {
        isStale = true;
      };
    }, [db]),
  );

  useEffect(() => {
    if (pickForWorkoutId === undefined) return;
    let isStale = false;
    readPickedIds(db, pickForWorkoutId)
      .then((ids) => {
        if (!isStale) setPickedIds(ids);
      })
      .catch((error) => {
        console.error('Reading the exercises of the workout failed', error);
      });
    return () => {
      isStale = true;
    };
  }, [db, pickForWorkoutId]);

  const query = text.trim();
  const isSearching = query.length > 0;

  useEffect(() => {
    let isStale = false;
    searchExercises(db, query)
      .then((exercises) => {
        if (isStale) return;
        // New results start from the top, wherever the old list was scrolled.
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
        setResults({ query, exercises });
      })
      .catch((error) => {
        console.error('Exercise search failed', error);
      });
    return () => {
      isStale = true;
    };
  }, [db, query]);

  // The previous results stay on screen until the new ones arrive, so "no
  // matches" is only shown once the database has answered the current query.
  const hasAnswer = results.query === query;

  function handlePress(exercise: ExerciseWithLinks) {
    if (pickForWorkoutId === undefined) {
      router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } });
      return;
    }
    void guarded(async () => {
      try {
        if (pickedIds.has(exercise.id)) {
          await removeExercise(db, pickForWorkoutId, exercise.id);
        } else {
          await addExercise(db, pickForWorkoutId, exercise.id);
        }
        setPickedIds(await readPickedIds(db, pickForWorkoutId));
      } catch (error) {
        console.error('Changing the exercises of the workout failed', error);
      }
    });
  }

  function handleStart() {
    confirmNewWorkout(workout, () => {
      void guarded(async () => {
        try {
          setWorkout(await startSession(db));
        } catch (error) {
          console.error('Starting the workout failed', error);
        }
      });
    });
  }

  return (
    <SafeAreaView style={styles.screen} edges={isPicking ? ['top', 'left', 'right'] : undefined}>
      <StatusBar style="light" />
      {isPicking ? <ScreenHeader title="Add exercises" /> : null}
      <View style={isSearching || isPicking ? styles.searchAtTop : styles.searchCentered}>
        <View style={styles.searchBox}>
          <SymbolView name="magnifyingglass" size={18} tintColor={colors.secondaryText} />
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Search exercises"
            placeholderTextColor={colors.secondaryText}
            selectionColor={colors.text}
            keyboardAppearance="dark"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
            accessibilityLabel="Search exercises"
          />
        </View>
      </View>
      {isSearching ? (
        <FlatList
          ref={listRef}
          data={results.exercises}
          // Rows show whether they are picked, which the list cannot see in `data`.
          extraData={pickedIds}
          keyExtractor={(exercise) => String(exercise.id)}
          renderItem={({ item }) => (
            <ExerciseRow
              exercise={item}
              mark={isPicking ? (pickedIds.has(item.id) ? 'picked' : 'pickable') : 'none'}
              onPress={() => handlePress(item)}
            />
          )}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={hasAnswer ? <Text style={styles.empty}>No exercises found</Text> : undefined}
          contentContainerStyle={styles.results}
          indicatorStyle="white"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        />
      ) : isPicking ? (
        <Text style={styles.empty}>Search for an exercise, then tap it to add it.</Text>
      ) : null}

      {isPicking ? null : (
        <>
          <Pressable
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
            onPress={() => router.push('/templates')}
            accessibilityRole="button">
            <Text style={styles.linkLabel}>Templates</Text>
            <SymbolView name="chevron.right" size={14} tintColor={colors.secondaryText} />
          </Pressable>
          <View style={styles.workoutBar}>
            <Text style={styles.workoutStatus} numberOfLines={1}>
              {workout
                ? `${workout.workoutName ?? 'Workout'} · started ${formatTime(workout.startedAt)}`
                : 'No workout today'}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.workoutButton, pressed && styles.pressed]}
              onPress={handleStart}
              accessibilityRole="button">
              <Text style={styles.workoutButtonLabel}>{workout ? 'New workout' : 'Start workout'}</Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

/** The ids of the exercises a workout currently holds. */
async function readPickedIds(db: SQLiteDatabase, workoutId: number): Promise<ReadonlySet<number>> {
  const workout = await getWorkout(db, workoutId);
  return new Set(workout?.entries.map((entry) => entry.exercise.id));
}

function ExerciseRow({
  exercise,
  mark,
  onPress,
}: {
  exercise: ExerciseWithLinks;
  /** What to show at the end of the row when picking: already in the workout, or not yet. */
  mark: 'none' | 'pickable' | 'picked';
  onPress: () => void;
}) {
  const kind = [exercise.category, exercise.trainingType, ...exercise.equipment]
    .filter(Boolean)
    .join(' · ');
  const muscleGroups = describeMuscleGroups(exercise);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={mark === 'none' ? undefined : { selected: mark === 'picked' }}>
      <View style={styles.rowText}>
        <Text style={styles.name}>{exercise.name}</Text>
        <Text style={styles.detail}>{kind}</Text>
        {muscleGroups ? <Text style={styles.detail}>{muscleGroups}</Text> : null}
      </View>
      {mark === 'none' ? null : (
        <SymbolView
          name={mark === 'picked' ? 'checkmark' : 'plus'}
          size={18}
          tintColor={mark === 'picked' ? colors.better : colors.secondaryText}
        />
      )}
    </Pressable>
  );
}

/** "Chest (Shoulders, Triceps)": the primary groups, then the secondary ones in brackets. */
function describeMuscleGroups(exercise: ExerciseWithLinks): string {
  const primary = exercise.primaryMuscleGroups.join(', ');
  if (exercise.secondaryMuscleGroups.length === 0) return primary;

  const secondary = `(${exercise.secondaryMuscleGroups.join(', ')})`;
  return primary ? `${primary} ${secondary}` : secondary;
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // With nothing typed, the box sits a little above the middle of the screen,
  // which keeps it clear of the keyboard on small phones.
  searchCentered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 160,
  },
  searchAtTop: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    color: colors.text,
    fontSize: 17,
  },
  results: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.5,
  },
  name: {
    color: colors.text,
    fontSize: 17,
  },
  detail: {
    color: colors.secondaryText,
    fontSize: 13,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
  },
  empty: {
    paddingTop: 24,
    paddingHorizontal: 20,
    color: colors.secondaryText,
    fontSize: 15,
    textAlign: 'center',
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  linkLabel: {
    color: colors.text,
    fontSize: 17,
  },
  workoutBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
  },
  workoutStatus: {
    flex: 1,
    color: colors.secondaryText,
    fontSize: 15,
  },
  workoutButton: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    backgroundColor: colors.text,
  },
  workoutButtonLabel: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '600',
  },
});
