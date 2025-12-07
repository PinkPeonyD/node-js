const API_BASE = (
  import.meta.env.VITE_API_BASE || 'http://localhost:3001'
).replace(/\/$/, '');

async function request(path, options = {}) {
  const { body, headers = {}, ...rest } = options;
  const init = {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  };

  const response = await fetch(`${API_BASE}${path}`, init);
  const isJson = response.headers
    .get('content-type')
    ?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    const message =
      (isJson && (data?.error || data?.message)) || response.statusText;
    throw new Error(message || 'Request failed');
  }
  return data;
}

export const api = {
  getStudents() {
    return request('/api/students');
  },
  createStudent(payload) {
    return request('/api/students', { method: 'POST', body: payload });
  },
  updateStudent(id, payload) {
    return request(`/api/students/${id}`, { method: 'PUT', body: payload });
  },
  deleteStudent(id) {
    return request(`/api/students/${id}`, { method: 'DELETE' });
  },
  replaceStudents(list) {
    return request('/api/students', { method: 'PUT', body: list });
  },
  getGroup(id) {
    return request(`/api/students/group/${encodeURIComponent(id)}`);
  },
  getAverageAge() {
    return request('/api/students/average-age');
  },
  saveStudents() {
    return request('/api/students/save', { method: 'POST' });
  },
  loadStudents() {
    return request('/api/students/load', { method: 'POST' });
  },
  startBackup() {
    return request('/api/backup/start', { method: 'POST' });
  },
  stopBackup() {
    return request('/api/backup/stop', { method: 'POST' });
  },
  backupStatus() {
    return request('/api/backup/status');
  },
};

export { API_BASE };
