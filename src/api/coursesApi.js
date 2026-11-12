import { apiRequest } from './client';

export async function getCoursesListApi() {
  return apiRequest('/api/courses', {
    method: 'GET',
  });
}

export async function getCourseDetailsApi(courseId) {
  return apiRequest(`/api/courses/${courseId}`, {
    method: 'GET',
  });
}

export async function getCourseVideoStreamingApi(courseId, videoId) {
  return apiRequest(`/api/courses/${courseId}/videos/${videoId}`, {
    method: 'GET',
  });
}
