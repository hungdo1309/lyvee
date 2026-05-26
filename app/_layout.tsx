import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../src/context/AuthContext';
import { AppProvider } from '../src/context/AppContext';
import { DialogProvider } from '../src/context/DialogContext';
import { NotificationHandler } from '../src/components/NotificationHandler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <DialogProvider>
        <AuthProvider>
          <AppProvider>
            <NotificationHandler />
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="join" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
            </Stack>
          </AppProvider>
        </AuthProvider>
      </DialogProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
