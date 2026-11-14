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
  getAllExamsAdminApi,
  getExamDetailsAdminApi,
  updateExamApi,
  toggleExamPublishApi,
  deleteExamApi,
  deleteQuestionApi,
  addQuestionApi,
} from '../../api/adminApi';
import { getExamsListApi, getExamForTakingApi } from '../../api/examsApi';
import { getServerUrl } from '../../api/client';
import * as ImagePicker from 'expo-image-picker';

export default function AdminExamsScreen({ navigation }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [serverUrl, setServerUrl] = useState('');

  // Edit Exam Modal
  const [editExamModal, setEditExamModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDuration, setEditDuration] = useState('30');
  const [editMarks, setEditMarks] = useState('60');
  const [editPassing, setEditPassing] = useState('50');
  const [savingEdit, setSavingEdit] = useState(false);

  // Manage Questions Modal
  const [questionsModal, setQuestionsModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Add Question Sub-form in Questions Modal
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [questionType, setQuestionType] = useState('mcq'); // 'mcq' | 'true_false'
  const [newQuestionText, setNewQuestionText] = useState('');
  const [choiceA, setChoiceA] = useState('');
  const [choiceB, setChoiceB] = useState('');
  const [choiceC, setChoiceC] = useState('');
  const [choiceD, setChoiceD] = useState('');
  const [correctChoiceIdx, setCorrectChoiceIdx] = useState(0);
  const [tfCorrect, setTfCorrect] = useState('true'); // 'true' | 'false'
  const [questionMarks, setQuestionMarks] = useState('1');
  const [diagramImage, setDiagramImage] = useState(null);
  const [savingQuestion, setSavingQuestion] = useState(false);

  useEffect(() => {
    getServerUrl().then(setServerUrl);
    loadExams();
  }, []);

  async function loadExams() {
    setLoading(true);
    try {
      let examsList = [];

      try {
        const res = await getAllExamsAdminApi();
        if (res && res.success && Array.isArray(res.data)) {
          examsList = res.data;
        }
      } catch (adminErr) {
        console.warn('Admin exams endpoint not reachable:', adminErr?.message);
      }

      if (examsList.length === 0) {
        const fallbackRes = await getExamsListApi().catch(() => ({ data: [] }));
        if (fallbackRes && Array.isArray(fallbackRes.data)) {
          examsList = fallbackRes.data;
        }
      }

      setExams(examsList);
    } catch (e) {
      console.warn('Load exams error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleTogglePublish(exam) {
    const originalStatus = exam.is_published;
    setExams((prev) =>
      prev.map((e) => (e.id === exam.id ? { ...e, is_published: !originalStatus } : e))
    );

    try {
      const res = await toggleExamPublishApi(exam.id);
      if (!res.success) {
        setExams((prev) =>
          prev.map((e) => (e.id === exam.id ? { ...e, is_published: originalStatus } : e))
        );
        Alert.alert('Error', 'Failed to update exam publish status');
      }
    } catch (e) {
      setExams((prev) =>
        prev.map((e) => (e.id === exam.id ? { ...e, is_published: originalStatus } : e))
      );
      Alert.alert('Error', 'Cannot connect to server');
    }
  }

  function openEditModal(exam) {
    setEditingExam(exam);
    setEditTitle(exam.title);
    setEditDescription(exam.description || '');
    setEditDuration(String(exam.duration_minutes || 30));
    setEditMarks(String(exam.total_marks || 60));
    setEditPassing(String(exam.passing_percentage || 50));
    setEditExamModal(true);
  }

  async function handleSaveExamEdit() {
    if (!editTitle.trim()) {
      Alert.alert('Notice', 'Exam title is required');
      return;
    }

    setSavingEdit(true);
    try {
      const res = await updateExamApi(editingExam.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        duration_minutes: parseInt(editDuration, 10) || 30,
        total_marks: parseInt(editMarks, 10) || 60,
        passing_percentage: parseInt(editPassing, 10) || 50,
        is_published: editingExam.is_published,
      });

      if (res.success) {
        Alert.alert('Success', 'Exam updated successfully');
        setEditExamModal(false);
        loadExams();
      } else {
        Alert.alert('Error', res.message || 'Update failed');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save exam settings');
    } finally {
      setSavingEdit(false);
    }
  }

  function handleDeleteExam(exam) {
    Alert.alert(
      'Delete Exam',
      `Are you sure you want to delete "${exam.title}" and all its questions and student submissions?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteExamApi(exam.id);
              if (res.success) {
                Alert.alert('Deleted', 'Exam deleted successfully');
                setExams((prev) => prev.filter((e) => e.id !== exam.id));
              } else {
                Alert.alert('Error', res.message || 'Failed to delete exam');
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to delete exam');
            }
          },
        },
      ]
    );
  }

  async function openQuestionsManager(exam) {
    setSelectedExam(exam);
    setQuestionsModal(true);
    setShowAddQuestion(false);
    setLoadingQuestions(true);

    try {
      let questions = [];

      try {
        const res = await getExamDetailsAdminApi(exam.id);
        if (res && res.success && res.exam && Array.isArray(res.exam.questions)) {
          questions = res.exam.questions;
        }
      } catch (adminErr) {
        console.warn('Admin exam details not reachable:', adminErr?.message);
      }

      if (questions.length === 0) {
        const fallbackRes = await getExamForTakingApi(exam.id).catch(() => null);
        if (fallbackRes && fallbackRes.success && fallbackRes.exam && Array.isArray(fallbackRes.exam.questions)) {
          questions = fallbackRes.exam.questions;
        }
      }

      setExamQuestions(questions);
    } catch (e) {
      console.warn('Questions manager error:', e);
    } finally {
      setLoadingQuestions(false);
    }
  }

  async function handleDeleteQuestion(question) {
    Alert.alert(
      'Delete Question',
      'Are you sure you want to delete this question?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteQuestionApi(question.id);
              if (res.success) {
                setExamQuestions((prev) => prev.filter((q) => q.id !== question.id));
                setExams((prev) =>
                  prev.map((e) =>
                    e.id === selectedExam.id
                      ? { ...e, questions_count: Math.max(0, (e.questions_count || 1) - 1) }
                      : e
                  )
                );
              } else {
                Alert.alert('Error', res.message || 'Failed to delete question');
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to delete question');
            }
          },
        },
      ]
    );
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

  async function handleAddQuestionToExam() {
    if (!newQuestionText.trim()) {
      Alert.alert('Notice', 'Please write the question text');
      return;
    }

    let choices = [];
    if (questionType === 'true_false') {
      choices = [
        { text: 'True', is_correct: tfCorrect === 'true' },
        { text: 'False', is_correct: tfCorrect === 'false' },
      ];
    } else {
      if (!choiceA.trim() || !choiceB.trim() || !choiceC.trim() || !choiceD.trim()) {
        Alert.alert('Notice', 'Please provide all 4 multiple choice options');
        return;
      }
      choices = [
        { text: choiceA.trim(), is_correct: correctChoiceIdx === 0 },
        { text: choiceB.trim(), is_correct: correctChoiceIdx === 1 },
        { text: choiceC.trim(), is_correct: correctChoiceIdx === 2 },
        { text: choiceD.trim(), is_correct: correctChoiceIdx === 3 },
      ];
    }

    setSavingQuestion(true);
    try {
      const formData = new FormData();
      formData.append('question_text', newQuestionText.trim());
      formData.append('question_type', questionType);
      formData.append('marks', questionMarks || '1');
      formData.append('choices', JSON.stringify(choices));

      if (diagramImage) {
        formData.append('image', {
          uri: diagramImage.uri,
          name: 'diagram.jpg',
          type: 'image/jpeg',
        });
      }

      const res = await addQuestionApi(selectedExam.id, formData);
      if (res.success) {
        Alert.alert('Success', 'Question added to exam successfully');
        // Reset form
        setNewQuestionText('');
        setChoiceA('');
        setChoiceB('');
        setChoiceC('');
        setChoiceD('');
        setCorrectChoiceIdx(0);
        setTfCorrect('true');
        setDiagramImage(null);
        setShowAddQuestion(false);

        // Reload questions
        const detailsRes = await getExamDetailsAdminApi(selectedExam.id);
        if (detailsRes.success && detailsRes.exam) {
          setExamQuestions(detailsRes.exam.questions || []);
        }
        setExams((prev) =>
          prev.map((e) =>
            e.id === selectedExam.id
              ? { ...e, questions_count: (e.questions_count || 0) + 1 }
              : e
          )
        );
      } else {
        Alert.alert('Error', res.message || 'Failed to add question');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not add question');
    } finally {
      setSavingQuestion(false);
    }
  }

  const filteredExams = exams.filter(
    (e) =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.chapter_title && e.chapter_title.toLowerCase().includes(searchQuery.toLowerCase()))
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
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Exams</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AdminExamBuilder')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarWrap}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exams or chapters..."
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
          Total Exams: {filteredExams.length} of {exams.length}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primaryLight} size="large" style={{ marginTop: 40 }} />
      ) : filteredExams.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No exams found</Text>
          <Text style={styles.emptySub}>
            {searchQuery ? 'Try a different search term' : 'Tap the (+) button at top right to build an exam'}
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
                loadExams();
              }}
              tintColor={colors.primaryLight}
            />
          }
        >
          {filteredExams.map((exam) => (
            <View key={exam.id} style={styles.examCard}>
              {/* Header row */}
              <View style={styles.cardHeaderRow}>
                <View
                  style={[
                    styles.statusBadge,
                    exam.is_published ? styles.statusPublished : styles.statusDraft,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {exam.is_published ? 'Published' : 'Draft (Hidden)'}
                  </Text>
                </View>
                <Text style={styles.examId}>#{exam.id}</Text>
              </View>

              <Text style={styles.examTitle}>{exam.title}</Text>
              {exam.description ? (
                <Text style={styles.examDescription}>{exam.description}</Text>
              ) : null}

              {/* Meta Stats */}
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="help-circle-outline" size={14} color={colors.primaryLight} />
                  <Text style={styles.metaText}>{exam.questions_count || 0} questions</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.metaText}>{exam.duration_minutes} min</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="trophy-outline" size={14} color={colors.warning} />
                  <Text style={styles.metaText}>{exam.total_marks} pts</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={14} color={colors.success} />
                  <Text style={styles.metaText}>{exam.submissions_count || 0} taken</Text>
                </View>
              </View>

              <View style={styles.actionDivider} />

              {/* Controls */}
              <View style={styles.controlsRow}>
                <View style={styles.toggleControl}>
                  <Switch
                    value={Boolean(exam.is_published)}
                    onValueChange={() => handleTogglePublish(exam)}
                    trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
                    thumbColor={exam.is_published ? colors.accent : '#94A3B8'}
                  />
                  <Text style={styles.controlLabel}>Publish</Text>
                </View>

                <View style={styles.btnGroup}>
                  {/* Manage Questions Button */}
                  <TouchableOpacity
                    style={styles.questionsBtn}
                    onPress={() => openQuestionsManager(exam)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="list-outline" size={16} color={colors.accent} />
                    <Text style={styles.questionsBtnText}>Questions ({exam.questions_count || 0})</Text>
                  </TouchableOpacity>

                  {/* Edit Button */}
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => openEditModal(exam)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil" size={15} color={colors.primaryLight} />
                  </TouchableOpacity>

                  {/* Delete Button */}
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteExam(exam)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={15} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Edit Exam Parameters Modal */}
      <Modal
        visible={editExamModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditExamModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Exam Settings</Text>
              <TouchableOpacity onPress={() => setEditExamModal(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Exam Title *</Text>
              <TextInput
                style={styles.modalInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Enter exam title..."
                placeholderTextColor={colors.textMuted}
                textAlign="left"
              />

              <Text style={styles.inputLabel}>Description / Instructions</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Instructions for students..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
                textAlign="left"
              />

              <View style={styles.inputGridRow}>
                <View style={styles.gridField}>
                  <Text style={styles.inputLabel}>Duration (min)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editDuration}
                    onChangeText={setEditDuration}
                    keyboardType="numeric"
                    textAlign="center"
                  />
                </View>

                <View style={styles.gridField}>
                  <Text style={styles.inputLabel}>Total Marks</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editMarks}
                    onChangeText={setEditMarks}
                    keyboardType="numeric"
                    textAlign="center"
                  />
                </View>

                <View style={styles.gridField}>
                  <Text style={styles.inputLabel}>Pass (%)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={editPassing}
                    onChangeText={setEditPassing}
                    keyboardType="numeric"
                    textAlign="center"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveExamEdit}
                disabled={savingEdit}
                activeOpacity={0.8}
              >
                {savingEdit ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Settings</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Questions Manager Modal */}
      <Modal
        visible={questionsModal}
        animationType="slide"
        onRequestClose={() => setQuestionsModal(false)}
      >
        <View style={styles.fullModalContainer}>
          {/* Modal Header */}
          <View style={styles.fullModalHeader}>
            <TouchableOpacity onPress={() => setQuestionsModal(false)} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <Text style={styles.fullModalTitle}>Exam Questions</Text>
              <Text style={styles.fullModalSubtitle} numberOfLines={1}>{selectedExam?.title}</Text>
            </View>
            <TouchableOpacity
              style={styles.addNewQuestionBtn}
              onPress={() => setShowAddQuestion(!showAddQuestion)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={showAddQuestion ? 'close' : 'add'}
                size={18}
                color="#FFF"
              />
              <Text style={styles.addNewQuestionText}>
                {showAddQuestion ? 'Cancel' : 'Add Question'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.questionsScrollContent}>
            {/* Add Question Inline Card */}
            {showAddQuestion && (
              <View style={styles.addQuestionCard}>
                <Text style={styles.addQuestionCardTitle}>New Question</Text>

                {/* Question Type Switcher */}
                <Text style={styles.inputLabel}>Question Type</Text>
                <View style={styles.typeSwitcherRow}>
                  <TouchableOpacity
                    style={[styles.typeBtn, questionType === 'mcq' && styles.typeBtnActive]}
                    onPress={() => setQuestionType('mcq')}
                  >
                    <Ionicons
                      name="list-circle-outline"
                      size={18}
                      color={questionType === 'mcq' ? '#FFF' : colors.textSecondary}
                    />
                    <Text style={[styles.typeBtnText, questionType === 'mcq' && styles.typeBtnTextActive]}>
                      Multiple Choice (MCQ)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.typeBtn, questionType === 'true_false' && styles.typeBtnActive]}
                    onPress={() => setQuestionType('true_false')}
                  >
                    <Ionicons
                      name="checkbox-outline"
                      size={18}
                      color={questionType === 'true_false' ? '#FFF' : colors.textSecondary}
                    />
                    <Text style={[styles.typeBtnText, questionType === 'true_false' && styles.typeBtnTextActive]}>
                      True / False
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Question Text *</Text>
                <TextInput
                  style={[styles.modalInput, styles.textArea]}
                  value={newQuestionText}
                  onChangeText={setNewQuestionText}
                  placeholder="Enter the question text here..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  textAlign="left"
                />

                {/* Diagram Image Picker */}
                <TouchableOpacity style={styles.diagramPickBtn} onPress={pickDiagram} activeOpacity={0.8}>
                  <Ionicons name="image-outline" size={20} color={colors.primaryLight} />
                  <Text style={styles.diagramPickText}>
                    {diagramImage ? 'Diagram selected (tap to change)' : 'Attach diagram or circuit image'}
                  </Text>
                </TouchableOpacity>

                {diagramImage && (
                  <Image source={{ uri: diagramImage.uri }} style={styles.diagramPreview} resizeMode="contain" />
                )}

                {/* If True / False */}
                {questionType === 'true_false' ? (
                  <View style={styles.tfContainer}>
                    <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                      Select the correct answer:
                    </Text>
                    <View style={styles.tfButtonGroup}>
                      <TouchableOpacity
                        style={[
                          styles.tfChoiceBtn,
                          tfCorrect === 'true' && styles.tfChoiceBtnTrueActive,
                        ]}
                        onPress={() => setTfCorrect('true')}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={tfCorrect === 'true' ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={tfCorrect === 'true' ? colors.success : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.tfChoiceBtnText,
                            tfCorrect === 'true' && { color: colors.success, fontWeight: 'bold' },
                          ]}
                        >
                          True (Correct)
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.tfChoiceBtn,
                          tfCorrect === 'false' && styles.tfChoiceBtnFalseActive,
                        ]}
                        onPress={() => setTfCorrect('false')}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={tfCorrect === 'false' ? 'close-circle' : 'ellipse-outline'}
                          size={22}
                          color={tfCorrect === 'false' ? colors.danger : colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.tfChoiceBtnText,
                            tfCorrect === 'false' && { color: colors.danger, fontWeight: 'bold' },
                          ]}
                        >
                          False (Incorrect)
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  /* If MCQ */
                  <View>
                    <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                      Multiple Choices (Select radio button for the correct choice):
                    </Text>

                    {[
                      { label: 'A', val: choiceA, setVal: setChoiceA, idx: 0 },
                      { label: 'B', val: choiceB, setVal: setChoiceB, idx: 1 },
                      { label: 'C', val: choiceC, setVal: setChoiceC, idx: 2 },
                      { label: 'D', val: choiceD, setVal: setChoiceD, idx: 3 },
                    ].map((item) => (
                      <View key={item.label} style={styles.choiceInputRow}>
                        <TouchableOpacity
                          style={[
                            styles.correctRadio,
                            correctChoiceIdx === item.idx && styles.correctRadioActive,
                          ]}
                          onPress={() => setCorrectChoiceIdx(item.idx)}
                        >
                          {correctChoiceIdx === item.idx && (
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          )}
                        </TouchableOpacity>
                        <Text style={styles.choiceLabel}>{item.label})</Text>
                        <TextInput
                          style={styles.choiceInput}
                          placeholder={`Option ${item.label}`}
                          placeholderTextColor={colors.textMuted}
                          value={item.val}
                          onChangeText={item.setVal}
                          textAlign="left"
                        />
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.marksRow}>
                  <Text style={styles.inputLabel}>Points for this question:</Text>
                  <TextInput
                    style={styles.marksInput}
                    value={questionMarks}
                    onChangeText={setQuestionMarks}
                    keyboardType="numeric"
                    textAlign="center"
                  />
                </View>

                <TouchableOpacity
                  style={styles.submitQuestionBtn}
                  onPress={handleAddQuestionToExam}
                  disabled={savingQuestion}
                  activeOpacity={0.8}
                >
                  {savingQuestion ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitQuestionBtnText}>Save Question to Exam</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Questions List */}
            {loadingQuestions ? (
              <ActivityIndicator color={colors.primaryLight} size="large" style={{ marginTop: 40 }} />
            ) : examQuestions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="help-circle-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No questions in this exam yet</Text>
                <Text style={styles.emptySub}>Tap "Add Question" above to add the first question</Text>
              </View>
            ) : (
              examQuestions.map((q, qIndex) => (
                <View key={q.id} style={styles.questionCard}>
                  <View style={styles.questionCardHeader}>
                    <View style={styles.questionIndexBadge}>
                      <Text style={styles.questionIndexText}>
                        Q{qIndex + 1} ({q.marks || 1} pt{q.marks > 1 ? 's' : ''})
                      </Text>
                      {q.question_type === 'true_false' && (
                        <View style={styles.tfBadgeSmall}>
                          <Text style={styles.tfBadgeSmallText}>T / F</Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.deleteQuestionBtn}
                      onPress={() => handleDeleteQuestion(q)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                      <Text style={styles.deleteQuestionText}>Delete</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.questionCardText}>{q.question_text}</Text>

                  {q.image_url ? (
                    <Image
                      source={{
                        uri: q.image_url.startsWith('http')
                          ? q.image_url
                          : `${serverUrl}${q.image_url}`,
                      }}
                      style={styles.serverDiagramImage}
                      resizeMode="contain"
                    />
                  ) : null}

                  {/* Choices list */}
                  <View style={styles.choicesWrap}>
                    {q.choices?.map((c, cIndex) => (
                      <View
                        key={c.id || cIndex}
                        style={[
                          styles.choiceItem,
                          c.is_correct && styles.correctChoiceItem,
                        ]}
                      >
                        {c.is_correct ? (
                          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                        ) : (
                          <Ionicons name="ellipse-outline" size={14} color={colors.textMuted} />
                        )}
                        <Text
                          style={[
                            styles.choiceItemText,
                            c.is_correct && styles.correctChoiceItemText,
                          ]}
                        >
                          {c.choice_text}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
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
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    textAlign: 'left',
  },
  infoBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  infoText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'left',
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
    textAlign: 'center',
  },
  examCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cardHeaderRow: {
    flexDirection: 'row',
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
  examId: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: 'monospace',
  },
  examTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'left',
    marginTop: 4,
  },
  examDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'left',
    marginTop: 4,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  metaItem: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  controlLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  btnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  questionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
  },
  questionsBtnText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: 'bold',
  },
  editBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
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
    flexDirection: 'row',
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
    textAlign: 'left',
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
  inputGridRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  gridField: {
    flex: 1,
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

  // Full Screen Questions Modal
  fullModalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fullModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  fullModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  fullModalSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  addNewQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addNewQuestionText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  questionsScrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  addQuestionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
  },
  addQuestionCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primaryLight,
    textAlign: 'left',
    marginBottom: 10,
  },
  typeSwitcherRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryLight,
  },
  typeBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  tfContainer: {
    marginTop: 6,
  },
  tfButtonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  tfChoiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.background,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.surfaceBorder,
  },
  tfChoiceBtnTrueActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: colors.success,
  },
  tfChoiceBtnFalseActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: colors.danger,
  },
  tfChoiceBtnText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  diagramPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  diagramPickText: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: '500',
  },
  diagramPreview: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginTop: 10,
    backgroundColor: '#000',
  },
  choiceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  choiceInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
    color: colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  choiceLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textPrimary,
    width: 20,
  },
  correctRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctRadioActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  marksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  marksInput: {
    width: 60,
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 8,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  submitQuestionBtn: {
    backgroundColor: colors.success,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitQuestionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  questionCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  questionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  questionIndexBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  questionIndexText: {
    fontSize: 12,
    color: colors.primaryLight,
    fontWeight: 'bold',
  },
  tfBadgeSmall: {
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tfBadgeSmallText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: 'bold',
  },
  deleteQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  deleteQuestionText: {
    fontSize: 11,
    color: colors.danger,
  },
  questionCardText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'left',
    lineHeight: 20,
  },
  serverDiagramImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 10,
    backgroundColor: '#000',
  },
  choicesWrap: {
    marginTop: 10,
    gap: 6,
  },
  choiceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  correctChoiceItem: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  choiceItemText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'left',
  },
  correctChoiceItemText: {
    color: colors.success,
    fontWeight: 'bold',
  },
});
