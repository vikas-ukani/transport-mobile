import { toast } from "@/lib/toast";
import { useRouter, useSegments } from "expo-router";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useTranslation } from "react-i18next";
import { SYSTEM_DEFAULT_LANGUAGE } from "../i18n/config";
import { AUTH_TOKEN_KEY, deleteStoreBy, setStoreBy } from "../lib/session";
import apiService from "../services/api.service";
import socketService from "../services/socket";

export type UserType = "customer" | "driver";

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
  address?: string;
  latitude?: number;
  longitude?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  me: () => Promise<{ error?: string } | void>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ error?: string } | void>;
  register: (userData: any, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { i18n } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Prevent race conditions with isMounted ref
  const isMounted = useRef(true);
  const router = useRouter();
  const segments = useSegments(); // expo-router segments can be used to approximate location

  // Helper: detect if the current route is /login
  // expo-router does not provide a pathname; we infer from segments
  const isOnLogin = () => {
    // segments example: ["(auth)", "login"]
    if (!segments || segments.length === 0) return false;
    return segments.includes("login");
  };

  // Helper to reset authentication
  const resetAuth = useCallback(
    async (showToast = true, message?: string) => {
      await deleteStoreBy(AUTH_TOKEN_KEY);
      socketService.disconnect();
      setUser(null);
      if (showToast && message) toast.error(message);
      // Only navigate if not already on /login
      if (router?.replace && !isOnLogin()) {
        router.replace("/login");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, segments]
  );

  // Fetch user info from backend, handle auth/session state
  const fetchUserFromBackend = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiService.me();
      if (res.success === false || res.detail === "Not authenticated") {
        await resetAuth(false);
      } else if (res.user) {
        if (isMounted.current) setUser(res.user);
      } else {
        await resetAuth(false);
      }
    } catch (error) {
      await resetAuth(true, "Session expired. Please log in again.");
    } finally {
      setIsLoading(false);
    }
  }, [resetAuth]);

  // On mount/unmount
  useEffect(() => {
    isMounted.current = true;
    fetchUserFromBackend();
    return () => {
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Synchronize language and socket with user state
  useEffect(() => {
    const syncUserState = async () => {
      if (user) {
        // Only connect if necessary
        i18n.changeLanguage(user.changeLanguage || SYSTEM_DEFAULT_LANGUAGE);
        if (!socketService.isConnected()) {
          await socketService.connect();
        }
      } else {
        socketService.disconnect();
      }
    };
    syncUserState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Refined me (auth check/refresh) function
  const me = useCallback(
    async () => {
      setIsLoading(true);
      try {
        const res = await apiService.me();
        if (res.success === false || res.detail === "Not authenticated") {
          await resetAuth(true, "Session expired. Please log in again.");
        } else if (res.user) {
          setUser(res.user);
          await socketService.connect();
          router.replace("/(apps)/(tabs)");
        }
      } catch (error: any) {
        await resetAuth(true, "Session expired. Please log in again.");
        await socketService.disconnect();
      } finally {
        setIsLoading(false);
      }
    },
    [resetAuth, router]
  );

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const res = await apiService.login(email, password);
        if (res.success === false || res.error) {
          toast.error(res.message || "Login failed. Please try again.");
          setUser(null);
          await deleteStoreBy(AUTH_TOKEN_KEY);
          return {
            error: res.message || "Login failed. Please try again.",
          };
        } else {
          if (res.token) {
            await setStoreBy(AUTH_TOKEN_KEY, res.token);
          } else {
            await deleteStoreBy(AUTH_TOKEN_KEY);
          }
          setUser(res.user);
          // Don't use possibly stale user variable in console.log
          console.log("SetUser Data", res.user);
          await socketService.connect();
          router.replace("/(apps)/(tabs)");
        }
      } catch (error: any) {
        setUser(null);
        await deleteStoreBy(AUTH_TOKEN_KEY);
        toast.error("Login failed due to unexpected error. Please try again.");
        return { error: error?.response?.data || "Unknown error" };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );
  console.log("user is", user?.id, user?.name, user?.email, user?.latitude, user?.longitude);

  const register = useCallback(
    async (userData: any, password: string) => {
      setIsLoading(true);
      try {
        const response = await apiService.register({ ...userData, password });
        if (response.success) {
          toast.success(response.message || "Registration successful");
          setUser(response.user);
          if (response.token) {
            await setStoreBy(AUTH_TOKEN_KEY, response.token);
          } else {
            await deleteStoreBy(AUTH_TOKEN_KEY);
          }
          await socketService.connect();
          router.replace("/(apps)/(tabs)");
        } else {
          toast.error(response.message || "Registration failed");
          setUser(null);
          await deleteStoreBy(AUTH_TOKEN_KEY);
        }
      } catch (error: any) {
        setUser(null);
        await deleteStoreBy(AUTH_TOKEN_KEY);
        toast.error("Registration failed due to unexpected error.");
        return error?.response?.data;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    socketService.disconnect();
    setUser(null);
    await deleteStoreBy(AUTH_TOKEN_KEY);
    // Use replace so user can't go 'back' after logging out
    router.replace && router.replace("/login");
    setIsLoading(false);
    toast.success("Logged out successfully.");
  }, [router]);

  const updateUser = useCallback(async (userData: Partial<User>) => {
    setUser((current) => (current ? { ...current, ...userData } : current));
  }, []);

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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
