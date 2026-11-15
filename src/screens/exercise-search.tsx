import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { searchExercises, type Exercise } from '@/db/exercises';

type SearchResults = {
  /** The query these exercises were found for. */
  query: string;
  exercises: Exercise[];
};

export function ExerciseSearch() {
  const db = useSQLiteContext();
  const [text, setText] = useState('');
  const [results, setResults] = useState<SearchResults>({ query: '', exercises: [] });
  const listRef = useRef<FlatList<Exercise>>(null);

  const query = text.trim();
  const isSearching = query.length > 0;

  useEffect(() => {
    let isStale = false;
    searchExercises(db, query)
      .then((exercises) => {
        if (isStale) return;
        // New results start from the top, wherever the old list was scrolled.
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
        setResults({ query, exercises });
      })
      .catch((error) => {
        console.error('Exercise search failed', error);
      });
    return () => {
      isStale = true;
    };
  }, [db, query]);

  // The previous results stay on screen until the new ones arrive, so "no
  // matches" is only shown once the database has answered the current query.
  const hasAnswer = results.query === query;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <View style={isSearching ? styles.searchAtTop : styles.searchCentered}>
        <View style={styles.searchBox}>
          <SymbolView name="magnifyingglass" size={18} tintColor={colors.secondaryText} />
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Search exercises"
            placeholderTextColor={colors.secondaryText}
            selectionColor={colors.text}
            keyboardAppearance="dark"
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
            accessibilityLabel="Search exercises"
          />
        </View>
      </View>
      {isSearching && (
        <FlatList
          ref={listRef}
          data={results.exercises}
          keyExtractor={(exercise) => String(exercise.id)}
          renderItem={({ item }) => <ExerciseRow exercise={item} />}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={hasAnswer ? <Text style={styles.empty}>No exercises found</Text> : undefined}
          contentContainerStyle={styles.results}
          indicatorStyle="white"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        />
      )}
    </SafeAreaView>
  );
}

function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const kind = exercise.trainingType
    ? `${exercise.category} · ${exercise.trainingType}`
    : exercise.category;

  return (
    <View style={styles.row}>
      <Text style={styles.name}>{exercise.name}</Text>
      <Text style={styles.kind}>{kind}</Text>
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const colors = {
  background: '#000000',
  surface: '#1C1C1E',
  border: '#3A3A3C',
  separator: '#2C2C2E',
  text: '#FFFFFF',
  secondaryText: '#8E8E93',
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // With nothing typed, the box sits a little above the middle of the screen,
  // which keeps it clear of the keyboard on small phones.
  searchCentered: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 160,
  },
  searchAtTop: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    color: colors.text,
    fontSize: 17,
  },
  results: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  row: {
    paddingVertical: 12,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: 17,
  },
  kind: {
    color: colors.secondaryText,
    fontSize: 13,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
  },
  empty: {
    paddingTop: 24,
    color: colors.secondaryText,
    fontSize: 15,
    textAlign: 'center',
  },
});
