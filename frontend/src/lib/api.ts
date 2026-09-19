import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const userId = localStorage.getItem('user_id');
      if (userId) {
        config.headers['X-User-ID'] = userId;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/api/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token } = response.data;
          localStorage.setItem('access_token', access_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  register: (data: {
    username: string;
    email: string;
    phone_number: string;
    password: string;
    display_name: string;
  }) => api.post('/api/auth/register', data),

  login: (identifier: string, password: string) =>
    api.post('/api/auth/login', { identifier, password }),

  logout: () => api.post('/api/auth/logout'),

  refreshToken: (refresh_token: string) =>
    api.post('/api/auth/refresh', { refresh_token }),

  getProfile: () => api.get('/api/users/profile'),
};

// Users API
export const usersAPI = {
  getProfile: () => api.get('/api/users/profile'),
  updateProfile: (data: any) => api.put('/api/users/profile', data),
  searchUsers: (query: string) => api.get(`/api/users/search?q=${query}`),
  getUserById: (userId: string) => api.get(`/api/users/${userId}`),
};

// Rewards API
export const rewardsAPI = {
  getBalance: () => api.get('/api/points/balance'),
  getTransactions: (limit = 50, offset = 0) =>
    api.get(`/api/points/transactions?limit=${limit}&offset=${offset}`),
  getLeaderboard: (timeframe = 'week') =>
    api.get(`/api/points/leaderboard?timeframe=${timeframe}`),
};

// Messages API (for REST endpoints)
export const messagesAPI = {
  getConversations: () => api.get('/api/conversations'),
  getConversation: (conversationId: string) =>
    api.get(`/api/conversations/${conversationId}`),
  getMessages: (conversationId: string, limit = 50, offset = 0) =>
    api.get(`/api/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`),
  createConversation: (participantIds: string[]) =>
    api.post('/api/conversations', { participant_ids: participantIds }),
};
