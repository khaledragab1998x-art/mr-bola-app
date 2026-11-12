import { apiRequest } from './client';

export async function getExamsListApi() {
  return apiRequest('/api/exams', {
    method: 'GET',
  });
}

export async function getExamForTakingApi(examId) {
  return apiRequest(`/api/exams/${examId}`, {
    method: 'GET',
  });
}

export async function submitExamApi(examId, submissionId, answers) {
  return apiRequest(`/api/exams/${examId}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      submission_id: submissionId,
      answers: answers
    }),
  });
}

export async function reportViolationApi(submissionId, violationType) {
  return apiRequest('/api/exams/violation', {
    method: 'POST',
    body: JSON.stringify({
      submission_id: submissionId,
      violation_type: violationType
    }),
  });
}
