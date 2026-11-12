import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { getPlatformStatsApi, toggleEmailVerificationApi } from '../../api/adminApi';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboardScreen({ navigation }) {
  const { setRequireEmailVerification } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    try {
      const res = await getPlatformStatsApi();
      if (res.success && res.stats) {
        setStats(res.stats);
        setRequireEmailVerification(res.stats.requireEmailVerification);
      }
    } catch (e) {
      console.warn('Stats error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleToggleVerification(newValue) {
    setToggling(true);
    try {
      const res = await toggleEmailVerificationApi(newValue);
      if (res.success) {
        setStats((prev) => ({ ...prev, requireEmailVerification: newValue }));
        setRequireEmailVerification(newValue);
        Alert.alert(
          'تم تحديث الإعدادات',
          newValue
            ? 'تم تفعيل إلزامية تأكيد البريد الإلكتروني. لن يتمكن الطلاب غير المؤكدين من فتح الفيديوهات أو دخول الامتحانات حتى يتم التأكيد.'
            : 'تم إلغاء الإلزامية. يمكن للطلاب الدخول واستعراض المحتوى والامتحانات بحرية وتأكيد الإيميل لاحقاً.'
        );
      }
    } catch (err) {
      Alert.alert('خطأ', 'فشل تحديث إعدادات التحقق');
    } finally {
      setToggling(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.switchModeBtn}
          onPress={() => navigation.navigate('StudentTabs')}
          activeOpacity={0.8}
        >
          <Text style={styles.switchModeText}>معاينة كطالب</Text>
          <Ionicons name="eye-outline" size={16} color={colors.primaryLight} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>لوحة تحكم كينج الفيزياء</Text>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.adminHeaderLogo}
            resizeMode="contain"
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStats(); }} tintColor={colors.primaryLight} />}
      >
        {/* Verification Requirement Toggle Card (KEY REQUIREMENT) */}
        <View style={styles.settingToggleCard}>
          <View style={styles.toggleRow}>
            <Switch
              value={stats?.requireEmailVerification || false}
              onValueChange={handleToggleVerification}
              trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
              thumbColor={stats?.requireEmailVerification ? colors.accent : '#94A3B8'}
              disabled={toggling}
            />
            <View style={styles.toggleTextWrap}>
              <Text style={styles.toggleTitle}>إلزام الطلاب بتأكيد البريد الإلكتروني</Text>
              <Text style={styles.toggleSubtitle}>
                {stats?.requireEmailVerification
                  ? 'مفعّل: يمنع الطلاب غير المؤكدين من مشاهدة الدروس أو دخول الامتحانات'
                  : 'معطّل: متاح التسجيل المباشر وتأكيد الإيميل لاحقاً في أي وقت'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <Text style={styles.sectionHeading}>إحصائيات المنصة الحالية</Text>

        {loading ? (
          <ActivityIndicator color={colors.primaryLight} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Ionicons name="people" size={24} color={colors.primaryLight} />
              <Text style={styles.statValue}>{stats?.totalStudents || 0}</Text>
              <Text style={styles.statLabel}>إجمالي الطلاب</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name="checkmark-done-circle" size={24} color={colors.success} />
              <Text style={[styles.statValue, { color: colors.success }]}>
                {stats?.verifiedStudents || 0}
              </Text>
              <Text style={styles.statLabel}>إيميل مؤكد</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name="film" size={24} color={colors.accent} />
              <Text style={styles.statValue}>{stats?.totalLessons || 0}</Text>
              <Text style={styles.statLabel}>الحصص المرفوعة</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name="school" size={24} color={colors.primaryLight} />
              <Text style={[styles.statValue, { color: colors.primaryLight }]}>
                {stats?.totalCourses || 0}
              </Text>
              <Text style={styles.statLabel}>الكورسات</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name="reader" size={24} color={colors.warning} />
              <Text style={[styles.statValue, { color: colors.warning }]}>
                {stats?.totalExams || 0}
              </Text>
              <Text style={styles.statLabel}>الامتحانات</Text>
            </View>

            <View style={styles.statBox}>
              <Ionicons name="clipboard" size={24} color={colors.success} />
              <Text style={[styles.statValue, { color: colors.success }]}>
                {stats?.totalExamSubmissions || 0}
              </Text>
              <Text style={styles.statLabel}>تسليمات الطلاب</Text>
            </View>
          </View>
        )}

        {/* Section 1: Control & Management */}
        <Text style={[styles.sectionHeading, { marginTop: 22 }]}>التحكم وإدارة المحتوى</Text>

        {/* Manage Lessons */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('AdminLessons')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconBox, { backgroundColor: 'rgba(2, 132, 199, 0.2)' }]}>
            <Ionicons name="film-outline" size={26} color={colors.primaryLight} />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>إدارة الحصص المرفوعة سابقاً</Text>
            <Text style={styles.actionSubtitle}>استعراض كافة الحصص، تعديل البيانات، تبديل النشر، أو الحذف</Text>
          </View>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Manage Exams */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('AdminExams')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
            <Ionicons name="document-text-outline" size={26} color={colors.warning} />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>إدارة الامتحانات والأسئلة</Text>
            <Text style={styles.actionSubtitle}>تعديل الامتحانات، حذف أو إضافة أسئلة جديدة لأي امتحان مضاف</Text>
          </View>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Manage Courses (NEW) */}
        <TouchableOpacity
          style={[styles.actionCard, { borderColor: colors.primaryLight, borderWidth: 1.5 }]}
          onPress={() => navigation.navigate('AdminCourses')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.2)' }]}>
            <Ionicons name="school" size={26} color={colors.primaryLight} />
          </View>
          <View style={styles.actionTextWrap}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <Text style={styles.actionTitle}>قسم الكورسات والدورات</Text>
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>جديد</Text>
              </View>
            </View>
            <Text style={styles.actionSubtitle}>إنشاء كورسات جديدة ورفع فيديوهات حصرية مخصصة للكورس فقط</Text>
          </View>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Section 2: Create & Tools */}
        <Text style={[styles.sectionHeading, { marginTop: 20 }]}>إضافة محتوى جديد وإدارة الطلاب</Text>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('AdminVideoUpload')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconBox, { backgroundColor: 'rgba(2, 132, 199, 0.2)' }]}>
            <Ionicons name="cloud-upload-outline" size={26} color={colors.primaryLight} />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>رفع وضغط حصة جديدة</Text>
            <Text style={styles.actionSubtitle}>رفع درس من هاتفك وضغطه تلقائياً وتوليد البث الآمن (HLS)</Text>
          </View>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('AdminExamBuilder')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
            <Ionicons name="create-outline" size={26} color={colors.warning} />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>معالج إنشاء امتحان جديد</Text>
            <Text style={styles.actionSubtitle}>إنشاء امتحان فوري وإضافة بنك أسئلة باختيارات متعددة</Text>
          </View>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('AdminStudents')}
          activeOpacity={0.8}
        >
          <View style={[styles.actionIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
            <Ionicons name="person-circle-outline" size={26} color={colors.success} />
          </View>
          <View style={styles.actionTextWrap}>
            <Text style={styles.actionTitle}>إدارة الطلاب وفك ربط الأجهزة</Text>
            <Text style={styles.actionSubtitle}>البحث في بيانات الطلاب وإعادة تعيين الهاتف المقفل لطالب</Text>
          </View>
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  headerTitleWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  adminHeaderLogo: {
    width: 36,
    height: 30,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  switchModeBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  switchModeText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  settingToggleCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginBottom: 20,
  },
  toggleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  toggleTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  toggleSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
    lineHeight: 16,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'right',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  actionCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 12,
    gap: 12,
  },
  actionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  actionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'right',
  },
  newBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
