import { toast } from '@backpackapp-io/react-native-toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import socketService from './socket';

export const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    // Perform web-specific actions
    return 'http://0.0.0.0:8080';
  }

  return process.env.EXPO_PUBLIC_BACKEND_URL;
};

export const getApiUrl = () => {
  return `${getBaseUrl()}/api`;
  // return __DEV__
  //   ? 'https://unspitefully-unresemblant-nia.ngrok-free.dev/api'
  //   : process.env.EXPO_PUBLIC_API_URL;
};

class ApiService {
  private client: AxiosInstance;

  constructor() {
    console.log('getApiUrl()', getApiUrl());
    this.client = axios.create({
      baseURL: getApiUrl(),
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        accept: 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config: any) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
          config.headers['Content-Type'] = 'application/json';
          config.headers['Accept'] = 'application/json';
        }
        return config;
      },
      (error: any) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: any) => response,
      async (error: AxiosError) => {
        console.log('API Crash Res:: ', error.response?.data);
        const resData: any = error.response?.data;
        if (
          error.response?.status === 401 ||
          resData?.detail === 'Not authenticated'
        ) {
          // Token expired or invalid
          if ((await AsyncStorage.getItem('authToken')) !== null) {
            await AsyncStorage.removeItem('authToken');
          }
          if ((await AsyncStorage.getItem('user')) !== null) {
            await AsyncStorage.removeItem('user');
          }
          socketService.disconnect();
          // redirecting to login page
          router.push('/login');
        }
        return Promise.reject(error.response?.data || error.message);
      }
    );
  }

  // Auth endpoints
  async me() {
    try {
      const response = await this.client.get('/me');
      return response.data;
    } catch (error: any) {
      return error.response.data;
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    try {
      const response = await this.client.post('/signin', {
        email: email,
        password,
      });
      return response.data;
    } catch (err: any) {
      console.error('Login Error: ', err.message);
      return { error: 'Login failed. Please check your credentials.' };
    }
  }

  async forgotPassword(email: string) {
    const res = await this.client.post('/forgot-password', { email });
    return res.data;
  }

  async resetPassword(new_password: string, token: string) {
    const res = await this.client.post('/reset-password', {
      new_password,
      token,
    });
    return res.data;
  }

  async register(userData: any) {
    const response = await this.client.post('/register', userData);
    return response.data;
  }

  async sendOTP(mobile: string) {
    const response = await this.client.post('/auth/send-otp', { mobile });
    return response.data;
  }

  async verifyOTP(mobile: string, otp: string) {
    const response = await this.client.post('/auth/verify-otp', {
      mobile,
      otp,
    });
    return response.data;
  }

  async sendEmailOTP(email: string) {
    const response = await this.client.post('/auth/email-send-otp', { email });
    return response.data;
  }

  async verifyEmailOTP(email: string, otp: string) {
    const response = await this.client.post('/auth/email-verify-otp', {
      email,
      otp,
    });
    return response.data;
  }

  async userPartialUpdate(id: string, user: any) {
    try {
      const response = await this.client.put(
        '/users/partial-update/' + id,
        user
      );
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  }

  // Booking endpoints
  async createBooking(bookingData: any) {
    try {
      const response = await this.client.post('/bookings', bookingData);
      return response.data;
    } catch (e: any) {
      console.log('Booking Error', e.message);
      // Mock booking data (fallback in case POST fails)
      return {
        id: Date.now().toString(),
        fromLocation: bookingData.fromLocation?.address || 'Mock From Location',
        toLocation: bookingData.toLocation?.address || 'Mock To Location',
        materialType: bookingData.materialType || 'Mock Material',
        truckType: bookingData.truckType || 'Mock Truck',
        materialWeight: bookingData.materialWeight || '1.0',
        truckLength: bookingData.truckLength || '10',
        truckHeight: bookingData.truckHeight || '5',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
    }
  }

  async getBookings() {
    const response = await this.client.get('/bookings');
    return response.data;
  }

  async getBookingHistory() {
    const response = await this.client.get('/bookings/history');
    return response.data;
  }

  // Vehicle endpoints
  async registerVehicle(vehicleData: any) {
    const response = await this.client.post('/vehicles', vehicleData);
    console.log('response.data', response.data);
    return response.data;
  }

  // Vehicle endpoints
  async updateRegisterVehicle(vehicleData: any, id: string) {
    const response = await this.client.put(`/vehicle/${id}`, vehicleData);
    console.log('response.data', response.data);
    return response.data;
  }

  async getVehicles() {
    const response = await this.client.get('/vehicles');
    return response.data;
  }

  async getVehicle(id: string) {
    const response = await this.client.get(`/vehicle/${id}`);
    return response.data;
  }

  async deleteVehicle(id: string) {
    const response = await this.client.delete(`/vehicle/${id}`);
    return response.data;
  }

  // Post endpoints
  async createPost(postData: any) {
    try {
      const response = await this.client.post('/posts', postData);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  }
  // Update
  async updatePost(postData: any, id: string) {
    try {
      const response = await this.client.put('/posts/' + id, postData);
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  }

  async getVideos() {
    try {
      const response = await this.client.get('/videos');
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data || err.message);
    }
  }

  async getPosts() {
    try {
      const response = await this.client.get('/posts');
      return response.data;
    } catch (err: any) {
      console.log('got Catch POSTS://', err.response?.data || err.message);
    }
  }
  async likePost(id: string) {
    try {
      const response = await this.client.get('/like-post/' + id);
      return response.data;
    } catch (err: any) {
      console.log('got Catch POSTS://', err.response?.data || err.message);
    }
  }
  async getMyPosts() {
    try {
      const response = await this.client.get('/my-posts');
      return response.data;
    } catch (err: any) {
      console.log('got Catch POSTS://', err.response?.data || err.message);
    }
  }
  async getPostById(id: string) {
    try {
      const response = await this.client.get('/posts/' + id);
      return response.data;
    } catch (err: any) {
      console.log('got Catch POSTS://', err.response?.data || err.message);
    }
  }

  async deletePost(postId: string) {
    try {
      const response = await this.client.delete(`/posts/${postId}`);
      return response.data;
    } catch (err: any) {
      console.log('got Catch POSTS://', err.response?.data || err.message);
    }
  }

  // Notification endpoints
  async getNotifications() {
    const response = await this.client.get('/notifications');
    return response.data;
  }

  async markNotificationRead(notificationId: string) {
    const response = await this.client.patch(
      `/notifications/${notificationId}/read`
    );
    return response.data;
  }

  // Payment endpoints
  async createPaymentIntent(amount: number, vehicleId: string) {
    const response = await this.client.post('/payments/create-intent', {
      amount,
      vehicleId,
    });
    return response.data;
  }

  // Upload endpoint
  /**
   * Uploads an image file to the FastAPI upload route.
   *
   * @param f8ile The URI of the file to upload (local file URI)
   * @param type The file context/category
   * @returns Upload response from the backend
   */
  // async uploadImage(uri: string, type: 'profile' | 'vehicle' | 'post') {
  async uploadImage(fileUri: string, type: 'profile' | 'vehicle' | 'post') {
    const filename: any = fileUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const typeE = match ? `image/${match[1]}` : `image`;

    const name = `${type}_` + fileUri.split('/').pop() || `${Date.now()}.jpg`;
    let formData = new FormData();

    formData.append('file', {
      uri: fileUri,
      name,
      type: typeE || 'image/jpeg',
    } as any);

    const { data: resData } = await axios.post(
      `${getBaseUrl()}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    if (resData.success) {
      return resData;
    } else {
      toast.error(resData.message);
      return null;
    }
  }
}

export const apiService = new ApiService();
export default apiService;
