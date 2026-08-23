import { AuthProvider, useAuth } from "@/context/AuthContext";
import "@/global.css";
import "@/i18n/config";
import client from "@/lib/client";
import Toast from "react-native-toast-message";
// Set Expo Router's initial route to the splash screen
export const unstable_settings = {
  initialRouteName: "(auth)/splash",
};

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";

function RootNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Remove/hide statusBarHidden to ensure StatusBar remains visible
        statusBarAnimation: "slide",
        statusBarStyle: "dark",
      }}
    >
      <Stack.Protected guard={!!isAuthenticated}>
        <Stack.Screen
          name="(apps)"
          options={{
            headerShown: false,
            // Remove/hide statusBarHidden to ensure StatusBar remains visible
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
            // Remove/hide statusBarHidden to ensure StatusBar remains visible
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
        {/* Set StatusBar to visible and a preferred style for mobile */}
        <StatusBar style="dark" hidden={false} />
        <GestureHandlerRootView style={{ flex: 1 }}>
          
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
     
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
