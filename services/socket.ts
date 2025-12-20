import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = __DEV__ 
  ? 'http://localhost:3000' 
  : 'https://api.yourdomain.com';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  async connect() {
    if (this.socket?.connected) {
      return;
    }

    const token = await AsyncStorage.getItem('authToken');
    
    this.socket = io(SOCKET_URL, {
      auth: {
        token,
      },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.emit('user:online');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    // Set up default listeners
    this.setupDefaultListeners();
  }

  private setupDefaultListeners() {
    if (!this.socket) return;

    // Booking updates
    this.socket.on('booking:created', (data) => {
      this.notifyListeners('booking:created', data);
    });

    this.socket.on('booking:updated', (data) => {
      this.notifyListeners('booking:updated', data);
    });

    this.socket.on('booking:matched', (data) => {
      this.notifyListeners('booking:matched', data);
    });

    // Notifications
    this.socket.on('notification:new', (data) => {
      this.notifyListeners('notification:new', data);
    });

    // Vehicle updates
    this.socket.on('vehicle:verified', (data) => {
      this.notifyListeners('vehicle:verified', data);
    });
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    // Also listen on socket if connected
    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  off(event: string, callback?: Function) {
    if (callback) {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
      if (this.socket) {
        this.socket.off(event, callback as any);
      }
    } else {
      this.listeners.delete(event);
      if (this.socket) {
        this.socket.off(event);
      }
    }
  }

  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  private notifyListeners(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
export default socketService;

