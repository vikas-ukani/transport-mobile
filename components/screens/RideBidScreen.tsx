import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "@backpackapp-io/react-native-toast";
import { useTranslation } from "react-i18next";
import apiService from "../../services/api.service";
import socketService from "../../services/socket";

const STEPS = [1, 2, 3] as const;

export default function RideBidScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [bidRupee, setBidRupee] = useState("");
  const [note, setNote] = useState("");
  const [bidsCount, setBidsCount] = useState(0);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const res = await apiService.getBookingById(id);
      if (res?.success && res.booking) {
        setBooking(res.booking);
        setBidsCount(
          res.booking._count?.bids ?? res.booking.bids?.length ?? 0,
        );
        const mine = res.booking.bids?.find(
          (b: any) => b.status === "pending",
        );
        if (mine?.fareOfferCents) {
          setBidRupee((mine.fareOfferCents / 100).toFixed(0));
        }
      } else {
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
    const sub = () => socketService.emit("booking:subscribe", id);
    sub();
    const onBid = () => {
      setBidsCount((c) => c + 1);
      load();
    };
    const onAccepted = () => {
      toast.success(t("bidding.acceptedLive"));
      load();
    };
    const onPayment = () => {
      toast(t("bidding.customerPaid"));
      load();
    };
    socketService.on("booking:bid", onBid);
    socketService.on("booking:bid_accepted", onAccepted);
    socketService.on("booking:payment", onPayment);
    return () => {
      socketService.emit("booking:unsubscribe", id);
      socketService.off("booking:bid", onBid);
      socketService.off("booking:bid_accepted", onAccepted);
      socketService.off("booking:payment", onPayment);
    };
  }, [id, load, t]);

  const rupeesToCents = (r: string) => {
    const n = parseFloat(r.replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n * 100);
  };

  const onSubmitBid = async () => {
    const cents = rupeesToCents(bidRupee);
    if (!cents || cents < 100) {
      toast.error(t("bidding.minBid"));
      return;
    }
    if (!id) return;
    setSubmitting(true);
    try {
      const res = await apiService.placeBookingBid(id, {
        fareOfferCents: cents,
        note: note.trim() || undefined,
      });
      if (res?.success) {
        toast.success(res.message || t("bidding.bidPlaced"));
        setStep(3);
        await load();
      } else {
        toast.error(res?.message || t("bidding.bidFailed"));
      }
    } catch (e: any) {
      toast.error(e?.message || t("bidding.bidFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !booking) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#9333ea" />
      </SafeAreaView>
    );
  }

  if (!booking.biddingOpen) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">
            {t("bidding.title")}
          </Text>
        </View>
        <View className="p-6">
          <Text className="text-base text-gray-700">
            {t("bidding.closed")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-gray-900">
          {t("bidding.title")}
        </Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" keyboardShouldPersistTaps="handled">
        <View className="flex-row justify-between mb-6">
          {STEPS.map((s) => (
            <View key={s} className="flex-1 items-center">
              <View
                className={`w-9 h-9 rounded-full items-center justify-center ${
                  step >= s ? "bg-primary" : "bg-gray-200"
                }`}
              >
                <Text
                  className={`font-bold ${step >= s ? "text-white" : "text-gray-600"}`}
                >
                  {s}
                </Text>
              </View>
              <Text className="px-1 mt-1 text-xs text-center text-gray-600">
                {s === 1
                  ? t("bidding.stepView")
                  : s === 2
                    ? t("bidding.stepPrice")
                    : t("bidding.stepSubmit")}
              </Text>
            </View>
          ))}
        </View>

        <View className="p-4 mb-4 bg-white rounded-2xl border border-gray-200">
          <Text className="text-xs font-semibold text-gray-500 uppercase">
            {t("bidding.route")}
          </Text>
          <Text className="mt-2 text-base font-semibold text-gray-900">
            {booking.fromAddress}
          </Text>
          <View className="my-1 ml-1 h-3 border-l-2 border-gray-300 border-dashed" />
          <Text className="text-base font-semibold text-gray-800">
            {booking.toAddress}
          </Text>
          {booking.estimatedKm ? (
            <Text className="mt-2 text-sm font-medium text-primary">
              ~{booking.estimatedKm} km · {booking.truckType} ·{" "}
              {booking.bodyType}
            </Text>
          ) : null}
          <Text className="mt-2 text-xs text-gray-500">
            {t("bidding.bidsOnRequest", { count: bidsCount })}
          </Text>
        </View>

        {step === 1 && (
          <TouchableOpacity
            className="items-center py-4 rounded-xl bg-primary"
            onPress={() => setStep(2)}
          >
            <Text className="text-base font-semibold text-white">
              {t("bidding.continueToPrice")}
            </Text>
          </TouchableOpacity>
        )}

        {step >= 2 && (
          <View className="p-4 mb-4 bg-white rounded-2xl border border-gray-200">
            <Text className="mb-2 text-sm font-semibold text-gray-700">
              {t("bidding.yourPriceInr")}
            </Text>
            <TextInput
              className="px-4 py-3 text-lg font-semibold rounded-xl border border-gray-200"
              keyboardType="decimal-pad"
              placeholder="e.g. 4500"
              value={bidRupee}
              onChangeText={setBidRupee}
              editable={!submitting}
            />
            {bidRupee ? (
              <Text className="mt-2 text-sm text-gray-600">
                0
              </Text>
            ) : null}
            <Text className="mt-4 mb-2 text-sm font-semibold text-gray-700">
              {t("bidding.noteOptional")}
            </Text>
            <TextInput
              className="px-4 py-3 text-base rounded-xl border border-gray-200"
              placeholder={t("bidding.notePlaceholder")}
              value={note}
              onChangeText={setNote}
              multiline
              editable={!submitting}
            />
            <TouchableOpacity
              className="flex-row gap-2 justify-center items-center py-4 mt-4 rounded-xl bg-primary"
              onPress={onSubmitBid}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-semibold text-white">
                  {t("bidding.submitBid")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View className="p-4 mb-8 bg-violet-50 rounded-2xl border border-violet-100">
            <Text className="text-base font-semibold text-violet-900">
              {t("bidding.submittedTitle")}
            </Text>
            <Text className="mt-2 text-sm text-violet-800">
              {t("bidding.submittedBody")}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
