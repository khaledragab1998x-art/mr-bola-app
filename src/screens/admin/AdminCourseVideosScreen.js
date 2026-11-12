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
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import {
  getCourseDetailsAdminApi,
  uploadCourseVideoApi,
  getCourseVideoProgressApi,
  updateCourseVideoApi,
  deleteCourseVideoApi,
} from '../../api/adminApi';

export default function AdminCourseVideosScreen({ route, navigation }) {
  const { courseId, courseTitle } = route.params;

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Upload Video Modal
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [isFreePreview, setIsFreePreview] = useState(false);
  const [selectedVideoFile, setSelectedVideoFile] = useState(null);

  // Uploading / Compression tracking
  const [uploading, setUploading] = useState(false);
  const [processingVideoId, setProcessingVideoId] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState(null);

  // Edit Video Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingVideo, setEditingVideo] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsFree, setEditIsFree] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadCourseVideos();
  }, [courseId]);

  // Polling compression progress
  useEffect(() => {
    let interval;
    if (processingVideoId && processingStatus !== 'ready' && processingStatus !== 'failed') {
      interval = setInterval(async () => {
        try {
          const res = await getCourseVideoProgressApi(processingVideoId);
          if (res.success && res.data) {
            setProcessingProgress(res.data.processing_progress || 0);
            setProcessingStatus(res.data.status);

            if (res.data.status === 'ready') {
              clearInterval(interval);
              Alert.alert('اكتمل بنجاح! 🎉', 'تم ضغط وتجهيز فيديو الكورس بصيغة البث الآمن (HLS)!');
              loadCourseVideos();
            }
          }
        } catch (e) {}
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [processingVideoId, processingStatus]);

  async function loadCourseVideos() {
    setLoading(true);
    try {
      const res = await getCourseDetailsAdminApi(courseId);
      if (res.success) {
        setVideos(res.videos || []);
      }
    } catch (e) {
      Alert.alert('خطأ', 'فشل تحميل فيديوهات الكورس');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function pickVideo() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedVideoFile(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('خطأ', 'فشل اختيار ملف الفيديو');
    }
  }

  async function handleStartUpload() {
    if (!videoTitle.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال عنوان الفيديو');
      return;
    }
    if (!selectedVideoFile) {
      Alert.alert('تنبيه', 'يرجى اختيار ملف الفيديو من الهاتف');
      return;
    }

    setUploading(true);
    setProcessingStatus('uploading');
    setProcessingProgress(0);

    try {
      const formData = new FormData();
      formData.append('title', videoTitle.trim());
      formData.append('description', videoDescription.trim());
      formData.append('is_free_preview', isFreePreview ? 'true' : 'false');
      formData.append('order_index', String(videos.length + 1));

      formData.append('video', {
        uri: selectedVideoFile.uri,
        name: selectedVideoFile.name || 'course_lecture.mp4',
        type: selectedVideoFile.mimeType || 'video/mp4',
      });

      const res = await uploadCourseVideoApi(courseId, formData, (uploadPercent) => {
        setProcessingProgress(uploadPercent);
      });

      if (res.success && res.videoId) {
        setProcessingVideoId(res.videoId);
        setProcessingStatus('processing');
        setUploadModalVisible(false);
        // Reset form
        setVideoTitle('');
        setVideoDescription('');
        setIsFreePreview(false);
        setSelectedVideoFile(null);
        Alert.alert(
          'تم الرفع بنجاح! 🚀',
          'جاري الآن معالجة وضغط الفيديو في السيرفر وتحويله للبث الآمن. يمكنك متابعة شريط التقدم في الأعلى.'
        );
        loadCourseVideos();
      } else {
        Alert.alert('خطأ', res.message || 'فشل رفع الفيديو');
        setProcessingStatus(null);
      }
    } catch (e) {
      Alert.alert('خطأ', 'تعذر رفع الفيديو إلى السيرفر');
      setProcessingStatus(null);
    } finally {
      setUploading(false);
    }
  }

  function openEditModal(video) {
    setEditingVideo(video);
    setEditTitle(video.title);
    setEditDescription(video.description || '');
    setEditIsFree(Boolean(video.is_free_preview));
    setEditModalVisible(true);
  }

  async function handleSaveEdit() {
    if (!editTitle.trim()) {
      Alert.alert('تنبيه', 'عنوان الفيديو مطلوب');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await updateCourseVideoApi(editingVideo.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        is_free_preview: editIsFree,
        order_index: editingVideo.order_index || 1,
      });

      if (res.success) {
        Alert.alert('تم بنجاح', 'تم تحديث بيانات الفيديو');
        setEditModalVisible(false);
        loadCourseVideos();
      } else {
        Alert.alert('خطأ', res.message || 'فشل التحديث');
      }
    } catch (e) {
      Alert.alert('خطأ', 'تعذر حفظ التعديلات');
    } finally {
      setSavingEdit(false);
    }
  }

  function handleDeleteVideo(video) {
    Alert.alert(
      'تأكيد الحذف',
      `هل أنت متأكد من رغبتك في حذف فيديو "${video.title}" من هذا الكورس؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، احذف',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteCourseVideoApi(video.id);
              if (res.success) {
                Alert.alert('تم الحذف', 'تم حذف الفيديو بنجاح');
                setVideos((prev) => prev.filter((v) => v.id !== video.id));
              } else {
                Alert.alert('خطأ', res.message || 'فشل حذف الفيديو');
              }
            } catch (e) {
              Alert.alert('خطأ', 'فشل حذف الفيديو');
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
        <View style={{ alignItems: 'flex-end', flex: 1, marginHorizontal: 10 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {courseTitle}
          </Text>
          <Text style={styles.headerSubtitle}>إدارة فيديوهات الكورس الحصرية</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setUploadModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="cloud-upload" size={18} color="#fff" />
          <Text style={styles.addBtnText}>رفع فيديو</Text>
        </TouchableOpacity>
      </View>

      {/* Real-time processing banner if active */}
      {processingStatus && processingStatus !== 'ready' && (
        <View style={styles.processingBanner}>
          <View style={styles.processingHeader}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.processingTitle}>
              {processingStatus === 'uploading'
                ? `جاري رفع الفيديو إلى السيرفر (${processingProgress}%)`
                : `جاري ضغط ومعالجة الفيديو HLS (${processingProgress}%)`}
            </Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${processingProgress}%` }]} />
          </View>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primaryLight} size="large" style={{ marginTop: 40 }} />
      ) : videos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="film-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>لا توجد فيديوهات في هذا الكورس بعد</Text>
          <Text style={styles.emptySub}>
            الفيديوهات التي ترفعها هنا ستكون خاصة ومتاحة حصرياً داخل هذا الكورس فقط
          </Text>
          <TouchableOpacity
            style={styles.emptyUploadBtn}
            onPress={() => setUploadModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
            <Text style={styles.emptyUploadText}>رفع أول فيديو للكورس 🎬</Text>
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
                loadCourseVideos();
              }}
              tintColor={colors.primaryLight}
            />
          }
        >
          {videos.map((video, idx) => (
            <View key={video.id} style={styles.videoCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.badgeGroup}>
                  <View
                    style={[
                      styles.statusBadge,
                      video.status === 'ready'
                        ? styles.statusReady
                        : video.status === 'processing'
                        ? styles.statusProcessing
                        : styles.statusFailed,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {video.status === 'ready'
                        ? 'جاهز للبث'
                        : video.status === 'processing'
                        ? `قيد الضغط (${video.processing_progress}%)`
                        : 'فشل'}
                    </Text>
                  </View>

                  {Boolean(video.is_free_preview) && (
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeBadgeText}>معاينة مجانية</Text>
                    </View>
                  )}
                </View>

                <View style={styles.lectureBadge}>
                  <Text style={styles.lectureBadgeText}>المحاضرة {idx + 1}</Text>
                </View>
              </View>

              <Text style={styles.videoTitle}>{video.title}</Text>
              {video.description ? (
                <Text style={styles.videoDescription}>{video.description}</Text>
              ) : null}

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.metaText}>{formatDuration(video.duration_seconds)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="lock-closed-outline" size={14} color={colors.accent} />
                  <Text style={styles.metaText}>حماية ببث HLS + علامة مائية</Text>
                </View>
              </View>

              <View style={styles.actionDivider} />

              {/* Action buttons */}
              <View style={styles.cardActionRow}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => openEditModal(video)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={16} color={colors.primaryLight} />
                  <Text style={styles.editBtnText}>تعديل البيانات</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteVideo(video)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                  <Text style={styles.deleteBtnText}>حذف الفيديو</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Upload Video Modal */}
      <Modal
        visible={uploadModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>رفع فيديو جديد لهذا الكورس فقط</Text>
              <TouchableOpacity onPress={() => setUploadModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>عنوان المحاضرة / الفيديو *</Text>
              <TextInput
                style={styles.modalInput}
                value={videoTitle}
                onChangeText={setVideoTitle}
                placeholder="مثال: المحاضرة الأولى: مقدمة وحل أفكار المتفوقين"
                placeholderTextColor={colors.textMuted}
                textAlign="right"
              />

              <Text style={styles.inputLabel}>الوصف</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={videoDescription}
                onChangeText={setVideoDescription}
                placeholder="وصف تفصيلي للمحاضرة..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlign="right"
              />

              {/* Video File Picker */}
              <Text style={styles.inputLabel}>ملف الفيديو من الهاتف *</Text>
              <TouchableOpacity style={styles.filePickerBtn} onPress={pickVideo} activeOpacity={0.8}>
                <Ionicons name="videocam-outline" size={24} color={colors.primaryLight} />
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={styles.filePickerTitle}>
                    {selectedVideoFile ? selectedVideoFile.name : 'اضغط لاختيار ملف الفيديو (MP4, MKV)'}
                  </Text>
                  <Text style={styles.filePickerSub}>
                    {selectedVideoFile
                      ? `الحجم: ${(selectedVideoFile.size / (1024 * 1024)).toFixed(1)} MB`
                      : 'سيتم ضغطه وتحويله للبث التلقائي فائق السرعة'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.modalToggleRow}>
                <Switch
                  value={isFreePreview}
                  onValueChange={setIsFreePreview}
                  trackColor={{ false: colors.surfaceBorder, true: colors.accent }}
                  thumbColor={isFreePreview ? '#fff' : '#94A3B8'}
                />
                <Text style={styles.modalToggleLabel}>معاينة مجانية (فيديو تجريبي مفتوح)</Text>
              </View>

              <TouchableOpacity
                style={styles.uploadSubmitBtn}
                onPress={handleStartUpload}
                disabled={uploading}
                activeOpacity={0.8}
              >
                {uploading ? (
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.uploadSubmitText}>جاري رفع الفيديو ({processingProgress}%)...</Text>
                  </View>
                ) : (
                  <Text style={styles.uploadSubmitText}>بدء الرفع والضغط التلقائي 🚀</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Video Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تعديل بيانات الفيديو</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>عنوان الفيديو *</Text>
              <TextInput
                style={styles.modalInput}
                value={editTitle}
                onChangeText={setEditTitle}
                textAlign="right"
              />

              <Text style={styles.inputLabel}>الوصف</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                numberOfLines={3}
                textAlign="right"
              />

              <View style={styles.modalToggleRow}>
                <Switch
                  value={editIsFree}
                  onValueChange={setEditIsFree}
                  trackColor={{ false: colors.surfaceBorder, true: colors.accent }}
                  thumbColor={editIsFree ? '#fff' : '#94A3B8'}
                />
                <Text style={styles.modalToggleLabel}>معاينة مجانية لهذا الفيديو</Text>
              </View>

              <TouchableOpacity
                style={styles.uploadSubmitBtn}
                onPress={handleSaveEdit}
                disabled={savingEdit}
                activeOpacity={0.8}
              >
                {savingEdit ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.uploadSubmitText}>حفظ التعديلات</Text>
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
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.primaryLight,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  processingBanner: {
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
  },
  processingHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  processingTitle: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: 'bold',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 3,
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
    lineHeight: 20,
  },
  emptyUploadBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
    gap: 6,
  },
  emptyUploadText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  videoCard: {
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
  badgeGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
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
  lectureBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lectureBadgeText: {
    fontSize: 11,
    color: colors.primaryLight,
    fontWeight: 'bold',
  },
  videoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'right',
    marginTop: 4,
  },
  videoDescription: {
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
  cardActionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  editBtnText: {
    fontSize: 12,
    color: colors.primaryLight,
    fontWeight: 'bold',
  },
  deleteBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteBtnText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: 'bold',
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
  filePickerBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    marginTop: 6,
  },
  filePickerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  filePickerSub: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 2,
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
  uploadSubmitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  uploadSubmitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
