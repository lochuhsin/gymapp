import { useLocalSearchParams } from 'expo-router';

import { WorkoutDetail } from '@/screens/workout-detail';

export default function WorkoutRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WorkoutDetail workoutId={Number(id)} />;
}
