import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { uploadAvatarApi, removeAvatarApi } from '../../api/authApi';
import { getServerUrl } from '../../api/client';
import OtpVerificationModal from '../auth/OtpVerificationModal';

export default function ProfileScreen({ navigation }) {
  const { user, isEmailVerified, isAdmin, logout, refreshProfile, updateUser } = useAuth();
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    getServerUrl().then(setServerUrl);
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refreshProfile();
    } catch (e) {
      console.warn('Refresh profile error:', e);
    } finally {
      setRefreshing(false);
    }
  }

  function confirmLogout() {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من رغبتك في تسجيل الخروج من التطبيق؟', [
      { text: 'تسجيل خروج', style: 'destructive', onPress: logout },
      { text: 'إلغاء', style: 'cancel' }
    ]);
  }

  function handleAvatarPress() {
    if (uploadingAvatar) return;

    const options = [
      { text: '📷 التقاط صورة بالكاميرا', onPress: takePhotoWithCamera },
      { text: '🖼️ اختيار صورة من المعرض', onPress: pickImageFromLibrary },
    ];

    if (user?.avatar_url) {
      options.push({ text: '🗑️ حذف الصورة الحالية', style: 'destructive', onPress: confirmRemoveAvatar });
    }

    options.push({ text: 'إلغاء', style: 'cancel' });

    Alert.alert('الصورة الشخصية', 'يمكنك رفع وتحديث صورتك الشخصية لحسابك:', options);
  }

  async function pickImageFromLibrary() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('تنبيه الصلاحيات', 'يرجى السماح للتطبيق بالوصول للصور لتتمكن من اختيار صورتك الشخصية.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImageFile(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('ImagePicker library error:', e);
      Alert.alert('خطأ', 'تعذر فتح معرض الصور');
    }
  }

  async function takePhotoWithCamera() {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('تنبيه الصلاحيات', 'يرجى السماح للتطبيق باستخدام الكاميرا لالتقاط صورة شخصية.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadImageFile(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('ImagePicker camera error:', e);
      Alert.alert('خطأ', 'تعذر فتح الكاميرا');
    }
  }

  async function uploadImageFile(uri) {
    setUploadingAvatar(true);
    try {
      const res = await uploadAvatarApi(uri);
      if (res.success && res.user) {
        await updateUser(res.user);
        Alert.alert('تم بنجاح! 📸', 'تم تحديث صورتك الشخصية بنجاح.');
      } else {
        throw new Error(res.message || 'فشل رفع الصورة');
      }
    } catch (err) {
      Alert.alert('فشل الرفع', err.message || 'حدث خطأ أثناء رفع الصورة الشخصية.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  function confirmRemoveAvatar() {
    Alert.alert('حذف الصورة الشخصية', 'هل أنت متأكد من رغبتك في إزالة صورتك الشخصية؟', [
      {
        text: 'حذف',
        style: 'destructive',
        onPress: async () => {
          setUploadingAvatar(true);
          try {
            const res = await removeAvatarApi();
            if (res.success) {
              await updateUser({ avatar_url: null });
              Alert.alert('تم الحذف', 'تمت إزالة صورتك الشخصية بنجاح.');
            }
          } catch (e) {
            Alert.alert('خطأ', 'فشل حذف الصورة');
          } finally {
            setUploadingAvatar(false);
          }
        }
      },
      { text: 'إلغاء', style: 'cancel' }
    ]);
  }

  const avatarUri = user?.avatar_url
    ? user.avatar_url.startsWith('http')
      ? user.avatar_url
      : `${serverUrl}${user.avatar_url}`
    : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الملف الشخصي للطالب</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* User Card with Avatar Upload */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={handleAvatarPress}
              activeOpacity={0.85}
              disabled={uploadingAvatar}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={38} color={colors.accent} />
              )}

              {uploadingAvatar && (
                <View style={styles.avatarLoadingOverlay}>
                  <ActivityIndicator size="small" color="#FFF" />
                </View>
              )}
            </TouchableOpacity>

            {/* Camera Floating Action Badge */}
            <TouchableOpacity
              style={styles.cameraBadge}
              onPress={handleAvatarPress}
              activeOpacity={0.8}
              disabled={uploadingAvatar}
            >
              <Ionicons name="camera" size={15} color="#FFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userRole}>
            {isAdmin ? 'مدرس ومسؤول النظام (مستر بولا)' : 'طالب فيزياء ثانوية عامة'}
          </Text>

          <TouchableOpacity style={styles.changePhotoPill} onPress={handleAvatarPress} activeOpacity={0.8}>
            <Ionicons name="cloud-upload-outline" size={14} color={colors.primaryLight} />
            <Text style={styles.changePhotoText}>
              {user?.avatar_url ? 'تغيير الصورة الشخصية' : 'رفع صورة شخصية'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Verification Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>حالة التحقق والأمان</Text>

          <View style={styles.statusRow}>
            <View style={[styles.badge, isEmailVerified ? styles.verifiedBadge : styles.unverifiedBadge]}>
              <Ionicons
                name={isEmailVerified ? 'checkmark-circle' : 'alert-circle'}
                size={16}
                color={isEmailVerified ? colors.success : colors.warning}
              />
              <Text style={[styles.badgeText, { color: isEmailVerified ? colors.success : colors.warning }]}>
                {isEmailVerified ? 'البريد الإلكتروني مؤكد' : 'البريد غير مؤكد'}
              </Text>
            </View>
            <Text style={styles.rowLabel}>تأكيد الإيميل:</Text>
          </View>

          {!isEmailVerified && !isAdmin && (
            <TouchableOpacity
              style={styles.verifyNowBtn}
              onPress={() => setShowOtpModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.verifyNowText}>إدخال رمز التحقق (OTP) الآن</Text>
              <Ionicons name="mail-open-outline" size={16} color="#FFF" />
            </TouchableOpacity>
          )}

          <View style={[styles.statusRow, { marginTop: 12 }]}>
            <View style={[styles.badge, styles.deviceBadge]}>
              <Ionicons name="phone-portrait-outline" size={14} color={colors.primaryLight} />
              <Text style={[styles.badgeText, { color: colors.primaryLight }]}>مربوط بهذا الجهاز</Text>
            </View>
            <Text style={styles.rowLabel}>حماية الحساب:</Text>
          </View>
        </View>

        {/* Details Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>البيانات المسجلة</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{user?.email}</Text>
            <Text style={styles.infoLabel}>البريد الإلكتروني:</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{user?.phone}</Text>
            <Text style={styles.infoLabel}>رقم الهاتف:</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{user?.academic_year || 'الصف الثالث الثانوي'}</Text>
            <Text style={styles.infoLabel}>المرحلة الدراسية:</Text>
          </View>
        </View>

        {/* Admin Switcher (If user is Admin) */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.adminSwitchBtn}
            onPress={() => navigation.navigate('AdminDashboard')}
            activeOpacity={0.8}
          >
            <Ionicons name="speedometer-outline" size={20} color="#FFF" />
            <Text style={styles.adminSwitchText}>الدخول إلى لوحة تحكم الأدمن</Text>
            <Ionicons name="arrow-back" size={16} color="#FFF" />
          </TouchableOpacity>
        )}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutBtnText}>تسجيل الخروج من الحساب</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* OTP Modal */}
      <OtpVerificationModal
        visible={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onSuccess={() => {
          setShowOtpModal(false);
          refreshProfile();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 2.5,
    borderColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  userRole: {
    fontSize: 12,
    color: colors.primaryLight,
    marginTop: 4,
  },
  changePhotoPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  changePhotoText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 8,
  },
  statusRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  unverifiedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  deviceBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  verifyNowBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  verifyNowText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  adminSwitchBtn: {
    backgroundColor: '#0369A1',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  adminSwitchText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  logoutBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },
  logoutBtnText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
