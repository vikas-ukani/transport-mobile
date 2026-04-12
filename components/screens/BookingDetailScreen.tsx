import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "@backpackapp-io/react-native-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import {
  formatMinorCurrency,
  useStripeTransportPayment,
} from "../../hooks/useStripeTransportPayment";
import apiService from "../../services/api.service";
import socketService from "../../services/socket";

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const { payForBooking } = useStripeTransportPayment();
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [booking, setBooking] = useState<any>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiService.getBookingById(id);
      if (res?.success && res.booking) setBooking(res.booking);
      else {
        toast.error(res?.message || t("bidding.loadFailed"));
        router.back();
      }
    } catch {
      toast.error(t("bidding.loadFailed"));
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!id) return;
    socketService.connect();
    socketService.emit("booking:subscribe", id);
    const refresh = () => load();
    socketService.on("booking:bid", refresh);
    socketService.on("booking:bid_accepted", refresh);
    socketService.on("booking:payment", refresh);
    return () => {
      socketService.emit("booking:unsubscribe", id);
      socketService.off("booking:bid", refresh);
      socketService.off("booking:bid_accepted", refresh);
      socketService.off("booking:payment", refresh);
    };
  }, [id, load]);

  const onAccept = async (bidId: string) => {
    if (!id) return;
    Alert.alert(
      t("bidding.acceptTitle"),
      t("bidding.acceptConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("bidding.accept"),
          onPress: async () => {
            setAccepting(bidId);
            try {
              const res = await apiService.acceptBookingBid(id, bidId);
              if (res?.success) {
                toast.success(res.message || t("bidding.accepted"));
                setBooking(res.booking);
              } else {
                toast.error(res?.message || t("bidding.acceptFailed"));
              }
            } catch (e: any) {
              toast.error(e?.message || t("bidding.acceptFailed"));
            } finally {
              setAccepting(null);
            }
          },
        },
      ],
    );
  };

  const onPay = async () => {
    if (!id) return;
    setPaying(true);
    try {
      const res = await payForBooking(id);
      if (res.ok) {
        toast.success(t("bidding.paidSuccess"));
        const w = await apiService.getWalletBalance();
        if (w?.success && typeof w.walletBalanceCents === "number") {
          await updateUser({ walletBalanceCents: w.walletBalanceCents });
        }
        await load();
      } else if (res.code === "INSUFFICIENT_WALLET") {
        Alert.alert(
          t("payment.insufficientWalletTitle"),
          t("payment.insufficientWalletBody"),
        );
      } else if (res.code === "BID_REQUIRED") {
        toast.error(res.message || t("bidding.payNeedBid"));
      } else {
        toast.error(res.message || t("bidding.payFailed"));
      }
    } finally {
      setPaying(false);
    }
  };

  if (loading || !booking) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#9333ea" />
      </SafeAreaView>
    );
  }

  const isCustomer = user?.id === booking.customerId;
  const pendingBids =
    booking.bids?.filter((b: any) => b.status === "pending") ?? [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-gray-900">
          {t("bidding.bookingDetail")}
        </Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        <View className="p-4 mb-4 bg-white rounded-2xl border border-gray-200">
          <Text className="text-sm text-gray-600">{booking.fromAddress}</Text>
          <Text className="mt-2 text-sm text-gray-800">{booking.toAddress}</Text>
          <Text className="mt-2 text-xs text-gray-500">
            {t("booking.status")}: {booking.status} · {booking.paymentStatus}
          </Text>
        </View>

        {isCustomer && booking.biddingOpen && (
          <View className="mb-2">
            <Text className="text-base font-bold text-gray-900 mb-2">
              {t("bidding.incomingBids")}
            </Text>
            {pendingBids.length === 0 ? (
              <Text className="text-gray-500">{t("bidding.noBidsYet")}</Text>
            ) : (
              pendingBids.map((b: any) => (
                <View
                  key={b.id}
                  className="p-4 mb-3 bg-white rounded-xl border border-gray-100"
                >
                  <Text className="font-semibold text-gray-900">
                    {b.driver?.name || t("booking.unknownUser")}
                  </Text>
                  <Text className="text-lg font-bold text-primary mt-1">
                    {formatMinorCurrency(b.fareOfferCents, "inr")}
                  </Text>
                  {b.note ? (
                    <Text className="mt-2 text-sm text-gray-600">{b.note}</Text>
                  ) : null}
                  <TouchableOpacity
                    className="mt-3 py-2.5 bg-primary rounded-lg items-center"
                    onPress={() => onAccept(b.id)}
                    disabled={!!accepting}
                  >
                    {accepting === b.id ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="font-semibold text-white">
                        {t("bidding.accept")}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {isCustomer &&
          !booking.biddingOpen &&
          booking.paymentStatus !== "Paid" && (
            <TouchableOpacity
              className="mb-8 py-4 bg-primary rounded-xl items-center flex-row justify-center gap-2"
              onPress={onPay}
              disabled={paying}
            >
              {paying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-semibold text-white">
                  {t("bidding.payFromWallet", {
                    amount: formatMinorCurrency(
                      booking.paymentAmountCents ?? 0,
                      "inr",
                    ),
                  })}
                </Text>
              )}
            </TouchableOpacity>
          )}

        {isCustomer && booking.paymentStatus === "Paid" && (
          <View className="p-4 mb-8 bg-green-50 rounded-xl border border-green-100">
            <Text className="font-semibold text-green-800">
              {t("bidding.paid")}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
