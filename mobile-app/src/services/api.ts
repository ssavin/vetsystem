import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  AuthResponse, 
  OwnerWithPets, 
  TimeSlot, 
  Appointment, 
  MedicalRecord 
} from '../types';

// API configuration
const API_URL = __DEV__ 
  ? 'http://localhost:5000/api' 
  : 'https://your-production-url.com/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
const TOKEN_KEY = 'auth_token';

export const setAuthToken = async (token: string) => {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const getAuthToken = async () => {
  return await AsyncStorage.getItem(TOKEN_KEY);
};

export const removeAuthToken = async () => {
  await AsyncStorage.removeItem(TOKEN_KEY);
  delete api.defaults.headers.common['Authorization'];
};

// Initialize token on app start
export const initializeAuth = async () => {
  const token = await getAuthToken();
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }
};

// Request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    if (__DEV__) {
      console.log('API Request:', config.method?.toUpperCase(), config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired, logout user
      await removeAuthToken();
    }
    return Promise.reject(error);
  }
);

// ========== AUTH API ==========

export const sendSmsCode = async (phone: string): Promise<{ success: boolean; message: string }> => {
  const { data } = await api.post('/mobile/auth/send-code', { phone });
  return data;
};

export const verifySmsCode = async (
  phone: string, 
  code: string
): Promise<AuthResponse> => {
  const { data } = await api.post('/mobile/auth/verify-code', { phone, code });
  if (data.token) {
    await setAuthToken(data.token);
  }
  return data;
};

export const logout = async () => {
  await removeAuthToken();
};

// ========== PROFILE API ==========

export const getOwnerProfile = async (): Promise<OwnerWithPets> => {
  const { data } = await api.get('/mobile/me/profile');
  return data;
};

// ========== APPOINTMENTS API ==========

export const getAppointmentSlots = async (
  doctorId: number,
  date: string,
  branchId: number
): Promise<TimeSlot[]> => {
  const { data } = await api.get('/mobile/appointments/slots', {
    params: { doctorId, date, branchId },
  });
  return data.slots;
};

export const createAppointment = async (appointmentData: {
  petId: number;
  doctorId: number;
  branchId: number;
  scheduledAt: string;
  description?: string;
}): Promise<Appointment> => {
  const { data } = await api.post('/mobile/appointments', appointmentData);
  return data;
};

// ========== MEDICAL RECORDS API ==========

export const getPetMedicalHistory = async (petId: number): Promise<MedicalRecord[]> => {
  const { data } = await api.get(`/mobile/pets/${petId}/history`);
  return data.records;
};

// ========== PUSH NOTIFICATIONS API ==========

export const registerPushToken = async (
  token: string,
  deviceId: string,
  platform: 'ios' | 'android'
): Promise<{ success: boolean }> => {
  const { data } = await api.post('/mobile/me/register-push-token', {
    token,
    deviceId,
    platform,
  });
  return data;
};

// ========== DOCTORS & BRANCHES API ==========

export interface Doctor {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  specialization?: string | null;
}

export interface Branch {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
}

export const getDoctors = async (): Promise<Doctor[]> => {
  const { data } = await api.get('/mobile/doctors');
  return data.doctors;
};

export const getBranches = async (): Promise<Branch[]> => {
  const { data } = await api.get('/mobile/branches');
  return data.branches;
};

// ========== ENCOUNTERS & FILES API ==========

export interface EncounterAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  downloadUrl: string;
}

export const getEncounterAttachments = async (encounterId: string): Promise<EncounterAttachment[]> => {
  const { data } = await api.get(`/mobile/encounters/${encounterId}/attachments`);
  return data.attachments;
};

export const getFileDownloadUrl = (fileId: string): string => {
  return `${API_URL}/mobile/files/${fileId}`;
};

// ========== CHAT API ==========

export interface Conversation {
  id: string;
  subject: string;
  status: string;
  unreadCount: number;
  lastMessage?: {
    text: string;
    createdAt: string;
    senderType: 'owner' | 'clinic';
  };
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderType: 'owner' | 'clinic';
  messageText: string;
  isRead: boolean;
  createdAt: string;
}

export const getConversations = async (): Promise<Conversation[]> => {
  const { data } = await api.get('/mobile/me/conversations');
  return data.conversations;
};

export const createConversation = async (subject: string): Promise<Conversation> => {
  const { data } = await api.post('/mobile/me/conversations', { subject });
  return data.conversation;
};

export const getConversationMessages = async (conversationId: string): Promise<Message[]> => {
  const { data } = await api.get(`/mobile/conversations/${conversationId}/messages`);
  return data.messages;
};

export const sendMessage = async (conversationId: string, messageText: string): Promise<Message> => {
  const { data } = await api.post(`/mobile/conversations/${conversationId}/messages`, { messageText });
  return data.message;
};

export default api;
