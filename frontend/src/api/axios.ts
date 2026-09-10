import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL as string;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAuthPage = window.location.pathname === "/signin" || window.location.pathname === "/signup";
      if (!isAuthPage) {
        localStorage.removeItem("token");
        window.location.href = "/signin";
      }
    }
    return Promise.reject(error);
  }
);

export interface SignupPayload {
  username: string;
  email: string;
  password: string;
}

export interface SigninPayload {
  email: string;
  password: string;
}

export interface ContentQuery {
  type?: string;
  tag?: string;
  q?: string;
  favorite?: boolean;
  page?: number;
  limit?: number;
}

export interface ContentPayload {
  type: ContentPayloadType;
  title: string;
  link?: string;
  description?: string;
  tags: string[];
}

export type ContentPayloadType = "tweet" | "video" | "doc" | "link" | "tag" | "note";

export const authAPI = {
  signup: (data: SignupPayload) => api.post("/auth/signup", data),
  signin: (data: SigninPayload) => api.post("/auth/signin", data),
  verifyEmail: (token: string) => api.get("/auth/verify-email", { params: { token } }),
  forgotPassword: (email: string) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) => api.post("/auth/reset-password", { token, password }),
};

export const contentAPI = {
  getAll: (query: ContentQuery = {}) => {
    const params: Record<string, string> = {};
    if (query.type && query.type !== "all") params.type = query.type;
    if (query.tag) params.tag = query.tag;
    if (query.q) params.q = query.q;
    if (query.favorite) params.favorite = "true";
    if (query.page) params.page = String(query.page);
    if (query.limit) params.limit = String(query.limit);
    return api.get("/content", { params });
  },
  getStats: () => api.get("/content/stats"),
  add: (data: ContentPayload) => api.post("/content", data),
  update: (id: string, data: Partial<ContentPayload>) => api.put(`/content/${id}`, data),
  toggleFavorite: (id: string, isFavorite?: boolean) =>
    api.post(`/content/${id}/favorite`, isFavorite !== undefined ? { isFavorite } : {}),
  delete: (id: string) => api.delete(`/content/${id}`),
  bulkDelete: (ids: string[]) => api.post("/content/bulk/delete", { ids }),
  bulkFavorite: (ids: string[], isFavorite: boolean) => api.post("/content/bulk/favorite", { ids, isFavorite }),
  bulkTag: (ids: string[], add: string[], remove: string[] = []) => api.post("/content/bulk/tag", { ids, add, remove }),
  exportData: (format: "json" | "csv" | "markdown") =>
    api.get("/content/export", { params: { format }, responseType: "blob" }).then((res) => res.data),
  importData: (items: ContentPayload[]) => api.post("/content/import", { items }),
};

export interface BrainSource {
  _id: string;
  type: string;
  title: string;
  link?: string;
  tags: string[];
  summary?: string;
  description?: string;
  snippet?: string;
  relevance: number;
}

export interface BrainAnswer {
  answer: string;
  sources: BrainSource[];
  llmUsed: boolean;
}

export const aiAPI = {
  summarize: (contentId: string) => api.post("/ai/summarize", { contentId }),
  autotag: (contentId: string) => api.post("/ai/autotag", { contentId }),
  askBrain: (question: string) => api.post<BrainAnswer>("/ai/brain", { question }),
};

export const tagAPI = {
  list: (q?: string) => api.get("/tags", { params: q ? { q } : {} }),
  rename: (tag: string, name: string) => api.put(`/tags/${encodeURIComponent(tag)}`, { name }),
  merge: (from: string[], into: string) => api.post("/tags/merge", { from, into }),
  remove: (tag: string) => api.delete(`/tags/${encodeURIComponent(tag)}`),
};

export const userAPI = {
  getProfile: () => api.get("/user/profile"),
  updateProfile: (data: { displayName?: string; avatar?: string }) => api.put("/user/profile", data),
  changePassword: (currentPassword: string, newPassword: string) => api.put("/user/password", { currentPassword, newPassword }),
  deleteAccount: () => api.delete("/user/account"),
};

export const shareAPI = {
  toggle: (data?: { slug?: string; password?: string; expiresInDays?: number; isShared?: boolean }) =>
    api.post("/brain/share", data ?? {}),
  getStatus: () => api.get("/brain/share/status"),
  getSharedBrain: (hash: string, password?: string) =>
    api.get(`/brain/${hash}`, password ? { headers: { "x-share-password": password } } : {}),
};

export default api;
