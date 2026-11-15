import { StyleSheet, Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gymapp</Text>
      <Text style={styles.subtitle}>測試環境 OK</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E6B3A',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 44,
    fontWeight: '700',
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 20,
    marginTop: 12,
  },
});
