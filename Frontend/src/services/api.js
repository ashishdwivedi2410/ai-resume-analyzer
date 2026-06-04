import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 60000,
})

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — handle 401 with token refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (refreshToken) {
          const res = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refresh_token: refreshToken }
          )
          const { access_token } = res.data
          localStorage.setItem('access_token', access_token)
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
          original.headers.Authorization = `Bearer ${access_token}`
          return api(original)
        }
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: (data) => api.post('/auth/refresh', data),
}

// ── Resumes ───────────────────────────────────────────────────────────────
export const resumeAPI = {
  upload: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/resume/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadBatch: (files) => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f))
    return api.post('/resume/upload/batch', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  list: () => api.get('/resume/'),
  get: (id) => api.get(`/resume/${id}`),
  delete: (id) => api.delete(`/resume/${id}`),
}

// ── Analysis ──────────────────────────────────────────────────────────────
export const analyzeAPI = {
  single: (data) => api.post('/analyze/single', data),
  batch: (data) => api.post('/analyze/batch', data),
  getResult: (id) => api.get(`/analyze/results/${id}`),
  getRankings: () => api.get('/analyze/rankings'),
  deleteResult: (id) => api.delete(`/analyze/results/${id}`),
}

export default api
