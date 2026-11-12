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

export async function apiUpload(endpoint, formData, onProgress, method = 'POST') {
  const baseUrl = await getServerUrl();
  const token = await AsyncStorage.getItem('@auth_token');
  const deviceId = await getDeviceId();
  const url = `${baseUrl}${endpoint}`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);

    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('x-device-id', deviceId);
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    // Note: Do NOT set 'Content-Type' header here.
    // XMLHttpRequest automatically sets multipart/form-data with the correct boundary!

    if (xhr.upload && typeof onProgress === 'function') {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const progress = Math.min(100, Math.round((event.loaded / event.total) * 100));
          onProgress(progress);
        }
      };
    }

    xhr.onload = () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {
        data = { message: xhr.responseText };
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        const error = new Error((data && data.message) || `Upload failed with status ${xhr.status}`);
        error.status = xhr.status;
        error.data = data;
        error.code = data && data.code;
        reject(error);
      }
    };

    xhr.onerror = () => {
      reject(new Error('فشل الاتصال بالخادم أثناء رفع الملف'));
    };

    xhr.ontimeout = () => {
      reject(new Error('انتهت مهلة الطلب أثناء رفع الملف'));
    };

    xhr.send(formData);
  });
}

export async function apiRequest(endpoint, options = {}) {
  // If request contains FormData (images, videos, files), route through apiUpload (XMLHttpRequest)
  // to avoid Expo WinterCG fetch's "Unsupported FormDataPart implementation" error.
  if (options.body instanceof FormData) {
    return apiUpload(endpoint, options.body, options.onProgress, options.method || 'POST');
  }

  const baseUrl = await getServerUrl();
  const token = await AsyncStorage.getItem('@auth_token');
  const deviceId = await getDeviceId();

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'x-device-id': deviceId,
    ...(options.headers || {})
  };

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
