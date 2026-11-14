import { apiRequest } from './client';

export async function getChaptersWithLessonsApi() {
  return apiRequest('/api/lessons/chapters', {
    method: 'GET',
  });
}

export async function getLessonDetailsApi(lessonId) {
  return apiRequest(`/api/lessons/${lessonId}`, {
    method: 'GET',
  });
}

export async function getLessonCommentsApi(lessonId) {
  return apiRequest(`/api/lessons/${lessonId}/comments`, {
    method: 'GET',
  });
}

export async function addLessonCommentApi(lessonId, commentText) {
  return apiRequest(`/api/lessons/${lessonId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ comment_text: commentText }),
  });
}

export async function deleteLessonCommentApi(lessonId, commentId) {
  return apiRequest(`/api/lessons/${lessonId}/comments/${commentId}`, {
    method: 'DELETE',
  });
}

export async function redeemLessonCodeApi(code, lessonId = null) {
  return apiRequest('/api/lessons/redeem-code', {
    method: 'POST',
    body: JSON.stringify({ code, lesson_id: lessonId }),
  });
}
