import { AuthProvider, useAuth } from "@/context/AuthContext";
import "@/global.css";
import "@/i18n/config";
import client from "@/lib/client";
import Toast from "react-native-toast-message";

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";

function RootNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        statusBarHidden: false,
        statusBarAnimation: "slide",
        statusBarStyle: "dark",
      }}
    >
      <Stack.Protected guard={!!isAuthenticated}>
        <Stack.Screen
          name="(apps)"
          options={{
            headerShown: false,
            statusBarHidden: false,
            statusBarAnimation: "slide",
            statusBarStyle: "dark",
          }}
        />
      </Stack.Protected>

      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen
          name="(auth)/login"
          options={{
            headerShown: false,
            statusBarHidden: false,
            statusBarStyle: "dark",
            statusBarAnimation: "slide",
          }}
        />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    // <AppErrorBoundary>
    <QueryClientProvider client={client}>
      <AuthProvider>
        <StatusBar style="inverted" />
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootNavigator />
          <Toast
            position="top"
            visibilityTime={5000}
            // globalAnimationType="fade"
            // defaultDuration={5000}
            // defaultStyle={{
            //   view: {
            //     backgroundColor: "rgba(0, 0, 0, 0.8)",
            //     borderRadius: 8,
            //   },
            //   text: {
            //     color: "white",
            //   },
            // }}
          />
        </GestureHandlerRootView>
      </AuthProvider>
    </QueryClientProvider>
    // </AppErrorBoundary>
  );
}
