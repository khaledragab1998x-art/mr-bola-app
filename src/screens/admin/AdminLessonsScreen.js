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
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../../theme/colors';
import {
  getAllLessonsAdminApi,
  updateLessonApi,
  toggleLessonPublishApi,
  deleteLessonApi,
  uploadLessonPdfApi,
  deleteLessonPdfApi,
  getLessonCodesApi,
  generateLessonCodesApi,
  deleteLessonCodeApi,
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

  // PDF Uploading
  const [uploadingPdfLessonId, setUploadingPdfLessonId] = useState(null);

  // Codes Management Modal State
  const [codesModalVisible, setCodesModalVisible] = useState(false);
  const [selectedLessonForCodes, setSelectedLessonForCodes] = useState(null);
  const [lessonCodesList, setLessonCodesList] = useState([]);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [generatingCodes, setGeneratingCodes] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      let lessonsList = [];
      let chaptersList = [];

      try {
        const res = await getAllLessonsAdminApi();
        if (res && res.success && Array.isArray(res.data)) {
          lessonsList = res.data;
        }
      } catch (adminErr) {
        console.warn('Admin lessons endpoint error:', adminErr?.message);
      }

      const chaptersRes = await getChaptersWithLessonsApi().catch(() => ({ data: [], lessons: [] }));
      if (chaptersRes) {
        if (Array.isArray(chaptersRes.data)) {
          chaptersList = chaptersRes.data;
        }

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
      console.warn('Load lessons error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleTogglePublish(lesson) {
    const originalStatus = lesson.is_published;
    setLessons((prev) =>
      prev.map((l) => (l.id === lesson.id ? { ...l, is_published: !originalStatus } : l))
    );

    try {
      const res = await toggleLessonPublishApi(lesson.id);
      if (!res.success) {
        setLessons((prev) =>
          prev.map((l) => (l.id === lesson.id ? { ...l, is_published: originalStatus } : l))
        );
        Alert.alert('Error', 'Failed to toggle publish status');
      }
    } catch (e) {
      setLessons((prev) =>
        prev.map((l) => (l.id === lesson.id ? { ...l, is_published: originalStatus } : l))
      );
      Alert.alert('Error', 'Cannot connect to server');
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
      Alert.alert('Notice', 'Lesson title is required');
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
        Alert.alert('Success', 'Lesson details updated successfully');
        setEditModalVisible(false);
        loadData();
      } else {
        Alert.alert('Error', res.message || 'Update failed');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not save changes');
    } finally {
      setSavingEdit(false);
    }
  }

  function handleDeleteLesson(lesson) {
    Alert.alert(
      'Delete Lesson',
      `Are you sure you want to delete "${lesson.title}" and all its uploaded video files and codes? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteLessonApi(lesson.id);
              if (res.success) {
                Alert.alert('Deleted', 'Lesson deleted successfully');
                setLessons((prev) => prev.filter((l) => l.id !== lesson.id));
              } else {
                Alert.alert('Error', res.message || 'Failed to delete lesson');
              }
            } catch (e) {
              Alert.alert('Error', 'Failed to delete lesson');
            }
          },
        },
      ]
    );
  }

  // --- PDF Attachment Handlers ---
  async function handlePickAndUploadPdf(lesson) {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setUploadingPdfLessonId(lesson.id);

      const formData = new FormData();
      formData.append('pdf', {
        uri: asset.uri,
        name: asset.name || 'lesson_sheet.pdf',
        type: 'application/pdf',
      });

      const res = await uploadLessonPdfApi(lesson.id, formData);
      if (res.success) {
        Alert.alert('Success', 'PDF attached to lesson successfully.');
        loadData();
      } else {
        Alert.alert('Upload Failed', res.message || 'Could not upload PDF');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to pick or upload PDF');
    } finally {
      setUploadingPdfLessonId(null);
    }
  }

  async function handleDeletePdf(lesson) {
    Alert.alert(
      'Remove PDF',
      `Are you sure you want to remove the attached PDF from "${lesson.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteLessonPdfApi(lesson.id);
              if (res.success) {
                Alert.alert('Success', 'PDF removed from lesson');
                loadData();
              } else {
                Alert.alert('Error', res.message || 'Failed to remove PDF');
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'Network error');
            }
          },
        },
      ]
    );
  }

  // --- Codes Management Handlers ---
  function openCodesModal(lesson) {
    setSelectedLessonForCodes(lesson);
    setCodesModalVisible(true);
    fetchLessonCodes(lesson.id);
  }

  async function fetchLessonCodes(lessonId) {
    setLoadingCodes(true);
    try {
      const res = await getLessonCodesApi(lessonId);
      if (res.success) {
        setLessonCodesList(res.data || []);
      } else {
        Alert.alert('Error', res.message || 'Failed to load codes');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not load codes from server');
    } finally {
      setLoadingCodes(false);
    }
  }

  async function handleGenerateCodes(count) {
    if (!selectedLessonForCodes) return;
    setGeneratingCodes(true);
    try {
      const res = await generateLessonCodesApi(selectedLessonForCodes.id, count);
      if (res.success) {
        Alert.alert('Success', `Generated ${count} new activation codes!`);
        fetchLessonCodes(selectedLessonForCodes.id);
        loadData();
      } else {
        Alert.alert('Error', res.message || 'Failed to generate codes');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to generate codes');
    } finally {
      setGeneratingCodes(false);
    }
  }

  async function handleShareUnusedCodes() {
    const unused = lessonCodesList.filter((c) => !c.is_used);
    if (unused.length === 0) {
      Alert.alert('Notice', 'No unused codes available to share.');
      return;
    }
    const codesText =
      `Activation Codes for "${selectedLessonForCodes?.title}":\n\n` +
      unused.map((c, i) => `${i + 1}. ${c.code}`).join('\n') +
      `\n\nMr.Poula Malak - Physics Platform`;

    try {
      await Share.share({
        title: `Activation Codes - ${selectedLessonForCodes?.title}`,
        message: codesText,
      });
    } catch (err) {
      console.log('Share error:', err);
    }
  }

  async function handleDeleteCode(codeItem) {
    Alert.alert(
      'Delete Code',
      `Are you sure you want to delete code "${codeItem.code}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await deleteLessonCodeApi(codeItem.id);
              if (res.success) {
                setLessonCodesList((prev) => prev.filter((c) => c.id !== codeItem.id));
                loadData();
              } else {
                Alert.alert('Error', res.message || 'Failed to delete code');
              }
            } catch (err) {
              Alert.alert('Error', 'Could not delete code');
            }
          },
        },
      ]
    );
  }

  function formatDuration(seconds) {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs} min`;
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
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Lessons</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('AdminVideoUpload')}
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
          placeholder="Search lessons or chapters..."
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
          Total Lessons: {filteredLessons.length} of {lessons.length}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primaryLight} size="large" style={{ marginTop: 40 }} />
      ) : filteredLessons.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="film-outline" size={56} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No matching lessons</Text>
          <Text style={styles.emptySub}>
            {searchQuery ? 'Try a different search term' : 'No lessons uploaded yet'}
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
                        ? 'Ready'
                        : lesson.status === 'processing'
                        ? `Encoding (${lesson.processing_progress}%)`
                        : 'Failed'}
                    </Text>
                  </View>

                  {Boolean(lesson.is_free_preview) ? (
                    <View style={styles.freeBadge}>
                      <Text style={styles.freeBadgeText}>Free Preview</Text>
                    </View>
                  ) : (
                    <View style={styles.paidBadge}>
                      <Text style={styles.paidBadgeText}>Premium (Code)</Text>
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
                  <Text style={styles.metaText}>{lesson.comments_count || 0} comments</Text>
                </View>
              </View>

              {/* Optional PDF Info & Actions */}
              <View style={styles.featureRow}>
                <View style={styles.featureItem}>
                  <Ionicons name="document-text-outline" size={16} color={lesson.pdf_url ? colors.accent : colors.textMuted} />
                  <Text style={[styles.featureText, lesson.pdf_url && { color: colors.accent, fontWeight: 'bold' }]} numberOfLines={1}>
                    {lesson.pdf_url ? (lesson.pdf_name || 'PDF Sheet Attached') : 'No PDF attached'}
                  </Text>
                </View>

                <View style={styles.featureBtnGroup}>
                  {uploadingPdfLessonId === lesson.id ? (
                    <ActivityIndicator size="small" color={colors.primaryLight} />
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.pdfActionBtn}
                        onPress={() => handlePickAndUploadPdf(lesson)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="cloud-upload-outline" size={14} color={colors.primaryLight} />
                        <Text style={styles.pdfActionBtnText}>{lesson.pdf_url ? 'Replace' : 'Attach PDF'}</Text>
                      </TouchableOpacity>

                      {lesson.pdf_url ? (
                        <TouchableOpacity
                          style={styles.pdfDeleteBtn}
                          onPress={() => handleDeletePdf(lesson)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close-circle-outline" size={14} color={colors.danger} />
                        </TouchableOpacity>
                      ) : null}
                    </>
                  )}
                </View>
              </View>

              {/* Codes Row */}
              <View style={styles.featureRow}>
                <View style={styles.featureItem}>
                  <Ionicons name="key-outline" size={16} color={colors.gold} />
                  <Text style={styles.featureText}>
                    Codes: <Text style={{ color: colors.gold, fontWeight: 'bold' }}>{lesson.unused_codes_count ?? 0}</Text> unused / {lesson.total_codes_count ?? 0} total
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.codesManageBtn}
                  onPress={() => openCodesModal(lesson)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="key" size={14} color="#FFF" />
                  <Text style={styles.codesManageBtnText}>Codes</Text>
                </TouchableOpacity>
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
                    {lesson.is_published ? 'Published' : 'Draft (Hidden)'}
                  </Text>
                </View>

                {/* Buttons: Edit & Delete */}
                <View style={styles.btnGroup}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => openEditModal(lesson)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pencil" size={15} color={colors.primaryLight} />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => handleDeleteLesson(lesson)}
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
              <Text style={styles.modalTitle}>Edit Lesson Details</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Lesson Title *</Text>
              <TextInput
                style={styles.modalInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Enter lesson title..."
                placeholderTextColor={colors.textMuted}
                textAlign="left"
              />

              <Text style={styles.inputLabel}>Description / Notes</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Enter lesson description..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlign="left"
              />

              <Text style={styles.inputLabel}>Chapter / Unit</Text>
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
                    No Chapter
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
                <Text style={styles.modalToggleLabel}>Free Preview (Unlocked for all students)</Text>
                <Switch
                  value={editIsFree}
                  onValueChange={setEditIsFree}
                  trackColor={{ false: colors.surfaceBorder, true: colors.accent }}
                  thumbColor={editIsFree ? '#fff' : '#94A3B8'}
                />
              </View>

              <View style={styles.modalToggleRow}>
                <Text style={styles.modalToggleLabel}>Published in student lessons list</Text>
                <Switch
                  value={editIsPublished}
                  onValueChange={setEditIsPublished}
                  trackColor={{ false: colors.surfaceBorder, true: colors.primary }}
                  thumbColor={editIsPublished ? colors.accent : '#94A3B8'}
                />
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
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Codes Management Modal */}
      <Modal
        visible={codesModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCodesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Lesson Activation Codes</Text>
                <Text style={styles.modalSubTitle} numberOfLines={1}>
                  {selectedLessonForCodes?.title}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCodesModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Quick Generator Actions */}
            <View style={styles.generateRow}>
              <Text style={styles.generateLabel}>Generate New Codes:</Text>
              <View style={styles.generateBtnGroup}>
                <TouchableOpacity
                  style={styles.genBtn}
                  onPress={() => handleGenerateCodes(10)}
                  disabled={generatingCodes}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#FFF" />
                  <Text style={styles.genBtnText}>+10 Codes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.genBtn, { backgroundColor: colors.accent }]}
                  onPress={() => handleGenerateCodes(50)}
                  disabled={generatingCodes}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#000" />
                  <Text style={[styles.genBtnText, { color: '#000' }]}>+50 Codes</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Share / Copy Unused Button */}
            <TouchableOpacity
              style={styles.shareAllBtn}
              onPress={handleShareUnusedCodes}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={18} color="#FFF" />
              <Text style={styles.shareAllBtnText}>Share / Copy All Unused Codes</Text>
            </TouchableOpacity>

            {/* Codes List */}
            {loadingCodes || generatingCodes ? (
              <ActivityIndicator color={colors.primaryLight} size="large" style={{ marginVertical: 30 }} />
            ) : lessonCodesList.length === 0 ? (
              <View style={styles.emptyCodesBox}>
                <Ionicons name="key-outline" size={40} color={colors.textMuted} />
                <Text style={styles.emptyCodesText}>No activation codes created yet.</Text>
                <Text style={styles.emptyCodesSub}>Tap "+10 Codes" to generate your first batch.</Text>
              </View>
            ) : (
              <ScrollView style={styles.codesListScroll} contentContainerStyle={{ paddingBottom: 20 }}>
                {lessonCodesList.map((c) => (
                  <View key={c.id} style={styles.codeItemRow}>
                    <View style={styles.codeItemLeft}>
                      <Text style={[styles.codeText, c.is_used && styles.codeUsedText]}>{c.code}</Text>
                      <View style={[styles.codeStatusBadge, c.is_used ? styles.codeUsedBadge : styles.codeActiveBadge]}>
                        <Text style={[styles.codeStatusBadgeText, c.is_used ? styles.codeUsedBadgeText : styles.codeActiveBadgeText]}>
                          {c.is_used ? `Used by ${c.used_by_student_name || 'Student'}` : 'Unused'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.codeDeleteBtn}
                      onPress={() => handleDeleteCode(c)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
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
  },
  lessonCard: {
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
  statusBadgeWrap: {
    flexDirection: 'row',
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
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freeBadgeText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: '700',
  },
  paidBadge: {
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  paidBadgeText: {
    fontSize: 10,
    color: colors.gold,
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
    textAlign: 'left',
    marginTop: 4,
  },
  chapterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  chapterTagText: {
    fontSize: 12,
    color: colors.primaryLight,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  featureText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  featureBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pdfActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pdfActionBtnText: {
    fontSize: 11,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  pdfDeleteBtn: {
    padding: 4,
  },
  codesManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  codesManageBtnText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: 'bold',
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
    gap: 8,
  },
  controlLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  btnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    flexDirection: 'row',
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
  modalSubTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
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
    flexDirection: 'row',
    marginVertical: 6,
  },
  chapterChoice: {
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
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
    flexDirection: 'row',
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
  // Codes Modal Specific
  generateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 14,
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 12,
  },
  generateLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  generateBtnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  genBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  genBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  shareAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    borderWidth: 1,
    borderColor: colors.primaryLight,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  shareAllBtnText: {
    color: colors.primaryLight,
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyCodesBox: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyCodesText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyCodesSub: {
    color: colors.textMuted,
    fontSize: 12,
  },
  codesListScroll: {
    maxHeight: 350,
  },
  codeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  codeItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  codeUsedText: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  codeStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeActiveBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  codeActiveBadgeText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: 'bold',
  },
  codeUsedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  codeUsedBadgeText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: 'bold',
  },
  codeDeleteBtn: {
    padding: 6,
  },
});
