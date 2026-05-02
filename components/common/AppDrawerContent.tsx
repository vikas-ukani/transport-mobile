import { FontAwesome, Ionicons } from "@expo/vector-icons";
import {
    DrawerContentScrollView,
    useDrawerStatus,
    type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { router } from "expo-router";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useAuth } from "../../context/AuthContext";

import { IconSymbol } from "../ui/icon-symbol";
import ConfirmPopup from "./ConfirmPopup";

export default function AppDrawerContent({
  navigation,
}: DrawerContentComponentProps) {
  const { t } = useTranslation();
  const { user, logout, updateUser } = useAuth();
  const drawerStatus = useDrawerStatus();
  const [openLogoutModal, setOpenLogoutModal] = useState(false);
  const [walletCurrency, setWalletCurrency] = useState("inr");
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [addFundsAmount, setAddFundsAmount] = useState("");
  const [addFundsMethod, setAddFundsMethod] = useState<
    "UPI" | "GOOGLE_PAY" | "CARD" | null
  >(null);
  const [addLoading, setAddLoading] = useState(false);

  const closeThen = (path: string) => {
    navigation.closeDrawer();
    requestAnimationFrame(() => router.push(path as any));
  };

  const walletLabel = "";

  const handleAddFunds = async () => {
    const rupees = parseFloat(String(addFundsAmount).replace(/,/g, ""));
    if (!Number.isFinite(rupees) || rupees < 1) {
      Alert.alert(
        t("wallet.invalidAmountTitle"),
        t("wallet.invalidAmountBody"),
      );
      return;
    }

    if (!process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      Alert.alert(
        t("payment.configurePublishableKey"),
        t("wallet.stripeKeyMissingBody"),
      );
      return;
    }
    const amountCents = Math.round(rupees * 100);
    setAddLoading(true);
    try {
    } catch (error: any) {
      Alert.alert(t("wallet.topUpFailedTitle"), error.message || "");
    } finally {
      setAddLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    closeThen("/(apps)");
  };

  return (
    <>
      <DrawerContentScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        style={{ flex: 1, backgroundColor: "#FAFAFA" }}
      >
        <ConfirmPopup
          loading={false}
          show={openLogoutModal}
          onCancel={() => setOpenLogoutModal(false)}
          onConfirm={handleLogout}
          title="Logout?"
          subTitle="Are you sure you want to logout?"
        />
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

            <View className="pt-4 mt-4 border-t border-gray-100">
              <View className="mb-1">
                {/* <Text className="text-xs font-semibold text-gray-500 tracking-tight mb-0.5">
                  {t("common.walletBalance")}
                </Text> */}
                <Text className="w-full text-3xl font-extrabold text-center text-primary">
                  {walletLabel ?? t("common.walletUnavailable")}
                </Text>
              </View>
              <TouchableOpacity
                className="justify-center items-center px-4 py-3 mt-3 w-full rounded-lg shadow-sm bg-primary"
                onPress={() => setShowAddFundsModal(true)}
                activeOpacity={0.85}
              >
                <Text className="font-semibold text-white text-md">
                  {t("wallet.addFunds")}
                </Text>
              </TouchableOpacity>
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
            icon={
              <Ionicons name="settings-outline" size={22} color="#9333ea" />
            }
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
              <Ionicons
                name="notifications-outline"
                size={22}
                color="#9333ea"
              />
            }
            label={t("common.notifications")}
            onPress={() => closeThen("/(apps)/notifications")}
            isLast
          />
        </View>

        <TouchableOpacity
          className="flex-row gap-3 items-center mx-3 mt-4 px-4 py-3.5 bg-white rounded-xl border border-red-100"
          onPress={() => setOpenLogoutModal(true)}
          activeOpacity={0.75}
        >
          <Ionicons name="log-out-outline" size={22} color="#DC2626" />
          <Text className="text-base font-semibold text-red-600">
            {t("common.logout")}
          </Text>
        </TouchableOpacity>
      </DrawerContentScrollView>

      {/* Add Funds Modal */}
      <Modal
        visible={showAddFundsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddFundsModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.35)",
            justifyContent: "center",
            alignItems: "center",
            paddingVertical: 24,
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                minWidth: 320,
                maxWidth: 380,
                backgroundColor: "white",
                borderRadius: 14,
                padding: 22,
                alignItems: "stretch",
                elevation: 6,
                shadowColor: "#000",
                shadowOpacity: 0.09,
                shadowRadius: 10,
              }}
            >
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 18,
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                {t("wallet.addFunds") || "Add Funds"}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  marginBottom: 10,
                  color: "#666",
                  textAlign: "center",
                }}
              >
                {t("wallet.modalSubtitle")}
              </Text>
              <Text style={{ fontSize: 14, marginBottom: 6 }}>
                {t("wallet.amountInr")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{ fontWeight: "bold", fontSize: 18, marginRight: 5 }}
                >
                  ₹
                </Text>
                <TextInput
                  keyboardType="numeric"
                  value={addFundsAmount}
                  onChangeText={setAddFundsAmount}
                  editable={!addLoading}
                  placeholder="Enter amount"
                  style={{
                    flex: 1,
                    borderBottomWidth: 1,
                    borderColor: "#9333ea",
                    paddingVertical: 4,
                    fontSize: 16,
                  }}
                />
              </View>

              <Text
                style={{
                  fontSize: 11,
                  color: "#888",
                  marginBottom: 10,
                }}
              >
                {t("wallet.stripeSheetHint")}
              </Text>

              <View style={{ flexDirection: "row", marginTop: 10 }}>
                <TouchableOpacity
                  onPress={() => {
                    if (!addLoading) {
                      setShowAddFundsModal(false);
                      setAddFundsAmount("");
                      setAddFundsMethod(null);
                    }
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: "#F3F4F6",
                    borderRadius: 7,
                    paddingVertical: 11,
                    alignItems: "center",
                    marginRight: 7,
                    opacity: addLoading ? 0.7 : 1,
                  }}
                  disabled={addLoading}
                >
                  <Text style={{ fontWeight: "bold", color: "#6B7280" }}>
                    {t("common.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAddFunds}
                  style={{
                    flex: 1,
                    backgroundColor: "#9333ea",
                    borderRadius: 7,
                    paddingVertical: 11,
                    alignItems: "center",
                    marginLeft: 7,
                    opacity: addLoading ? 0.7 : 1,
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 8,
                  }}
                  disabled={addLoading}
                >
                  {addLoading ? <ActivityIndicator color="#fff" /> : null}
                  <Text style={{ fontWeight: "bold", color: "white" }}>
                    {addLoading
                      ? t("wallet.addingFunds")
                      : t("wallet.continuePay")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
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
