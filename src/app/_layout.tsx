import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from '../components/ui';

export default function Layout() {
  return <SafeAreaProvider><StatusBar style="dark"/><Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.ink, contentStyle: { backgroundColor: colors.bg }, headerShadowVisible: false }}>
    <Stack.Screen name="index" options={{ title: '简续', headerShown: false }}/>
    <Stack.Screen name="reader/[id]" options={{ headerShown: false }}/>
    <Stack.Screen name="settings" options={{ title: '设置' }}/>
    <Stack.Screen name="community" options={{ title: '社区' }}/>
  </Stack></SafeAreaProvider>;
}
