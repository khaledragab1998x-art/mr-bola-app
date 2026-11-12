import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { getChaptersWithLessonsApi } from '../../api/lessonsApi';
import { useAuth } from '../../context/AuthContext';
import OtpVerificationModal from '../auth/OtpVerificationModal';

export default function LessonsScreen({ navigation }) {
  const { isAccessBlockedByVerification } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);

  useEffect(() => {
    loadLessons();
  }, []);

  async function loadLessons() {
    setLoading(true);
    try {
      const res = await getChaptersWithLessonsApi();
      if (res.success) {
        let all = [];
        if (res.lessons && Array.isArray(res.lessons)) {
          all = res.lessons;
        } else if (res.data && Array.isArray(res.data)) {
          res.data.forEach((chap) => {
            if (chap.lessons) all.push(...chap.lessons);
          });
        }
        setLessons(all);
      }
    } catch (error) {
      Alert.alert('خطأ', 'فشل تحميل قائمة الحصص والدروس');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleLessonClick(lesson) {
    if (isAccessBlockedByVerification) {
      Alert.alert(
        'تأكيد الإيميل مطلوب',
        'عذراً، قام مستر بولا بتفعيل خاصية إلزامية تأكيد البريد الإلكتروني. يرجى إدخال رمز التحقق (OTP) للمتابعة.',
        [
          { text: 'تأكيد الآن', onPress: () => setShowOtpModal(true) },
          { text: 'إلغاء', style: 'cancel' }
        ]
      );
      return;
    }

    if (lesson.status === 'processing') {
      Alert.alert('جاري المعالجة', 'هذا الفيديو قيد الضغط والمعالجة الآن على السيرفر وسيكون متاحاً خلال لحظات.');
      return;
    }

    navigation.navigate('VideoPlayer', { lessonId: lesson.id, title: lesson.title });
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>حصص ومحاضرات الفيزياء</Text>
        <Text style={styles.headerSubtitle}>شرح تفصيلي للمفاهيم وحل المسائل مع مستر بولا</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primaryLight} size="large" style={{ marginTop: 40 }} />
      ) : lessons.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="film-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>لم يتم رفع حصص بعد. سيقوم مستر بولا بإضافتها قريباً.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadLessons(); }} tintColor={colors.primaryLight} />}
        >
          {lessons.map((lesson, index) => (
            <TouchableOpacity
              key={lesson.id}
              style={styles.lessonCard}
              onPress={() => handleLessonClick(lesson)}
              activeOpacity={0.8}
            >
              <View style={styles.lessonHeaderRow}>
                <View style={styles.lessonNumberBadge}>
                  <Text style={styles.lessonNumberText}>{index + 1}</Text>
                </View>

                <View style={styles.lessonInfo}>
                  <Text style={styles.lessonTitle}>{lesson.title}</Text>
                  {lesson.description ? (
                    <Text style={styles.lessonDescription} numberOfLines={2}>
                      {lesson.description}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.playIconContainer}>
                  <Ionicons
                    name={lesson.status === 'processing' ? 'sync-outline' : 'play'}
                    size={18}
                    color="#FFF"
                  />
                </View>
              </View>

              {/* Bottom Info Bar */}
              <View style={styles.lessonFooterRow}>
                <View style={styles.badgesWrap}>
                  {lesson.is_free_preview ? (
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeText}>معاينة مجانية</Text>
                    </View>
                  ) : null}
                  {lesson.status === 'processing' ? (
                    <View style={styles.processingBadge}>
                      <Text style={styles.processingText}>جاري الضغط {lesson.processing_progress}%</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.durationPill}>
                  <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                  <Text style={styles.durationText}>
                    {lesson.duration_seconds
                      ? `${Math.round(lesson.duration_seconds / 60)} دقيقة`
                      : 'شرح متكامل'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* OTP Modal */}
      <OtpVerificationModal
        visible={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onSuccess={() => setShowOtpModal(false)}
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
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  scrollList: {
    padding: 16,
    paddingBottom: 30,
  },
  lessonCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 14,
    padding: 16,
  },
  lessonHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  lessonNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonNumberText: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: 'bold',
  },
  lessonInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  lessonTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  lessonDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'right',
    lineHeight: 18,
  },
  playIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonFooterRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  badgesWrap: {
    flexDirection: 'row-reverse',
    gap: 6,
  },
  freeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freeText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: 'bold',
  },
  processingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  processingText: {
    color: colors.warning,
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
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 60,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
});
