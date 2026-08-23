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

// NOTE: useRouter and useSegments are imported but ONLY used inside
// AuthNavigationHandler (which renders inside the navigator tree).
// They are NOT called inside AuthProvider to avoid the
// "Couldn't find a navigation context" crash that occurs when
// AuthProvider renders before the <Stack>/<Drawer> mounts its
// NavigationStateContext.

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
  // Internal: bridge to AuthNavigationHandler for navigation after auth actions.
  // AuthProvider cannot call useRouter/useSegments directly because it renders
  // outside the <Stack> navigator, and those hooks require NavigationStateContext.
  _pendingRedirect: string | null;
  _clearPendingRedirect: () => void;
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

  // _pendingRedirect is set by auth actions (login/logout/resetAuth) and
  // consumed by AuthNavigationHandler which renders inside the navigator tree.
  // This avoids calling useRouter/useSegments inside AuthProvider (which is
  // outside the <Stack> and would crash with "navigation context not found").
  const [_pendingRedirect, _setPendingRedirect] = useState<string | null>(null);
  const _clearPendingRedirect = useCallback(
    () => _setPendingRedirect(null),
    [],
  );

  // Helper to reset authentication (no router call — delegate to AuthNavigationHandler)
  const resetAuth = useCallback(async (showToast = true, message?: string) => {
    await deleteStoreBy(AUTH_TOKEN_KEY);
    socketService.disconnect();
    if (isMounted.current) setUser(null);
    if (showToast && message) toast.error(message);
    _setPendingRedirect("/login");
  }, []);

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
      if (isMounted.current) setIsLoading(false);
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
  const me = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiService.me();
      if (res.success === false || res.detail === "Not authenticated") {
        await resetAuth(true, "Session expired. Please log in again.");
      } else if (res.user) {
        if (isMounted.current) setUser(res.user);
        await socketService.connect();
        _setPendingRedirect("/(apps)/(tabs)");
      }
    } catch (error: any) {
      await resetAuth(true, "Session expired. Please log in again.");
      await socketService.disconnect();
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [resetAuth]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiService.login(email, password);
      if (res.success === false || res.error) {
        toast.error(res.message || "Login failed. Please try again.");
        if (isMounted.current) setUser(null);
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
        if (isMounted.current) setUser(res.user);
        console.log("SetUser Data", res.user);
        await socketService.connect();
        _setPendingRedirect("/(apps)/(tabs)");
      }
    } catch (error: any) {
      if (isMounted.current) setUser(null);
      await deleteStoreBy(AUTH_TOKEN_KEY);
      toast.error("Login failed due to unexpected error. Please try again.");
      return { error: error?.response?.data || "Unknown error" };
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);
  console.log(
    "user is",
    user?.id,
    user?.name,
    user?.email,
    user?.latitude,
    user?.longitude,
  );

  const register = useCallback(async (userData: any, password: string) => {
    setIsLoading(true);
    try {
      const response = await apiService.register({ ...userData, password });
      if (response.success) {
        toast.success(response.message || "Registration successful");
        if (isMounted.current) setUser(response.user);
        if (response.token) {
          await setStoreBy(AUTH_TOKEN_KEY, response.token);
        } else {
          await deleteStoreBy(AUTH_TOKEN_KEY);
        }
        await socketService.connect();
        _setPendingRedirect("/(apps)/(tabs)");
      } else {
        toast.error(response.message || "Registration failed");
        if (isMounted.current) setUser(null);
        await deleteStoreBy(AUTH_TOKEN_KEY);
      }
    } catch (error: any) {
      if (isMounted.current) setUser(null);
      await deleteStoreBy(AUTH_TOKEN_KEY);
      toast.error("Registration failed due to unexpected error.");
      return error?.response?.data;
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (isMounted.current) setIsLoading(true);
    socketService.disconnect();
    if (isMounted.current) setUser(null);
    await deleteStoreBy(AUTH_TOKEN_KEY);
    _setPendingRedirect("/login");
    if (isMounted.current) setIsLoading(false);
    // toast.success("Logged out successfully.");
  }, []);

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
        _pendingRedirect,
        _clearPendingRedirect,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * AuthNavigationHandler
 *
 * Renders INSIDE the navigator tree (must be a child of <Stack> or <Tabs>).
 * Reads _pendingRedirect from AuthContext and performs router.replace().
 *
 * This separation is required because useRouter() and useSegments() from
 * expo-router internally access @react-navigation/native's NavigationStateContext,
 * which only exists after the <Stack>/<Drawer> navigator has mounted.
 * AuthProvider renders above the Stack (in RootLayout), so we cannot call
 * those hooks there.
 *
 * Usage in _layout.tsx:
 *   <Stack>
 *     <AuthNavigationHandler />
 *     ...
 *   </Stack>
 */
export function AuthNavigationHandler() {
  const { _pendingRedirect, _clearPendingRedirect } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!_pendingRedirect) return;

    // Avoid navigating to /login if already on the login screen
    const isOnLogin = Array.isArray(segments) && segments.includes("login");
    if (_pendingRedirect === "/login" && isOnLogin) {
      _clearPendingRedirect();
      return;
    }

    router.replace(_pendingRedirect as any);
    _clearPendingRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_pendingRedirect]);

  return null;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
