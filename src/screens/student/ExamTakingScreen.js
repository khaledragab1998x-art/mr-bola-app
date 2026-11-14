import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { getExamForTakingApi, submitExamApi, reportViolationApi } from '../../api/examsApi';
import { getServerUrl } from '../../api/client';

export default function ExamTakingScreen({ route, navigation }) {
  const { examId, title } = route.params;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [examData, setExamData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [question_id]: selected_choice_id }
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [violations, setViolations] = useState(0);
  const [baseUrl, setBaseUrl] = useState('');

  const appStateRef = useRef(AppState.currentState);
  const isSubmittedRef = useRef(false);

  // 1. Fetch Exam Questions and Timer
  useEffect(() => {
    async function initExam() {
      try {
        const [examRes, url] = await Promise.all([
          getExamForTakingApi(examId),
          getServerUrl(),
        ]);

        setBaseUrl(url);

        if (examRes.success && examRes.exam) {
          setExamData(examRes.exam);
          setTimeLeftSeconds((examRes.exam.duration_minutes || 30) * 60);
        }
      } catch (err) {
        Alert.alert(
          'Notice',
          err.message || 'Could not load exam. You may have already completed it.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } finally {
        setLoading(false);
      }
    }

    initExam();
  }, [examId]);

  // 2. Countdown Timer
  useEffect(() => {
    if (loading || !examData || timeLeftSeconds <= 0 || isSubmittedRef.current) return;

    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit('time_expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, examData, timeLeftSeconds]);

  // 3. Anti-Cheat: App State Listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current === 'active' &&
        (nextAppState === 'background' || nextAppState === 'inactive')
      ) {
        if (!isSubmittedRef.current && examData) {
          handleViolation();
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, [examData, violations]);

  async function handleViolation() {
    const newCount = violations + 1;
    setViolations(newCount);

    if (examData?.submission_id) {
      reportViolationApi(examData.submission_id, 'app_switched').catch(() => {});
    }

    if (newCount >= 3) {
      Alert.alert(
        '🚨 Security Violation!',
        'You have left or minimized the exam screen 3 times. Your exam is being automatically submitted to prevent cheating.',
        [{ text: 'OK', onPress: () => handleAutoSubmit('cheating_violation') }]
      );
    } else {
      Alert.alert(
        '⚠️ Anti-Cheat Warning!',
        `Minimizing or leaving the exam screen is strictly prohibited!\n• Warning: (${newCount} of 3)\n• On the 3rd warning, your exam will be auto-submitted.`
      );
    }
  }

  function handleSelectChoice(questionId, choiceId) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: choiceId,
    }));
  }

  async function handleAutoSubmit(reason) {
    if (isSubmittedRef.current) return;
    isSubmittedRef.current = true;
    await doSubmit();
  }

  function confirmSubmit() {
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = examData?.questions?.length || 0;

    Alert.alert(
      'Submit Exam',
      `You answered (${answeredCount} of ${totalQuestions}) questions.\nAre you sure you want to finish and submit your exam now?`,
      [
        { text: 'Submit Now', onPress: () => doSubmit() },
        { text: 'Continue Exam', style: 'cancel' },
      ]
    );
  }

  async function doSubmit() {
    if (!examData) return;
    setSubmitting(true);
    isSubmittedRef.current = true;

    try {
      const answersPayload = Object.entries(answers).map(([qId, choiceId]) => ({
        question_id: parseInt(qId, 10),
        selected_choice_id: choiceId,
      }));

      const res = await submitExamApi(examId, examData.submission_id, answersPayload);

      if (res.success && res.result) {
        navigation.replace('ExamResult', {
          examId,
          title: examData.title,
          score: res.result.score,
          totalMarks: res.result.totalMarks,
          percentage: res.result.percentage,
          passed: res.result.passed,
        });
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit exam');
      setSubmitting(false);
    }
  }

  // Formatting remaining time
  const minutes = Math.floor(timeLeftSeconds / 60);
  const seconds = timeLeftSeconds % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primaryLight} />
        <Text style={styles.loadingText}>Preparing exam questions...</Text>
      </View>
    );
  }

  const questions = examData?.questions || [];
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const isTrueFalse = currentQuestion?.question_type === 'true_false';

  return (
    <View style={styles.container}>
      {/* Top Exam Header with Timer & Violations indicator */}
      <View style={styles.examHeader}>
        <View style={styles.timerBadge}>
          <Ionicons name="time" size={16} color={timeLeftSeconds < 180 ? colors.danger : colors.warning} />
          <Text style={[styles.timerText, timeLeftSeconds < 180 && { color: colors.danger }]}>
            {timeFormatted}
          </Text>
        </View>

        <Text style={styles.examTitleText} numberOfLines={1}>
          {examData?.title || title}
        </Text>

        {violations > 0 ? (
          <View style={styles.violationPill}>
            <Ionicons name="warning" size={12} color="#FFF" />
            <Text style={styles.violationText}>{violations}/3</Text>
          </View>
        ) : null}
      </View>

      {/* Question Progress Bar */}
      <View style={styles.progressBarWrap}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${((currentIndex + 1) / Math.max(1, questions.length)) * 100}%` },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Question Counter Card */}
        <View style={styles.questionNavCard}>
          <Text style={styles.questionIndexText}>
            Question <Text style={{ color: colors.primaryLight, fontSize: 18 }}>{currentIndex + 1}</Text> of {questions.length}
          </Text>
          <View style={styles.marksBadge}>
            <Text style={styles.marksText}>{currentQuestion?.marks || 1} pt{currentQuestion?.marks > 1 ? 's' : ''}</Text>
          </View>
        </View>

        {/* Question Body Card */}
        <View style={styles.questionBox}>
          <Text style={styles.questionText}>{currentQuestion?.question_text}</Text>

          {/* Diagram / Circuit Image if available */}
          {currentQuestion?.image_url ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: `${baseUrl}${currentQuestion.image_url}` }}
                style={styles.questionImage}
                resizeMode="contain"
              />
            </View>
          ) : null}
        </View>

        {/* Choices List */}
        <View style={styles.choicesSection}>
          <Text style={styles.choicesHeading}>Select the correct answer:</Text>

          {isTrueFalse ? (
            /* True / False layout */
            <View style={styles.tfChoicesWrap}>
              {currentQuestion?.choices?.map((choice) => {
                const isSelected = answers[currentQuestion.id] === choice.id;
                const lowerText = (choice.choice_text || '').toLowerCase();
                const isTrue = lowerText.includes('true') || lowerText.includes('صح');

                return (
                  <TouchableOpacity
                    key={choice.id}
                    style={[
                      styles.tfStudentCard,
                      isSelected && (isTrue ? styles.tfStudentCardTrueSelected : styles.tfStudentCardFalseSelected),
                    ]}
                    onPress={() => handleSelectChoice(currentQuestion.id, choice.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={
                        isTrue
                          ? isSelected ? 'checkmark-circle' : 'checkmark-circle-outline'
                          : isSelected ? 'close-circle' : 'close-circle-outline'
                      }
                      size={28}
                      color={isSelected ? (isTrue ? colors.success : colors.danger) : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.tfStudentCardText,
                        isSelected && { color: isTrue ? colors.success : colors.danger, fontWeight: 'bold' },
                      ]}
                    >
                      {isTrue ? 'True' : 'False'}
                    </Text>
                    {isSelected && (
                      <View style={[styles.selectedPill, { backgroundColor: isTrue ? colors.success : colors.danger }]}>
                        <Text style={styles.selectedPillText}>Selected</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            /* Standard MCQ layout */
            currentQuestion?.choices?.map((choice, idx) => {
              const isSelected = answers[currentQuestion.id] === choice.id;
              const letters = ['A', 'B', 'C', 'D', 'E'];
              const letter = letters[idx] || (idx + 1);

              return (
                <TouchableOpacity
                  key={choice.id}
                  style={[styles.choiceCard, isSelected && styles.choiceCardSelected]}
                  onPress={() => handleSelectChoice(currentQuestion.id, choice.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    <Text style={[styles.letterText, isSelected && styles.letterTextSelected]}>
                      {letter}
                    </Text>
                  </View>

                  <View style={styles.choiceTextWrap}>
                    <Text style={[styles.choiceText, isSelected && styles.choiceTextSelected]}>
                      {choice.choice_text}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Bottom Pager Controls */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.navBtn, currentIndex === 0 && styles.disabledNavBtn]}
          onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
        >
          <Ionicons name="arrow-back" size={18} color="#FFF" />
          <Text style={styles.navBtnText}>Previous</Text>
        </TouchableOpacity>

        {isLastQuestion ? (
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.disabledNavBtn]}
            onPress={confirmSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Submit Exam</Text>
                <Ionicons name="checkmark-done" size={18} color="#FFF" />
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
          >
            <Text style={styles.navBtnText}>Next</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  examHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    gap: 10,
  },
  examTitleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 37, 65, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 6,
  },
  timerText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  violationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 2,
  },
  violationText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressBarWrap: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primaryLight,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  questionNavCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  questionIndexText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  marksBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  marksText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: 'bold',
  },
  questionBox: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 18,
  },
  questionText: {
    color: colors.textPrimary,
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'left',
    fontWeight: '600',
  },
  imageContainer: {
    marginTop: 14,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  questionImage: {
    width: '100%',
    height: 200,
  },
  choicesSection: {
    gap: 10,
  },
  choicesHeading: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'left',
    marginBottom: 4,
    fontWeight: 'bold',
  },
  // True / False Student Choice Cards
  tfChoicesWrap: {
    gap: 12,
  },
  tfStudentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    gap: 14,
  },
  tfStudentCardTrueSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.success,
  },
  tfStudentCardFalseSelected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.danger,
  },
  tfStudentCardText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  selectedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  selectedPillText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // MCQ Choice Card
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    gap: 12,
  },
  choiceCardSelected: {
    borderColor: colors.primaryLight,
    backgroundColor: 'rgba(2, 132, 199, 0.15)',
  },
  radioCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: colors.primaryLight,
    backgroundColor: colors.primary,
  },
  letterText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  letterTextSelected: {
    color: '#FFF',
  },
  choiceTextWrap: {
    flex: 1,
  },
  choiceText: {
    color: colors.textPrimary,
    fontSize: 14,
    textAlign: 'left',
    lineHeight: 22,
  },
  choiceTextSelected: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
    gap: 12,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    gap: 6,
  },
  disabledNavBtn: {
    opacity: 0.4,
  },
  navBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
