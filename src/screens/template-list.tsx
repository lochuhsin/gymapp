import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { createTemplate, listTemplates, type TemplateSummary } from '@/db/workouts';
import { useGuardedAction } from '@/hooks/use-guarded-action';
import { colors } from '@/theme';

/** Lists the workout templates and creates new ones. */
export function TemplateList() {
  const db = useSQLiteContext();
  const router = useRouter();
  const guarded = useGuardedAction();
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Read again whenever the screen comes back into view, since a template may
  // have been changed or deleted on its own page.
  useFocusEffect(
    useCallback(() => {
      let isStale = false;
      listTemplates(db)
        .then((found) => {
          if (!isStale) setTemplates(found);
        })
        .catch((reason) => {
          if (!isStale) setError(messageOf(reason));
        });
      return () => {
        isStale = true;
      };
    }, [db]),
  );

  function open(id: number) {
    router.push({ pathname: '/workout/[id]', params: { id } });
  }

  function handleCreate() {
    void guarded(async () => {
      try {
        const id = await createTemplate(db, name);
        setName('');
        setError(null);
        open(id);
      } catch (reason) {
        setError(messageOf(reason));
      }
    });
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <ScreenHeader title="Templates" />

      <View style={styles.entry}>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          onSubmitEditing={handleCreate}
          placeholder="New template name"
          placeholderTextColor={colors.secondaryText}
          selectionColor={colors.text}
          keyboardAppearance="dark"
          returnKeyType="done"
          accessibilityLabel="New template name"
        />
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={handleCreate}
          accessibilityRole="button">
          <Text style={styles.buttonLabel}>Create</Text>
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={templates}
        keyExtractor={(template) => String(template.id)}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => open(item.id)}
            accessibilityRole="button">
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.detail}>
              {item.exerciseCount === 1 ? '1 exercise' : `${item.exerciseCount} exercises`}
            </Text>
          </Pressable>
        )}
        ItemSeparatorComponent={Separator}
        ListEmptyComponent={<Text style={styles.empty}>No templates yet</Text>}
        contentContainerStyle={styles.list}
        indicatorStyle="white"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function messageOf(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  input: {
    flex: 1,
    height: 44,
    paddingHorizontal: 12,
    paddingVertical: 0,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 17,
  },
  button: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    backgroundColor: colors.text,
  },
  buttonLabel: {
    color: colors.background,
    fontSize: 17,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.5,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  row: {
    paddingVertical: 12,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: 17,
  },
  detail: {
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
  error: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    color: colors.worse,
    fontSize: 15,
  },
});
