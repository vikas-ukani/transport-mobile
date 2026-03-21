import { Stack } from "expo-router";
import { Platform } from "react-native";
import UserGPSUpdate from "../../components/common/UserGPSUpdate";

export default function RootLayout() {
  // Notifications.registerRemoteNotifications();

  return (
    <>
      {Platform.OS !== "web" && <UserGPSUpdate />}
      <Stack
        screenOptions={{
          headerShown: false,
          statusBarHidden: false,
          statusBarAnimation: "slide",
          statusBarStyle: "dark",
        }}
      >
        <Stack.Screen name="index" options={{ title: "Home Page" }} />
        {/* <Stack.Screen name="book-vehicle" /> */}
        {/* <Stack.Screen name="notifications" /> */}
      </Stack>
    </>
  );
}
