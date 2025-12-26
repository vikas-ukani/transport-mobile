import { toast } from '@backpackapp-io/react-native-toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { SYSTEM_DEFAULT_LANGUAGE } from '../i18n/config';
import apiService from '../services/api.service';
import socketService from '../services/socket';

export type UserType = 'customer' | 'driver';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  photo?: string;
  type: UserType;
  vehicleRegistration?: string;
  vehiclePhoto?: string;
  changeLanguage?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  me: () => Promise<{ error?: string } | void>;
  login: (
    email: string,
    password: string
  ) => Promise<{ error?: string } | void>;
  register: (userData: any, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}: any) => {
  const { i18n } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from storage on mount
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  // Connect socket when user is authenticated
  useEffect(() => {
    if (user) {
      i18n.changeLanguage(user.changeLanguage || SYSTEM_DEFAULT_LANGUAGE);
      // i18n.defaultLocale = user.changeLanguage || SYSTEM_DEFAULT_LANGUAGE;
      socketService.connect();
    } else {
      socketService.disconnect();
    }
  }, [user]);

  const loadUserFromStorage = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('authToken');

      // Check if auto logout or not
      if (storedUser && token) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } else {
        clearStorage();
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const me = async () => {
    try {
      const res = await apiService.me();
      console.log('ME res', res);
      if (res.success === false || res.detail === 'Not authenticated') {
        logout();
        router.replace('/login');
      } else {
        const { user: userData, token } = res;
        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        await socketService.connect();
        router.replace('/(apps)/(tabs)');
      }
    } catch (error: any) {
      console.log('Got Catch on /ME:::', error);
      toast.error('Session expired. Please log in again.');
      router.replace('/login');
      await socketService.disconnect();
      // return error;
    } finally {
      console.log('finally ME::');
      router.replace('/(apps)/(tabs)');
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await apiService.login(email, password);
      const { error, user: userData, token } = res;
      if (res.success === false || error) {
        toast.error(error || res.message || 'Login failed. Please try again.');
      } else {
        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        toast.success(res.message || 'Login successful done.');
      }

      setUser(userData);
      await socketService.connect();
      router.replace('/(apps)/(tabs)');
    } catch (error: any) {
      throw Error(error.response.data);
    }
  };

  const register = async (userData: any, password: string) => {
    try {
      console.log('Register userData: ', userData);
      const response = await apiService.register({ ...userData, password });
      if (response.success) {
        // Registration successful
        toast.success(response.message || 'Registration successful');
        const { user, token } = response;
        await AsyncStorage.setItem('authToken', token);
        await AsyncStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        await socketService.connect();
        router.replace('/(apps)/(tabs)');
      } else {
        toast.error(response.message || 'Registration successful');
      }
    } catch (error: any) {
      return error.response.data;
    }
  };
  const clearStorage = async () => {
    if ((await AsyncStorage.getItem('authToken')) !== null) {
      await AsyncStorage.removeItem('authToken');
    }
    if ((await AsyncStorage.getItem('user')) !== null) {
      await AsyncStorage.removeItem('user');
    }
    socketService.disconnect();
    setUser(null);
  };

  const logout = async () => {
    try {
      clearStorage();
      toast.success('Logout successfully.');
      router.push('/login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    const updatedUser = { ...user, ...userData } as User;
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
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
        updateUser,
        me,
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
