import type { NewExercise } from './exercises';

/**
 * The exercises every new database starts with. Different equipment means a
 * different exercise, so the name starts with the equipment whenever the same
 * movement exists with several kinds.
 *
 * This list is inserted by the first migration. Once that migration has run on
 * a real phone, add or change built-in exercises in a new migration instead of
 * editing this list.
 */
export const SEED_EXERCISES: readonly NewExercise[] = [
  // Strength: the joints move through a range of motion against a load.
  { name: 'Barbell Back Squat', category: 'strength', trainingType: 'isotonic' },
  { name: 'Barbell Front Squat', category: 'strength', trainingType: 'isotonic' },
  { name: 'Barbell Deadlift', category: 'strength', trainingType: 'isotonic' },
  { name: 'Barbell Romanian Deadlift', category: 'strength', trainingType: 'isotonic' },
  { name: 'Barbell Bench Press', category: 'strength', trainingType: 'isotonic' },
  { name: 'Barbell Incline Bench Press', category: 'strength', trainingType: 'isotonic' },
  { name: 'Dumbbell Bench Press', category: 'strength', trainingType: 'isotonic' },
  { name: 'Dumbbell Incline Bench Press', category: 'strength', trainingType: 'isotonic' },
  { name: 'Barbell Overhead Press', category: 'strength', trainingType: 'isotonic' },
  { name: 'Dumbbell Shoulder Press', category: 'strength', trainingType: 'isotonic' },
  { name: 'Barbell Row', category: 'strength', trainingType: 'isotonic' },
  { name: 'Dumbbell Row', category: 'strength', trainingType: 'isotonic' },
  { name: 'Barbell Hip Thrust', category: 'strength', trainingType: 'isotonic' },
  { name: 'Dumbbell Bulgarian Split Squat', category: 'strength', trainingType: 'isotonic' },
  { name: 'Dumbbell Lunge', category: 'strength', trainingType: 'isotonic' },
  { name: 'Barbell Curl', category: 'strength', trainingType: 'isotonic' },
  { name: 'Dumbbell Curl', category: 'strength', trainingType: 'isotonic' },
  { name: 'Dumbbell Hammer Curl', category: 'strength', trainingType: 'isotonic' },
  { name: 'Dumbbell Lateral Raise', category: 'strength', trainingType: 'isotonic' },
  { name: 'Dumbbell Reverse Fly', category: 'strength', trainingType: 'isotonic' },
  { name: 'Barbell Skull Crusher', category: 'strength', trainingType: 'isotonic' },
  { name: 'Dumbbell Overhead Triceps Extension', category: 'strength', trainingType: 'isotonic' },
  { name: 'Barbell Shrug', category: 'strength', trainingType: 'isotonic' },
  { name: 'Leg Press', category: 'strength', trainingType: 'isotonic' },
  { name: 'Leg Extension', category: 'strength', trainingType: 'isotonic' },
  { name: 'Leg Curl', category: 'strength', trainingType: 'isotonic' },
  { name: 'Machine Calf Raise', category: 'strength', trainingType: 'isotonic' },
  { name: 'Lat Pulldown', category: 'strength', trainingType: 'isotonic' },
  { name: 'Cable Row', category: 'strength', trainingType: 'isotonic' },
  { name: 'Machine Chest Press', category: 'strength', trainingType: 'isotonic' },
  { name: 'Cable Fly', category: 'strength', trainingType: 'isotonic' },
  { name: 'Triceps Pushdown', category: 'strength', trainingType: 'isotonic' },
  { name: 'Face Pull', category: 'strength', trainingType: 'isotonic' },
  { name: 'Pull-Up', category: 'strength', trainingType: 'isotonic' },
  { name: 'Chin-Up', category: 'strength', trainingType: 'isotonic' },
  { name: 'Push-Up', category: 'strength', trainingType: 'isotonic' },
  { name: 'Dip', category: 'strength', trainingType: 'isotonic' },
  { name: 'Hanging Leg Raise', category: 'strength', trainingType: 'isotonic' },
  // Strength: a position is held.
  { name: 'Plank', category: 'strength', trainingType: 'isometric' },
  { name: 'Side Plank', category: 'strength', trainingType: 'isometric' },
  { name: 'Wall Sit', category: 'strength', trainingType: 'isometric' },
  { name: 'Dead Hang', category: 'strength', trainingType: 'isometric' },
  // Strength: explosive jumps and throws.
  { name: 'Box Jump', category: 'strength', trainingType: 'plyometric' },
  { name: 'Jump Squat', category: 'strength', trainingType: 'plyometric' },
  { name: 'Clap Push-Up', category: 'strength', trainingType: 'plyometric' },
  { name: 'Medicine Ball Slam', category: 'strength', trainingType: 'plyometric' },
  // Cardio. Steady or interval is decided by the program, not here.
  { name: 'Treadmill Run', category: 'cardio', trainingType: null },
  { name: 'Treadmill Walk', category: 'cardio', trainingType: null },
  { name: 'Outdoor Run', category: 'cardio', trainingType: null },
  { name: 'Stationary Bike', category: 'cardio', trainingType: null },
  { name: 'Rowing Machine', category: 'cardio', trainingType: null },
  { name: 'Elliptical', category: 'cardio', trainingType: null },
  { name: 'Stair Climber', category: 'cardio', trainingType: null },
  { name: 'Jump Rope', category: 'cardio', trainingType: null },
  // Mobility.
  { name: 'Cat-Cow', category: 'mobility', trainingType: null },
  { name: "World's Greatest Stretch", category: 'mobility', trainingType: null },
  { name: 'Chest Stretch', category: 'mobility', trainingType: null },
  { name: 'Shoulder Pass-Through', category: 'mobility', trainingType: null },
  { name: 'Hip Flexor Stretch', category: 'mobility', trainingType: null },
  { name: 'Hamstring Stretch', category: 'mobility', trainingType: null },
  { name: 'Pigeon Pose', category: 'mobility', trainingType: null },
  { name: "Child's Pose", category: 'mobility', trainingType: null },
];
