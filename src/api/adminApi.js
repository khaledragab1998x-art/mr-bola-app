import { apiRequest } from './client';

// ============================================
// Lessons & Chapters
// ============================================

export async function uploadLessonVideoApi(formData, onProgress) {
  return apiRequest('/api/admin/upload-video', {
    method: 'POST',
    body: formData,
    onProgress,
  });
}

export async function getVideoProgressApi(lessonId) {
  return apiRequest(`/api/admin/video-progress/${lessonId}`, {
    method: 'GET',
  });
}

export async function getAllLessonsAdminApi() {
  return apiRequest('/api/admin/lessons', {
    method: 'GET',
  });
}

export async function updateLessonApi(lessonId, data) {
  return apiRequest(`/api/admin/lessons/${lessonId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function toggleLessonPublishApi(lessonId) {
  return apiRequest(`/api/admin/lessons/${lessonId}/toggle-publish`, {
    method: 'PATCH',
  });
}

export async function deleteLessonApi(lessonId) {
  return apiRequest(`/api/admin/lessons/${lessonId}`, {
    method: 'DELETE',
  });
}

export async function createChapterApi(title, description, orderIndex = 1) {
  return apiRequest('/api/admin/chapters', {
    method: 'POST',
    body: JSON.stringify({ title, description, order_index: orderIndex }),
  });
}

export async function deleteChapterApi(chapterId) {
  return apiRequest(`/api/admin/chapters/${chapterId}`, {
    method: 'DELETE',
  });
}

// PDF Management for Lessons
export async function uploadLessonPdfApi(lessonId, formData) {
  return apiRequest(`/api/admin/lessons/${lessonId}/pdf`, {
    method: 'POST',
    body: formData,
  });
}

export async function deleteLessonPdfApi(lessonId) {
  return apiRequest(`/api/admin/lessons/${lessonId}/pdf`, {
    method: 'DELETE',
  });
}

// Lesson Unlock Codes Management
export async function getLessonCodesApi(lessonId) {
  return apiRequest(`/api/admin/lessons/${lessonId}/codes`, {
    method: 'GET',
  });
}

export async function generateLessonCodesApi(lessonId, count = 10, prefix = 'MP') {
  return apiRequest(`/api/admin/lessons/${lessonId}/codes/generate`, {
    method: 'POST',
    body: JSON.stringify({ count, prefix }),
  });
}

export async function deleteLessonCodeApi(codeId) {
  return apiRequest(`/api/admin/codes/${codeId}`, {
    method: 'DELETE',
  });
}

// ============================================
// Exams & Questions
// ============================================

export async function getAllExamsAdminApi() {
  return apiRequest('/api/admin/exams', {
    method: 'GET',
  });
}

export async function getExamDetailsAdminApi(examId) {
  return apiRequest(`/api/admin/exams/${examId}/details`, {
    method: 'GET',
  });
}

export async function createExamApi(chapterId, title, description, durationMinutes, totalMarks, isPublished = true) {
  return apiRequest('/api/admin/exams', {
    method: 'POST',
    body: JSON.stringify({
      chapter_id: chapterId,
      title,
      description,
      duration_minutes: durationMinutes,
      total_marks: totalMarks,
      is_published: isPublished
    }),
  });
}

export async function updateExamApi(examId, data) {
  return apiRequest(`/api/admin/exams/${examId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function addQuestionApi(examId, formData) {
  return apiRequest(`/api/admin/exams/${examId}/questions`, {
    method: 'POST',
    body: formData,
  });
}

export async function deleteQuestionApi(questionId) {
  return apiRequest(`/api/admin/exams/questions/${questionId}`, {
    method: 'DELETE',
  });
}

export async function toggleExamPublishApi(examId) {
  return apiRequest(`/api/admin/exams/${examId}/toggle-publish`, {
    method: 'PATCH',
  });
}

export async function deleteExamApi(examId) {
  return apiRequest(`/api/admin/exams/${examId}`, {
    method: 'DELETE',
  });
}

// ============================================
// Courses & Course Videos
// ============================================

export async function getAllCoursesAdminApi() {
  return apiRequest('/api/admin/courses', {
    method: 'GET',
  });
}

export async function getCourseDetailsAdminApi(courseId) {
  return apiRequest(`/api/admin/courses/${courseId}`, {
    method: 'GET',
  });
}

export async function createCourseApi(formData) {
  return apiRequest('/api/admin/courses', {
    method: 'POST',
    body: formData,
  });
}

export async function updateCourseApi(courseId, formData) {
  return apiRequest(`/api/admin/courses/${courseId}`, {
    method: 'PUT',
    body: formData,
  });
}

export async function toggleCoursePublishApi(courseId) {
  return apiRequest(`/api/admin/courses/${courseId}/toggle-publish`, {
    method: 'PATCH',
  });
}

export async function deleteCourseApi(courseId) {
  return apiRequest(`/api/admin/courses/${courseId}`, {
    method: 'DELETE',
  });
}

export async function uploadCourseVideoApi(courseId, formData, onProgress) {
  return apiRequest(`/api/admin/courses/${courseId}/videos`, {
    method: 'POST',
    body: formData,
    onProgress,
  });
}

export async function getCourseVideoProgressApi(videoId) {
  return apiRequest(`/api/admin/courses/videos/${videoId}/progress`, {
    method: 'GET',
  });
}

export async function updateCourseVideoApi(videoId, data) {
  return apiRequest(`/api/admin/courses/videos/${videoId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCourseVideoApi(videoId) {
  return apiRequest(`/api/admin/courses/videos/${videoId}`, {
    method: 'DELETE',
  });
}

// ============================================
// Platform Analytics, Settings, & Students
// ============================================

export async function getPlatformStatsApi() {
  return apiRequest('/api/admin/stats', {
    method: 'GET',
  });
}

export async function getStudentsListApi(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return apiRequest(`/api/admin/students${query}`, {
    method: 'GET',
  });
}

export async function toggleEmailVerificationApi(requireVerification) {
  return apiRequest('/api/admin/settings/email-verification', {
    method: 'POST',
    body: JSON.stringify({ require_verification: requireVerification }),
  });
}

export async function resetStudentDeviceApi(studentId) {
  return apiRequest('/api/admin/students/reset-device', {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId }),
  });
}

export async function toggleStudentBlockApi(studentId) {
  return apiRequest('/api/admin/students/toggle-block', {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId }),
  });
}
