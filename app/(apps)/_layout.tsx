import { Drawer } from "expo-router/drawer";
import { Platform } from "react-native";
import AppDrawerContent from "../../components/common/AppDrawerContent";
import UserGPSUpdate from "../../components/common/UserGPSUpdate";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

export default function AppsLayout() {
  return (
    <>
      {Platform.OS !== "web" && <UserGPSUpdate />}
      <Drawer
        drawerContent={(props: any) => <AppDrawerContent {...props} />}
        screenOptions={{
          headerShown: false,
          drawerType: "slide",
          overlayColor: "rgba(0,0,0,0.45)",
          drawerStyle: { width: 300 },
          swipeEnabled: true,
        }}
      />
    </>
  );
}
