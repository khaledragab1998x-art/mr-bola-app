import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginApi, registerApi, verifyOtpApi, resendOtpApi, getProfileApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requireEmailVerification, setRequireEmailVerification] = useState(false);

  useEffect(() => {
    loadStoredSession();
  }, []);

  async function loadStoredSession() {
    try {
      const storedToken = await AsyncStorage.getItem('@auth_token');
      const storedUser = await AsyncStorage.getItem('@auth_user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Refresh profile in background
        fetchLatestProfile(storedToken);
      }
    } catch (e) {
      console.warn('Error loading session:', e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLatestProfile(authToken) {
    try {
      const res = await getProfileApi();
      if (res.success && res.user) {
        setUser(res.user);
        setRequireEmailVerification(Boolean(res.requireEmailVerification));
        await AsyncStorage.setItem('@auth_user', JSON.stringify(res.user));
      }
    } catch (e) {
      // If token expired or blocked, clear session
      if (e.status === 401 || e.status === 403) {
        logout();
      }
    }
  }

  async function login(email, password) {
    const res = await loginApi(email, password);
    if (res.success) {
      setUser(res.user);
      setToken(res.token);
      setRequireEmailVerification(Boolean(res.requireEmailVerification));
      await AsyncStorage.setItem('@auth_token', res.token);
      await AsyncStorage.setItem('@auth_user', JSON.stringify(res.user));
    }
    return res;
  }

  async function register(name, email, password, phone) {
    const res = await registerApi(name, email, password, phone);
    if (res.success) {
      setUser(res.user);
      setToken(res.token);
      await AsyncStorage.setItem('@auth_token', res.token);
      await AsyncStorage.setItem('@auth_user', JSON.stringify(res.user));
    }
    return res;
  }

  async function verifyEmail(otp) {
    const res = await verifyOtpApi(otp);
    if (res.success) {
      const updatedUser = { ...user, is_email_verified: true };
      setUser(updatedUser);
      await AsyncStorage.setItem('@auth_user', JSON.stringify(updatedUser));
    }
    return res;
  }

  async function resendVerificationOtp() {
    return resendOtpApi();
  }

  async function updateUser(partialUser) {
    if (!partialUser) return;
    const updated = { ...user, ...partialUser };
    setUser(updated);
    try {
      await AsyncStorage.setItem('@auth_user', JSON.stringify(updated));
    } catch (e) {
      console.warn('Error persisting updated user:', e);
    }
  }

  async function logout() {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem('@auth_token');
    await AsyncStorage.removeItem('@auth_user');
  }

  const isAdmin = user && user.role === 'admin';
  const isEmailVerified = user && Boolean(user.is_email_verified);
  const isAccessBlockedByVerification = requireEmailVerification && !isEmailVerified && !isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAdmin,
        isEmailVerified,
        requireEmailVerification,
        isAccessBlockedByVerification,
        setRequireEmailVerification,
        login,
        register,
        verifyEmail,
        resendVerificationOtp,
        logout,
        updateUser,
        refreshProfile: () => fetchLatestProfile(token),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
