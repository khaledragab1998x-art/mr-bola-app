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
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { getChaptersWithLessonsApi } from '../../api/lessonsApi';
import { createExamApi, addQuestionApi, getExamsListApi } from '../../api/adminApi';

export default function AdminExamBuilderScreen({ navigation }) {
  // Step: 'create_exam' or 'add_questions'
  const [mode, setMode] = useState('create_exam');
  const [activeExamId, setActiveExamId] = useState(null);
  const [examTitle, setExamTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [totalMarks, setTotalMarks] = useState('60');

  // Question Form
  const [questionType, setQuestionType] = useState('mcq'); // 'mcq' or 'true_false'
  const [questionText, setQuestionText] = useState('');
  const [choiceA, setChoiceA] = useState('');
  const [choiceB, setChoiceB] = useState('');
  const [choiceC, setChoiceC] = useState('');
  const [choiceD, setChoiceD] = useState('');
  const [correctChoiceIndex, setCorrectChoiceIndex] = useState(0); // 0: A, 1: B, 2: C, 3: D
  const [tfCorrectAnswer, setTfCorrectAnswer] = useState('true'); // 'true' or 'false'
  const [questionMarks, setQuestionMarks] = useState('1');
  const [diagramImage, setDiagramImage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [addedQuestionsCount, setAddedQuestionsCount] = useState(0);

  async function handleCreateExam() {
    if (!examTitle.trim()) {
      Alert.alert('Alert', 'Please enter an exam title');
      return;
    }

    setLoading(true);
    try {
      const res = await createExamApi(
        null,
        examTitle.trim(),
        'Online Physics Examination',
        parseInt(durationMinutes, 10) || 30,
        parseInt(totalMarks, 10) || 60,
        true
      );

      if (res.success && res.examId) {
        setActiveExamId(res.examId);
        setMode('add_questions');
        Alert.alert('Success', 'Exam created! You can now start adding questions.');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create exam');
    } finally {
      setLoading(false);
    }
  }

  async function pickDiagram() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!res.canceled && res.assets && res.assets.length > 0) {
      setDiagramImage(res.assets[0]);
    }
  }

  async function handleAddQuestion() {
    if (!questionText.trim()) {
      Alert.alert('Alert', 'Please enter the question text');
      return;
    }

    let choices = [];
    if (questionType === 'true_false') {
      choices = [
        { text: 'True', is_correct: tfCorrectAnswer === 'true' },
        { text: 'False', is_correct: tfCorrectAnswer === 'false' },
      ];
    } else {
      if (!choiceA.trim() || !choiceB.trim() || !choiceC.trim() || !choiceD.trim()) {
        Alert.alert('Alert', 'Please fill in all 4 choices for the question');
        return;
      }
      choices = [
        { text: choiceA.trim(), is_correct: correctChoiceIndex === 0 },
        { text: choiceB.trim(), is_correct: correctChoiceIndex === 1 },
        { text: choiceC.trim(), is_correct: correctChoiceIndex === 2 },
        { text: choiceD.trim(), is_correct: correctChoiceIndex === 3 },
      ];
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('question_text', questionText.trim());
      formData.append('question_type', questionType);
      formData.append('marks', questionMarks);
      formData.append('choices', JSON.stringify(choices));

      if (diagramImage) {
        formData.append('image', {
          uri: diagramImage.uri,
          name: diagramImage.fileName || 'diagram.jpg',
          type: diagramImage.mimeType || 'image/jpeg',
        });
      }

      const res = await addQuestionApi(activeExamId, formData);

      if (res.success) {
        setAddedQuestionsCount((prev) => prev + 1);
        // Reset question form
        setQuestionText('');
        setChoiceA('');
        setChoiceB('');
        setChoiceC('');
        setChoiceD('');
        setDiagramImage(null);
        setTfCorrectAnswer('true');
        Alert.alert('Success', 'Question added successfully! You can add the next question.');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to add question');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'create_exam' ? 'Create New Exam' : `Add Questions (${addedQuestionsCount} Added)`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {mode === 'create_exam' ? (
          <View style={styles.card}>
            <Text style={styles.label}>Exam Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Chapter 1 Comprehensive Exam"
              placeholderTextColor={colors.textMuted}
              value={examTitle}
              onChangeText={setExamTitle}
              textAlign="left"
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Total Marks</Text>
                <TextInput
                  style={styles.input}
                  value={totalMarks}
                  onChangeText={setTotalMarks}
                  keyboardType="number-pad"
                  textAlign="center"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Duration (Minutes)</Text>
                <TextInput
                  style={styles.input}
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                  keyboardType="number-pad"
                  textAlign="center"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabledBtn]}
              onPress={handleCreateExam}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnText}>Continue & Add Questions</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            {/* Question Type Toggle */}
            <Text style={styles.label}>Question Type</Text>
            <View style={styles.typeToggleRow}>
              <TouchableOpacity
                style={[styles.typeBtn, questionType === 'mcq' && styles.typeBtnActive]}
                onPress={() => setQuestionType('mcq')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="list-outline"
                  size={16}
                  color={questionType === 'mcq' ? '#FFF' : colors.textSecondary}
                />
                <Text style={[styles.typeBtnText, questionType === 'mcq' && styles.typeBtnTextActive]}>
                  Multiple Choice (MCQ)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeBtn, questionType === 'true_false' && styles.typeBtnActive]}
                onPress={() => setQuestionType('true_false')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color={questionType === 'true_false' ? '#FFF' : colors.textSecondary}
                />
                <Text style={[styles.typeBtnText, questionType === 'true_false' && styles.typeBtnTextActive]}>
                  True / False
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { marginTop: 14 }]}>Question Text</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Type the physics problem or statement here..."
              placeholderTextColor={colors.textMuted}
              value={questionText}
              onChangeText={setQuestionText}
              multiline
              textAlign="left"
            />

            {/* Diagram Picker */}
            <TouchableOpacity style={styles.diagramPicker} onPress={pickDiagram}>
              <Ionicons name="image-outline" size={20} color={colors.primaryLight} />
              <Text style={styles.diagramPickerText}>
                {diagramImage ? 'Diagram Image Selected ✓' : 'Attach Circuit Diagram / Figure (Optional)'}
              </Text>
            </TouchableOpacity>

            {/* Dynamic Choices Form depending on Question Type */}
            {questionType === 'true_false' ? (
              <View style={styles.tfContainer}>
                <Text style={[styles.label, { marginTop: 14 }]}>Select Correct Answer:</Text>
                <View style={styles.tfOptionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.tfOptionBtn,
                      tfCorrectAnswer === 'true' && styles.tfOptionBtnTrue,
                    ]}
                    onPress={() => setTfCorrectAnswer('true')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={tfCorrectAnswer === 'true' ? '#FFF' : colors.success}
                    />
                    <Text style={[styles.tfOptionText, tfCorrectAnswer === 'true' && styles.tfOptionTextActive]}>
                      True (صح)
                    </Text>
                    {tfCorrectAnswer === 'true' && (
                      <View style={styles.correctBadge}>
                        <Text style={styles.correctBadgeText}>CORRECT</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.tfOptionBtn,
                      tfCorrectAnswer === 'false' && styles.tfOptionBtnFalse,
                    ]}
                    onPress={() => setTfCorrectAnswer('false')}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="close-circle"
                      size={24}
                      color={tfCorrectAnswer === 'false' ? '#FFF' : colors.danger}
                    />
                    <Text style={[styles.tfOptionText, tfCorrectAnswer === 'false' && styles.tfOptionTextActive]}>
                      False (خطأ)
                    </Text>
                    {tfCorrectAnswer === 'false' && (
                      <View style={styles.correctBadge}>
                        <Text style={styles.correctBadgeText}>CORRECT</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <Text style={[styles.label, { marginTop: 14 }]}>
                  Choices (Tap green radio button to set correct answer):
                </Text>

                {[
                  { letter: 'A', val: choiceA, set: setChoiceA, idx: 0 },
                  { letter: 'B', val: choiceB, set: setChoiceB, idx: 1 },
                  { letter: 'C', val: choiceC, set: setChoiceC, idx: 2 },
                  { letter: 'D', val: choiceD, set: setChoiceD, idx: 3 },
                ].map((item) => (
                  <View key={item.idx} style={styles.choiceInputRow}>
                    <TouchableOpacity
                      style={[
                        styles.radioBtn,
                        correctChoiceIndex === item.idx && styles.radioBtnCorrect,
                      ]}
                      onPress={() => setCorrectChoiceIndex(item.idx)}
                    >
                      <Text style={styles.radioLetter}>{item.letter}</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.choiceInput}
                      placeholder={`Choice ${item.letter}`}
                      placeholderTextColor={colors.textMuted}
                      value={item.val}
                      onChangeText={item.set}
                      textAlign="left"
                    />
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabledBtn, { marginTop: 22 }]}
              onPress={handleAddQuestion}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnText}>Save & Add Next Question</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.finishBtn}
              onPress={() => {
                Alert.alert('Exam Finished', 'Questions saved! The exam is ready for students.');
                navigation.goBack();
              }}
            >
              <Text style={styles.finishBtnText}>Finish & Return to Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}
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
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
  typeToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.background,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.accent,
  },
  typeBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  tfContainer: {
    marginTop: 6,
  },
  tfOptionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  tfOptionBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.surfaceBorder,
    gap: 6,
  },
  tfOptionBtnTrue: {
    borderColor: colors.success,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  tfOptionBtnFalse: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  tfOptionText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  tfOptionTextActive: {
    color: '#FFF',
  },
  correctBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  correctBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
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
    height: 80,
    textAlignVertical: 'top',
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  diagramPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginTop: 10,
    justifyContent: 'center',
  },
  diagramPickerText: {
    color: colors.primaryLight,
    fontSize: 12,
  },
  choiceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  choiceInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  radioBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioBtnCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  radioLetter: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  btnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  finishBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  finishBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
