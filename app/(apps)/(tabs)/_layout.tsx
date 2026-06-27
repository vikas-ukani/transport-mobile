import { FontAwesome } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { IconSymbol } from "../../../components/ui/icon-symbol";
import { useAuth } from "../../../context/AuthContext";

export const unstable_settings = {
  initialRouteName: "index",
  // The following anchor property is required for proper tab rendering on web in Expo Router v3+
  anchor: "index", // Set to a valid anchor from ['bookings', 'index', 'profile', 'vehicles']
};

export default function AppTabLayout() {
  const { user } = useAuth();
  const { t } = useTranslation();
  // Workaround for web - ensure Tabs always render
  // On web, the tabs may not show unless the layout file exports unstable_settings with anchor

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("common.home"),
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={28}
              name="house.fill"
              className={focused ? "!text-primary":"!text-gray-500"}
            />
          ),
        }}
      />

      {/* <Tabs.Protected guard={user?.type === "driver"}> */}
      {/* {user?.type === "driver" && ( */}
      <Tabs.Screen
        name="rides"
        options={{
          tabBarLabel: t("common.rides"),
          title: t("common.rides"),
          href: user?.type === "driver" ? "/rides" : null,
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome
              name="trophy"
              size={24}
              className={focused ? "!text-primary":"!text-gray-500"}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          tabBarLabel: t("common.myVehicles"),
          title: t("common.myVehicles"),
          href: user?.type === "driver" ? "/vehicles" : null,
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome
              name="truck"
              size={24}
              className={focused ? "!text-primary":"!text-gray-500"}
            />
          ),
        }}
      />

      {/* CUSTOMER CAN CREATE AND SEE ALL THEIR BOOKING REQUEST */}
      <Tabs.Screen
        name="bookings"
        options={{
          tabBarLabel: t("common.booking"),
          title: t("common.booking"),
          href: user?.type === "customer" ? "/bookings" : null,
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome
              name="bookmark"
              size={24}
              className={focused ? "!text-primary":"!text-gray-500"}
            />
          ),
        }}
      />
      {/* )} */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t("common.profile"),
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome
              name="gear"
              size={24}
              className={focused ? "!text-primary":"!text-gray-500"}
            />
          ),
        }}
      />
    </Tabs>
  );
}
