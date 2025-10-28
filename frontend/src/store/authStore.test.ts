import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';
import type { AuthUser } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.getState().clear();
  });

  describe('Initial state', () => {
    it('has null tokens and user initially', () => {
      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
    });
  });

  describe('setTokens', () => {
    it('sets access and refresh tokens', () => {
      const { setTokens } = useAuthStore.getState();
      setTokens('access123', 'refresh456');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('access123');
      expect(state.refreshToken).toBe('refresh456');
    });
  });

  describe('setUser', () => {
    it('sets user data', () => {
      const mockUser: AuthUser = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'USER',
      };

      const { setUser } = useAuthStore.getState();
      setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
    });

    it('can set user to null', () => {
      const mockUser: AuthUser = {
        id: 1,
        email: 'test@example.com',
        role: 'USER',
      };

      const { setUser } = useAuthStore.getState();
      setUser(mockUser);
      setUser(null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });
  });

  describe('clear', () => {
    it('clears all auth data', () => {
      const mockUser: AuthUser = {
        id: 1,
        email: 'test@example.com',
        role: 'ADMIN',
      };

      const { setTokens, setUser, clear } = useAuthStore.getState();
      setTokens('access123', 'refresh456');
      setUser(mockUser);

      clear();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
    });
  });

  describe('Combined operations', () => {
    it('handles full login flow', () => {
      const mockUser: AuthUser = {
        id: 42,
        email: 'user@test.com',
        full_name: 'John Doe',
        role: 'USER',
      };

      const { setTokens, setUser } = useAuthStore.getState();

      // Simulate login
      setTokens('new-access-token', 'new-refresh-token');
      setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('new-access-token');
      expect(state.refreshToken).toBe('new-refresh-token');
      expect(state.user).toEqual(mockUser);
    });

    it('handles logout flow', () => {
      const mockUser: AuthUser = {
        id: 42,
        email: 'user@test.com',
        role: 'USER',
      };

      const { setTokens, setUser, clear } = useAuthStore.getState();

      // Login
      setTokens('access', 'refresh');
      setUser(mockUser);

      // Logout
      clear();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
    });
  });

  describe('User roles', () => {
    it('supports USER role', () => {
      const mockUser: AuthUser = {
        id: 1,
        email: 'user@test.com',
        role: 'USER',
      };

      useAuthStore.getState().setUser(mockUser);
      expect(useAuthStore.getState().user?.role).toBe('USER');
    });

    it('supports ADMIN role', () => {
      const mockUser: AuthUser = {
        id: 2,
        email: 'admin@test.com',
        role: 'ADMIN',
      };

      useAuthStore.getState().setUser(mockUser);
      expect(useAuthStore.getState().user?.role).toBe('ADMIN');
    });
  });
});
