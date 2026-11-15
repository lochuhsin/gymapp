import type { SQLiteDatabase } from 'expo-sqlite';

let previous: Promise<unknown> = Promise.resolve();

/**
 * Runs a task inside a transaction, after every earlier one has finished.
 *
 * Use this instead of `db.withTransactionAsync`. That method does not wait for
 * a transaction already open on the same connection: started twice in quick
 * succession, for example by two taps on a button, the second BEGIN fails and
 * its rollback undoes the first one's work.
 */
export function inTransaction(db: SQLiteDatabase, task: () => Promise<void>): Promise<void> {
  const run = previous.then(() => db.withTransactionAsync(task));
  // The chain itself must never reject, or every later task would be skipped.
  previous = run.catch(() => undefined);
  return run;
}
