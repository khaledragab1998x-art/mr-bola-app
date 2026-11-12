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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import {
  getAllLessonsAdminApi,
  updateLessonApi,
  toggleLessonPublishApi,
  deleteLessonApi,
} from '../../api/adminApi';
import { getChaptersWithLessonsApi } from '../../api/lessonsApi';

export default function AdminLessonsScreen({ navigation }) {
  const [lessons, setLessons] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editChapterId, setEditChapterId] = useState(null);
  const [editIsFree, setEditIsFree] = useState(false);
  const [editIsPublished, setEditIsPublished] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      let lessonsList = [];
      let chaptersList = [];

      // 1. Try dedicated admin lessons endpoint
      try {
        const res = await getAllLessonsAdminApi();
        if (res && res.success && Array.isArray(res.data)) {
          lessonsList = res.data;
        }
      } catch (adminErr) {
        console.warn('Admin lessons endpoint not reachable, trying standard lessons API:', adminErr?.message);
      }

      // 2. Fetch chapters & fallback lessons
      const chaptersRes = await getChaptersWithLessonsApi().catch(() => ({ data: [], lessons: [] }));
      if (chaptersRes) {
        if (Array.isArray(chaptersRes.data)) {
          chaptersList = chaptersRes.data;
        }

        // If admin endpoint was unavailable (404), extract lessons from chaptersRes
        if (lessonsList.length === 0) {
          if (Array.isArray(chaptersRes.lessons) && chaptersRes.lessons.length > 0) {
            lessonsList = chaptersRes.lessons;
          } else if (Array.isArray(chaptersRes.data)) {
            chaptersRes.data.forEach((chap) => {
              if (chap.lessons && Array.isArray(chap.lessons)) {
                lessonsList.push(...chap.lessons);
              }
            });
          }
        }
      }

      setLessons(lessonsList);
      setChapters(chaptersList);
    } catch (e) {
      console.warn('Load lessons general error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleTogglePublish(lesson) {
    const originalStatus = lesson.is_published;
    // Optimistic UI update
    setLessons((prev) =>
      prev.map((l) => (l.id === lesson.id ? { ...l, is_published: !originalStatus } : l))
    );

    try {
      const res = await toggleLessonPublishApi(lesson.id);
      if (!res.success) {
        // Revert on failure
        setLessons((prev) =>
          prev.map((l) => (l.id === lesson.id ? { ...l, is_published: originalStatus } : l))
        );
        Alert.alert('خطأ', 'فشل تغيير حالة النشر');
      }
    } catch (e) {
      setLessons((prev) =>
        prev.map((l) => (l.id === lesson.id ? { ...l, is_published: originalStatus } : l))
      );
      Alert.alert('خطأ', 'تعذر الاتصال بالسيرفر');
    }
  }

  function openEditModal(lesson) {
    setEditingLesson(lesson);
    setEditTitle(lesson.title);
    setEditDescription(lesson.description || '');
    setEditChapterId(lesson.chapter_id);
    setEditIsFree(Boolean(lesson.is_free_preview));
    setEditIsPublished(Boolean(lesson.is_published));
    setEditModalVisible(true);
  }

  async function handleSaveEdit() {
    if (!editTitle.trim()) {
      Alert.alert('تنبيه', 'عنوان الحصة مطلوب');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await updateLessonApi(editingLesson.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        chapter_id: editChapterId,
        is_free_preview: editIsFree,
        is_published: editIsPublished,
      });

      if (res.success) {
        Alert.alert('تم بنجاح', 'تم تحديث بيانات الحصة');
        setEditModalVisible(false);
        loadData();
      } else {
        Alert.alert('خطأ', res.message || 'فشل التحديث');
      }
    } catch (e) {
      Alert.alert('خطأ', 'تعذر حفظ التعديلات');
    } finally {
      setSavingEdit(false);
    }
  }

  function handleDeleteLesson(lesson) {
    Alert.alert(
      'تأكيد الحذف',
      `هل أنت متأكد من رغبتك في حذف حصة "${lesson.title}" وجميع ملفات الفيديو الملحقة بها؟ لا يمكن التراجع عن هذا الإجراء.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، احذف',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteLessonApi(lesson.id);
              if (res.success) {
                Alert.alert('تم الحذف', 'تم حذف الحصة بنجاح');
                setLessons((prev) => prev.filter((l) => l.id !== lesson.id));
              } else {
                Alert.alert('خطأ', res.message || 'فشل حذف الحصة');
              }
            } catch (e) {
              Alert.alert('خطأ', 'فشل حذف الحصة');
            }
          },
        },
      ]
    );
  }

  function formatDuration(seconds) {
    if (!seconds) return 'غير محدد';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs} دقيقة`;
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }

  const filteredLessons = lessons.filter(
    (l) =>
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.chapter_title && l.chapter_title.toLowerCase().includes(searchQuery.toLowerCase()))
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
        <Text style={styles.headerTitle}>إدارة الحصص المرفوعة</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AdminVideoUpload')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarWrap}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="ابحث باسم الحصة أو الفصل..."
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

      {/* Count Info */}
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          إجمالي الحصص: {filteredLessons.length} من {lessons.length}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primaryLight} size="large" style={{ marginTop: 40 }} />
      ) : filteredLessons.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="film-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>لا توجد حصص مطابقة</Text>
          <Text style={styles.emptySub}>
            {searchQuery ? 'جرب البحث بكلمة أخرى' : 'لم تقم برفع أي حصص بعد'}
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
                loadData();
              }}
              tintColor={colors.primaryLight}
            />
          }
        >
          {filteredLessons.map((lesson) => (
            <View key={lesson.id} style={styles.lessonCard}>
              {/* Card Header */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.statusBadgeWrap}>
                  <View
                    style={[
                      styles.statusBadge,
                      lesson.status === 'ready'
                        ? styles.statusReady
                        : lesson.status === 'processing'
                        ? styles.statusProcessing
                        : styles.statusFailed,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {lesson.status === 'ready'
                        ? 'جاهز للعرض'
                        : lesson.status === 'processing'
                        ? `قيد الضغط (${lesson.processing_progress}%)`
                        : 'فشل المعالجة'}
                    </Text>
                  </View>

                  {Boolean(lesson.is_free_preview) && (
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeBadgeText}>معاينة مجانية</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.lessonId}>#{lesson.id}</Text>
              </View>

              {/* Title & Chapter */}
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
              {lesson.chapter_title ? (
                <View style={styles.chapterTag}>
                  <Ionicons name="folder-outline" size={14} color={colors.primaryLight} />
                  <Text style={styles.chapterTagText}>{lesson.chapter_title}</Text>
                </View>
              ) : null}

              {/* Tech details */}
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.metaText}>{formatDuration(lesson.duration_seconds)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="save-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.metaText}>
                    {formatBytes(lesson.compressed_size_bytes || lesson.file_size_bytes)}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="chatbubbles-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.metaText}>{lesson.comments_count || 0} تعليق</Text>
                </View>
              </View>

              {/* Toggles & Actions */}
              <View style={styles.actionDivider} />

              <View style={styles.controlsRow}>
                {/* Publish Toggle */}
                <View style={styles.toggleControl}>
                  <Switch
                    value={Boolean(lesson.is_published)}
                    onValueChange={() => handleTogglePublish(lesson)}
                    trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
                    thumbColor={lesson.is_published ? colors.accent : '#94A3B8'}
                  />
                  <Text style={styles.controlLabel}>
                    {lesson.is_published ? 'منشور للطلاب' : 'مخفي (مسودة)'}
                  </Text>
                </View>

                {/* Buttons: Edit & Delete */}
                <View style={styles.btnGroup}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => openEditModal(lesson)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil" size={16} color={colors.primaryLight} />
                    <Text style={styles.editBtnText}>تعديل</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteLesson(lesson)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تعديل بيانات الحصة</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>عنوان الحصة *</Text>
              <TextInput
                style={styles.modalInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="أدخل عنوان الحصة..."
                placeholderTextColor={colors.textMuted}
                textAlign="right"
              />

              <Text style={styles.inputLabel}>الوصف / الملاحظات</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="أدخل وصف الحصة..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlign="right"
              />

              <Text style={styles.inputLabel}>الفصل / الباب</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chapterPicker}>
                <TouchableOpacity
                  style={[
                    styles.chapterChoice,
                    editChapterId === null && styles.chapterChoiceActive,
                  ]}
                  onPress={() => setEditChapterId(null)}
                >
                  <Text
                    style={[
                      styles.chapterChoiceText,
                      editChapterId === null && styles.chapterChoiceTextActive,
                    ]}
                  >
                    بدون باب محدد
                  </Text>
                </TouchableOpacity>

                {chapters.map((chap) => (
                  <TouchableOpacity
                    key={chap.id}
                    style={[
                      styles.chapterChoice,
                      editChapterId === chap.id && styles.chapterChoiceActive,
                    ]}
                    onPress={() => setEditChapterId(chap.id)}
                  >
                    <Text
                      style={[
                        styles.chapterChoiceText,
                        editChapterId === chap.id && styles.chapterChoiceTextActive,
                      ]}
                    >
                      {chap.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalToggleRow}>
                <Switch
                  value={editIsFree}
                  onValueChange={setEditIsFree}
                  trackColor={{ false: colors.surfaceBorder, true: colors.accent }}
                  thumbColor={editIsFree ? '#fff' : '#94A3B8'}
                />
                <Text style={styles.modalToggleLabel}>معاينة مجانية (متاح بدون اشتراك)</Text>
              </View>

              <View style={styles.modalToggleRow}>
                <Switch
                  value={editIsPublished}
                  onValueChange={setEditIsPublished}
                  trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
                  thumbColor={editIsPublished ? colors.accent : '#94A3B8'}
                />
                <Text style={styles.modalToggleLabel}>نشر الحصة في قائمة دروس الطلاب</Text>
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveEdit}
                disabled={savingEdit}
                activeOpacity={0.8}
              >
                {savingEdit ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>حفظ التعديلات</Text>
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
    gap: 14,
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
  },
  lessonCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cardHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusBadgeWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusReady: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusProcessing: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusFailed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  freeBadge: {
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freeBadgeText: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '700',
  },
  lessonId: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'right',
    marginTop: 4,
  },
  chapterTag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  chapterTagText: {
    fontSize: 12,
    color: colors.primaryLight,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 16,
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
  controlsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleControl: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  editBtnText: {
    fontSize: 12,
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
    marginTop: 10,
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
    height: 80,
    textAlignVertical: 'top',
  },
  chapterPicker: {
    flexDirection: 'row-reverse',
    marginVertical: 6,
  },
  chapterChoice: {
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  chapterChoiceActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  chapterChoiceText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  chapterChoiceTextActive: {
    color: '#fff',
    fontWeight: 'bold',
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
    marginTop: 24,
    marginBottom: 30,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
