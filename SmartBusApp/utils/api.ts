import { Platform } from 'react-native';

// ngrok URL for production - needed for Paynow API callbacks
// Paynow must be able to reach your backend
const NGROK_URL = 'https://chirurgic-jazmine-uncontroverted.ngrok-free.dev';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  NGROK_URL;

/**
 * Helper function to add ngrok headers to API requests
 * Bypasses ngrok browser warning on free tier
 */
export const getApiHeaders = (customHeaders: Record<string, string> = {}): Record<string, string> => {
  return {
    'ngrok-skip-browser-warning': 'true',
    'user-agent': 'SmartBusApp/1.0',
    ...customHeaders,
  };
};

/**
 * Wrapper for fetch that automatically adds ngrok headers
 */
export const apiFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const headers = getApiHeaders(options.headers as Record<string, string>);
  return fetch(url, { ...options, headers });
};
