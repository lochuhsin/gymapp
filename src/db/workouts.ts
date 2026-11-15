import type { SQLiteDatabase } from 'expo-sqlite';

import { getExercises, type ExerciseWithLinks } from './exercises';
import { inTransaction } from './transaction';

/**
 * THE TEMPLATE RULE. There is no template table and no "is template" flag.
 * A workout is a template exactly when its `program_id` is NULL; a workout
 * with a `program_id` belongs to that program.
 *
 * Every query that needs to tell the two apart must use this condition (or
 * `isTemplate` below) instead of spelling the rule out again, so that the rule
 * lives in one place.
 */
const IS_TEMPLATE = 'workout.program_id IS NULL';

/** A workout: a named, ordered list of exercises. */
export type Workout = {
  id: number;
  name: string;
  /** The program this workout belongs to. NULL MEANS IT IS A TEMPLATE; see `isTemplate`. */
  programId: number | null;
  entries: WorkoutEntry[];
};

/**
 * One line of a workout's list. `entryId` identifies the line itself, not the
 * exercise, because that is what gets moved or removed.
 */
export type WorkoutEntry = {
  entryId: number;
  exercise: ExerciseWithLinks;
};

/** A template as shown in the list of templates. */
export type TemplateSummary = {
  id: number;
  name: string;
  exerciseCount: number;
};

/** Whether a workout is a template: it is one exactly when it belongs to no program. */
export function isTemplate(workout: Pick<Workout, 'programId'>): boolean {
  return workout.programId === null;
}

/** All templates, by name. */
export async function listTemplates(db: SQLiteDatabase): Promise<TemplateSummary[]> {
  return db.getAllAsync<TemplateSummary>(
    `SELECT workout.id, workout.name, COUNT(workout_exercise.id) AS exerciseCount
       FROM workout
       LEFT JOIN workout_exercise ON workout_exercise.workout_id = workout.id
      WHERE ${IS_TEMPLATE}
      GROUP BY workout.id
      ORDER BY workout.name COLLATE NOCASE, workout.id`,
  );
}

/** Creates an empty template and returns its id. Leaving `program_id` out is what makes it a template. */
export async function createTemplate(db: SQLiteDatabase, name: string): Promise<number> {
  const trimmed = name.trim();
  if (trimmed === '') throw new Error('A template needs a name');

  const created = await db.runAsync('INSERT INTO workout (program_id, name) VALUES (NULL, ?)', [
    trimmed,
  ]);
  return created.lastInsertRowId;
}

/**
 * Deletes a workout and its list of exercises. Sessions that followed it are
 * kept, with their sets; they only stop pointing at it.
 */
export async function deleteWorkout(db: SQLiteDatabase, workoutId: number): Promise<void> {
  await db.runAsync('DELETE FROM workout WHERE id = ?', [workoutId]);
}

/** Reads a workout with its exercises in order, or null when there is none with that id. */
export async function getWorkout(db: SQLiteDatabase, workoutId: number): Promise<Workout | null> {
  const workout = await db.getFirstAsync<{ id: number; name: string; programId: number | null }>(
    'SELECT id, name, program_id AS programId FROM workout WHERE id = ?',
    [workoutId],
  );
  if (!workout) return null;

  const lines = await db.getAllAsync<{ entryId: number; exerciseId: number }>(
    `SELECT id AS entryId, exercise_id AS exerciseId FROM workout_exercise
      WHERE workout_id = ?
      ORDER BY position, id`,
    [workoutId],
  );
  const exercises = await getExercises(
    db,
    lines.map((line) => line.exerciseId),
  );
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  const entries: WorkoutEntry[] = [];
  for (const line of lines) {
    const exercise = byId.get(line.exerciseId);
    if (exercise) entries.push({ entryId: line.entryId, exercise });
  }
  return { ...workout, entries };
}

/** Adds an exercise at the end of a workout's list. */
export async function addExercise(
  db: SQLiteDatabase,
  workoutId: number,
  exerciseId: number,
): Promise<void> {
  await inTransaction(db, async () => {
    const last = await db.getFirstAsync<{ position: number | null }>(
      'SELECT MAX(position) AS position FROM workout_exercise WHERE workout_id = ?',
      [workoutId],
    );
    await db.runAsync(
      'INSERT INTO workout_exercise (workout_id, exercise_id, position) VALUES (?, ?, ?)',
      [workoutId, exerciseId, (last?.position ?? 0) + 1],
    );
  });
}

/** Removes every line of a workout that holds the given exercise. */
export async function removeExercise(
  db: SQLiteDatabase,
  workoutId: number,
  exerciseId: number,
): Promise<void> {
  await db.runAsync('DELETE FROM workout_exercise WHERE workout_id = ? AND exercise_id = ?', [
    workoutId,
    exerciseId,
  ]);
}

/** Removes one line of a workout's list. */
export async function removeEntry(db: SQLiteDatabase, entryId: number): Promise<void> {
  await db.runAsync('DELETE FROM workout_exercise WHERE id = ?', [entryId]);
}

/**
 * Moves one line of a workout's list one place up or down, by swapping places
 * with its neighbour. Does nothing at the end of the list.
 */
export async function moveEntry(
  db: SQLiteDatabase,
  entryId: number,
  direction: 'up' | 'down',
): Promise<void> {
  await inTransaction(db, async () => {
    const lines = await db.getAllAsync<{ id: number; position: number }>(
      `SELECT id, position FROM workout_exercise
        WHERE workout_id = (SELECT workout_id FROM workout_exercise WHERE id = ?)
        ORDER BY position, id`,
      [entryId],
    );
    const index = lines.findIndex((line) => line.id === entryId);
    const neighbour = lines[direction === 'up' ? index - 1 : index + 1];
    if (index === -1 || !neighbour) return;

    // Renumbering the whole list rather than swapping two values keeps the
    // order well defined even if two lines ever ended up with the same position.
    const reordered = [...lines];
    reordered[index] = neighbour;
    reordered[lines.indexOf(neighbour)] = lines[index];
    for (const [place, line] of reordered.entries()) {
      await db.runAsync('UPDATE workout_exercise SET position = ? WHERE id = ?', [
        place + 1,
        line.id,
      ]);
    }
  });
}
