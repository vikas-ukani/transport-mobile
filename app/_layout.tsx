import { Toasts } from "@backpackapp-io/react-native-toast";
import { StripeProvider } from "@stripe/stripe-react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import AppErrorBoundary from "../components/AppErrorBoundary";
import { AuthProvider, useAuth } from "../context/AuthContext";
import "../global.css";
import "../i18n/config";

const stripePublishableKey =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

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
    <AppErrorBoundary>
      <StripeProvider
        publishableKey={stripePublishableKey}
        merchantIdentifier="merchant.com.vikasdev.transport"
        urlScheme="mobile"
      >
        <AuthProvider>
          <StatusBar style="inverted" />
          <GestureHandlerRootView>
            <RootNavigator />
            <Toasts
              globalAnimationType="fade"
              defaultStyle={{
                view: {
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  borderRadius: 8,
                },
                text: {
                  color: "white",
                },
              }}
            />
          </GestureHandlerRootView>
        </AuthProvider>
      </StripeProvider>
    </AppErrorBoundary>
  );
}
