import { Platform } from 'react-native';
import Constants from 'expo-constants';

let cachedBaseUrl = null;

export const getBackendBaseUrl = () => {
  if (cachedBaseUrl) {
    return cachedBaseUrl;
  }

  const envUrl = (typeof process !== 'undefined' && process.env)
    ? (process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL)
    : undefined;
  const extraUrl = Constants?.expoConfig?.extra?.apiBaseUrl
    || Constants?.manifest?.extra?.apiBaseUrl;

  if (envUrl || extraUrl) {
    cachedBaseUrl = (envUrl || extraUrl).replace(/\/$/, '');
    return cachedBaseUrl;
  }

  const hostCandidates = [
    Constants?.expoConfig?.hostUri,
    Constants?.manifest?.hostUri,
    Constants?.expoConfig?.debuggerHost,
    Constants?.manifest?.debuggerHost,
    Constants?.manifest2?.extra?.expoClient?.hostUri,
    Constants?.manifest2?.extra?.expoClient?.debuggerHost,
    Constants?.expoConfig?.extra?.expoClient?.hostUri,
    Constants?.expoConfig?.extra?.expoClient?.debuggerHost,
  ].filter(Boolean);

  const pickHostFromCandidate = (candidate) => {
    if (!candidate || typeof candidate !== 'string') return null;
    const sanitized = candidate
      .replace('exp://', '')
      .replace('http://', '')
      .replace('https://', '');
    const host = sanitized.split(':')[0];
    return host || null;
  };

  for (const candidate of hostCandidates) {
    const host = pickHostFromCandidate(candidate);
    if (host) {
      cachedBaseUrl = `http://${host}:3000`;
      return cachedBaseUrl;
    }
  }

  if (Platform.OS === 'android') {
    cachedBaseUrl = 'http://10.0.2.2:3000';
  } else if (Platform.OS === 'ios') {
    // iOS Simulator can reach the Mac via localhost; physical devices cannot.
    if (Constants?.isDevice) {
      cachedBaseUrl = 'http://localhost:3000';
    } else {
      cachedBaseUrl = 'http://127.0.0.1:3000';
    }
  } else {
    cachedBaseUrl = 'http://localhost:3000';
  }

  return cachedBaseUrl;
};
