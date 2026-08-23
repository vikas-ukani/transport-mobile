import { Drawer } from "expo-router/drawer";
import { Platform } from "react-native";
import AppDrawerContent from "../../components/common/AppDrawerContent";
import UserGPSUpdate from "../../components/common/UserGPSUpdate";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function AppsLayout() {
  return (
    <Drawer
      drawerContent={(props: any) => (
        <>
          {/* UserGPSUpdate uses useFocusEffect (expo-router) which needs NavigationStateContext.
              It must render inside the navigator tree, not as a sibling before the Drawer mounts. */}
          {Platform.OS !== "web" && <UserGPSUpdate />}
          <AppDrawerContent {...props} />
        </>
      )}
      screenOptions={{
        headerShown: false,
        drawerType: "slide",
        overlayColor: "rgba(0,0,0,0.45)",
        drawerStyle: { width: 300 },
        swipeEnabled: true,
      }}
    />
  );
}

