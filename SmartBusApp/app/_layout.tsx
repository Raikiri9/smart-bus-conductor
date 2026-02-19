import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { PassengerProvider } from '../utils/PassengerContext';
import { TripProvider } from '../utils/TripContext';
import { ConnectivityProvider } from '../utils/ConnectivityManager';
import { initializeDatabase } from '../utils/offlineDatabase';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Initialize offline database on app start
  useEffect(() => {
    initializeDatabase().catch(error => {
      console.error('Failed to initialize offline database:', error);
    });
  }, []);

  // Runtime presence checks for imports to identify any undefined elements
  // eslint-disable-next-line no-console
  const importsStatus = {
    ThemeProvider: typeof ThemeProvider,
    PassengerProvider: typeof PassengerProvider,
    TripProvider: typeof TripProvider,
    Stack: typeof Stack,
    StatusBar: typeof StatusBar,
    useColorScheme: typeof useColorScheme,
  };
  // eslint-disable-next-line no-console
  console.log('RootLayout imports:', importsStatus);
  // eslint-disable-next-line no-console
  const tripModule = require('../utils/TripContext');
  // eslint-disable-next-line no-console
  console.log('Trip module require:', tripModule);

  const missing = Object.entries(importsStatus).filter(([_, v]) => v === 'undefined').map(([k]) => k);
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error('Missing imports in RootLayout:', missing);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Startup error</Text>
        <Text style={{ textAlign: 'center' }}>Missing imports: {missing.join(', ')}</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1 }} edges={[]}>
          <ConnectivityProvider>
            <PassengerProvider>
              <TripProvider>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                </Stack>
              </TripProvider>
            </PassengerProvider>
          </ConnectivityProvider>
        </SafeAreaView>
      </SafeAreaProvider>
      <StatusBar style="light" hidden={true} />
    </ThemeProvider>
  );
}
