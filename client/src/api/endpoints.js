import api from './axios.js';

/**
 * Thin, typed-ish wrappers around every backend endpoint. Each returns the
 * `data` field of the success envelope (or the whole body when meta is needed).
 * Components/hooks call these instead of axios directly.
 */
const unwrap = (res) => res.data?.data;
const full = (res) => res.data; // { success, data, meta }

// ---- Auth ----
export const authApi = {
  login: (body) => api.post('/auth/login', body).then(unwrap),
  logout: () => api.post('/auth/logout').then(unwrap),
  me: () => api.get('/auth/me').then(unwrap),
  verifyPassword: (password) => api.post('/auth/verify-password', { password }).then(unwrap),
};

// ---- Dashboard ----
export const dashboardApi = {
  stats: (yearId) => api.get('/dashboard/stats', { params: { yearId } }).then(unwrap),
};

// ---- Students ----
export const studentApi = {
  list: (params) => api.get('/students', { params }).then(full),
  get: (id) => api.get(`/students/${id}`).then(unwrap),
  create: (body) => api.post('/students', body).then(unwrap),
  update: (id, body) => api.put(`/students/${id}`, body).then(unwrap),
  updateSiblings: (id, body) => api.put(`/students/${id}/siblings`, body).then(unwrap),
  remove: (id) => api.delete(`/students/${id}`).then(unwrap),
  fees: (id, academicYearId) => api.get(`/students/${id}/fees`, { params: { academicYearId } }).then(unwrap),
  receipts: (id, type) => api.get(`/students/${id}/receipts`, { params: type ? { type } : {} }).then(unwrap),
  history: (id) => api.get(`/students/${id}/history`).then(unwrap),
};

// ---- Fees ----
export const feeApi = {
  list: (params) => api.get('/fees', { params }).then(full),
  overview: (params) => api.get('/fees/overview', { params }).then(unwrap),
  collect: (feeRecordId, body) => api.post(`/fees/${feeRecordId}/collect`, body).then(unwrap),
  edit: (feeRecordId, body) => api.put(`/fees/${feeRecordId}/edit`, body).then(unwrap),
  bulkCollect: (body) => api.post('/fees/bulk-collect', body).then(unwrap),
  adjustFees: (body) => api.post('/fees/adjust', body).then(unwrap),
  familyFees: (params) => api.get('/fees/family', { params }).then(unwrap),
  familyCollect: (body) => api.post('/fees/family-collect', body).then(unwrap),
  reminders: (body) => api.post('/fees/reminders', body).then(unwrap),
};

// ---- Routes ----
export const routeApi = {
  list: (params) => api.get('/routes', { params }).then(unwrap),
  get: (id, params) => api.get(`/routes/${id}`, { params }).then(unwrap),
  create: (body) => api.post('/routes', body).then(unwrap),
  update: (id, body) => api.put(`/routes/${id}`, body).then(unwrap),
  remove: (id, force) => api.delete(`/routes/${id}`, { params: force ? { force: true } : {} }).then(unwrap),
};

// ---- Buses ----
export const busApi = {
  list: () => api.get('/buses').then(unwrap),
  create: (body) => api.post('/buses', body).then(unwrap),
  update: (id, body) => api.put(`/buses/${id}`, body).then(unwrap),
  remove: (id, force) => api.delete(`/buses/${id}`, { params: force ? { force: true } : {} }).then(unwrap),
};

// ---- Sub Admins / Users ----
export const userApi = {
  listSubAdmins: () => api.get('/users/subadmins').then(unwrap),
  createSubAdmin: (body) => api.post('/users/subadmins', body).then(unwrap),
  updateSubAdmin: (id, body) => api.put(`/users/subadmins/${id}`, body).then(unwrap),
  removeSubAdmin: (id) => api.delete(`/users/subadmins/${id}`).then(unwrap),
  resetPassword: (id, newPassword) => api.post(`/users/subadmins/${id}/reset-password`, { newPassword }).then(unwrap),
  changeOwnPassword: (body) => api.post('/users/me/password', body).then(unwrap),
  updateOwnProfile: (body) => api.put('/users/me/profile', body).then(unwrap),
};

// ---- Academic Years & Promotion ----
export const yearApi = {
  list: () => api.get('/academic-years').then(unwrap),
  create: (body) => api.post('/academic-years', body).then(unwrap),
  update: (id, body) => api.put(`/academic-years/${id}`, body).then(unwrap),
  delete: (id) => api.delete(`/academic-years/${id}`).then(unwrap),
  setCurrent: (id) => api.post(`/academic-years/${id}/set-current`).then(unwrap),
  archive: (id) => api.post(`/academic-years/${id}/archive`).then(unwrap),
  promote: (body) => api.post('/academic-years/promote', body).then(unwrap),
};

// ---- Receipts ----
export const receiptApi = {
  list: (params) => api.get('/receipts', { params }).then(full),
  get: (id) => api.get(`/receipts/${id}`).then(unwrap),
  markPrinted: (id) => api.post(`/receipts/${id}/printed`).then(unwrap),
};

// ---- Notifications ----
export const notificationApi = {
  list: (params) => api.get('/notifications', { params }).then(full),
  markRead: (id) => api.post(`/notifications/${id}/read`).then(unwrap),
  markAllRead: () => api.post('/notifications/read-all').then(unwrap),
};

// ---- Reports ----
export const reportApi = {
  financialMonthly: (yearId) => api.get('/reports/financial/monthly', { params: { yearId } }).then(unwrap),
  financialRouteWise: (params) => api.get('/reports/financial/route-wise', { params }).then(unwrap),
  financialPending: (params) => api.get('/reports/financial/pending', { params }).then(unwrap),
  yearComparison: () => api.get('/reports/financial/year-comparison').then(unwrap),
  studentsByClass: (yearId) => api.get('/reports/students/by-class', { params: { yearId } }).then(unwrap),
  studentsRouteWise: (yearId) => api.get('/reports/students/route-wise', { params: { yearId } }).then(unwrap),
  admissions: (yearId) => api.get('/reports/students/admissions', { params: { yearId } }).then(unwrap),
  alumni: () => api.get('/reports/students/alumni').then(unwrap),
  dailyCollection: (date) => api.get('/reports/daily-collection', { params: { date } }).then(unwrap),
  verifyCollection: (body) => api.post('/reports/verify-collection', body).then(unwrap),
};

// ---- Archive ----
export const archiveApi = {
  years: () => api.get('/archive/years').then(unwrap),
  year: (id, params) => api.get(`/archive/years/${id}`, { params }).then(full),
  student: (yearId, studentId) => api.get(`/archive/years/${yearId}/students/${studentId}`).then(unwrap),
};

// ---- Settings ----
export const settingsApi = {
  get: () => api.get('/settings').then(unwrap),
  update: (body) => api.put('/settings', body).then(unwrap),
  activityLogs: (params) => api.get('/settings/activity-logs', { params }).then(full),
};
