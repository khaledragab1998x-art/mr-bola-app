import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { getCourseDetailsApi } from '../../api/coursesApi';
import { getServerUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import OtpVerificationModal from '../auth/OtpVerificationModal';

export default function CourseDetailsScreen({ route, navigation }) {
  const { courseId, title } = route.params;
  const { isAccessBlockedByVerification } = useAuth();

  const [course, setCourse] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);

  useEffect(() => {
    getServerUrl().then(setServerUrl);
    loadDetails();
  }, [courseId]);

  async function loadDetails() {
    setLoading(true);
    try {
      const res = await getCourseDetailsApi(courseId);
      if (res.success) {
        setCourse(res.course);
        setVideos(res.videos || []);
      }
    } catch (e) {
      Alert.alert('خطأ', 'فشل تحميل بيانات الكورس');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleVideoClick(video) {
    if (isAccessBlockedByVerification && !video.is_free_preview) {
      Alert.alert(
        'تأكيد الإيميل مطلوب',
        'عذراً، يجب تأكيد بريدك الإلكتروني أولاً لمشاهدة محاضرات هذا الكورس.',
        [
          { text: 'تأكيد الآن', onPress: () => setShowOtpModal(true) },
          { text: 'إلغاء', style: 'cancel' },
        ]
      );
      return;
    }

    if (video.status === 'processing') {
      Alert.alert('جاري التجهيز', 'هذا الفيديو قيد المعالجة الآن على السيرفر وسيكون متاحاً خلال لحظات.');
      return;
    }

    navigation.navigate('VideoPlayer', {
      courseId: courseId,
      videoId: video.id,
      title: video.title,
    });
  }

  function formatDuration(seconds) {
    if (!seconds || seconds === 0) return 'غير محدد';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs} دقيقة`;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {course?.title || title || 'تفاصيل الكورس'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primaryLight} size="large" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadDetails();
              }}
              tintColor={colors.primaryLight}
            />
          }
        >
          {/* Hero Banner */}
          {course?.thumbnail_url ? (
            <Image
              source={{
                uri: course.thumbnail_url.startsWith('http')
                  ? course.thumbnail_url
                  : `${serverUrl}${course.thumbnail_url}`,
              }}
              style={styles.heroCover}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="school" size={50} color={colors.primaryLight} />
            </View>
          )}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.badgeRow}>
              <View style={styles.yearBadge}>
                <Text style={styles.yearBadgeText}>
                  {course?.academic_year || 'الصف الثالث الثانوي'}
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Ionicons name="film-outline" size={14} color={colors.primaryLight} />
                <Text style={styles.countBadgeText}>{videos.length} محاضرات</Text>
              </View>
            </View>

            <Text style={styles.courseMainTitle}>{course?.title}</Text>

            {course?.description ? (
              <Text style={styles.courseDescription}>{course.description}</Text>
            ) : null}

            {/* Security note */}
            <View style={styles.securityNoteRow}>
              <Ionicons name="shield-checkmark" size={16} color={colors.success} />
              <Text style={styles.securityNoteText}>
                بث فائق السرعة ومشفر (HLS) مع نظام العلامة المائية للطلاب
              </Text>
            </View>
          </View>

          {/* Curriculum Section Heading */}
          <View style={styles.sectionHeadingRow}>
            <Ionicons name="list" size={20} color={colors.accent} />
            <Text style={styles.sectionHeadingText}>فهرس محاضرات الكورس</Text>
          </View>

          {videos.length === 0 ? (
            <View style={styles.emptyVideos}>
              <Ionicons name="film-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyVideosText}>
                لم يتم إضافة محاضرات لهذا الكورس بعد. سيتم إضافتها قريباً.
              </Text>
            </View>
          ) : (
            videos.map((v, index) => (
              <TouchableOpacity
                key={v.id}
                style={styles.videoItem}
                onPress={() => handleVideoClick(v)}
                activeOpacity={0.8}
              >
                <View style={styles.playIconBox}>
                  <Ionicons name="play" size={20} color={colors.primaryLight} />
                </View>

                <View style={styles.videoDetailsWrap}>
                  <View style={styles.videoItemTopRow}>
                    <Text style={styles.lectureNumberText}>المحاضرة {index + 1}</Text>
                    {Boolean(v.is_free_preview) && (
                      <View style={styles.freePreviewBadge}>
                        <Text style={styles.freePreviewText}>معاينة مجانية</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.videoItemTitle}>{v.title}</Text>

                  {v.description ? (
                    <Text style={styles.videoItemSub} numberOfLines={2}>
                      {v.description}
                    </Text>
                  ) : null}

                  <View style={styles.videoItemMetaRow}>
                    <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                    <Text style={styles.videoItemDuration}>{formatDuration(v.duration_seconds)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      {/* Verification Modal */}
      <OtpVerificationModal
        visible={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onVerified={() => setShowOtpModal(false)}
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroCover: {
    width: '100%',
    height: 200,
  },
  heroPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  badgeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  yearBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  yearBadgeText: {
    fontSize: 11,
    color: colors.primaryLight,
    fontWeight: 'bold',
  },
  countBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countBadgeText: {
    fontSize: 11,
    color: colors.primaryLight,
  },
  courseMainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  courseDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 8,
    lineHeight: 20,
  },
  securityNoteRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  securityNoteText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '500',
  },
  sectionHeadingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 22,
    marginBottom: 12,
  },
  sectionHeadingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  emptyVideos: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyVideosText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  videoItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  playIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDetailsWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  videoItemTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  lectureNumberText: {
    fontSize: 11,
    color: colors.primaryLight,
    fontWeight: 'bold',
  },
  freePreviewBadge: {
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  freePreviewText: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '700',
  },
  videoItemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'right',
    marginTop: 2,
  },
  videoItemSub: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 2,
    lineHeight: 16,
  },
  videoItemMetaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  videoItemDuration: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
