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
  const [questionText, setQuestionText] = useState('');
  const [choiceA, setChoiceA] = useState('');
  const [choiceB, setChoiceB] = useState('');
  const [choiceC, setChoiceC] = useState('');
  const [choiceD, setChoiceD] = useState('');
  const [correctChoiceIndex, setCorrectChoiceIndex] = useState(0); // 0: A, 1: B, 2: C, 3: D
  const [questionMarks, setQuestionMarks] = useState('1');
  const [diagramImage, setDiagramImage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [addedQuestionsCount, setAddedQuestionsCount] = useState(0);

  async function handleCreateExam() {
    if (!examTitle.trim()) {
      Alert.alert('تنبيه', 'برجاء كتابة عنوان الامتحان');
      return;
    }

    setLoading(true);
    try {
      const res = await createExamApi(
        null, // No chapter required
        examTitle.trim(),
        'امتحان فيزياء إلكتروني',
        parseInt(durationMinutes, 10) || 30,
        parseInt(totalMarks, 10) || 60,
        true
      );

      if (res.success && res.examId) {
        setActiveExamId(res.examId);
        setMode('add_questions');
        Alert.alert('تم بنجاح', 'تم إنشاء الامتحان. يمكنك الآن البدء في إضافة الأسئلة واختيار الإجابات الصحيحة.');
      }
    } catch (e) {
      Alert.alert('خطأ', e.message || 'فشل إنشاء الامتحان');
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
    if (!questionText.trim() || !choiceA.trim() || !choiceB.trim() || !choiceC.trim() || !choiceD.trim()) {
      Alert.alert('تنبيه', 'برجاء كتابة نص السؤال والخيارات الأربعة بالكامل');
      return;
    }

    setLoading(true);
    try {
      const choices = [
        { text: choiceA.trim(), is_correct: correctChoiceIndex === 0 },
        { text: choiceB.trim(), is_correct: correctChoiceIndex === 1 },
        { text: choiceC.trim(), is_correct: correctChoiceIndex === 2 },
        { text: choiceD.trim(), is_correct: correctChoiceIndex === 3 },
      ];

      const formData = new FormData();
      formData.append('question_text', questionText.trim());
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
        Alert.alert('نجاح', 'تمت إضافة السؤال بنجاح! يمكنك إضافة السؤال التالي.');
      }
    } catch (e) {
      Alert.alert('خطأ', e.message || 'فشل إضافة السؤال');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'create_exam' ? 'إنشاء امتحان جديد' : `إضافة الأسئلة (${addedQuestionsCount} أُضيفت)`}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {mode === 'create_exam' ? (
          <View style={styles.card}>
            <Text style={styles.label}>عنوان الامتحان</Text>
            <TextInput
              style={styles.input}
              placeholder="مثال: امتحان شامل - فيزياء"
              placeholderTextColor={colors.textMuted}
              value={examTitle}
              onChangeText={setExamTitle}
              textAlign="right"
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>الدرجة الكلية</Text>
                <TextInput
                  style={styles.input}
                  value={totalMarks}
                  onChangeText={setTotalMarks}
                  keyboardType="number-pad"
                  textAlign="center"
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>المدة (بالدقائق)</Text>
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
                <Text style={styles.btnText}>متابعة وإضافة الأسئلة</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>نص السؤال</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="اكتب رأس المسألة أو السؤال هنا..."
              placeholderTextColor={colors.textMuted}
              value={questionText}
              onChangeText={setQuestionText}
              multiline
              textAlign="right"
            />

            {/* Diagram Picker */}
            <TouchableOpacity style={styles.diagramPicker} onPress={pickDiagram}>
              <Ionicons name="image-outline" size={20} color={colors.primaryLight} />
              <Text style={styles.diagramPickerText}>
                {diagramImage ? 'تم اختيار صورة الرسم البياني' : 'رفع رسم بياني أو دائرة كهربية (اختياري)'}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.label, { marginTop: 14 }]}>الخيارات (حدد النقطة الخضراء للإجابة الصحيحة)</Text>

            {[
              { letter: 'أ', val: choiceA, set: setChoiceA, idx: 0 },
              { letter: 'ب', val: choiceB, set: setChoiceB, idx: 1 },
              { letter: 'ج', val: choiceC, set: setChoiceC, idx: 2 },
              { letter: 'د', val: choiceD, set: setChoiceD, idx: 3 },
            ].map((item) => (
              <View key={item.idx} style={styles.choiceInputRow}>
                <TextInput
                  style={styles.choiceInput}
                  placeholder={`الخيار (${item.letter})`}
                  placeholderTextColor={colors.textMuted}
                  value={item.val}
                  onChangeText={item.set}
                  textAlign="right"
                />
                <TouchableOpacity
                  style={[
                    styles.radioBtn,
                    correctChoiceIndex === item.idx && styles.radioBtnCorrect,
                  ]}
                  onPress={() => setCorrectChoiceIndex(item.idx)}
                >
                  <Text style={styles.radioLetter}>{item.letter}</Text>
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabledBtn, { marginTop: 20 }]}
              onPress={handleAddQuestion}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnText}>حفظ وإضافة السؤال التالي</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.finishBtn}
              onPress={() => {
                Alert.alert('اكتمل الامتحان', 'تم حفظ جميع الأسئلة والامتحان جاهز للطلاب!');
                navigation.goBack();
              }}
            >
              <Text style={styles.finishBtnText}>إنهاء والعودة للوحة التحكم</Text>
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
    textAlign: 'right',
  },
  chipsRow: {
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
    height: 80,
    textAlignVertical: 'top',
  },
  twoCol: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginTop: 14,
  },
  diagramPicker: {
    flexDirection: 'row-reverse',
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
    flexDirection: 'row-reverse',
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
