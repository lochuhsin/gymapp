import type { SQLiteDatabase } from 'expo-sqlite';

import { SEED_EQUIPMENT, SEED_EXERCISE_LINKS, SEED_MUSCLE_GROUPS } from './seed-exercise-links';
import { SEED_EXERCISES } from './seed-exercises';

export const DATABASE_NAME = 'gymapp.db';

type Migration = (db: SQLiteDatabase) => Promise<void>;

/** The built-in stretches that are held for time rather than repeated. */
const TIMED_STRETCHES = [
  'Chest Stretch',
  'Hip Flexor Stretch',
  'Hamstring Stretch',
  'Pigeon Pose',
  "Child's Pose",
];

/**
 * Applied in order; the database's `user_version` is the number already
 * applied. A migration that has run on a real phone must never be edited:
 * change the schema or the built-in data by appending a new one.
 *
 * Foreign keys are on while a migration runs and cannot be switched off inside
 * its transaction. So a migration must not drop or rebuild a table that other
 * tables point to (`exercise`, `muscle_group`, `equipment`, `profile`,
 * `session`, `program`, `workout`), nor use INSERT OR REPLACE on one: dropping
 * silently deletes or detaches the rows that point to it, and the rest fail.
 * Change such a table with ALTER TABLE instead.
 */
const MIGRATIONS: Migration[] = [
  async function createExercise(db) {
    // `category` and `training_type` have no CHECK constraint here, so the
    // database accepts any text. `ExerciseKind` guards them in code.
    await db.execAsync(`
      CREATE TABLE exercise (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE,
        category TEXT NOT NULL,
        training_type TEXT
      );
    `);
    for (const exercise of SEED_EXERCISES) {
      await db.runAsync('INSERT INTO exercise (name, category, training_type) VALUES (?, ?, ?)', [
        exercise.name,
        exercise.category,
        exercise.trainingType,
      ]);
    }
  },

  async function addMuscleGroupsAndEquipment(db) {
    // An exercise links to any number of muscle groups (none for cardio) and
    // of equipment (none for bodyweight). Deleting an exercise removes its
    // links; a muscle group or equipment that is still linked cannot be
    // deleted. `role` is 'primary' or 'secondary', guarded by `MuscleGroupRole`.
    await db.execAsync(`
      CREATE TABLE muscle_group (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE
      );
      CREATE TABLE equipment (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL COLLATE NOCASE UNIQUE
      );
      CREATE TABLE exercise_muscle_group (
        exercise_id INTEGER NOT NULL REFERENCES exercise (id) ON DELETE CASCADE,
        muscle_group_id INTEGER NOT NULL REFERENCES muscle_group (id),
        role TEXT NOT NULL,
        PRIMARY KEY (exercise_id, muscle_group_id)
      );
      CREATE TABLE exercise_equipment (
        exercise_id INTEGER NOT NULL REFERENCES exercise (id) ON DELETE CASCADE,
        equipment_id INTEGER NOT NULL REFERENCES equipment (id),
        PRIMARY KEY (exercise_id, equipment_id)
      );
    `);
    for (const name of SEED_MUSCLE_GROUPS) {
      await db.runAsync('INSERT INTO muscle_group (name) VALUES (?)', [name]);
    }
    for (const name of SEED_EQUIPMENT) {
      await db.runAsync('INSERT INTO equipment (name) VALUES (?)', [name]);
    }
    // Rows are linked by name because the ids are assigned by the database. A
    // link whose exercise is no longer in the table inserts nothing.
    for (const link of SEED_EXERCISE_LINKS) {
      if (link.equipment) {
        await db.runAsync(
          `INSERT INTO exercise_equipment (exercise_id, equipment_id)
           SELECT exercise.id, equipment.id
             FROM exercise, equipment
            WHERE exercise.name = ? AND equipment.name = ?`,
          [link.exercise, link.equipment],
        );
      }
      const roles = [
        ['primary', link.primary],
        ['secondary', link.secondary],
      ] as const;
      for (const [role, muscleGroups] of roles) {
        for (const muscleGroup of muscleGroups) {
          await db.runAsync(
            `INSERT INTO exercise_muscle_group (exercise_id, muscle_group_id, role)
             SELECT exercise.id, muscle_group.id, ?
               FROM exercise, muscle_group
              WHERE exercise.name = ? AND muscle_group.name = ?`,
            [role, link.exercise, muscleGroup],
          );
        }
      }
    }
  },

  async function addTrainingLog(db) {
    // `measure` says what one set of the exercise counts: 'reps' or 'seconds'.
    // Holds, cardio and static stretches are timed; everything else is counted.
    await db.execAsync(`
      ALTER TABLE exercise ADD COLUMN measure TEXT NOT NULL DEFAULT 'reps';
      UPDATE exercise SET measure = 'seconds'
       WHERE training_type = 'isometric' OR category = 'cardio';
    `);
    for (const name of TIMED_STRETCHES) {
      await db.runAsync("UPDATE exercise SET measure = 'seconds' WHERE name = ?", [name]);
    }

    // A session is one day of training by one profile; each of its sets is a
    // row. `weight` is the added load in kilograms, 0 for none. Exactly one of
    // `reps` and `seconds` is filled, following the exercise's measure. `meta`
    // is JSON for anything else about the set and is not used for comparisons.
    // An exercise that has been logged cannot be deleted; deleting a session
    // removes its sets.
    await db.execAsync(`
      CREATE TABLE profile (
        id INTEGER PRIMARY KEY NOT NULL,
        name TEXT NOT NULL
      );
      INSERT INTO profile (name) VALUES ('Me');

      CREATE TABLE session (
        id INTEGER PRIMARY KEY NOT NULL,
        profile_id INTEGER NOT NULL REFERENCES profile (id),
        performed_at TEXT NOT NULL
      );
      CREATE TABLE session_set (
        id INTEGER PRIMARY KEY NOT NULL,
        session_id INTEGER NOT NULL REFERENCES session (id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercise (id),
        set_number INTEGER NOT NULL,
        weight REAL NOT NULL DEFAULT 0,
        reps INTEGER,
        seconds INTEGER,
        meta TEXT
      );
      CREATE INDEX session_set_by_exercise ON session_set (exercise_id, session_id);
    `);
  },

  async function makeSessionsExplicit(db) {
    // A session no longer means a day. It runs from when a workout is started
    // until it is finished, so a day can hold several, and `finished_at` is
    // empty while it is in progress. The sessions logged under the old rule
    // are closed.
    await db.execAsync(`
      ALTER TABLE session RENAME COLUMN performed_at TO started_at;
      ALTER TABLE session ADD COLUMN finished_at TEXT;
      UPDATE session SET finished_at = started_at;
    `);
  },

  async function addPrograms(db) {
    // The plan side. A program belongs to a profile and holds workouts; a
    // workout is a named, ordered list of exercises.
    //
    // TEMPLATES have no table or flag of their own: a workout whose
    // `program_id` is NULL is a template, and one with a `program_id` belongs
    // to that program. Templates are shared by every profile. Bringing a
    // template into a program copies it, so the two never affect each other
    // afterwards. (`workouts.ts` holds this rule for the rest of the code.)
    //
    // Deleting a program deletes its workouts, and deleting a workout deletes
    // its list of exercises. A session only remembers which workout it
    // followed: deleting that workout leaves the session and its sets alone.
    // An exercise that is still in a workout cannot be deleted.
    await db.execAsync(`
      CREATE TABLE program (
        id INTEGER PRIMARY KEY NOT NULL,
        profile_id INTEGER NOT NULL REFERENCES profile (id),
        name TEXT NOT NULL
      );
      CREATE TABLE workout (
        id INTEGER PRIMARY KEY NOT NULL,
        program_id INTEGER REFERENCES program (id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE workout_exercise (
        id INTEGER PRIMARY KEY NOT NULL,
        workout_id INTEGER NOT NULL REFERENCES workout (id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercise (id),
        position INTEGER NOT NULL
      );
      CREATE INDEX workout_exercise_by_workout ON workout_exercise (workout_id, position);

      ALTER TABLE session ADD COLUMN workout_id INTEGER REFERENCES workout (id) ON DELETE SET NULL;
    `);

    // When each set was logged. Sets logged before this have no time, and
    // there is nothing to work it out from, so it is left empty for them.
    await db.execAsync('ALTER TABLE session_set ADD COLUMN logged_at TEXT');
  },

  async function makeSessionsMoments(db) {
    // A session is the moment a workout was started, not a span of time, so
    // there is nothing to finish and no end time to keep. Which session is
    // the current one is worked out from `started_at`; `sessions.ts` holds
    // that rule.
    await db.execAsync('ALTER TABLE session DROP COLUMN finished_at');
  },
];

/** Brings the database up to the latest schema. Safe to call on every launch. */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  // SQLite only enforces foreign keys on connections that ask for it, and
  // ignores the request inside a transaction, so it has to happen here.
  await db.execAsync('PRAGMA foreign_keys = ON');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  while (version < MIGRATIONS.length) {
    const migrate = MIGRATIONS[version];
    const next = version + 1;
    // The version is bumped in the same transaction, so a migration that
    // fails halfway is rolled back and retried on the next launch.
    await db.withTransactionAsync(async () => {
      await migrate(db);
      await db.execAsync(`PRAGMA user_version = ${next}`);
    });
    version = next;
  }
}
