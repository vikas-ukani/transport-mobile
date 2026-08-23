import { toast } from "@/lib/toast";
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Linking,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { useAuth } from "../../context/AuthContext";
import apiService from "../../services/api.service";
import ConfirmPopup from "../common/ConfirmPopup";
import RideMapLocationBlock from "./Rides/RideMapLocationBlock";

// Razorpay loading (unchanged)
let RazorpayCheckout: any = null;
if (Platform.OS === "android" || Platform.OS === "ios") {
  try {
    // @ts-ignore
    RazorpayCheckout =
      require("react-native-razorpay").default ||
      require("react-native-razorpay");
  } catch (e) {
    RazorpayCheckout = null;
  }
}

const MyActiveRideScreen = () => {
  const [isConfirmCancelRide, setIsConfirmCancelRide] = useState(false);
  const [isCancellingRide, setIsCancellingRide] = useState(false);
  const [otpPopup, showOtpPopup] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const { t } = useTranslation();

  const { user } = useAuth();

  const { data, isFetching, isRefetching, isLoading, isError, refetch, error } =
    useQuery({
      queryKey: ["my-active-ride"],
      queryFn: () => apiService.getMyActiveRide(),
      staleTime: 60 * 1000, // 1 minute
      placeholderData: keepPreviousData,
    });
  const activeRide = data?.activeRide || null;

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleOtp = async () => {
    try {
      toast.dismiss();
      if (!activeRide || !otpCode) return;

      const response = await apiService.verifyRideWithCustomer(
        activeRide?.id,
        otpCode,
      );
      if (response.success) {
        showOtpPopup(false);
        setOtpCode("");
        refetch?.();
        toast.success(response.message);
      } else {
        toast.error(
          t(
            "booking.invalidOtp",
            "The OTP code you entered is incorrect. Please try again.",
          ),
        );
      }
    } catch (err: any) {
      console.log("CATCH VERIFY OTP", err.message);
      toast.error(
        t("booking.otpVerificationFailed", {
          defaultValue:
            err.message || "Failed to verify OTP. Please try again later.",
        }),
      );
    }
  };

  const handleCancelRide = async (rideId: string) => {
    try {
      toast.remove();
      setIsCancellingRide(true);
      setIsConfirmCancelRide(false);
      const response = await apiService.cancelActiveRide(rideId);
      if (response.success) {
        refetch();
        toast.success(response.message);
      } else {
        toast.error(response.message);
      }
    } catch (err: any) {
      console.log("CANCEL RIDE", err.message);
      toast.error(err.message);
    } finally {
      setIsCancellingRide(false);
    }
  };

  const handleBookingPay = async () => {
    try {
      toast.dismiss();

      if (!activeRide || !user) {
        toast.error("Invalid ride or user data.");
        return;
      }

      // 2. Fetch Order from backend
      let orderData;
      try {
        orderData = await apiService.createBookingPayOrder(activeRide.id);
      } catch (err: any) {
        toast.error("Failed to get payment order. Please try again.");
        return;
      }
      if (!orderData || !orderData.order?.id || !orderData.payAmount) {
        toast.error("Invalid order data from server.");
        return;
      }

      // 3. Construct options (defensively, e.g. ensure all required fields)
      const key = process.env.EXPO_PUBLIC_RAZORPAY_KEY || "";
      const name = process.env.EXPO_PUBLIC_APP_NAME || "Safar Path";

      if (!key) {
        toast.error("Razorpay Key is not configured. Please contact support.");
        return;
      }

      const options = {
        description: "Pay before start ride.",
        currency: "INR",
        key: key,
        amount: orderData.payAmount, // Should be in paise (integer)
        name: name,
        order_id: orderData.order.id,
        prefill: {
          email: user?.email || "email@example.com",
          contact: user?.mobile || "9999999999",
          name: user?.name || "John Doe",
        },
        theme: { color: "#045498" },
        config: {
          display: {
            blocks: {
              banks: {
                name: "Pay via Google Pay",
                instruments: [{ method: "upi", apps: ["google_pay"] }],
              },
            },
            sequence: ["block.banks"],
          },
        },
      };

      // 4. Defensive: ensure RazorpayCheckout exists and is an object/function
      if (Platform.OS !== "android" && Platform.OS !== "ios") {
        toast.error("Razorpay is only supported on real devices.");
        return;
      }
      if (!RazorpayCheckout || typeof RazorpayCheckout.open !== "function") {
        toast.error(
          "Razorpay module could not be loaded. Please reinstall the app or contact support.",
        );
        return;
      }

      try {
        toast.dismiss();
        RazorpayCheckout.open(options)
          .then(async (data: any) => {
            try {
              const verifyData = await apiService.verifyBookingPayment(
                activeRide.id,
                {
                  razorpay_order_id: data.razorpay_order_id,
                  razorpay_payment_id: data.razorpay_payment_id,
                  razorpay_signature: data.razorpay_signature,
                },
              );
              if (verifyData.success) {
                toast.success(
                  `Payment Successful. You can now start the ride.`,
                );
                refetch?.();
              } else {
                toast.error(`Verification Failed: ${verifyData.message}`);
              }
            } catch (err: any) {
              toast.error(
                `Could not verify payment: ${err?.message || "Unknown error"}`,
              );
            }
          })
          .catch((error: any) => {
            if (error && error.code === 0) {
              toast.error("Payment cancelled by user.");
            } else {
              console.log("Payment error: ", error);
              toast.error(
                error?.description ||
                  error?.message ||
                  "Payment Cancelled or Failed.",
              );
            }
          });
      } catch (err: any) {
        toast.error(
          "Could not launch Razorpay payment. Please restart the app or contact support.",
        );
        console.log("Outer Razorpay open error:", err);
      }
    } catch (err: any) {
      toast.error(
        err?.message || "Unknown error occured during payment. Try again.",
      );
      console.log("Payment outer err:", err);
    }
  };

  const customerInfo = (
    <View className="flex-row gap-2 px-4 py-2">
      <Ionicons name="calendar-outline" size={20} className="text-primary" />
      <Text className="text-base font-medium">
        {t("booking.date", "Date")}:
      </Text>
      <Text className="text-base font-bold text-primary">
        {activeRide?.bookingDate
          ? new Date(activeRide?.bookingDate).toLocaleString()
          : "-"}
      </Text>
    </View>
  );

  const riderInfo = (
    <View className="flex flex-row flex-wrap rounded-xl px-2 !text-lg">
      {/* Status */}
      <View className="flex flex-row gap-1 items-center px-2 py-2 w-1/2">
        <Ionicons
          name={
            activeRide?.status === "COMPLETED"
              ? "checkmark-circle"
              : activeRide?.status === "CANCELED"
                ? "close-circle"
                : activeRide?.status === "PENDING" ||
                    activeRide?.status === "ACTIVE"
                  ? "time"
                  : "ellipse"
          }
          size={20}
          className={
            activeRide?.status === "COMPLETED"
              ? "!text-green-500"
              : activeRide?.status === "CANCELED"
                ? "!text-red-400"
                : activeRide?.status === "PENDING" ||
                    activeRide?.status === "ACTIVE"
                  ? "!text-yellow-500"
                  : "!text-slate-400"
          }
        />
        <Text className="text-base font-semibold text-gray-600">
          {t("booking.status", "Status")}:
        </Text>
        <Text className="w-full text-base font-bold text-gray-800 uppercase">
          {activeRide?.status
            ? t(`booking.status_${activeRide?.status}`, {
                status: activeRide?.status,
                defaultValue:
                  activeRide?.status.charAt(0).toUpperCase() +
                  activeRide?.status.slice(1),
              })
            : "-"}
        </Text>
      </View>
      {/* Payment */}
      <View className="flex flex-row gap-1 items-center px-2 py-2 w-1/2">
        <Ionicons
          name={
            activeRide?.paymentStatus === "paid"
              ? "wallet"
              : activeRide?.paymentStatus === "pending"
                ? "card"
                : "alert-circle"
          }
          size={20}
          className={
            activeRide?.paymentStatus === "paid"
              ? "!text-green-500"
              : activeRide?.paymentStatus === "pending"
                ? "!text-yellow-400"
                : "!text-red-400"
          }
        />
        <Text className="text-base font-semibold text-gray-600">
          {t("booking.payment", "Payment")}:
        </Text>
        <Text className="w-full text-base font-bold text-gray-800 uppercase">
          {activeRide?.paymentStatus
            ? t(`booking.paymentStatus_${activeRide?.paymentStatus}`, {
                status: activeRide?.paymentStatus,
                defaultValue:
                  activeRide?.paymentStatus.charAt(0).toUpperCase() +
                  activeRide?.paymentStatus.slice(1),
              })
            : "-"}
        </Text>
      </View>
      {/* Truck Type */}
      <View className="flex flex-row gap-1 items-center px-2 py-2 w-1/2">
        <Ionicons name="car-outline" size={20} className="!text-indigo-500" />
        <Text className="text-base font-semibold text-gray-600">
          {t("bidding.truckType", "Truck Type")}:
        </Text>
        <Text className="ml-1 w-full text-base font-bold text-gray-800 uppercase">
          {activeRide?.truckType || "-"}
        </Text>
      </View>
      {/* Body Type */}
      <View className="flex flex-row gap-1 items-center px-2 py-2 w-1/2">
        <Ionicons name="cube-outline" size={20} className="!text-indigo-500" />
        <Text className="text-base font-semibold text-gray-600">
          {t("bidding.bodyType", "Body Type")}:
        </Text>
        <Text className="ml-1 w-full text-base font-bold text-gray-800 uppercase">
          {activeRide?.bodyType || "-"}
        </Text>
      </View>
      {/* Truck Length */}
      <View className="flex flex-row gap-1 items-center px-2 py-2 w-1/2">
        <Ionicons
          name="resize-outline"
          size={20}
          className="!text-indigo-500"
        />
        <Text className="text-base font-semibold text-gray-600">
          {t("bidding.truckLength", "Truck Length")}:
        </Text>
        <Text className="ml-1 text-base font-bold text-gray-800">
          {activeRide?.truckLength ? `${activeRide.truckLength} ft` : "-"}
        </Text>
      </View>
      {/* Load Capacity */}
      <View className="flex flex-row gap-1 items-center px-2 py-2 w-1/2">
        <Ionicons
          name="barbell-outline"
          size={20}
          className="!text-indigo-500"
        />
        <Text className="text-base font-semibold text-gray-600">
          {t("bidding.loadCapacity", "Load Capacity")}:
        </Text>
        <Text className="ml-1 text-base font-bold text-gray-800">
          {activeRide?.loadCapacity ? `${activeRide.loadCapacity} ton` : "-"}
        </Text>
      </View>
      {/* Estimated KM */}
      <View className="flex flex-row gap-1 items-center px-2 py-2 w-1/2">
        <Ionicons
          name="speedometer-outline"
          size={20}
          className="!text-primary"
        />
        <Text className="text-base font-semibold text-gray-600">
          {t("bidding.estimatedKm", "Estimated Km")}:
        </Text>
        <Text className="ml-1 text-base font-bold text-gray-800">
          {activeRide?.estimatedKm || "-"} km
        </Text>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      {otpPopup && (
        <View className="absolute inset-0 z-[999] items-center justify-center bg-black/45">
          <View
            className="items-center px-7 py-7 w-11/12 bg-white rounded-2xl shadow-lg"
            style={{
              maxWidth: 340,
              elevation: 8,
            }}
          >
            <FontAwesome5
              name="shield-alt"
              size={32}
              color="#4F46E5"
              style={{ marginBottom: 10 }}
            />
            <Text className="mb-2 text-lg font-bold text-center text-primary">
              {t("booking.enterOtpTitle", "Customer Delivery Verification")}
            </Text>
            <Text className="flex-row mb-4 w-full text-center text-green-600 font-base">
              {t(
                "booking.enterOtpMessage",
                "Please collect payment from customer to finish the ride.",
              )}
            </Text>
            <View className="flex-row justify-center items-center mb-4">
              <TextInput
                className="mx-0 h-16 w-2/3 rounded-lg border-2 border-primary bg-white text-center text-[22px] font-bold tracking-widest text-primary"
                maxLength={6}
                keyboardType="numeric"
                value={otpCode.replace(/[^0-9]/g, "")}
                onChangeText={(text) => setOtpCode(text.replace(/[^0-9]/g, ""))}
                returnKeyType="done"
                inputMode="numeric"
              />
            </View>

            <Text className="mb-4 text-sm text-center text-gray-500">
              {t(
                "booking.otpInstruction",
                "Ask the customer for the OTP code to complete. ",
              )}
            </Text>
            <View className="flex-row gap-2 space-x-3 w-full">
              <TouchableOpacity
                className="flex-1 items-center py-3 bg-gray-200 rounded-xl"
                onPress={() => {
                  setOtpCode("");
                  showOtpPopup(false);
                }}
                activeOpacity={0.7}
              >
                <Text className="font-semibold text-gray-700">
                  {t("booking.cancel", "Cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 items-center rounded-xl bg-primary py-3 duration-200 disabled:!bg-danger"
                onPress={() => {
                  handleOtp();
                }}
                disabled={otpCode.length !== 6}
                activeOpacity={0.85}
              >
                <Text className="font-bold text-white">
                  {t("booking.confirm", "Confirm")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <ConfirmPopup
        show={isConfirmCancelRide}
        loading={isCancellingRide}
        onCancel={() => setIsConfirmCancelRide(false)}
        onConfirm={() => handleCancelRide(activeRide?.id)}
        title={t("booking.cancelRide", "Cancel Ride")}
        subTitle={t(
          "booking.cancelRideSubTitle",
          "Are you sure you want to cancel this ride?",
        )}
        confirmText={t("booking.confirm", "Confirm")}
        cancelText={t("booking.cancel", "Cancel")}
        confirmClassName="bg-danger"
      />
      <ScrollView
        className="flex-1 px-5 py-5 bg-screen"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isFetching || isRefetching}
            onRefresh={onRefresh}
          />
        }
      >
        {isLoading ? (
          <View className="items-center py-16">
            <Ionicons name="car-sport-outline" size={48} color="#D1D5DB" />
            <Text className="mt-4 text-base font-medium text-gray-500">
              {t("booking.loadingActiveRide", "Loading your active ride...")}
            </Text>
          </View>
        ) : isError ? (
          <View className="items-center py-16">
            <Ionicons name="alert-circle-outline" size={48} color="#F87171" />
            <Text className="mt-4 text-base font-medium text-red-500">
              {error?.message ||
                t(
                  "booking.failedToLoadActiveRide",
                  "Failed to load active ride.",
                )}
            </Text>
            <TouchableOpacity
              className="px-6 py-2 mt-4 rounded-xl bg-primary"
              onPress={onRefresh}
            >
              <Text className="text-white">{t("booking.retry", "Retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : !activeRide ? (
          <View className="items-center py-16">
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text className="mt-4 text-base font-medium text-gray-500">
              {t("booking.noActiveRide", "You are not running any active ride")}
            </Text>
          </View>
        ) : (
          <View className="overflow-hidden flex-col gap-2 rounded-2xl border-2 shadow-lg border-primary bg-screen">
            <RideMapLocationBlock activeRide={activeRide} />

            {customerInfo}

            {riderInfo}

            {activeRide?.paymentId && activeRide?.owner && (
              <View className="flex-row gap-4 items-center p-4 mx-2 my-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                <View className="flex-shrink-0 p-3 rounded-full bg-primary/10">
                  <FontAwesome5 name="user" size={22} color="#045498" />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-base font-semibold text-primary"
                    numberOfLines={1}
                  >
                    {activeRide?.owner?.name ||
                      t("booking.unknownUser", "Customer")}
                  </Text>
                  {activeRide?.owner?.email && (
                    <View className="flex-row items-center mt-1">
                      <Ionicons
                        name="mail-outline"
                        size={16}
                        className="!text-primary"
                      />
                      <Text
                        className="ml-2 text-xs font-semibold text-primary"
                        numberOfLines={1}
                      >
                        {activeRide?.owner?.email}
                      </Text>
                    </View>
                  )}
                  {activeRide?.owner?.mobile && (
                    <TouchableOpacity
                      className="flex-row items-center mt-1"
                      onPress={() => {
                        let number = String(
                          activeRide.owner.mobile || "",
                        ).replace(/\s+/g, "");
                        Linking.openURL(`tel:${number}`);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="call-outline"
                        size={16}
                        className="!text-primary"
                      />
                      <Text
                        className="ml-2 text-xs font-semibold underline text-primary"
                        numberOfLines={1}
                      >
                        {activeRide?.owner?.mobile}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {activeRide?.owner?.mobile && (
                  <TouchableOpacity
                    className="p-2 bg-green-100 rounded-full"
                    onPress={() => {
                      let number = String(
                        activeRide.owner.mobile || "",
                      ).replace(/\s+/g, "");
                      Linking.openURL(`tel:${number}`);
                    }}
                    accessibilityLabel={t(
                      "booking.callCustomer",
                      "Call Customer",
                    )}
                  >
                    <Ionicons name="call" size={22} className="!text-primary" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View className="px-2 my-4">
              {activeRide?.paymentId == null ? (
                <TouchableOpacity
                  onPress={handleBookingPay}
                  activeOpacity={0.85}
                >
                  <View className="flex-row flex-1 justify-center items-center px-3 py-3 mb-4 w-full h-14 rounded-lg border border-primary bg-primary">
                    <FontAwesome5
                      name="credit-card"
                      size={18}
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-base font-semibold text-white">
                      {t(
                        "booking.payAndContinue",
                        `Pay ${activeRide.driverCommissionPercentAmount} to Start Ride`,
                      )}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={async () => {
                    showOtpPopup(true);
                  }}
                  className="flex-row flex-1 justify-center items-center px-3 py-3 mb-4 w-full h-14 rounded-lg border border-primary bg-primary"
                  activeOpacity={0.85}
                >
                  <FontAwesome5
                    name="check-circle"
                    size={18}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-base font-semibold text-white">
                    {t(
                      "booking.completeRide",
                      "Complete Ride (with Verification)",
                    )}
                  </Text>
                </TouchableOpacity>
              )}

              {activeRide?.paymentId === null && (
                <TouchableOpacity
                  onPress={async () => {
                    setIsConfirmCancelRide(true);
                  }}
                  className="flex-row flex-1 justify-center items-center px-3 py-3 mb-2 w-full h-14 rounded-lg border border-danger bg-danger"
                  activeOpacity={0.85}
                >
                  <MaterialIcons
                    name="cancel"
                    size={20}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-base font-semibold text-white">
                    {t("booking.cancelRide", "Cancel Ride")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default MyActiveRideScreen;
