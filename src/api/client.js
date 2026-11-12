import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Production API Server
export const DEFAULT_SERVER_URL = 'https://bola.gridmotion-dfc.com';

export async function getServerUrl() {
  return DEFAULT_SERVER_URL;
}

export async function setServerUrl(newUrl) {
  // Kept for interface compatibility if needed
}

export async function getDeviceId() {
  let deviceId = await AsyncStorage.getItem('@device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
    await AsyncStorage.setItem('@device_id', deviceId);
  }
  return deviceId;
}

export async function apiRequest(endpoint, options = {}) {
  const baseUrl = await getServerUrl();
  const token = await AsyncStorage.getItem('@auth_token');
  const deviceId = await getDeviceId();

  const headers = {
    'Accept': 'application/json',
    'x-device-id': deviceId,
    ...(options.headers || {})
  };

  // Only set Content-Type to application/json if body is not FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${baseUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error((data && data.message) || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      error.code = data && data.code;
      throw error;
    }

    return data;
  } catch (error) {
    console.warn(`API Error [${endpoint}]:`, error.message);
    throw error;
  }
}
