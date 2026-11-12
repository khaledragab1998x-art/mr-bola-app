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
  Switch,
  Modal,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import {
  getAllCoursesAdminApi,
  createCourseApi,
  updateCourseApi,
  toggleCoursePublishApi,
  deleteCourseApi,
} from '../../api/adminApi';
import { getServerUrl } from '../../api/client';
import * as ImagePicker from 'expo-image-picker';

export default function AdminCoursesScreen({ navigation }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [serverUrl, setServerUrl] = useState('');

  // Create / Edit Course Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCourseId, setCurrentCourseId] = useState(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDescription, setCourseDescription] = useState('');
  const [academicYear, setAcademicYear] = useState('الصف الثالث الثانوي');
  const [price, setPrice] = useState('0');
  const [isPublished, setIsPublished] = useState(true);
  const [thumbnailImage, setThumbnailImage] = useState(null);
  const [savingCourse, setSavingCourse] = useState(false);

  useEffect(() => {
    getServerUrl().then(setServerUrl);
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    try {
      const res = await getAllCoursesAdminApi();
      if (res.success) {
        setCourses(res.data || []);
      }
    } catch (e) {
      Alert.alert('خطأ', 'فشل تحميل قائمة الكورسات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function openCreateModal() {
    setIsEditing(false);
    setCurrentCourseId(null);
    setCourseTitle('');
    setCourseDescription('');
    setAcademicYear('الصف الثالث الثانوي');
    setPrice('0');
    setIsPublished(true);
    setThumbnailImage(null);
    setModalVisible(true);
  }

  function openEditModal(course) {
    setIsEditing(true);
    setCurrentCourseId(course.id);
    setCourseTitle(course.title);
    setCourseDescription(course.description || '');
    setAcademicYear(course.academic_year || 'الصف الثالث الثانوي');
    setPrice(String(course.price || 0));
    setIsPublished(Boolean(course.is_published));
    setThumbnailImage(null);
    setModalVisible(true);
  }

  async function pickThumbnail() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!res.canceled && res.assets && res.assets.length > 0) {
      setThumbnailImage(res.assets[0]);
    }
  }

  async function handleSaveCourse() {
    if (!courseTitle.trim()) {
      Alert.alert('تنبيه', 'عنوان الكورس مطلوب');
      return;
    }

    setSavingCourse(true);
    try {
      const formData = new FormData();
      formData.append('title', courseTitle.trim());
      formData.append('description', courseDescription.trim());
      formData.append('academic_year', academicYear);
      formData.append('price', price);
      formData.append('is_published', isPublished ? 'true' : 'false');

      if (thumbnailImage) {
        formData.append('thumbnail', {
          uri: thumbnailImage.uri,
          name: 'thumbnail.jpg',
          type: 'image/jpeg',
        });
      }

      let res;
      if (isEditing) {
        res = await updateCourseApi(currentCourseId, formData);
      } else {
        res = await createCourseApi(formData);
      }

      if (res.success) {
        Alert.alert('تم بنجاح', isEditing ? 'تم تحديث الكورس' : 'تم إنشاء الكورس بنجاح');
        setModalVisible(false);
        loadCourses();
      } else {
        Alert.alert('خطأ', res.message || 'فشل حفظ الكورس');
      }
    } catch (e) {
      Alert.alert('خطأ', 'تعذر حفظ الكورس');
    } finally {
      setSavingCourse(false);
    }
  }

  async function handleTogglePublish(course) {
    const originalStatus = course.is_published;
    setCourses((prev) =>
      prev.map((c) => (c.id === course.id ? { ...c, is_published: !originalStatus } : c))
    );

    try {
      const res = await toggleCoursePublishApi(course.id);
      if (!res.success) {
        setCourses((prev) =>
          prev.map((c) => (c.id === course.id ? { ...c, is_published: originalStatus } : c))
        );
        Alert.alert('خطأ', 'فشل تغيير حالة نشر الكورس');
      }
    } catch (e) {
      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, is_published: originalStatus } : c))
      );
      Alert.alert('خطأ', 'تعذر الاتصال بالسيرفر');
    }
  }

  function handleDeleteCourse(course) {
    Alert.alert(
      'تأكيد حذف الكورس',
      `هل أنت متأكد من حذف كورس "${course.title}" وجميع فيديوهاته وملفاته نهائياً؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، احذف',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteCourseApi(course.id);
              if (res.success) {
                Alert.alert('تم الحذف', 'تم حذف الكورس بنجاح');
                setCourses((prev) => prev.filter((c) => c.id !== course.id));
              } else {
                Alert.alert('خطأ', res.message || 'فشل حذف الكورس');
              }
            } catch (e) {
              Alert.alert('خطأ', 'فشل حذف الكورس');
            }
          },
        },
      ]
    );
  }

  function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0 دقيقة';
    const mins = Math.round(seconds / 60);
    return `${mins} دقيقة`;
  }

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <Text style={styles.headerTitle}>إدارة الكورسات والدورات</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarWrap}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث باسم الكورس..."
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

      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          إجمالي الكورسات: {filteredCourses.length} من {courses.length}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primaryLight} size="large" style={{ marginTop: 40 }} />
      ) : filteredCourses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="school-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>لا توجد كورسات مضافة</Text>
          <Text style={styles.emptySub}>
            {searchQuery ? 'جرب البحث باسم آخر' : 'اضغط على زر (+) في الأعلى لإنشاء كورس جديد'}
          </Text>
          <TouchableOpacity style={styles.createNowBtn} onPress={openCreateModal} activeOpacity={0.8}>
            <Text style={styles.createNowText}>إنشاء كورس الآن 🎓</Text>
          </TouchableOpacity>
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
            <View key={course.id} style={styles.courseCard}>
              {/* Thumbnail / Cover */}
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('AdminCourseVideos', {
                    courseId: course.id,
                    courseTitle: course.title,
                  })
                }
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
                    <Ionicons name="school-outline" size={40} color={colors.primaryLight} />
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.courseCardBody}>
                <View style={styles.cardHeaderRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      course.is_published ? styles.statusPublished : styles.statusDraft,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {course.is_published ? 'منشور للطلاب' : 'مسودة غير منشورة'}
                    </Text>
                  </View>
                  <Text style={styles.yearTag}>{course.academic_year || 'الصف الثالث الثانوي'}</Text>
                </View>

                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('AdminCourseVideos', {
                      courseId: course.id,
                      courseTitle: course.title,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Text style={styles.courseTitle}>{course.title}</Text>
                  {course.description ? (
                    <Text style={styles.courseDescription} numberOfLines={2}>
                      {course.description}
                    </Text>
                  ) : null}
                </TouchableOpacity>

                {/* Course Stats */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="videocam-outline" size={14} color={colors.primaryLight} />
                    <Text style={styles.metaText}>{course.videos_count || 0} فيديو حصري</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.metaText}>{formatDuration(course.total_duration_seconds)}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="pricetag-outline" size={14} color={colors.accent} />
                    <Text style={styles.metaText}>
                      {Number(course.price) > 0 ? `${course.price} ج.م` : 'مجاني'}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionDivider} />

                {/* Manage Videos Button (Primary Action) */}
                <TouchableOpacity
                  style={styles.manageVideosBtn}
                  onPress={() =>
                    navigation.navigate('AdminCourseVideos', {
                      courseId: course.id,
                      courseTitle: course.title,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Ionicons name="film-outline" size={18} color="#fff" />
                  <Text style={styles.manageVideosText}>
                    إدارة فيديوهات الكورس ({course.videos_count || 0})
                  </Text>
                  <Ionicons name="chevron-back" size={18} color="#fff" />
                </TouchableOpacity>

                {/* Controls */}
                <View style={styles.controlsRow}>
                  <View style={styles.toggleControl}>
                    <Switch
                      value={Boolean(course.is_published)}
                      onValueChange={() => handleTogglePublish(course)}
                      trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
                      thumbColor={course.is_published ? colors.accent : '#94A3B8'}
                    />
                    <Text style={styles.controlLabel}>النشر للطلاب</Text>
                  </View>

                  <View style={styles.btnGroup}>
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => openEditModal(course)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="pencil" size={16} color={colors.primaryLight} />
                      <Text style={styles.editBtnText}>تعديل</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteCourse(course)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Create / Edit Course Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditing ? 'تعديل بيانات الكورس' : 'إنشاء كورس جديد'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>عنوان الكورس *</Text>
              <TextInput
                style={styles.modalInput}
                value={courseTitle}
                onChangeText={setCourseTitle}
                placeholder="مثال: كورس المراجعة الشاملة - الكهربية الحديثة"
                placeholderTextColor={colors.textMuted}
                textAlign="right"
              />

              <Text style={styles.inputLabel}>وصف الكورس</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={courseDescription}
                onChangeText={setCourseDescription}
                placeholder="نبذة عن محتوى الكورس والموضوعات التي يغطيها..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlign="right"
              />

              <Text style={styles.inputLabel}>السنة الدراسية</Text>
              <TextInput
                style={styles.modalInput}
                value={academicYear}
                onChangeText={setAcademicYear}
                placeholder="الصف الثالث الثانوي"
                placeholderTextColor={colors.textMuted}
                textAlign="right"
              />

              {/* Cover Image Picker */}
              <Text style={styles.inputLabel}>صورة غلاف الكورس (بوستر الكورس)</Text>
              <TouchableOpacity style={styles.coverPickBtn} onPress={pickThumbnail} activeOpacity={0.8}>
                <Ionicons name="image-outline" size={20} color={colors.primaryLight} />
                <Text style={styles.coverPickText}>
                  {thumbnailImage ? 'تم اختيار الغلاف (اضغط للتغيير)' : 'اختر صورة من الهاتف (نسبة 16:9)'}
                </Text>
              </TouchableOpacity>

              {thumbnailImage && (
                <Image
                  source={{ uri: thumbnailImage.uri }}
                  style={styles.coverImagePreview}
                  resizeMode="cover"
                />
              )}

              <View style={styles.modalToggleRow}>
                <Switch
                  value={isPublished}
                  onValueChange={setIsPublished}
                  trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
                  thumbColor={isPublished ? colors.accent : '#94A3B8'}
                />
                <Text style={styles.modalToggleLabel}>نشر الكورس وجعله متاحاً للطلاب الآن</Text>
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveCourse}
                disabled={savingCourse}
                activeOpacity={0.8}
              >
                {savingCourse ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {isEditing ? 'حفظ التعديلات' : 'إنشاء الكورس'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  addBtn: {
    backgroundColor: colors.primary,
    padding: 6,
    borderRadius: 8,
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
  infoBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  infoText: {
    fontSize: 12,
    color: colors.textMuted,
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
    marginTop: 4,
    textAlign: 'center',
  },
  createNowBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  createNowText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  courseCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  courseCover: {
    width: '100%',
    height: 150,
  },
  courseCoverPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courseCardBody: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPublished: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusDraft: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  yearTag: {
    fontSize: 11,
    color: colors.primaryLight,
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
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
  },
  metaItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  actionDivider: {
    height: 1,
    backgroundColor: colors.surfaceBorder,
    marginVertical: 12,
  },
  manageVideosBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  manageVideosText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  controlsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleControl: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  controlLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  btnGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  editBtnText: {
    fontSize: 11,
    color: colors.primaryLight,
    fontWeight: 'bold',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  modalBody: {
    marginTop: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: 6,
    marginTop: 8,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  coverPickBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  coverPickText: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '500',
  },
  coverImagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginTop: 8,
  },
  modalToggleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingVertical: 6,
  },
  modalToggleLabel: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
