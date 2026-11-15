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

export type Exercise = { id: number } & NewExercise;

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

/**
 * Finds exercises whose name contains every word of the query, in any order
 * and ignoring case, apostrophes and hyphens. An empty query matches nothing.
 */
export async function searchExercises(db: SQLiteDatabase, query: string): Promise<Exercise[]> {
  const words = searchWords(query);
  if (words.length === 0) return [];

  const conditions = words.map(() => `${NAME_FOR_MATCHING} LIKE ? ESCAPE '\\'`).join(' AND ');
  const params = words.map((word) => `%${escapeLike(word)}%`);

  return db.getAllAsync<Exercise>(
    `SELECT id, name, category, training_type AS trainingType
       FROM exercise
      WHERE ${conditions}
      ORDER BY name`,
    params,
  );
}
