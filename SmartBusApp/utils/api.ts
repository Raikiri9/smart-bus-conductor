import { Platform } from 'react-native';

// ngrok URL for production - needed for Paynow API callbacks
// Paynow must be able to reach your backend
const NGROK_URL = 'https://chirurgic-jazmine-uncontroverted.ngrok-free.dev';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  NGROK_URL;
