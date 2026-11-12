import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import VerificationBanner from '../../components/VerificationBanner';
import OtpVerificationModal from '../auth/OtpVerificationModal';
import { getChaptersWithLessonsApi } from '../../api/lessonsApi';
import { getExamsListApi } from '../../api/examsApi';
import { getServerUrl } from '../../api/client';

export default function HomeScreen({ navigation }) {
  const { user, isAdmin, refreshProfile } = useAuth();
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recentLessons, setRecentLessons] = useState([]);
  const [activeExams, setActiveExams] = useState([]);
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    getServerUrl().then(setServerUrl);
    loadHomeData();
  }, []);

  async function loadHomeData() {
    setLoading(true);
    try {
      const [chaptersRes, examsRes] = await Promise.all([
        getChaptersWithLessonsApi().catch(() => ({ data: [] })),
        getExamsListApi().catch(() => ({ data: [] }))
      ]);

      // Flatten lessons to find newest ones
      const allLessons = [];
      if (chaptersRes && chaptersRes.data) {
        chaptersRes.data.forEach(chap => {
          if (chap.lessons) {
            chap.lessons.forEach(l => allLessons.push({ ...l, chapterTitle: chap.title }));
          }
        });
      }
      setRecentLessons(allLessons.slice(0, 3));

      if (examsRes && examsRes.data) {
        setActiveExams(examsRes.data.slice(0, 2));
      }
    } catch (e) {
      console.warn('Home data load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    refreshProfile();
    loadHomeData();
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
      >
        {/* Top Bar / Profile Greeting */}
        <View style={styles.topBar}>
          <View style={styles.userWrap}>
            <Text style={styles.greetingText}>أهلاً بك يا بطل الفيزياء 👋</Text>
            <Text style={styles.userNameText}>{user?.name || 'طالب مستر بولا'}</Text>
            <Text style={styles.academicYearText}>{user?.academic_year || 'الصف الثالث الثانوي'}</Text>
          </View>

          <TouchableOpacity
            style={styles.avatarLogoWrap}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            {user?.avatar_url ? (
              <Image
                source={{
                  uri: user.avatar_url.startsWith('http')
                    ? user.avatar_url
                    : `${serverUrl}${user.avatar_url}`
                }}
                style={styles.userCustomAvatar}
              />
            ) : (
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.brandAvatarLogo}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Verification Reminder Banner */}
        <VerificationBanner onOpenVerifyModal={() => setShowOtpModal(true)} />

        {/* Admin Switcher Card (Shows ONLY if current user is Admin) */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.adminBanner}
            onPress={() => navigation.navigate('AdminDashboard')}
            activeOpacity={0.85}
          >
            <View style={styles.adminBannerRow}>
              <View style={styles.adminIconBox}>
                <Ionicons name="speedometer" size={24} color="#FFF" />
              </View>
              <View style={styles.adminBannerText}>
                <Text style={styles.adminBannerTitle}>أنت مسجل كـ "مستر بولا (أدمن)"</Text>
                <Text style={styles.adminBannerSubtitle}>اضغط هنا لفتح لوحة التحكم، رفع الفيديوهات، وإدارة الامتحانات</Text>
              </View>
            </View>
            <Ionicons name="arrow-back" size={20} color="#FFF" style={{ marginRight: 8 }} />
          </TouchableOpacity>
        )}

        {/* Physics Quote & Motivation */}
        <View style={styles.quoteCard}>
          <Ionicons name="bulb-outline" size={24} color={colors.accent} />
          <Text style={styles.quoteText}>
            "الفيزياء ليست مجرد قوانين ومعادلات، بل فهم عميق لحركة الكون من حولك."
          </Text>
          <Text style={styles.teacherSign}>— مستر بولا</Text>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.gridSection}>
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('Lessons')}
            activeOpacity={0.8}
          >
            <View style={[styles.gridIconBox, { backgroundColor: 'rgba(2, 132, 199, 0.2)' }]}>
              <Ionicons name="play-circle" size={28} color={colors.primaryLight} />
            </View>
            <Text style={styles.gridTitle}>دروس</Text>
            <Text style={styles.gridSubtitle}>فيديوهات ومحاضرات</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => navigation.navigate('Exams')}
            activeOpacity={0.8}
          >
            <View style={[styles.gridIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
              <Ionicons name="document-text" size={28} color={colors.warning} />
            </View>
            <Text style={styles.gridTitle}>الامتحانات</Text>
            <Text style={styles.gridSubtitle}>تقييمات دورية بمؤقت</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Lessons Section */}
        <View style={styles.sectionHeader}>
          <TouchableOpacity onPress={() => navigation.navigate('Lessons')}>
            <Text style={styles.seeAllText}>عرض الكل</Text>
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>أحدث الحصص المرفوعة</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primaryLight} style={{ marginVertical: 20 }} />
        ) : recentLessons.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="film-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>لم يتم رفع حصص بعد. سيقوم مستر بولا بإضافتها قريباً.</Text>
          </View>
        ) : (
          recentLessons.map((lesson) => (
            <TouchableOpacity
              key={lesson.id}
              style={styles.lessonCard}
              onPress={() => navigation.navigate('VideoPlayer', { lessonId: lesson.id, title: lesson.title })}
              activeOpacity={0.8}
            >
              <View style={styles.lessonMeta}>
                <View style={styles.lessonPlayCircle}>
                  <Ionicons name="play" size={18} color="#FFF" />
                </View>
                <View style={styles.lessonInfo}>
                  <Text style={styles.lessonTitle}>{lesson.title}</Text>
                  <Text style={styles.lessonChapter}>{lesson.chapterTitle || 'الفصل الأول'}</Text>
                </View>
              </View>

              <View style={styles.lessonBadgeRow}>
                {lesson.is_free_preview ? (
                  <View style={[styles.badge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Text style={[styles.badgeText, { color: colors.success }]}>مجانية</Text>
                  </View>
                ) : null}
                <View style={styles.durationPill}>
                  <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.durationText}>
                    {lesson.duration_seconds ? `${Math.round(lesson.duration_seconds / 60)} دقيقة` : 'جاهزة'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Active Exams Section */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <TouchableOpacity onPress={() => navigation.navigate('Exams')}>
            <Text style={styles.seeAllText}>عرض الكل</Text>
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>الامتحانات والتقييمات</Text>
        </View>

        {activeExams.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="clipboard-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>لا توجد امتحانات نشطة حالياً</Text>
          </View>
        ) : (
          activeExams.map((exam) => (
            <TouchableOpacity
              key={exam.id}
              style={styles.examCard}
              onPress={() => navigation.navigate('ExamTaking', { examId: exam.id, title: exam.title })}
              activeOpacity={0.8}
            >
              <View style={styles.examCardTop}>
                <View style={styles.examBadge}>
                  <Text style={styles.examBadgeText}>{exam.duration_minutes} دقيقة</Text>
                </View>
                <Text style={styles.examTitle}>{exam.title}</Text>
              </View>

              <View style={styles.examCardBottom}>
                <Text style={styles.examScoreStatus}>
                  {exam.submission_status === 'completed'
                    ? `تم الحل: ${exam.student_score} / ${exam.total_marks}`
                    : 'لم يتم الحل بعد'}
                </Text>
                <View style={styles.examActionBtn}>
                  <Text style={styles.examActionText}>
                    {exam.submission_status === 'completed' ? 'عرض النتيجة' : 'بدء الامتحان'}
                  </Text>
                  <Ionicons name="chevron-back" size={14} color="#FFF" />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
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
  scrollContent: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  userWrap: {
    alignItems: 'flex-end',
  },
  greetingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  userNameText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 2,
  },
  academicYearText: {
    fontSize: 11,
    color: colors.primaryLight,
    marginTop: 2,
  },
  avatarLogoWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  userCustomAvatar: {
    width: '100%',
    height: '100%',
  },
  brandAvatarLogo: {
    width: '85%',
    height: '85%',
  },
  adminBanner: {
    backgroundColor: '#0369A1',
    borderRadius: 14,
    padding: 14,
    marginVertical: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  adminBannerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  adminIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminBannerText: {
    flex: 1,
    alignItems: 'flex-end',
  },
  adminBannerTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  adminBannerSubtitle: {
    color: '#E0F2FE',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
  },
  quoteCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginVertical: 12,
    alignItems: 'center',
  },
  quoteText: {
    color: colors.textPrimary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    fontStyle: 'italic',
  },
  teacherSign: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 6,
  },
  gridSection: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginVertical: 12,
  },
  gridCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  gridIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  gridSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  seeAllText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  lessonCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  lessonMeta: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  lessonPlayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  lessonTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  lessonChapter: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  lessonBadgeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  durationPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  examCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  examCardTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  examTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'right',
    marginRight: 10,
  },
  examBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  examBadgeText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: 'bold',
  },
  examCardBottom: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  examScoreStatus: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  examActionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  examActionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginVertical: 8,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});
