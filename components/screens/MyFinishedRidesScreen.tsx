import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    NativeScrollEvent,
    NativeSyntheticEvent,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { RefreshControl, ScrollView } from "react-native-gesture-handler";
import { useAuth } from "../../context/AuthContext";
import { apiService } from "../../services/api.service";
import { socketService } from "../../services/socket";
import { Booking } from "./RidesScreen";

const MyFinishedRidesScreen = () => {
  const { t } = useTranslation();
  const { refreshWalletBalance } = useAuth();

  // No more local rides state. React Query will manage fetching and cache.
  const [page, setPage] = useState(1);
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);

  // Track if we are already fetching/at bottom to prevent double fetch
  const isFetchingMore = useRef(false);

  // React Query fetching
  const { data, isLoading, isError, isFetching, refetch, error } = useQuery({
    queryKey: ["all-finished-rides", page],
    queryFn: () =>
      apiService.getMyFinishedRide({
        page,
        limit: 10,
      }),
    placeholderData: keepPreviousData,
    // keepPreviousData lets us swap pages without flicker (if paging is implemented in future)
  });

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
                  <View className="flex flex-row justify-between items-center my-4 mb-2 space-x-2 w-full">
                    {/* Total Earning - Attractive card style */}
                    <View className="flex-row items-center p-2 bg-green-100 rounded-xl">
                      <FontAwesome5
                        name="wallet"
                        size={14}
                        color="#16A34A"
                        style={{ marginRight: 4 }}
                      />
                      <Text className="text-sm font-semibold text-green-700">
                        {"finalAmount" in booking &&
                        (booking?.paymentAmountCents || booking?.finalAmount)
                          ? `${booking?.paymentAmountCents || booking?.finalAmount} ${t("wallet.currency", { defaultValue: "₹" })}`
                          : t("wallet.noEarning", {
                              defaultValue: "No earning",
                            })}
                      </Text>
                    </View>

                    {/* Booking Status - More attractive with badge style */}
                    <View className="flex-row items-center mb-2 space-x-2">
                      <Ionicons
                        name="information-circle-outline"
                        size={17}
                        color="#6366F1"
                        style={{ marginTop: 1 }}
                      />
                      <View
                        className={`px-2 py-[2px] rounded-full ${
                          booking.status?.toLowerCase() === "completed"
                            ? "bg-green-100"
                            : booking.status?.toLowerCase() === "cancelled"
                              ? "bg-red-100"
                              : "bg-orange-100"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            booking.status?.toLowerCase() === "completed"
                              ? "text-green-700"
                              : booking.status?.toLowerCase() === "cancelled"
                                ? "text-red-700"
                                : "text-orange-700"
                          }`}
                        >
                          {t(
                            `booking.status.${booking.status?.toLowerCase()}`,
                            { defaultValue: booking.status ?? "Unknown" },
                          )}
                        </Text>
                      </View>
                    </View>
                  </View>
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
    </>
  );
};

export default MyFinishedRidesScreen;
