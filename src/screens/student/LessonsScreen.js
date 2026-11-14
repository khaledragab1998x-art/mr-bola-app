import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { getChaptersWithLessonsApi, redeemLessonCodeApi } from '../../api/lessonsApi';
import { useAuth } from '../../context/AuthContext';
import OtpVerificationModal from '../auth/OtpVerificationModal';

export default function LessonsScreen({ navigation }) {
  const { isAccessBlockedByVerification, isAdmin } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);

  // Lesson Code Unlock Modal State
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [selectedLessonToUnlock, setSelectedLessonToUnlock] = useState(null);
  const [unlockCode, setUnlockCode] = useState('');
  const [unlocking, setUnlocking] = useState(false);

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
      Alert.alert('Error', 'Failed to load physics lessons');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleLessonClick(lesson) {
    if (isAccessBlockedByVerification) {
      Alert.alert(
        'Email Verification Required',
        'Mr.Poula Malak has enabled email verification for video lessons. Please verify your OTP code to proceed.',
        [
          { text: 'Verify Now', onPress: () => setShowOtpModal(true) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    if (lesson.status === 'processing') {
      Alert.alert('Processing', 'This video is being compressed and secured on the server. It will be ready shortly.');
      return;
    }

    // Check lock status: if paid and not unlocked and not admin, prompt for code
    const isUnlocked = isAdmin || lesson.is_free_preview || lesson.is_unlocked;
    if (!isUnlocked) {
      setSelectedLessonToUnlock(lesson);
      setUnlockCode('');
      setUnlockModalVisible(true);
      return;
    }

    navigation.navigate('VideoPlayer', { lessonId: lesson.id, title: lesson.title });
  }

  async function handleRedeemCode() {
    if (!unlockCode.trim()) {
      Alert.alert('Alert', 'Please enter your unlock code');
      return;
    }

    setUnlocking(true);
    try {
      const res = await redeemLessonCodeApi(unlockCode.trim(), selectedLessonToUnlock?.id);
      if (res.success) {
        Alert.alert('Lesson Unlocked! 🎉', res.message || 'Lesson unlocked successfully! Enjoy watching.');
        setUnlockModalVisible(false);
        setUnlockCode('');
        // Reload lessons to reflect unlock status
        await loadLessons();
        // Open player
        if (selectedLessonToUnlock) {
          navigation.navigate('VideoPlayer', {
            lessonId: selectedLessonToUnlock.id,
            title: selectedLessonToUnlock.title,
          });
        }
      } else {
        throw new Error(res.message || 'Invalid unlock code');
      }
    } catch (e) {
      Alert.alert('Unlock Failed', e.message || 'Invalid or expired code. Please check with Mr.Poula.');
    } finally {
      setUnlocking(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Physics Lectures & Lessons</Text>
        <Text style={styles.headerSubtitle}>Master core concepts and problem-solving with Mr.Poula Malak</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primaryLight} size="large" style={{ marginTop: 40 }} />
      ) : lessons.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="film-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No lessons uploaded yet. Mr.Poula will publish new lessons soon.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadLessons(); }}
              tintColor={colors.primaryLight}
            />
          }
        >
          {lessons.map((lesson, index) => {
            const isUnlocked = isAdmin || lesson.is_free_preview || lesson.is_unlocked;

            return (
              <TouchableOpacity
                key={lesson.id}
                style={[styles.lessonCard, !isUnlocked && styles.lessonCardLocked]}
                onPress={() => handleLessonClick(lesson)}
                activeOpacity={0.8}
              >
                <View style={styles.lessonHeaderRow}>
                  <View style={[styles.lessonNumberBadge, !isUnlocked && styles.lessonNumberBadgeLocked]}>
                    <Text style={[styles.lessonNumberText, !isUnlocked && styles.lessonNumberTextLocked]}>
                      {index + 1}
                    </Text>
                  </View>

                  <View style={styles.lessonInfo}>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    {lesson.description ? (
                      <Text style={styles.lessonDescription} numberOfLines={2}>
                        {lesson.description}
                      </Text>
                    ) : null}
                  </View>

                  <View style={[styles.playIconContainer, !isUnlocked && styles.lockIconContainer]}>
                    <Ionicons
                      name={
                        !isUnlocked
                          ? 'lock-closed'
                          : lesson.status === 'processing'
                          ? 'sync-outline'
                          : 'play'
                      }
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
                        <Text style={styles.freeText}>Free Preview</Text>
                      </View>
                    ) : !isUnlocked ? (
                      <View style={styles.lockedBadge}>
                        <Ionicons name="key-outline" size={12} color={colors.warning} />
                        <Text style={styles.lockedText}>Enter Code to Unlock</Text>
                      </View>
                    ) : (
                      <View style={styles.unlockedBadge}>
                        <Ionicons name="checkmark-circle-outline" size={12} color={colors.success} />
                        <Text style={styles.unlockedText}>Unlocked</Text>
                      </View>
                    )}

                    {lesson.pdf_url ? (
                      <View style={styles.pdfBadge}>
                        <Ionicons name="document-text-outline" size={12} color={colors.primaryLight} />
                        <Text style={styles.pdfBadgeText}>PDF Attached</Text>
                      </View>
                    ) : null}

                    {lesson.status === 'processing' ? (
                      <View style={styles.processingBadge}>
                        <Text style={styles.processingText}>Processing {lesson.processing_progress}%</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.durationPill}>
                    <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.durationText}>
                      {lesson.duration_seconds
                        ? `${Math.round(lesson.duration_seconds / 60)} min`
                        : 'Full Lecture'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Unlock Code Modal */}
      <Modal
        visible={unlockModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setUnlockModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.unlockModalCard}>
            <View style={styles.unlockModalHeader}>
              <View style={styles.keyIconCircle}>
                <Ionicons name="key" size={26} color={colors.gold} />
              </View>
              <Text style={styles.unlockModalTitle}>Unlock Premium Lesson</Text>
              <Text style={styles.unlockModalLessonTitle} numberOfLines={2}>
                "{selectedLessonToUnlock?.title}"
              </Text>
              <Text style={styles.unlockModalSubtitle}>
                Enter the secret activation code provided by Mr.Poula Malak to watch this lesson.
              </Text>
            </View>

            <TextInput
              style={styles.codeInput}
              placeholder="e.g. MP-8F2A-9K7C"
              placeholderTextColor={colors.textMuted}
              value={unlockCode}
              onChangeText={setUnlockCode}
              autoCapitalize="characters"
              autoCorrect={false}
              textAlign="center"
            />

            <TouchableOpacity
              style={[styles.redeemBtn, unlocking && styles.disabledBtn]}
              onPress={handleRedeemCode}
              disabled={unlocking}
              activeOpacity={0.8}
            >
              {unlocking ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.redeemBtnText}>Unlock Lesson Now</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setUnlockModalVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    textAlign: 'left',
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'left',
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
  lessonCardLocked: {
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  lessonHeaderRow: {
    flexDirection: 'row',
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
  lessonNumberBadgeLocked: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: colors.warning,
  },
  lessonNumberText: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: 'bold',
  },
  lessonNumberTextLocked: {
    color: colors.warning,
  },
  lessonInfo: {
    flex: 1,
    alignItems: 'flex-start',
  },
  lessonTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'left',
  },
  lessonDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'left',
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
  lockIconContainer: {
    backgroundColor: '#D97706',
  },
  lessonFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  badgesWrap: {
    flexDirection: 'row',
    alignItems: 'center',
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
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  lockedText: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: 'bold',
  },
  unlockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  unlockedText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: 'bold',
  },
  pdfBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  pdfBadgeText: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: '600',
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
    flexDirection: 'row',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unlockModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
  },
  unlockModalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  keyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  unlockModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  unlockModalLessonTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryLight,
    marginTop: 4,
    textAlign: 'center',
  },
  unlockModalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  codeInput: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  redeemBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  redeemBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
