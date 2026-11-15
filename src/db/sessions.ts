import type { SQLiteDatabase } from 'expo-sqlite';

import type { Measure } from './exercises';
import { inTransaction } from './transaction';

/**
 * THE SESSION RULE. A session is a moment, not a span of time: it is created
 * when the user starts a workout, and it has no end. Several can be started on
 * the same day.
 *
 * The CURRENT session is the most recently started one whose start falls on
 * today's date by the phone's clock. Sets are logged into it. On a later day
 * there is no current session until a workout is started again, so sets can
 * never slip into a session from an earlier day.
 *
 * Every query that needs "today" must use this condition instead of spelling
 * the rule out again, so that the rule lives in one place.
 */
const STARTED_TODAY = "date(session.started_at, 'localtime') = date('now', 'localtime')";

/** The session that sets are being logged into. See the session rule above. */
export type CurrentSession = {
  id: number;
  startedAt: string;
  /**
   * The workout or template this session follows. Null when it was started on
   * its own, or when the workout it followed has since been deleted.
   */
  workoutId: number | null;
  workoutName: string | null;
  /** How many sets it holds so far, over all exercises. */
  setCount: number;
};

/** One set as it was done. Exactly one of `reps` and `seconds` is filled. */
export type LoggedSet = {
  id: number;
  /** Added load in kilograms; 0 when there is none. */
  weight: number;
  reps: number | null;
  seconds: number | null;
};

/** What has been logged for one exercise: in the current session, and the time before. */
export type ExerciseLog = {
  /** The sets done in the current session, in order. Empty when there is none. */
  current: LoggedSet[];
  /** The most recent other session that included this exercise, if there is one. */
  previous: { startedAt: string; sets: LoggedSet[] } | null;
};

export type Progress = 'better' | 'same' | 'worse';

/** The reps or seconds of a set, whichever it has. */
export function amountOf(set: LoggedSet): number {
  return set.reps ?? set.seconds ?? 0;
}

/**
 * Compares a set with the same-numbered set of an earlier session. More weight
 * counts as better; at the same weight, more reps or seconds does.
 */
export function compareSets(now: LoggedSet, before: LoggedSet): Progress {
  const difference = now.weight - before.weight || amountOf(now) - amountOf(before);
  if (difference > 0) return 'better';
  return difference < 0 ? 'worse' : 'same';
}

/** There is one profile until profiles can be created; everything is logged under it. */
async function defaultProfileId(db: SQLiteDatabase): Promise<number> {
  const profile = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM profile ORDER BY id LIMIT 1',
  );
  if (!profile) throw new Error('The database has no profile');
  return profile.id;
}

/** The current session, or null when no workout has been started today. */
export async function getCurrentSession(db: SQLiteDatabase): Promise<CurrentSession | null> {
  return db.getFirstAsync<CurrentSession>(
    `SELECT session.id, session.started_at AS startedAt,
            session.workout_id AS workoutId, workout.name AS workoutName,
            (SELECT COUNT(*) FROM session_set
              WHERE session_set.session_id = session.id) AS setCount
       FROM session
       LEFT JOIN workout ON workout.id = session.workout_id
      WHERE session.profile_id = ? AND ${STARTED_TODAY}
      ORDER BY session.id DESC LIMIT 1`,
    [await defaultProfileId(db)],
  );
}

/**
 * Starts a workout, following the given workout or template if there is one.
 * Every call begins a new session, which becomes the current one. There is no
 * limit per day: the same template can be started twice on one day and gives
 * two sessions.
 */
export async function startSession(
  db: SQLiteDatabase,
  workoutId: number | null = null,
): Promise<CurrentSession> {
  const result: { session: CurrentSession | null } = { session: null };
  await inTransaction(db, async () => {
    await db.runAsync('INSERT INTO session (profile_id, started_at, workout_id) VALUES (?, ?, ?)', [
      await defaultProfileId(db),
      new Date().toISOString(),
      workoutId,
    ]);
    result.session = await getCurrentSession(db);

    // A session in which nothing was logged can no longer receive sets once a
    // newer one exists, so it is only clutter: started by mistake, or twice.
    await db.runAsync(
      `DELETE FROM session
        WHERE id IS NOT ?
          AND NOT EXISTS (SELECT 1 FROM session_set WHERE session_set.session_id = session.id)`,
      [result.session?.id ?? null],
    );
  });
  if (!result.session) throw new Error('The workout could not be started');
  return result.session;
}

async function setsOf(
  db: SQLiteDatabase,
  sessionId: number,
  exerciseId: number,
): Promise<LoggedSet[]> {
  return db.getAllAsync<LoggedSet>(
    `SELECT id, weight, reps, seconds FROM session_set
      WHERE session_id = ? AND exercise_id = ?
      ORDER BY set_number, id`,
    [sessionId, exerciseId],
  );
}

/**
 * Reads the sets of an exercise in the current session, and its sets in the
 * most recent other session that included it. That other session can be from
 * earlier the same day.
 */
export async function getExerciseLog(db: SQLiteDatabase, exerciseId: number): Promise<ExerciseLog> {
  const current = await getCurrentSession(db);

  const earlier = await db.getFirstAsync<{ id: number; startedAt: string }>(
    `SELECT id, started_at AS startedAt FROM session
      WHERE profile_id = ?
        AND id IS NOT ?
        AND EXISTS (SELECT 1 FROM session_set
                     WHERE session_id = session.id AND exercise_id = ?)
      ORDER BY id DESC LIMIT 1`,
    [await defaultProfileId(db), current?.id ?? null, exerciseId],
  );

  return {
    current: current ? await setsOf(db, current.id, exerciseId) : [],
    previous: earlier
      ? { startedAt: earlier.startedAt, sets: await setsOf(db, earlier.id, exerciseId) }
      : null,
  };
}

/**
 * Logs one more set of an exercise in the current session. `amount` is reps or
 * seconds, whichever the exercise is measured in.
 */
export async function addSet(
  db: SQLiteDatabase,
  exerciseId: number,
  weight: number,
  amount: number,
): Promise<void> {
  if (!Number.isFinite(weight) || weight < 0) {
    throw new Error('Weight must be zero or more');
  }
  if (!Number.isInteger(amount) || amount < 1) {
    throw new Error('Reps or seconds must be a whole number above zero');
  }

  await inTransaction(db, async () => {
    const exercise = await db.getFirstAsync<{ measure: Measure }>(
      'SELECT measure FROM exercise WHERE id = ?',
      [exerciseId],
    );
    if (!exercise) throw new Error(`There is no exercise with id ${exerciseId}`);

    const session = await getCurrentSession(db);
    if (!session) throw new Error('Start a workout before logging a set');

    const last = await db.getFirstAsync<{ setNumber: number | null }>(
      `SELECT MAX(set_number) AS setNumber FROM session_set
        WHERE session_id = ? AND exercise_id = ?`,
      [session.id, exerciseId],
    );
    // The column name comes from the exercise's own measure, never from input.
    const amountColumn = exercise.measure === 'seconds' ? 'seconds' : 'reps';
    await db.runAsync(
      `INSERT INTO session_set
         (session_id, exercise_id, set_number, weight, ${amountColumn}, logged_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [session.id, exerciseId, (last?.setNumber ?? 0) + 1, weight, amount, new Date().toISOString()],
    );
  });
}

/** Removes a logged set and closes the gap it leaves in the set numbers. */
export async function deleteSet(db: SQLiteDatabase, setId: number): Promise<void> {
  await inTransaction(db, async () => {
    const set = await db.getFirstAsync<{
      sessionId: number;
      exerciseId: number;
      setNumber: number;
    }>(
      `SELECT session_id AS sessionId, exercise_id AS exerciseId, set_number AS setNumber
         FROM session_set WHERE id = ?`,
      [setId],
    );
    if (!set) return;

    await db.runAsync('DELETE FROM session_set WHERE id = ?', [setId]);
    // Keeps the stored set numbers the same as the ones shown on screen.
    await db.runAsync(
      `UPDATE session_set SET set_number = set_number - 1
        WHERE session_id = ? AND exercise_id = ? AND set_number > ?`,
      [set.sessionId, set.exerciseId, set.setNumber],
    );
  });
}
