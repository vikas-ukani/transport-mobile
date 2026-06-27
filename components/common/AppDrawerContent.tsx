import { FontAwesome, Ionicons } from "@expo/vector-icons";
import {
  DrawerContentScrollView,
  useDrawerStatus,
  type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { router } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
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

import { toast } from "@backpackapp-io/react-native-toast";
import {
  CFDropCheckoutPayment,
  CFPaymentComponentBuilder,
  CFPaymentModes,
  CFThemeBuilder,
} from "cashfree-pg-api-contract";
import {
  CFErrorResponse,
  CFPaymentGatewayService,
} from "react-native-cashfree-pg-sdk";
import { apiService } from "../../services/api.service";
import { createSession } from "../../services/cashfree";
import ConfirmPopup from "./ConfirmPopup";

export default function AppDrawerContent({
  navigation,
}: DrawerContentComponentProps) {
  const { t } = useTranslation();
  const { user, logout, updateUser, refreshWalletBalance } = useAuth();
  const drawerStatus = useDrawerStatus();
  const [openLogoutModal, setOpenLogoutModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [addFundsAmount, setAddFundsAmount] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    try {
      CFPaymentGatewayService.setCallback({
        async onVerify(orderID: string) {
          console.log("success ", orderID);
          // mstStore.cartStore.emptyCart(mstStore.otpStore.userId);
          const data = await apiService.successWalletTopup({
            cashFreeOrderId: orderID,
          });
          await updateUser({
            walletAmount: data.walletAmount,
          });
          setAddFundsAmount("");
          setShowAddFundsModal(false);
          // navigation.navigate(NAVIGATION.PaymentSuccess);
          toast.dismiss();
          toast.success("Payment successful.");
        },
        onError(error: CFErrorResponse, orderID: string): void {
          toast.remove();
          toast.error(error.getMessage());
          setAddFundsAmount("");
          setShowAddFundsModal(false);
          console.log("failed walelt TOPIUP: ", orderID, error.getMessage());
          // navigation.navigate(NAVIGATION.PaymentFailed);
        },
      });
    } catch (error: any) {
      console.error(
        "Error in setCallback",
        error?.message || error,
        error?.stack || "",
      );
    } finally {
      refreshWalletBalance();
    }
    return () => CFPaymentGatewayService.removeCallback();
  }, []);

  const closeThen = (path: string) => {
    navigation.closeDrawer();
    requestAnimationFrame(() => router.push(path as any));
  };

  const handleLogout = async () => {
    await logout();
    closeThen("/(apps)");
  };

  const handleAddFunds = async () => {
    try {
      setAddLoading(true);
      const makeOrderId = `order_${Date.now()}_${Math.floor(Math.random() * 1e8)}`;
      const order = await apiService.createWalletOrder({
        order_amount: parseFloat(addFundsAmount),
        order_id: makeOrderId,
        order_currency: "INR",
        customer_details: {
          customer_id: user?.id,
          customer_name: user?.name,
          customer_email: user?.email,
          customer_phone: user?.mobile,
        },
        order_meta: {
          notify_url: `https://test.cashfree.com/pgappsdemos/return.php?order_id=${makeOrderId}`,
        },
        order_note: "Top up wallet balance",
      });

      const sessionId = order.payment_session_id;
      const orderId = order.order_id;

      const session = createSession(sessionId, orderId);
      const paymentComponent = new CFPaymentComponentBuilder()
        .add(CFPaymentModes.CARD)
        .add(CFPaymentModes.UPI)
        .add(CFPaymentModes.UPI)
        .add(CFPaymentModes.NB)
        .add(CFPaymentModes.WALLET)
        .add(CFPaymentModes.PAY_LATER)
        .build();

      // // 3. Optional: Customize Theme
      const theme = new CFThemeBuilder()
        .setNavigationBarBackgroundColor("#a855f7")
        .setNavigationBarTextColor("#FFFFFF")
        .setButtonBackgroundColor("#FFC107")
        .setButtonTextColor("#FFFFFF")
        .setPrimaryTextColor("#212121")
        .setSecondaryTextColor("#757575")
        .build();

      // // Use this wrapper class to initiate the payment
      const dropCheckoutPayment = new CFDropCheckoutPayment(
        session,
        paymentComponent,
        theme,
      );
      CFPaymentGatewayService.doPayment(dropCheckoutPayment);
    } catch (e: any) {
      console.error(`Error in handleAddFunds`, e?.message || e, e?.stack || "");
      // Optionally, show an error toast to the user (requires a toast library):
      // toast.error(`Failed to add funds: ${e?.message || e}`);
    } finally {
      setAddLoading(false);
    }
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
                <View className="justify-center items-center w-16 h-16 rounded-full border-2 !border-primary bg-screen">
                  <Ionicons name="person" size={32} className="!text-primary" />
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
              <View className="flex-row justify-center items-center mb-1 w-full">
                <Text className="font-bold text-3xl mr-1.5 text-primary">
                  ₹
                </Text>
                <Text className="w-auto text-3xl font-extrabold text-center text-primary">
                  {user?.walletAmount ?? t("common.walletUnavailable")}
                </Text>
                <TouchableOpacity
                  onPress={refreshWalletBalance}
                  style={{ marginLeft: 8, padding: 2 }}
                  accessibilityRole="button"
                  className="flex justify-end"
                  accessibilityLabel={t("wallet.refreshBalance")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="refresh-circle"
                    size={28}
                    className="!text-primary"
                  />
                </TouchableOpacity>
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
            icon={
              <FontAwesome name="home" size={22} className="!text-primary" />
            }
            label={t("common.home")}
            onPress={() => closeThen("/(apps)/(tabs)")}
          />
          {user?.type === "driver" ? (
            <DrawerRow
              icon={
                <FontAwesome
                  name="trophy"
                  size={20}
                  className="!text-primary"
                />
              }
              label={t("common.rides")}
              onPress={() => closeThen("/(apps)/(tabs)/rides")}
            />
          ) : null}
          {user?.type === "driver" ? (
            <DrawerRow
              icon={
                <FontAwesome name="truck" size={20} className="!text-primary" />
              }
              label={t("common.myVehicles")}
              onPress={() => closeThen("/(apps)/(tabs)/vehicles")}
            />
          ) : null}
          {user?.type === "customer" ? (
            <DrawerRow
              icon={
                <FontAwesome
                  name="bookmark"
                  size={20}
                  className="!text-primary"
                />
              }
              label={t("common.booking")}
              onPress={() => closeThen("/(apps)/(tabs)/bookings")}
            />
          ) : null}
          {user?.type === "customer" ? (
            <DrawerRow
              icon={
                <Ionicons
                  name="car-outline"
                  size={22}
                  className="!text-primary"
                />
              }
              label={t("common.bookVehicle")}
              onPress={() => closeThen("/(apps)/book-vehicle")}
            />
          ) : null}
          <DrawerRow
            icon={
              <FontAwesome name="gear" size={20} className="!text-primary" />
            }
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
              <Ionicons
                name="settings-outline"
                size={22}
                className="!text-primary"
              />
            }
            label={t("common.settings")}
            onPress={() => closeThen("/(apps)/settings")}
          />
          <DrawerRow
            icon={
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                className="!text-primary"
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
                className="!text-primary"
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
                  className="border-primary"
                  style={{
                    flex: 1,
                    borderBottomWidth: 1,

                    paddingVertical: 4,
                    fontSize: 16,
                  }}
                />
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                {[200, 500, 1000, 2000].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    onPress={() => setAddFundsAmount(String(amount))}
                    disabled={addLoading}
                    className={`mx-1.5 ${addFundsAmount === String(amount) ? "bg-primary border-primary border-[1.5px]" : "bg-gray-100 border border-gray-300"} py-2 px-4 rounded-full`}
                    style={{
                      opacity: addLoading ? 0.7 : 1,
                    }}
                  >
                    <Text
                      className={`${
                        addFundsAmount === String(amount)
                          ? "text-white"
                          : "text-primary"
                      } font-bold text-lg`}
                    >
                      ₹{amount}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text
                style={{
                  fontSize: 11,
                  color: "#888",
                  marginBottom: 10,
                }}
              >
                {t("wallet.PaymentHint")}
              </Text>

              <View style={{ flexDirection: "row", marginTop: 10 }}>
                <TouchableOpacity
                  onPress={() => {
                    if (!addLoading) {
                      setShowAddFundsModal(false);
                      setAddFundsAmount("");
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
                  className="!bg-primary"
                  style={{
                    flex: 1,
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
