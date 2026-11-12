import { apiRequest, getDeviceId } from './client';

export async function loginApi(email, password) {
  const deviceId = await getDeviceId();
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, device_id: deviceId }),
  });
}

export async function registerApi(name, email, password, phone) {
  const deviceId = await getDeviceId();
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, phone, device_id: deviceId }),
  });
}

export async function verifyOtpApi(otp) {
  return apiRequest('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ otp }),
  });
}

export async function resendOtpApi() {
  return apiRequest('/api/auth/resend-otp', {
    method: 'POST',
  });
}

export async function getProfileApi() {
  return apiRequest('/api/auth/profile', {
    method: 'GET',
  });
}

export async function uploadAvatarApi(imageUri) {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() || 'avatar.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('avatar', {
    uri: imageUri,
    name: filename,
    type: type,
  });

  return apiRequest('/api/auth/profile/avatar', {
    method: 'POST',
    body: formData,
  });
}

export async function removeAvatarApi() {
  return apiRequest('/api/auth/profile/avatar', {
    method: 'DELETE',
  });
}
