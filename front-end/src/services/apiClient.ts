import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// ==========================================
// SIMPLE IN-MEMORY CACHE FOR GET REQUESTS
// ==========================================
interface CacheEntry {
  data: any;
  timestamp: number;
}

const apiCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds (Chuyển qua lại giữa các tab trong 1 phút không gọi lại API)

/**
 * Xóa toàn bộ cache thủ công (hoặc khi người dùng ấn nút Làm mới / Refresh)
 */
export const clearApiCache = () => {
  apiCache.clear();
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor Request: Kiểm tra Cache cho GET & Gắn JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const method = config.method?.toLowerCase();

    // 1. Khi có thao tác Thêm / Sửa / Xóa (POST / PUT / DELETE / PATCH):
    // Tự động xóa Cache để lần GET tiếp theo lấy dữ liệu mới nhất từ server
    if (method && ['post', 'put', 'delete', 'patch'].includes(method)) {
      apiCache.clear();
      return config;
    }

    // 2. Khi là GET: Kiểm tra xem đã có kết quả trong RAM chưa
    const isNoCache = config.headers?.['Cache-Control'] === 'no-cache' || config.headers?.['x-no-cache'];
    if (method === 'get' && !isNoCache) {
      const cacheKey = `${config.url}_${JSON.stringify(config.params || {})}`;
      const cached = apiCache.get(cacheKey);

      if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        // Trả ngay kết quả từ Cache mà không gửi request qua mạng (0ms latency)
        config.adapter = () =>
          Promise.resolve({
            data: cached.data,
            status: 200,
            statusText: 'OK (Cached)',
            headers: config.headers,
            config,
          } as AxiosResponse);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor Response: Lưu kết quả GET thành công vào Cache & xử lý 401
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    const method = response.config.method?.toLowerCase();
    const isNoCache = response.config.headers?.['Cache-Control'] === 'no-cache' || response.config.headers?.['x-no-cache'];

    if (method === 'get' && !isNoCache && response.status === 200) {
      const cacheKey = `${response.config.url}_${JSON.stringify(response.config.params || {})}`;
      apiCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });
    }

    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      apiCache.clear();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('aives_auth_session');
      if (!window.location.pathname.includes('/login')) {
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
