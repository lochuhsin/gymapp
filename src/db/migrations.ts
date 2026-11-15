import type { SQLiteDatabase } from 'expo-sqlite';

import { SEED_EXERCISES } from './seed-exercises';

export const DATABASE_NAME = 'gymapp.db';

type Migration = (db: SQLiteDatabase) => Promise<void>;

/**
 * Applied in order; the database's `user_version` is the number already
 * applied. A migration that has run on a real phone must never be edited:
 * change the schema or the built-in data by appending a new one.
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
