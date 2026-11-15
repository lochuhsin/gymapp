import { useLocalSearchParams } from 'expo-router';

import { ExerciseLog } from '@/screens/exercise-log';

export default function ExerciseRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ExerciseLog exerciseId={Number(id)} />;
}
