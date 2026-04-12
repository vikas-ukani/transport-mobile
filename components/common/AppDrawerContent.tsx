import { FontAwesome, Ionicons } from "@expo/vector-icons";
import {
    DrawerContentScrollView,
    useDrawerStatus,
    type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { router } from "expo-router";
import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Image, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { apiService } from "../../services/api.service";
import { IconSymbol } from "../ui/icon-symbol";

function formatWallet(balance: number | undefined) {
  if (balance === undefined || balance === null || Number.isNaN(balance)) {
    return null;
  }
  return `₹${Number(balance).toFixed(2)}`;
}

export default function AppDrawerContent({
  navigation,
}: DrawerContentComponentProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuth();
  const drawerStatus = useDrawerStatus();

  useEffect(() => {
    if (drawerStatus !== "open") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiService.me();
        if (cancelled || !res?.user || res.detail === "Not authenticated") {
          return;
        }
        await updateUser(res.user);
      } catch {
        /* keep cached user */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [drawerStatus, updateUser]);

  const closeThen = (path: string) => {
    navigation.closeDrawer();
    requestAnimationFrame(() => router.push(path as any));
  };

  const onLogout = () => {
    Alert.alert(t("common.logout"), t("drawer.logoutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.logout"),
        style: "destructive",
        onPress: async () => {
          navigation.closeDrawer();
          await logout();
        },
      },
    ]);
  };

  const walletLabel = formatWallet(user?.walletBalance);

  return (
    <DrawerContentScrollView
      contentContainerStyle={{ paddingBottom: 24 }}
      style={{ flex: 1, backgroundColor: "#FAFAFA" }}
    >
      <View style={{ paddingTop: 10 }}>
        <View className="p-4 mx-2 bg-white rounded-2xl border border-gray-200 shadow-sm">
          <View className="flex-row gap-3 items-center">
            {user?.photo ? (
              <Image
                source={{ uri: user.photo }}
                className="w-16 h-16 rounded-full border-2 border-primary"
              />
            ) : (
              <View className="justify-center items-center w-16 h-16 bg-violet-100 rounded-full border-2 border-violet-200">
                <Ionicons name="person" size={32} color="#9333ea" />
              </View>
            )}
            <View className="flex-1">
              <Text
                className="text-lg font-bold text-gray-900"
                numberOfLines={1}
              >
                {user?.name ?? "—"}
              </Text>
              <Text className="text-sm text-gray-600" numberOfLines={1}>
                {user?.email ?? ""}
              </Text>
              {user?.type ? (
                <View className="self-start mt-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/30">
                  <Text className="text-xs font-semibold text-primary">
                    {user.type === "customer"
                      ? t("common.customer")
                      : t("common.driver")}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          <View className="flex-row justify-between items-center pt-3 mt-4 border-t border-gray-100">
            <Text className="text-sm font-medium text-gray-600">
              {t("common.walletBalance")}
            </Text>
            <Text className="text-base font-bold text-primary">
              {walletLabel ?? t("common.walletUnavailable")}
            </Text>
          </View>
        </View>
      </View>

      <Text className="px-5 pt-5 pb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
        {t("drawer.mainSection")}
      </Text>
      <View className="overflow-hidden mx-2 bg-white rounded-xl border border-gray-200">
        <DrawerRow
          icon={<IconSymbol name="house.fill" size={22} color="#9333ea" />}
          label={t("common.home")}
          onPress={() => closeThen("/(apps)/(tabs)")}
        />
        {user?.type === "driver" ? (
          <DrawerRow
            icon={<FontAwesome name="trophy" size={20} color="#9333ea" />}
            label={t("common.rides")}
            onPress={() => closeThen("/(apps)/(tabs)/rides")}
          />
        ) : null}
        {user?.type === "driver" ? (
          <DrawerRow
            icon={<FontAwesome name="truck" size={20} color="#9333ea" />}
            label={t("common.myVehicles")}
            onPress={() => closeThen("/(apps)/(tabs)/vehicles")}
          />
        ) : null}
        {user?.type === "customer" ? (
          <DrawerRow
            icon={<FontAwesome name="bookmark" size={20} color="#9333ea" />}
            label={t("common.booking")}
            onPress={() => closeThen("/(apps)/(tabs)/bookings")}
          />
        ) : null}
        {user?.type === "customer" ? (
          <DrawerRow
            icon={<Ionicons name="car-outline" size={22} color="#9333ea" />}
            label={t("common.bookVehicle")}
            onPress={() => closeThen("/(apps)/book-vehicle")}
          />
        ) : null}
        <DrawerRow
          icon={<FontAwesome name="gear" size={20} color="#9333ea" />}
          label={t("common.profile")}
          onPress={() => closeThen("/(apps)/(tabs)/profile")}
          isLast
        />
      </View>

      <Text className="px-5 pt-5 pb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">
        {t("drawer.moreSection")}
      </Text>
      <View className="overflow-hidden mx-3 bg-white rounded-xl border border-gray-200">
        <DrawerRow
          icon={<Ionicons name="settings-outline" size={22} color="#9333ea" />}
          label={t("common.settings")}
          onPress={() => closeThen("/(apps)/settings")}
        />
        <DrawerRow
          icon={
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color="#9333ea"
            />
          }
          label={t("common.security")}
          onPress={() => closeThen("/(apps)/security")}
        />
        <DrawerRow
          icon={
            <Ionicons name="notifications-outline" size={22} color="#9333ea" />
          }
          label={t("common.notifications")}
          onPress={() => closeThen("/(apps)/notifications")}
          isLast
        />
      </View>

      <TouchableOpacity
        className="flex-row gap-3 items-center mx-3 mt-4 px-4 py-3.5 bg-white rounded-xl border border-red-100"
        onPress={onLogout}
        activeOpacity={0.75}
      >
        <Ionicons name="log-out-outline" size={22} color="#DC2626" />
        <Text className="text-base font-semibold text-red-600">
          {t("common.logout")}
        </Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
}

function DrawerRow({
  icon,
  label,
  onPress,
  isLast,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.65}
      className={`flex-row gap-3 items-center px-4 py-3.5 ${isLast ? "" : "border-b border-gray-100"}`}
    >
      <View className="justify-center items-center w-9 h-9 bg-violet-50 rounded-full">
        {icon}
      </View>
      <Text className="flex-1 text-base font-medium text-gray-900">
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );
}
