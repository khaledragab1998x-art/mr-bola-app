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
import { getExamsListApi } from '../../api/examsApi';
import { useAuth } from '../../context/AuthContext';
import OtpVerificationModal from '../auth/OtpVerificationModal';

export default function ExamsScreen({ navigation }) {
  const { isAccessBlockedByVerification } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);

  useEffect(() => {
    loadExams();
  }, []);

  async function loadExams() {
    setLoading(true);
    try {
      const res = await getExamsListApi();
      if (res.success) {
        setExams(res.data);
      }
    } catch (e) {
      console.warn('Exams error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleExamClick(exam) {
    if (isAccessBlockedByVerification) {
      Alert.alert(
        'Email Verification Required',
        'Please verify your email address first before taking exams.',
        [
          { text: 'Verify Now', onPress: () => setShowOtpModal(true) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    if (exam.submission_status === 'completed') {
      navigation.navigate('ExamResult', {
        examId: exam.id,
        title: exam.title,
        score: exam.student_score,
        totalMarks: exam.total_marks,
      });
      return;
    }

    Alert.alert(
      'Start Exam',
      `You are about to start: "${exam.title}"\n• Duration: ${exam.duration_minutes} minutes\n• Anti-cheat enabled: Do not minimize or switch apps during the exam.`,
      [
        {
          text: 'Start Now',
          onPress: () => navigation.navigate('ExamTaking', { examId: exam.id, title: exam.title }),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Physics Exams & Quizzes</Text>
        <Text style={styles.headerSubtitle}>
          Test your conceptual understanding and practice official exam questions
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primaryLight} size="large" style={{ marginTop: 40 }} />
      ) : exams.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>No exams available at this time</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadExams();
              }}
              tintColor={colors.primaryLight}
            />
          }
        >
          {exams.map((exam) => (
            <TouchableOpacity
              key={exam.id}
              style={styles.examCard}
              onPress={() => handleExamClick(exam)}
              activeOpacity={0.8}
            >
              <View style={styles.examTop}>
                <Text style={styles.examTitle}>{exam.title}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    exam.submission_status === 'completed'
                      ? styles.statusCompleted
                      : styles.statusPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      exam.submission_status === 'completed'
                        ? styles.statusCompletedText
                        : styles.statusPendingText,
                    ]}
                  >
                    {exam.submission_status === 'completed' ? 'Completed' : 'Ready'}
                  </Text>
                </View>
              </View>

              {exam.chapter_title ? (
                <Text style={styles.chapterName}>{exam.chapter_title}</Text>
              ) : null}

              <View style={styles.examInfoGrid}>
                <View style={styles.infoPill}>
                  <Ionicons name="time-outline" size={14} color={colors.warning} />
                  <Text style={styles.infoText}>{exam.duration_minutes} min</Text>
                </View>

                <View style={styles.infoPill}>
                  <Ionicons name="help-circle-outline" size={14} color={colors.primaryLight} />
                  <Text style={styles.infoText}>{exam.questions_count || 'Multi'} questions</Text>
                </View>

                <View style={styles.infoPill}>
                  <Ionicons name="trophy-outline" size={14} color={colors.accent} />
                  <Text style={styles.infoText}>{exam.total_marks} pts</Text>
                </View>
              </View>

              <View style={styles.examCardFooter}>
                {exam.submission_status === 'completed' ? (
                  <View style={styles.scoreRow}>
                    <Text style={styles.scoreLabel}>Score:</Text>
                    <Text style={styles.scoreValue}>
                      {exam.student_score} / {exam.total_marks}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.notTakenText}>Not attempted yet</Text>
                )}

                <View style={styles.startBtn}>
                  <Text style={styles.startBtnText}>
                    {exam.submission_status === 'completed' ? 'View Result' : 'Take Exam'}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFF" />
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
  examCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 14,
  },
  examTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  examTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'left',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusPendingText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusCompletedText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: 'bold',
  },
  chapterName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'left',
  },
  examInfoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  examCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.success,
  },
  notTakenText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  startBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
});
