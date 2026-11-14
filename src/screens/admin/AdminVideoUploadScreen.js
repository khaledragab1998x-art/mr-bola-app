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
              Alert.alert('Complete! 🎉', 'Video successfully compressed and converted to secure HLS stream!');
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
      Alert.alert('Error', 'Failed to pick video file');
    }
  }

  async function handleUpload() {
    if (!title.trim()) {
      Alert.alert('Notice', 'Please enter a lesson title');
      return;
    }
    if (!videoFile) {
      Alert.alert('Notice', 'Please select a video file from your device');
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
      formData.append('video', {
        uri: videoFile.uri,
        name: videoFile.name || 'lecture.mp4',
        type: videoFile.mimeType || 'video/mp4',
      });

      const res = await uploadLessonVideoApi(formData, (uploadPercent) => {
        setProcessingProgress(uploadPercent);
      });

      if (res.success && res.lessonId) {
        setProcessingLessonId(res.lessonId);
        setProcessingStatus('processing');
        Alert.alert(
          'Upload Complete! 🚀',
          'Server has started compressing the video with FFmpeg and generating secure HLS chunks. You can follow progress below.'
        );
      }
    } catch (error) {
      Alert.alert('Upload Failed', error.message || 'Error occurred while uploading video');
      setProcessingStatus(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload & Encode Video</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Processing Progress Card */}
        {processingStatus && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressStatusText}>
                {processingStatus === 'uploading'
                  ? 'Transferring file to server...'
                  : processingStatus === 'processing'
                  ? 'Compressing with FFmpeg & generating HLS...'
                  : processingStatus === 'ready'
                  ? '✅ Encoding complete! Stream is ready.'
                  : 'Processing failed'}
              </Text>
              <Text style={styles.progressPercent}>{processingProgress}%</Text>
            </View>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.max(5, processingProgress)}%` }]} />
            </View>
          </View>
        )}

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.label}>Lesson Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Lecture 1 - Current & Potential Difference"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            textAlign="left"
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Description & Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Key concepts, homework notes, or formula summary..."
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlign="left"
          />

          {/* Video Picker */}
          <Text style={[styles.label, { marginTop: 14 }]}>Video File *</Text>
          <TouchableOpacity style={styles.filePickerBox} onPress={pickVideo} activeOpacity={0.8}>
            <Ionicons
              name={videoFile ? 'videocam' : 'cloud-upload-outline'}
              size={32}
              color={videoFile ? colors.primaryLight : colors.textSecondary}
            />
            <Text style={styles.filePickerText}>
              {videoFile ? videoFile.name : 'Tap to select video from device (MP4 / MKV)'}
            </Text>
            {videoFile && (
              <Text style={styles.fileSizeText}>
                Size: {Math.round((videoFile.size || 0) / (1024 * 1024))} MB
              </Text>
            )}
          </TouchableOpacity>

          {/* Free Preview Switch */}
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Free Preview</Text>
              <Text style={styles.switchSub}>Allow all students to watch this lesson without an unlock code</Text>
            </View>
            <Switch
              value={isFree}
              onValueChange={setIsFree}
              trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
              thumbColor={isFree ? colors.accent : '#94A3B8'}
            />
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
                <Ionicons name="cloud-upload" size={20} color="#FFF" />
                <Text style={styles.uploadBtnText}>Upload & Start Encoding</Text>
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
    flexDirection: 'row',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressStatusText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },
  progressPercent: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 8,
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
    textAlign: 'left',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 18,
    gap: 12,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  switchSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  uploadBtn: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
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
