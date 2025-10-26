import axios from "axios";
import { useAuthStore } from "@/store/authStore";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true
});
let isRefreshing = false;
let pendingRequests = [];
const processQueue = (token) => {
    pendingRequests.forEach((callback) => callback(token));
    pendingRequests = [];
};
apiClient.interceptors.request.use((config) => {
    const state = useAuthStore.getState();
    if (state.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`;
    }
    return config;
});
apiClient.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    if (error.response?.status !== 401 || originalRequest._retry) {
        return Promise.reject(error);
    }
    if (isRefreshing) {
        return new Promise((resolve, reject) => {
            pendingRequests.push((token) => {
                if (token) {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    resolve(apiClient(originalRequest));
                }
                else {
                    reject(error);
                }
            });
        });
    }
    originalRequest._retry = true;
    isRefreshing = true;
    try {
        const { refreshToken } = useAuthStore.getState();
        if (!refreshToken) {
            throw error;
        }
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refresh_token: refreshToken }, { withCredentials: true });
        const { access_token, refresh_token } = response.data;
        useAuthStore.getState().setTokens(access_token, refresh_token);
        processQueue(access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
    }
    catch (refreshError) {
        processQueue(null);
        useAuthStore.getState().clear();
        return Promise.reject(refreshError);
    }
    finally {
        isRefreshing = false;
    }
});
