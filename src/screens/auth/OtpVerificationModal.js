import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';

export default function OtpVerificationModal({ visible, onClose, onSuccess }) {
  const { user, verifyEmail, resendVerificationOtp } = useAuth();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    let interval;
    if (visible && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [visible, timer]);

  async function handleVerify() {
    if (otp.trim().length < 6) {
      Alert.alert('Alert', 'Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyEmail(otp.trim());
      Alert.alert('Success', res.message || 'Email verified successfully!');
      setOtp('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      Alert.alert('Error', error.message || 'Invalid or expired verification code');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (timer > 0) return;
    setResending(true);
    try {
      await resendVerificationOtp();
      Alert.alert('Sent', 'A new verification code has been sent to your email');
      setTimer(60);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to resend verification code');
    } finally {
      setResending(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Ionicons name="mail-open-outline" size={36} color={colors.primaryLight} />
          </View>

          <Text style={styles.title}>Email Verification</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit OTP code sent to:
          </Text>
          <Text style={styles.emailText}>{user?.email}</Text>

          <TextInput
            style={styles.otpInput}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="• • • • • •"
            placeholderTextColor={colors.textMuted}
            textAlign="center"
          />

          <TouchableOpacity
            style={[styles.verifyBtn, loading && styles.disabledBtn]}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.verifyBtnText}>Verify Account Now</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendBtn}
            onPress={handleResend}
            disabled={timer > 0 || resending}
          >
            {resending ? (
              <ActivityIndicator size="small" color={colors.primaryLight} />
            ) : (
              <Text
                style={[
                  styles.resendText,
                  timer > 0 ? styles.resendDisabled : styles.resendActive,
                ]}
              >
                {timer > 0 ? `Resend code in (${timer}s)` : 'Resend Code'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 10, 20, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 8,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 6,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emailText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primaryLight,
    marginBottom: 20,
  },
  otpInput: {
    width: '100%',
    height: 56,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
    marginBottom: 20,
  },
  verifyBtn: {
    width: '100%',
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  verifyBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  resendBtn: {
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 13,
  },
  resendDisabled: {
    color: colors.textMuted,
  },
  resendActive: {
    color: colors.primaryLight,
    fontWeight: 'bold',
  },
});
