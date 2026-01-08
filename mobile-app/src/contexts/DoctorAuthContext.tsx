import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { DoctorUser } from '../types';

interface DoctorAuthContextType {
  isAuthenticated: boolean;
  user: DoctorUser | null;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const DoctorAuthContext = createContext<DoctorAuthContextType | undefined>(undefined);

const DOCTOR_TOKEN_KEY = '@vetsystem_doctor_token';
const DOCTOR_USER_KEY = '@vetsystem_doctor_user';

export const DoctorAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<DoctorUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem(DOCTOR_TOKEN_KEY);
        const userJson = await AsyncStorage.getItem(DOCTOR_USER_KEY);
        
        if (token && userJson) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          setUser(JSON.parse(userJson));
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error checking doctor auth:', error);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login', { username, password });
      
      if (response.data.token && response.data.user) {
        await AsyncStorage.setItem(DOCTOR_TOKEN_KEY, response.data.token);
        await AsyncStorage.setItem(DOCTOR_USER_KEY, JSON.stringify(response.data.user));
        
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        setUser(response.data.user);
        setIsAuthenticated(true);
        
        return { success: true };
      }
      
      return { success: false, message: response.data.message || 'Ошибка входа' };
    } catch (error: any) {
      console.error('Doctor login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Неверный логин или пароль' 
      };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(DOCTOR_TOKEN_KEY);
      await AsyncStorage.removeItem(DOCTOR_USER_KEY);
      delete api.defaults.headers.common['Authorization'];
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Doctor logout error:', error);
    }
  };

  return (
    <DoctorAuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading }}>
      {children}
    </DoctorAuthContext.Provider>
  );
};

export const useDoctorAuth = () => {
  const context = useContext(DoctorAuthContext);
  if (context === undefined) {
    throw new Error('useDoctorAuth must be used within a DoctorAuthProvider');
  }
  return context;
};
