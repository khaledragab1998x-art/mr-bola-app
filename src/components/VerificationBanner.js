import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

export default function VerificationBanner({ onOpenVerifyModal }) {
  const { user, requireEmailVerification, isEmailVerified, isAdmin } = useAuth();

  // If verified or admin, no banner needed
  if (isAdmin || isEmailVerified || !user) {
    return null;
  }

  const isEnforced = requireEmailVerification;

  return (
    <View style={[styles.container, isEnforced ? styles.enforcedContainer : styles.optionalContainer]}>
      <View style={styles.contentRow}>
        <Ionicons
          name={isEnforced ? 'shield-outline' : 'mail-unread-outline'}
          size={22}
          color={isEnforced ? colors.danger : colors.warning}
        />
        <View style={styles.textWrap}>
          <Text style={styles.title}>
            {isEnforced ? 'تأكيد البريد الإلكتروني إلزامي' : 'بريدك الإلكتروني غير مؤكد بعد'}
          </Text>
          <Text style={styles.subtitle}>
            {isEnforced
              ? 'يجب إدخال رمز التحقق لتتمكن من فتح الفيديوهات والامتحانات'
              : 'يمكنك تأكيد إيميلك في أي وقت لحماية حسابك'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.actionBtn, isEnforced ? styles.enforcedBtn : styles.optionalBtn]}
        onPress={onOpenVerifyModal}
        activeOpacity={0.8}
      >
        <Text style={styles.btnText}>تأكيد الآن</Text>
        <Ionicons name="chevron-back" size={16} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionalContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  enforcedContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.40)',
  },
  contentRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  textWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  actionBtn: {
    marginTop: 10,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  optionalBtn: {
    backgroundColor: colors.warning,
  },
  enforcedBtn: {
    backgroundColor: colors.danger,
  },
  btnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
