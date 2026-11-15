import { useLocalSearchParams } from 'expo-router';

import { ExerciseSearch } from '@/screens/exercise-search';

export default function AddExercisesRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExerciseSearch pickForWorkoutId={Number(id)} />;
}
