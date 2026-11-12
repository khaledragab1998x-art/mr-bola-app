import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { getCoursesListApi } from '../../api/coursesApi';
import { getServerUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import OtpVerificationModal from '../auth/OtpVerificationModal';

export default function CoursesScreen({ navigation }) {
  const { isAccessBlockedByVerification } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);

  useEffect(() => {
    getServerUrl().then(setServerUrl);
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    try {
      const res = await getCoursesListApi();
      if (res.success) {
        setCourses(res.data || []);
      }
    } catch (e) {
      console.warn('Load courses error:', e);
      Alert.alert('خطأ', 'فشل تحميل قائمة الكورسات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleCourseClick(course) {
    navigation.navigate('CourseDetails', {
      courseId: course.id,
      title: course.title,
    });
  }

  function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0 دقيقة';
    const mins = Math.round(seconds / 60);
    return `${mins} دقيقة`;
  }

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الكورسات والدورات الشاملة</Text>
        <Text style={styles.headerSubtitle}>
          دورات فيزياء مكثفة مرتبة من البداية حتى التفوق والـ 60/60
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarWrap}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث في الكورسات والدورات المتاحة..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primaryLight} size="large" style={{ marginTop: 40 }} />
      ) : filteredCourses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="school-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>لا توجد كورسات متاحة حالياً</Text>
          <Text style={styles.emptySub}>
            {searchQuery
              ? 'لا توجد نتائج مطابقة لبحثك'
              : 'سيقوم مستر بولا بنشر كورسات ومراجعات جديدة قريباً!'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadCourses();
              }}
              tintColor={colors.primaryLight}
            />
          }
        >
          {filteredCourses.map((course) => (
            <TouchableOpacity
              key={course.id}
              style={styles.courseCard}
              onPress={() => handleCourseClick(course)}
              activeOpacity={0.85}
            >
              {course.thumbnail_url ? (
                <Image
                  source={{
                    uri: course.thumbnail_url.startsWith('http')
                      ? course.thumbnail_url
                      : `${serverUrl}${course.thumbnail_url}`,
                  }}
                  style={styles.courseCover}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.courseCoverPlaceholder}>
                  <Ionicons name="school" size={44} color={colors.primaryLight} />
                </View>
              )}

              <View style={styles.cardContent}>
                <View style={styles.cardTopRow}>
                  <View style={styles.badgeWrap}>
                    <Text style={styles.badgeText}>{course.academic_year || 'الصف الثالث الثانوي'}</Text>
                  </View>
                  <View style={styles.priceBadge}>
                    <Text style={styles.priceBadgeText}>
                      {Number(course.price) > 0 ? `${course.price} ج.م` : 'متاح مجاناً'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.courseTitle}>{course.title}</Text>
                {course.description ? (
                  <Text style={styles.courseDescription} numberOfLines={2}>
                    {course.description}
                  </Text>
                ) : null}

                <View style={styles.cardFooter}>
                  <View style={styles.metaItem}>
                    <Ionicons name="videocam-outline" size={15} color={colors.primaryLight} />
                    <Text style={styles.metaText}>{course.videos_count || 0} محاضرات</Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={15} color={colors.textMuted} />
                    <Text style={styles.metaText}>{formatDuration(course.total_duration_seconds)}</Text>
                  </View>

                  <View style={styles.viewCourseBtn}>
                    <Text style={styles.viewCourseText}>استعراض الكورس</Text>
                    <Ionicons name="arrow-back" size={14} color={colors.primaryLight} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Verification OTP Modal */}
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
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'right',
  },
  searchBarWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    height: 46,
  },
  searchIcon: {
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    textAlign: 'right',
  },
  scrollList: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  courseCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  courseCover: {
    width: '100%',
    height: 160,
  },
  courseCoverPlaceholder: {
    width: '100%',
    height: 140,
    backgroundColor: 'rgba(2, 132, 199, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    padding: 16,
  },
  cardTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeWrap: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    color: colors.primaryLight,
    fontWeight: 'bold',
  },
  priceBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceBadgeText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: 'bold',
  },
  courseTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  courseDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  metaItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  viewCourseBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  viewCourseText: {
    fontSize: 12,
    color: colors.primaryLight,
    fontWeight: 'bold',
  },
});
