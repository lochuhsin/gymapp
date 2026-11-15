import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';

import { DATABASE_NAME, migrateDbIfNeeded } from '@/db/migrations';

// Shows a message and a retry button if the database cannot be opened or
// migrated, instead of leaving an empty screen.
export { ErrorBoundary } from 'expo-router';

export default function RootLayout() {
  return (
    // The provider renders nothing until the database is ready, so the black
    // background has to come from outside it.
    <View style={styles.root}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDbIfNeeded}>
        <Stack screenOptions={{ headerShown: false, contentStyle: styles.root }} />
      </SQLiteProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
