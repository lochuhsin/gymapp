import type { SQLiteDatabase } from 'expo-sqlite';

/** The role an exercise plays in a program. */
export type ExerciseCategory = 'strength' | 'cardio' | 'mobility';

/** How the movement itself is performed. Only strength exercises have one. */
export type TrainingType = 'isotonic' | 'isometric' | 'plyometric';

/**
 * The category and training type always go together: strength exercises have
 * a training type, every other category leaves it empty. The database does not
 * enforce this, so every write must go through this type.
 */
export type ExerciseKind =
  | { category: 'strength'; trainingType: TrainingType }
  | { category: 'cardio' | 'mobility'; trainingType: null };

export type NewExercise = { name: string } & ExerciseKind;

/** What one set of an exercise counts: repetitions, or seconds held or spent. */
export type Measure = 'reps' | 'seconds';

export type Exercise = { id: number; measure: Measure } & NewExercise;

/** Whether an exercise is chosen to train a muscle group, or the group only assists. */
export type MuscleGroupRole = 'primary' | 'secondary';

/** An exercise together with the names of the equipment and muscle groups it is linked to. */
export type ExerciseWithLinks = Exercise & {
  /** Empty when the exercise needs no equipment. */
  equipment: string[];
  /** Both lists are empty for an exercise with no muscle group, such as cardio. */
  primaryMuscleGroups: string[];
  secondaryMuscleGroups: string[];
};

/**
 * Splits the text of a search box into the words to look for. Apostrophes are
 * dropped and hyphens count as spaces, because both are awkward to type on a
 * phone and the keyboard may substitute curly variants. `NAME_FOR_MATCHING`
 * applies the same rule to the stored name.
 */
export function searchWords(query: string): string[] {
  return query
    .replace(/['’‘`´]/g, '')
    .replace(/[-‐‑‒–—]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

const NAME_FOR_MATCHING = "replace(replace(name, '''', ''), '-', ' ')";

/** Escapes the LIKE wildcards so that what the user typed is matched literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

const EXERCISE_COLUMNS = 'id, name, category, training_type AS trainingType, measure';

/**
 * Finds exercises whose name contains every word of the query, in any order
 * and ignoring case, apostrophes and hyphens. An empty query matches nothing.
 */
export async function searchExercises(
  db: SQLiteDatabase,
  query: string,
): Promise<ExerciseWithLinks[]> {
  const words = searchWords(query);
  if (words.length === 0) return [];

  const conditions = words.map(() => `${NAME_FOR_MATCHING} LIKE ? ESCAPE '\\'`).join(' AND ');
  const params = words.map((word) => `%${escapeLike(word)}%`);

  const exercises = await db.getAllAsync<Exercise>(
    `SELECT ${EXERCISE_COLUMNS}
       FROM exercise
      WHERE ${conditions}
      ORDER BY name`,
    params,
  );
  return withLinks(db, exercises);
}

/** Looks up one exercise with its links, or null when there is none with that id. */
export async function getExercise(
  db: SQLiteDatabase,
  id: number,
): Promise<ExerciseWithLinks | null> {
  const [exercise] = await getExercises(db, [id]);
  return exercise ?? null;
}

/**
 * Looks up several exercises with their links. Each exercise comes back once,
 * in no particular order, and ids that do not exist are left out.
 */
export async function getExercises(
  db: SQLiteDatabase,
  ids: number[],
): Promise<ExerciseWithLinks[]> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];

  const exercises = await db.getAllAsync<Exercise>(
    `SELECT ${EXERCISE_COLUMNS} FROM exercise WHERE id IN (${unique.map(() => '?').join(', ')})`,
    unique,
  );
  return withLinks(db, exercises);
}

/** Looks up the equipment and muscle groups of the given exercises, keeping their order. */
async function withLinks(db: SQLiteDatabase, exercises: Exercise[]): Promise<ExerciseWithLinks[]> {
  if (exercises.length === 0) return [];

  const results: ExerciseWithLinks[] = exercises.map((exercise) => ({
    ...exercise,
    equipment: [],
    primaryMuscleGroups: [],
    secondaryMuscleGroups: [],
  }));
  const byId = new Map(results.map((result) => [result.id, result]));
  const ids = results.map((result) => result.id);
  const idList = ids.map(() => '?').join(', ');

  const equipment = await db.getAllAsync<{ exerciseId: number; name: string }>(
    `SELECT link.exercise_id AS exerciseId, equipment.name
       FROM exercise_equipment AS link
       JOIN equipment ON equipment.id = link.equipment_id
      WHERE link.exercise_id IN (${idList})
      ORDER BY equipment.name`,
    ids,
  );
  for (const { exerciseId, name } of equipment) {
    byId.get(exerciseId)?.equipment.push(name);
  }

  const muscleGroups = await db.getAllAsync<{
    exerciseId: number;
    name: string;
    role: MuscleGroupRole;
  }>(
    `SELECT link.exercise_id AS exerciseId, muscle_group.name, link.role
       FROM exercise_muscle_group AS link
       JOIN muscle_group ON muscle_group.id = link.muscle_group_id
      WHERE link.exercise_id IN (${idList})
      ORDER BY muscle_group.name`,
    ids,
  );
  for (const { exerciseId, name, role } of muscleGroups) {
    const result = byId.get(exerciseId);
    if (!result) continue;
    (role === 'primary' ? result.primaryMuscleGroups : result.secondaryMuscleGroups).push(name);
  }

  return results;
}
