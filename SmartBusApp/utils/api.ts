import { Platform } from 'react-native';

const DEFAULT_ANDROID_EMULATOR = 'http://10.0.2.2:8000';
const DEFAULT_IOS_SIMULATOR = 'http://localhost:8000';
const DEFAULT_DEVICE = 'http://10.130.4.183:8000';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  (Platform.OS === 'android'
    ? DEFAULT_ANDROID_EMULATOR
    : Platform.OS === 'ios'
      ? DEFAULT_IOS_SIMULATOR
      : DEFAULT_DEVICE);
