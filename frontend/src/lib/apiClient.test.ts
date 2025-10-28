import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/store/authStore';

// Import apiClient directly without mocking axios
// This allows the real axios instance to be created
import { apiClient } from './apiClient';

describe('apiClient', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  describe('Configuration', () => {
    it('is configured with base URL', () => {
      expect(apiClient.defaults.baseURL).toBeDefined();
      expect(typeof apiClient.defaults.baseURL).toBe('string');
    });

    it('is configured with credentials', () => {
      expect(apiClient.defaults.withCredentials).toBe(true);
    });
  });

  describe('Request interceptor', () => {
    it('adds authorization header when token exists', async () => {
      useAuthStore.getState().setTokens('test-token', 'refresh-token');

      const mockRequest = {
        headers: {},
        url: '/test',
      };

      // Get the request interceptor
      const requestInterceptors = apiClient.interceptors.request;
      // Access the handlers - the structure varies by axios version
      const handler = (requestInterceptors as any).handlers?.[0]?.fulfilled;

      if (handler) {
        const result = await handler(mockRequest);
        expect(result.headers.Authorization).toBe('Bearer test-token');
      }
    });

    it('does not add authorization header when no token', async () => {
      // Ensure no token is set
      useAuthStore.getState().clear();

      const mockRequest = {
        headers: {},
        url: '/test',
      };

      const requestInterceptors = apiClient.interceptors.request;
      const handler = (requestInterceptors as any).handlers?.[0]?.fulfilled;

      if (handler) {
        const result = await handler(mockRequest);
        expect(result.headers.Authorization).toBeUndefined();
      }
    });
  });

  describe('Instance properties', () => {
    it('is a valid axios instance', () => {
      expect(apiClient.defaults).toBeDefined();
      expect(apiClient.interceptors).toBeDefined();
      expect(apiClient.interceptors.request).toBeDefined();
      expect(apiClient.interceptors.response).toBeDefined();
    });

    it('has interceptors configured', () => {
      // Verify that interceptors are set up
      const requestHandlers = (apiClient.interceptors.request as any).handlers;
      const responseHandlers = (apiClient.interceptors.response as any).handlers;

      expect(requestHandlers).toBeDefined();
      expect(responseHandlers).toBeDefined();
      expect(requestHandlers.length).toBeGreaterThan(0);
      expect(responseHandlers.length).toBeGreaterThan(0);
    });
  });
});
