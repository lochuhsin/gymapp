/**
 * The muscle groups, equipment and exercise links every database starts with.
 *
 * These lists are inserted by the second migration. Once that migration has run
 * on a real phone, change the built-in data in a new migration instead of
 * editing these lists.
 */
export const SEED_MUSCLE_GROUPS = [
  'Chest',
  'Lats',
  'Upper Back',
  'Traps',
  'Lower Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Abs',
  'Glutes',
  'Quads',
  'Hamstrings',
  'Calves',
] as const;

export type SeedMuscleGroup = (typeof SEED_MUSCLE_GROUPS)[number];

export const SEED_EQUIPMENT = [
  'Barbell',
  'Dumbbell',
  'Kettlebell',
  'Machine',
  'Cable',
  'Pull-Up Bar',
  'Medicine Ball',
  'Treadmill',
  'Stationary Bike',
  'Rowing Machine',
  'Elliptical',
  'Stair Climber',
  'Jump Rope',
  'Dip Bars',
  'Plyo Box',
] as const;

export type SeedEquipment = (typeof SEED_EQUIPMENT)[number];

type SeedExerciseLinks = {
  /** The exercise's name, as in `SEED_EXERCISES`. */
  exercise: string;
  /** The one main piece of equipment, or null when none is needed. Benches, racks and mats do not count. */
  equipment: SeedEquipment | null;
  /**
   * What the exercise is chosen to train or, for a stretch, what it stretches.
   * Empty for cardio, and for a stretch whose target is not one of the groups.
   */
  primary: readonly SeedMuscleGroup[];
  /** What clearly assists. Muscles that only stabilize are left out. */
  secondary: readonly SeedMuscleGroup[];
};

// prettier-ignore
export const SEED_EXERCISE_LINKS: readonly SeedExerciseLinks[] = [
  // Strength.
  { exercise: 'Barbell Back Squat', equipment: 'Barbell', primary: ['Quads', 'Glutes'], secondary: [] },
  { exercise: 'Barbell Front Squat', equipment: 'Barbell', primary: ['Quads'], secondary: ['Glutes'] },
  { exercise: 'Barbell Deadlift', equipment: 'Barbell', primary: ['Glutes', 'Hamstrings', 'Lower Back'], secondary: ['Quads', 'Traps'] },
  { exercise: 'Barbell Romanian Deadlift', equipment: 'Barbell', primary: ['Hamstrings', 'Glutes'], secondary: ['Lower Back'] },
  { exercise: 'Barbell Bench Press', equipment: 'Barbell', primary: ['Chest'], secondary: ['Triceps', 'Shoulders'] },
  { exercise: 'Barbell Incline Bench Press', equipment: 'Barbell', primary: ['Chest', 'Shoulders'], secondary: ['Triceps'] },
  { exercise: 'Dumbbell Bench Press', equipment: 'Dumbbell', primary: ['Chest'], secondary: ['Triceps', 'Shoulders'] },
  { exercise: 'Dumbbell Incline Bench Press', equipment: 'Dumbbell', primary: ['Chest', 'Shoulders'], secondary: ['Triceps'] },
  { exercise: 'Barbell Overhead Press', equipment: 'Barbell', primary: ['Shoulders'], secondary: ['Triceps'] },
  { exercise: 'Dumbbell Shoulder Press', equipment: 'Dumbbell', primary: ['Shoulders'], secondary: ['Triceps'] },
  { exercise: 'Barbell Row', equipment: 'Barbell', primary: ['Lats', 'Upper Back'], secondary: ['Biceps', 'Shoulders'] },
  { exercise: 'Dumbbell Row', equipment: 'Dumbbell', primary: ['Lats', 'Upper Back'], secondary: ['Biceps', 'Shoulders'] },
  { exercise: 'Barbell Hip Thrust', equipment: 'Barbell', primary: ['Glutes'], secondary: ['Hamstrings'] },
  { exercise: 'Dumbbell Bulgarian Split Squat', equipment: 'Dumbbell', primary: ['Quads', 'Glutes'], secondary: [] },
  { exercise: 'Dumbbell Lunge', equipment: 'Dumbbell', primary: ['Quads', 'Glutes'], secondary: [] },
  { exercise: 'Barbell Curl', equipment: 'Barbell', primary: ['Biceps'], secondary: ['Forearms'] },
  { exercise: 'Dumbbell Curl', equipment: 'Dumbbell', primary: ['Biceps'], secondary: ['Forearms'] },
  { exercise: 'Dumbbell Hammer Curl', equipment: 'Dumbbell', primary: ['Biceps', 'Forearms'], secondary: [] },
  { exercise: 'Dumbbell Lateral Raise', equipment: 'Dumbbell', primary: ['Shoulders'], secondary: [] },
  { exercise: 'Dumbbell Reverse Fly', equipment: 'Dumbbell', primary: ['Shoulders'], secondary: ['Upper Back'] },
  { exercise: 'Barbell Skull Crusher', equipment: 'Barbell', primary: ['Triceps'], secondary: [] },
  { exercise: 'Dumbbell Overhead Triceps Extension', equipment: 'Dumbbell', primary: ['Triceps'], secondary: [] },
  { exercise: 'Barbell Shrug', equipment: 'Barbell', primary: ['Traps'], secondary: [] },
  { exercise: 'Leg Press', equipment: 'Machine', primary: ['Quads'], secondary: ['Glutes'] },
  { exercise: 'Leg Extension', equipment: 'Machine', primary: ['Quads'], secondary: [] },
  { exercise: 'Leg Curl', equipment: 'Machine', primary: ['Hamstrings'], secondary: [] },
  { exercise: 'Machine Calf Raise', equipment: 'Machine', primary: ['Calves'], secondary: [] },
  { exercise: 'Lat Pulldown', equipment: 'Cable', primary: ['Lats'], secondary: ['Biceps', 'Upper Back'] },
  { exercise: 'Cable Row', equipment: 'Cable', primary: ['Lats', 'Upper Back'], secondary: ['Biceps', 'Shoulders'] },
  { exercise: 'Machine Chest Press', equipment: 'Machine', primary: ['Chest'], secondary: ['Triceps', 'Shoulders'] },
  { exercise: 'Cable Fly', equipment: 'Cable', primary: ['Chest'], secondary: ['Shoulders'] },
  { exercise: 'Triceps Pushdown', equipment: 'Cable', primary: ['Triceps'], secondary: [] },
  { exercise: 'Face Pull', equipment: 'Cable', primary: ['Shoulders', 'Upper Back'], secondary: [] },
  { exercise: 'Pull-Up', equipment: 'Pull-Up Bar', primary: ['Lats'], secondary: ['Biceps', 'Upper Back'] },
  { exercise: 'Chin-Up', equipment: 'Pull-Up Bar', primary: ['Lats', 'Biceps'], secondary: ['Upper Back'] },
  { exercise: 'Push-Up', equipment: null, primary: ['Chest'], secondary: ['Triceps', 'Shoulders'] },
  { exercise: 'Dip', equipment: 'Dip Bars', primary: ['Chest', 'Triceps'], secondary: ['Shoulders'] },
  { exercise: 'Hanging Leg Raise', equipment: 'Pull-Up Bar', primary: ['Abs'], secondary: [] },
  { exercise: 'Plank', equipment: null, primary: ['Abs'], secondary: [] },
  { exercise: 'Side Plank', equipment: null, primary: ['Abs'], secondary: [] },
  { exercise: 'Wall Sit', equipment: null, primary: ['Quads'], secondary: [] },
  { exercise: 'Dead Hang', equipment: 'Pull-Up Bar', primary: ['Forearms'], secondary: [] },
  { exercise: 'Box Jump', equipment: 'Plyo Box', primary: ['Quads', 'Glutes'], secondary: ['Calves'] },
  { exercise: 'Jump Squat', equipment: null, primary: ['Quads', 'Glutes'], secondary: ['Calves'] },
  { exercise: 'Clap Push-Up', equipment: null, primary: ['Chest'], secondary: ['Triceps', 'Shoulders'] },
  { exercise: 'Medicine Ball Slam', equipment: 'Medicine Ball', primary: ['Abs', 'Lats'], secondary: ['Shoulders'] },
  // Cardio: equipment only, no muscle groups.
  { exercise: 'Treadmill Run', equipment: 'Treadmill', primary: [], secondary: [] },
  { exercise: 'Treadmill Walk', equipment: 'Treadmill', primary: [], secondary: [] },
  { exercise: 'Outdoor Run', equipment: null, primary: [], secondary: [] },
  { exercise: 'Stationary Bike', equipment: 'Stationary Bike', primary: [], secondary: [] },
  { exercise: 'Rowing Machine', equipment: 'Rowing Machine', primary: [], secondary: [] },
  { exercise: 'Elliptical', equipment: 'Elliptical', primary: [], secondary: [] },
  { exercise: 'Stair Climber', equipment: 'Stair Climber', primary: [], secondary: [] },
  { exercise: 'Jump Rope', equipment: 'Jump Rope', primary: [], secondary: [] },
  // Mobility: the groups being stretched, when they are among the ones above.
  { exercise: 'Cat-Cow', equipment: null, primary: ['Lower Back'], secondary: [] },
  { exercise: "World's Greatest Stretch", equipment: null, primary: ['Hamstrings', 'Glutes'], secondary: [] },
  { exercise: 'Chest Stretch', equipment: null, primary: ['Chest'], secondary: [] },
  { exercise: 'Shoulder Pass-Through', equipment: null, primary: ['Shoulders'], secondary: [] },
  { exercise: 'Hip Flexor Stretch', equipment: null, primary: [], secondary: [] },
  { exercise: 'Hamstring Stretch', equipment: null, primary: ['Hamstrings'], secondary: [] },
  { exercise: 'Pigeon Pose', equipment: null, primary: ['Glutes'], secondary: [] },
  { exercise: "Child's Pose", equipment: null, primary: ['Lower Back', 'Lats'], secondary: [] },
];
