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
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { getChaptersWithLessonsApi } from '../../api/lessonsApi';
import { uploadLessonVideoApi, getVideoProgressApi } from '../../api/adminApi';

export default function AdminVideoUploadScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [videoFile, setVideoFile] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [processingLessonId, setProcessingLessonId] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState(null);

  // Poll video compression progress
  useEffect(() => {
    let interval;
    if (processingLessonId && processingStatus !== 'ready' && processingStatus !== 'failed') {
      interval = setInterval(async () => {
        try {
          const res = await getVideoProgressApi(processingLessonId);
          if (res.success && res.data) {
            setProcessingProgress(res.data.processing_progress || 0);
            setProcessingStatus(res.data.status);

            if (res.data.status === 'ready') {
              clearInterval(interval);
              Alert.alert('اكتمل بنجاح! 🎉', 'تم ضغط الفيديو وتحويله لصيغة البث الآمن (HLS) بنجاح!');
            }
          }
        } catch (e) {}
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [processingLessonId, processingStatus]);

  async function pickVideo() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setVideoFile(result.assets[0]);
      }
    } catch (e) {
      Alert.alert('خطأ', 'فشل اختيار ملف الفيديو');
    }
  }

  async function handleUpload() {
    if (!title.trim()) {
      Alert.alert('تنبيه', 'برجاء إدخال عنوان الحصة');
      return;
    }
    if (!videoFile) {
      Alert.alert('تنبيه', 'برجاء اختيار ملف الفيديو من الهاتف');
      return;
    }

    setUploading(true);
    setProcessingStatus('uploading');
    setProcessingProgress(0);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('is_free_preview', isFree ? 'true' : 'false');

      // Append video file
      const fileUri = Platform.OS === 'ios' ? videoFile.uri.replace('file://', '') : videoFile.uri;
      formData.append('video', {
        uri: fileUri,
        name: videoFile.name || 'lecture.mp4',
        type: videoFile.mimeType || 'video/mp4',
      });

      const res = await uploadLessonVideoApi(formData);

      if (res.success && res.lessonId) {
        setProcessingLessonId(res.lessonId);
        setProcessingStatus('processing');
        Alert.alert(
          'تم الرفع بنجاح! 🚀',
          'بدأ سيرفر Linux في ضغط الفيديو بأداة FFmpeg وتوليد بث HLS الآمن. يمكنك متابعة النسبة بالأسفل.'
        );
      }
    } catch (error) {
      Alert.alert('فشل الرفع', error.message || 'حدث خطأ أثناء رفع الفيديو للسيرفر');
      setProcessingStatus(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>رفع وضغط فيديو الحصة</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Processing Progress Card */}
        {processingStatus && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressPercent}>{processingProgress}%</Text>
              <Text style={styles.progressStatusText}>
                {processingStatus === 'uploading'
                  ? 'جاري نقل الملف إلى السيرفر...'
                  : processingStatus === 'processing'
                  ? 'جاري ضغط الفيديو بـ FFmpeg وتقسيم HLS...'
                  : processingStatus === 'ready'
                  ? '✅ تم الضغط والبث جاهز للطالب!'
                  : 'فشلت المعالجة'}
              </Text>
            </View>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.max(5, processingProgress)}%` }]} />
            </View>
          </View>
        )}

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.label}>عنوان الحصة / الدرس</Text>
          <TextInput
            style={styles.input}
            placeholder="مثال: محاضرة 1 - شدة التيار وفرق الجهد"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            textAlign="right"
          />

          <Text style={[styles.label, { marginTop: 14 }]}>وصف الحصة والنقاط المشروحة</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="اكتب ملخص القوانين أو الملاحظات..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlign="right"
          />

          {/* Video Picker */}
          <Text style={[styles.label, { marginTop: 14 }]}>ملف الفيديو</Text>
          <TouchableOpacity style={styles.filePickerBox} onPress={pickVideo} activeOpacity={0.8}>
            <Ionicons
              name={videoFile ? 'videocam' : 'cloud-upload-outline'}
              size={32}
              color={videoFile ? colors.primaryLight : colors.textSecondary}
            />
            <Text style={styles.filePickerText}>
              {videoFile ? videoFile.name : 'اضغط لاختيار فيديو من جهازك (MP4 / MKV)'}
            </Text>
            {videoFile && (
              <Text style={styles.fileSizeText}>
                الحجم: {Math.round((videoFile.size || 0) / (1024 * 1024))} ميجابايت
              </Text>
            )}
          </TouchableOpacity>

          {/* Free Preview Switch */}
          <View style={styles.switchRow}>
            <Switch
              value={isFree}
              onValueChange={setIsFree}
              trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
              thumbColor={isFree ? colors.accent : '#94A3B8'}
            />
            <Text style={styles.switchLabel}>إتاحة هذه الحصة كمعاينة مجانية لجميع الطلاب</Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.uploadBtn, (uploading || !videoFile) && styles.disabledBtn]}
            onPress={handleUpload}
            disabled={uploading || !videoFile}
            activeOpacity={0.8}
          >
            {uploading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.uploadBtnText}>بدء رفع وضغط الحصة</Text>
                <Ionicons name="cloud-upload" size={20} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  progressCard: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressStatusText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressPercent: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '900',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 8,
    textAlign: 'right',
  },
  chapterChips: {
    flexDirection: 'row-reverse',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  chipTextSelected: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  filePickerBox: {
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  filePickerText: {
    color: colors.textPrimary,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  fileSizeText: {
    color: colors.primaryLight,
    fontSize: 11,
  },
  switchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 18,
    gap: 12,
  },
  switchLabel: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  uploadBtn: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  uploadBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
