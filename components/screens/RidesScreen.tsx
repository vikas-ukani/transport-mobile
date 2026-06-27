import { toast } from "@backpackapp-io/react-native-toast";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { useAuth, User } from "../../context/AuthContext";
import apiService from "../../services/api.service";
import socketService from "../../services/socket";

interface Bid {
  id: string;
  driver: {
    id: string;
    name: string;
    photo?: string | null;
    rating?: number;
  };
  amount: number;
  createdAt: string;
}

export interface Booking {
  id: string;
  bookingDate: string;
  status: string;
  driverNotes?: string;
  customerId: string;
  driver?: any;
  driverId?: number;
  fromAddress: string;
  fromLatitude?: number;
  fromLongitude?: number;
  toAddress: string;
  toLatitude?: number;
  toLongitude?: number;
  truckType: string;
  bodyType: string;
  truckLength?: string;
  truckHeight?: string;
  loadCapacity?: string;
  estimatedKm?: string;
  paymentStatus: string;
  shipment?: any[];
  createdAt: string;
  updatedAt: string;
  driverBookingRequests?: any[];
  owner: User | null;
}

const BidsModal = ({
  visible,
  onClose,
  bookingId,
}: {
  visible: boolean;
  onClose: () => void;
  bookingId: string | null;
}) => {
  const { user }: any = useAuth();
  const { t } = useTranslation();
  const [bids, setBids] = useState<Bid[]>([]);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBids = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getBidsForBooking(bookingId);
      if (res.success) {
        setBids(res.bids?.slice(0, 5) || []);
      } else {
        setError(res.message || t("booking.failedToLoadBids"));
        setBids([]);
      }
    } catch (e) {
      setError(t("booking.failedToLoadBids"));
      setBids([]);
    } finally {
      setLoading(false);
    }
  }, [bookingId, t]);

  useEffect(() => {
    if (visible && bookingId) {
      fetchBids();
      setAmount("");
    }
  }, [visible, bookingId, fetchBids]);

  const handleBid = async () => {
    toast.remove();
    if (!amount || !bookingId) {
      toast.error(t("booking.enterBidAmount"));
      setError(t("booking.enterBidAmount"));
      return;
    }

    setSubmitting(true);

    try {
      const bidValue = parseFloat(amount);
      if (isNaN(bidValue) || bidValue <= 0) {
        toast.error(t("booking.invalidBidAmount"));
        setError(t("booking.invalidBidAmount"));
        setSubmitting(false);
        return;
      }

      if (user?.walletAmount < bidValue) {
        toast.error(
          t("wallet.insufficientBalance") ||
            "Insufficient wallet balance to place this bid.",
        );
        setSubmitting(false);
        return;
      }
      const params = {
        amount: bidValue,
        note: "",
      };
      const res = await apiService.placeBid(bookingId, params);
      if (res.success) {
        toast.success(t("booking.bidSuccess"));
        setAmount("");
        fetchBids();
      } else {
        toast.error(res.message || t("booking.failedToBid"));
        setError(res.message || t("booking.failedToBid"));
      }
    } catch (e: any) {
      toast.error(e.message || t("booking.failedToBid"));
      setError(t("booking.failedToBid"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "flex-end",
          }}
        >
          <TouchableWithoutFeedback /* to allow inner tap to not dismiss */>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{
                backgroundColor: "white",
                padding: 20,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                minHeight: 350,
                maxHeight: 550,
                justifyContent: "flex-start",
              }}
            >
              <View style={{ alignItems: "center", marginBottom: 10 }}>
                <View
                  style={{
                    width: 50,
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: "#DDD",
                    marginBottom: 10,
                  }}
                />
                <Text
                  style={{
                    fontWeight: "700",
                    fontSize: 18,
                    color: "#222",
                  }}
                >
                  {t("booking.bidding")}
                </Text>
              </View>

              {loading ? (
                <Text style={{ alignSelf: "center", marginVertical: 30 }}>
                  {t("booking.loadingBids")}
                </Text>
              ) : bids.length > 0 ? (
                <>
                  <Text
                    style={{
                      marginBottom: 8,
                      color: "#444",
                      fontWeight: "500",
                    }}
                  >
                    {t("booking.latestBids")}
                  </Text>
                  <FlatList
                    data={bids}
                    keyExtractor={(bid) => bid.id}
                    renderItem={({ item }) => (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 8,
                          borderBottomColor: "#F3F4F6",
                          borderBottomWidth: 1,
                        }}
                      >
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            backgroundColor: "#F3F4F6",
                            justifyContent: "center",
                            alignItems: "center",
                            marginRight: 10,
                          }}
                        >
                          {item?.driver?.photo ? (
                            <View
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 17,
                                overflow: "hidden",
                              }}
                            >
                              <img
                                src={item.driver.photo || ""}
                                width={34}
                                height={34}
                              />
                            </View>
                          ) : (
                            <Text className="text-base font-bold text-primary">
                              {item.driver?.name?.[0]?.toUpperCase() || "U"}
                            </Text>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <View className="flex-row gap-2 justify-start items-center">
                            <Text style={{ color: "#222", fontWeight: "600" }}>
                              {item.driver.name || ""}
                            </Text>
                            {typeof item.driver?.rating === "number" && (
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                }}
                              >
                                <Ionicons
                                  name="star"
                                  size={15}
                                  color="#FBBF24"
                                  style={{ marginRight: 3 }}
                                />
                                <Text style={{ color: "#999", fontSize: 12 }}>
                                  {item.driver?.rating.toFixed(1)}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View>
                          <Text
                            className="font-bold text-primary text-[16px] select-none"
                            selectable={false}
                            style={{
                              filter:
                                user?.id !== item.driver.id
                                  ? "blur(4px)"
                                  : "blur(0px)",
                            }}
                          >
                            ₹ {item.amount}
                          </Text>
                        </View>
                      </View>
                    )}
                  />
                </>
              ) : (
                <View style={{ alignItems: "center", marginVertical: 30 }}>
                  <Text
                    className="text-primary"
                    style={{
                      fontWeight: "600",
                      fontSize: 18,
                      marginBottom: 10,
                    }}
                  >
                    {t("booking.noBidsYet")}
                  </Text>
                  <Text
                    style={{ color: "#888", fontSize: 14, textAlign: "center" }}
                  >
                    {t("booking.beFirstToBid")}
                  </Text>
                </View>
              )}

              <View style={{ marginTop: 20 }}>
                <Text
                  style={{ marginBottom: 2, color: "#333", fontWeight: "500" }}
                >
                  {t("booking.enterBidAmount")}
                </Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  placeholder={
                    t("booking.bidAmountPlaceholder") || "Enter your bid"
                  }
                  keyboardType="number-pad"
                  style={{
                    borderColor: "#E5E7EB",
                    borderWidth: 1,
                    borderRadius: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 16,
                  }}
                  editable={!submitting}
                />
                {!!error && (
                  <Text style={{ color: "red", marginTop: 2 }}>{error}</Text>
                )}
                <TouchableOpacity
                  activeOpacity={0.85}
                  className={`mt-[15px] py-[12px] px-6 rounded-[10px] shadow-md bg-primary items-center ${submitting ? "opacity-60" : "opacity-100"}`}
                  disabled={submitting || !amount}
                  onPress={handleBid}
                >
                  <Text className="font-bold text-white text-[16px]">
                    {t("booking.placeBid")}
                  </Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const RidesScreen = () => {
  const { t } = useTranslation();
  const { refreshWalletBalance } = useAuth();

  // No more local rides state. React Query will manage fetching and cache.
  const [page, setPage] = useState(1);
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Track if we are already fetching/at bottom to prevent double fetch
  const isFetchingMore = useRef(false);

  // React Query fetching
  const { data, isLoading, isError, isFetching, refetch, error } = useQuery({
    queryKey: ["all-rides", page],
    queryFn: () =>
      apiService.getDriverRides({
        page,
        limit: 10,
        tab: "all",
      }),
    placeholderData: keepPreviousData,
    // keepPreviousData lets us swap pages without flicker (if paging is implemented in future)
  });

  useEffect(() => {
    refreshWalletBalance();
  }, []);

  // Use socket to refetch rides on changes
  useFocusEffect(
    useCallback(() => {
      socketService.connect();
      const onNew = () => {
        refetch();
      };
      socketService.on("booking:created", onNew);
      socketService.on("booking:updated", onNew);
      return () => {
        socketService.off("booking:created", onNew);
        socketService.off("booking:updated", onNew);
      };
    }, [refetch]),
  );

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleBidPress = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowBidModal(true);
  };

  // Safely get rides array from data returned by useQuery
  const rides: Booking[] = data?.rides || [];
  const totalPages: number = data?.totalPages || 1; // update this if your backend returns total pages

  // Optionally, sort
  const filteredRides = [...rides].sort((a, b) => {
    if (a.status < b.status) return 1;
    if (a.status > b.status) return -1;
    return 0;
  });

  // Scroll handler: checks if user scrolled to end, then set next page
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isEnd =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 40;
    if (
      isEnd &&
      !isFetchingMore.current &&
      !isLoading &&
      !isFetching &&
      page < totalPages
    ) {
      isFetchingMore.current = true;
      setPage((prev) => prev + 1);
      // release after a small delay to prevent double-firing
      setTimeout(() => {
        isFetchingMore.current = false;
      }, 500);
    }
  };

  return (
    <>
      <ScrollView
        className="flex-1 px-5 py-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {isLoading ? (
          <View className="items-center py-16">
            <Ionicons name="time-outline" size={48} color="#D1D5DB" />
            <Text className="mt-4 text-base font-medium text-gray-500">
              {t("booking.loadingRides")}
            </Text>
          </View>
        ) : isError ? (
          <View className="items-center py-16">
            <Ionicons name="alert-circle-outline" size={48} color="#F87171" />
            <Text className="mt-4 text-base font-medium text-red-500">
              {error?.message || t("booking.failedToLoadRides")}
            </Text>
            <TouchableOpacity
              className="px-6 py-2 mt-4 rounded-xl bg-primary"
              onPress={onRefresh}
            >
              <Text className="text-white">{t("booking.retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : filteredRides.length > 0 ? (
          filteredRides.map((booking: Booking, idx: number) => (
            <View
              key={`booking-${booking.id}-${booking.createdAt ?? ""}-${idx}`}
              className="p-0 mb-6 bg-transparent"
            >
              <View className="overflow-hidden flex-col bg-white rounded-2xl border border-gray-200 shadow-lg">
                {/* Top Row: From - To with map pin icons */}
                <View className="flex-row gap-4 items-center px-5 pt-5">
                  <View className="flex-1">
                    <View className="flex-row gap-2 items-center">
                      <Ionicons
                        name="ellipse"
                        size={18}
                        color="#4F46E5"
                        className="text-primary"
                      />
                      <Text
                        className="text-base font-semibold text-gray-900"
                        numberOfLines={1}
                      >
                        {booking.fromAddress}
                      </Text>
                    </View>
                    <View className="h-4 border-l-2 border-dashed border-gray-300 ml-[9px]" />
                    <View className="flex-row gap-2 items-center">
                      <Ionicons
                        name="location"
                        size={18}
                        color="#F59E42"
                        className="text-orange-400"
                      />
                      <Text
                        className="text-base font-semibold text-gray-700"
                        numberOfLines={1}
                      >
                        {booking.toAddress}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end"></View>
                </View>

                {/* Booking User Info Card */}
                <View className="flex-row items-center px-5 mt-5">
                  <View className="flex overflow-hidden justify-center items-center w-10 h-10 rounded-full border bg-primary/10 border-primary">
                    <Text className="text-lg font-bold text-primary">
                      {(booking.owner?.name || "U")[0]}
                    </Text>
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="font-bold text-gray-900">
                      {booking.owner?.name || t("booking.unknownUser")}
                    </Text>
                  </View>
                  {booking.estimatedKm && (
                    <View className="items-end">
                      <Text className="text-lg font-bold text-primary">
                        {booking.estimatedKm} km
                      </Text>
                      <Text className="text-xs text-gray-400 mt-0.5">
                        {t("booking.estimatedKm")}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Ride Details Line */}
                <View className="px-5 pb-3 mt-5">
                  <View className="flex-row flex-wrap gap-3 justify-between">
                    {/* Truck Type / Body */}
                    <View className="flex-row items-center mb-2">
                      <FontAwesome5
                        name={
                          booking.bodyType?.toLowerCase() === "open"
                            ? "truck"
                            : booking.bodyType?.toLowerCase() === "container"
                              ? "truck-moving"
                              : "truck-pickup"
                        }
                        size={16}
                        color="#4B5563"
                        style={{ marginRight: 6 }}
                      />
                      <Text className="text-sm font-medium text-gray-600">
                        {booking.truckType} • {booking.bodyType}
                      </Text>
                    </View>

                    {/* Height  */}
                    <View className="flex-row items-center mb-2">
                      <Ionicons
                        name="resize-outline"
                        size={16}
                        color="#4B5563"
                      />
                      <Text className="ml-2 text-sm text-gray-600">
                        {booking.truckHeight
                          ? `${booking.truckHeight} ft`
                          : t("vehicles.notMentioned")}
                      </Text>
                    </View>

                    {/* Length */}
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="resize-sharp" size={16} color="#4B5563" />
                      <Text className="ml-2 text-sm text-gray-600">
                        {booking.truckLength
                          ? `${booking.truckLength} ft`
                          : t("vehicles.notMentioned")}
                      </Text>
                    </View>

                    {/* Load Capacity */}
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="cube-outline" size={16} color="#4B5563" />
                      <Text className="ml-2 text-sm text-gray-600">
                        {booking.loadCapacity
                          ? `${booking.loadCapacity} kg`
                          : t("vehicles.unknownLoadCapacity")}
                      </Text>
                    </View>

                    {/* Distance */}
                    <View className="flex-row items-center mb-2">
                      <Ionicons
                        name="speedometer-outline"
                        size={16}
                        color="#4B5563"
                      />
                      <Text className="ml-2 text-sm text-gray-600">
                        {booking.estimatedKm} km
                      </Text>
                    </View>

                    {/* Date/Time */}
                    {booking.createdAt && (
                      <View className="flex-row items-center mb-2">
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color="#4B5563"
                        />
                        <Text className="ml-2 text-sm text-gray-600">
                          {new Date(booking.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Action Button */}
                <View className="flex-row justify-end items-center px-5 pb-5">
                  <TouchableOpacity
                    activeOpacity={0.85}
                    className="px-6 py-2 mt-2 rounded-xl shadow-md bg-primary"
                    onPress={() => handleBidPress(booking)}
                  >
                    <Text className="text-base font-semibold text-white">
                      {t("booking.bookRide")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View className="items-center py-16">
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text className="mt-4 text-base font-medium text-gray-500">
              {t("booking.noRides")}
            </Text>
          </View>
        )}
        {/* Loader at bottom for next page */}
        {isFetching && page > 1 && (
          <View className="items-center py-4">
            <Ionicons name="time-outline" size={32} color="#a1a1aa" />
            <Text className="mt-2 text-gray-400">
              {t("booking.loadingMore")}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Popup Bid Modal */}
      <BidsModal
        visible={showBidModal}
        onClose={() => setShowBidModal(false)}
        bookingId={selectedBooking?.id || null}
      />
    </>
  );
};

export default RidesScreen;
