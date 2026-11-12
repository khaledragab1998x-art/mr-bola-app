import { apiRequest } from './client';

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

export async function deleteLessonApi(lessonId) {
  return apiRequest(`/api/admin/lessons/${lessonId}`, {
    method: 'DELETE',
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

export async function addQuestionApi(examId, formData) {
  return apiRequest(`/api/admin/exams/${examId}/questions`, {
    method: 'POST',
    body: formData,
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
