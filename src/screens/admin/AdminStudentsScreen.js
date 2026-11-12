import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { getStudentsListApi, resetStudentDeviceApi, toggleStudentBlockApi } from '../../api/adminApi';

export default function AdminStudentsScreen({ navigation }) {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents(query = '') {
    setLoading(true);
    try {
      const res = await getStudentsListApi(query);
      if (res.success && res.data) {
        setStudents(res.data);
      }
    } catch (e) {
      console.warn('Students load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleSearch(text) {
    setSearch(text);
    loadStudents(text);
  }

  async function handleResetDevice(student) {
    Alert.alert(
      'فك ربط الجهاز',
      `هل تريد فك ربط الجهاز للطالب "${student.name}"؟\nسيتمكن الطالب من تسجيل الدخول من جهاز جديد.`,
      [
        {
          text: 'فك الربط الآن',
          onPress: async () => {
            try {
              const res = await resetStudentDeviceApi(student.id);
              if (res.success) {
                Alert.alert('نجاح', res.message);
                loadStudents(search);
              }
            } catch (err) {
              Alert.alert('خطأ', 'فشل فك ربط الجهاز');
            }
          },
        },
        { text: 'إلغاء', style: 'cancel' }
      ]
    );
  }

  async function handleToggleBlock(student) {
    const actionText = student.is_blocked ? 'إلغاء حظر' : 'حظر';
    Alert.alert(
      `${actionText} الحساب`,
      `هل أنت متأكد من ${actionText} حساب الطالب "${student.name}"؟`,
      [
        {
          text: actionText,
          style: student.is_blocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const res = await toggleStudentBlockApi(student.id);
              if (res.success) {
                Alert.alert('نجاح', res.message);
                loadStudents(search);
              }
            } catch (err) {
              Alert.alert('خطأ', 'فشل تغيير حالة الحساب');
            }
          },
        },
        { text: 'إلغاء', style: 'cancel' }
      ]
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>إدارة الطلاب والأجهزة ({students.length})</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث بالاسم أو البريد أو رقم الهاتف..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={handleSearch}
          textAlign="right"
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primaryLight} size="large" style={{ marginTop: 40 }} />
      ) : students.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>لم يتم العثور على طلاب مطابقة</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStudents(search); }} tintColor={colors.primaryLight} />}
        >
          {students.map((student) => (
            <View key={student.id} style={styles.studentCard}>
              <View style={styles.studentTopRow}>
                <View style={styles.badgesCol}>
                  <View style={[
                    styles.badge,
                    student.is_email_verified ? styles.verifiedBadge : styles.unverifiedBadge
                  ]}>
                    <Text style={[
                      styles.badgeText,
                      { color: student.is_email_verified ? colors.success : colors.warning }
                    ]}>
                      {student.is_email_verified ? 'إيميل مؤكد' : 'غير مؤكد'}
                    </Text>
                  </View>

                  {student.is_blocked ? (
                    <View style={[styles.badge, styles.blockedBadge]}>
                      <Text style={[styles.badgeText, { color: colors.danger }]}>محظور</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.studentNameWrap}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentEmail}>{student.email}</Text>
                  <Text style={styles.studentPhone}>{student.phone}</Text>
                </View>
              </View>

              {/* Device ID Info */}
              <View style={styles.deviceRow}>
                <Ionicons
                  name={student.device_id ? 'phone-portrait' : 'phone-portrait-outline'}
                  size={16}
                  color={student.device_id ? colors.accent : colors.textMuted}
                />
                <Text style={styles.deviceText}>
                  {student.device_id ? `الجهاز: ${student.device_id.substring(0, 16)}...` : 'لم يتم ربط جهاز بعد'}
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.cardActions}>
                {student.device_id ? (
                  <TouchableOpacity
                    style={styles.resetDeviceBtn}
                    onPress={() => handleResetDevice(student)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh-circle-outline" size={16} color={colors.primaryLight} />
                    <Text style={styles.resetDeviceText}>فك ربط الجهاز</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.blockBtn, student.is_blocked && styles.unblockBtn]}
                  onPress={() => handleToggleBlock(student)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={student.is_blocked ? 'lock-open-outline' : 'ban-outline'}
                    size={16}
                    color={student.is_blocked ? colors.success : colors.danger}
                  />
                  <Text style={[styles.blockText, student.is_blocked && { color: colors.success }]}>
                    {student.is_blocked ? 'إلغاء الحظر' : 'حظر الطالب'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    gap: 12,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  searchWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 12,
    height: 46,
  },
  searchIcon: {
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 13,
  },
  scrollList: {
    padding: 16,
    paddingBottom: 30,
  },
  studentCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 12,
  },
  studentTopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  studentNameWrap: {
    alignItems: 'flex-end',
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  studentEmail: {
    fontSize: 12,
    color: colors.primaryLight,
    marginTop: 2,
  },
  studentPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgesCol: {
    alignItems: 'flex-start',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  unverifiedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  blockedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  deviceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  deviceText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  cardActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  resetDeviceBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  resetDeviceText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: 'bold',
  },
  blockBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  unblockBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  blockText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
});
