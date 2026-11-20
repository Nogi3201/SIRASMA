import React, { createContext, useContext, useEffect, useState } from 'react';
import { authService } from '../../services/auth.service.js';
import type { LoginPayload, RegisterStudentPayload, User, UserRole } from '../../types/auth.js';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<UserRole>;
  register: (payload: RegisterStudentPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session from HttpOnly cookie on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Attempt token refresh via HttpOnly cookie
        await authService.refreshToken();
        const profile = await authService.getProfile();
        setUser(profile.data);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (payload: LoginPayload): Promise<UserRole> => {
    setIsLoading(true);
    try {
      const res = await authService.login(payload);
      setUser(res.data.user);
      return res.data.user.role;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterStudentPayload) => {
    setIsLoading(true);
    try {
      await authService.register(payload);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

