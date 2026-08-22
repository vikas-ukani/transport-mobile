import { toast } from "@/lib/toast";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import apiService from "../../services/api.service";
import ConfirmPopup from "../common/ConfirmPopup";

// React Query key
const BOOKINGS_QUERY_KEY = ["my-bookings"];

interface Booking {
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
}

const PAGE_SIZE = 10;

const fetchBookings = async ({ pageParam = 1 }: { pageParam?: number }) => {
  const data = await apiService.getMyBookings({
    page: pageParam,
    limit: PAGE_SIZE,
  });
  if (!data.success) throw new Error("Failed to fetch bookings");
  return {
    bookings: data.bookings || [],
    nextPage:
      data.bookings && data.bookings.length >= PAGE_SIZE
        ? pageParam + 1
        : undefined,
  };
};

const MyBookingScreen = () => {
  const { t } = useTranslation();
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(
    null,
  );
  const refreshRef = useRef(false);

  // Infinite Query for bookings
  const {
    data,
    isLoading,
    isFetching,
    isRefetching,
    hasNextPage,
    fetchNextPage,
    refetch,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: BOOKINGS_QUERY_KEY,
    queryFn: fetchBookings,
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => lastPage.nextPage,
    staleTime: 1000 * 60 * 2, // 2m cache    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Refetch posts when coming back to this screen
  useFocusEffect(
    useCallback(() => {
      // When screen is focused, refetch posts to ensure latest
      refetch();
    }, [refetch]),
  );

  // Pull to refresh
  const onRefresh = useCallback(() => {
    refreshRef.current = true;
    refetch();
  }, [refetch]);

  // Flatten paginated data for render
  const bookings: Booking[] =
    data?.pages?.flatMap((page: any) => page.bookings) ?? [];

  // Infinite scroll - load more
  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage && !isFetching) {
      fetchNextPage();
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiService.deleteBookingById(id);
      toast.success(t("booking.bookingDeleted"));
      // Refetch bookings after deletion
      refetch();
    } catch (error) {
      console.error("Failed to delete booking:", error);
    } finally {
      setShowConfirmDelete(null);
    }
  };

  // Trigger pagination on scroll bottom
  const handleScroll = (e: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    const paddingToBottom = 60;
    if (
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom
    ) {
      handleLoadMore();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-screen">
      <ConfirmPopup
        loading={isLoading || isFetching}
        show={showConfirmDelete !== null}
        onCancel={() => setShowConfirmDelete(null)}
        onConfirm={() => handleDelete(showConfirmDelete!)}
        title="Delete?"
        subTitle="Are you sure you want to delete?"
      />

      <View className="flex-row justify-between items-center px-5 py-4 bg-white border-b border-gray-100 shadow-sm">
        <Text className="text-xl font-bold text-gray-900">
          {t("booking.myBookings")}
        </Text>
        <TouchableOpacity
          className=""
          activeOpacity={0.8}
          onPress={() =>
            router.push("/(apps)/book-vehicle", {
              screen: "MainTabs",
              params: { screen: "CreateBookVehicle" },
            } as any)
          }
        >
          <View
            className={`flex-row p-2 px-8 items-center !text-white gap-3 rounded-xl shadow-md bg-primary`}
          >
            <Ionicons name="add-circle-outline" size={22} color="white" />
            <Text className="text-lg font-semibold !text-white">
              {t("booking.title")}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5 py-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isFetching || isRefetching}
            onRefresh={onRefresh}
            colors={["#EF4444"]}
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={200}
      >
        {bookings.length > 0 ? (
          bookings.map((booking: Booking) => (
            <View
              key={`booking-${booking.id}-${booking.createdAt ?? ""}`}
              className="p-5 mb-4 rounded-xl border border-gray-100 shadow-md bg-secondScreen"
            >
              <View className="flex-row justify-between items-start mb-4">
                <TouchableOpacity
                  className=""
                  onPress={() => router.push(`/(apps)/bookings/${booking.id}`)}
                  activeOpacity={0.8}
                  accessibilityLabel={t("bidding.bookingDetail")}
                >
                  <View className="flex-1 mr-3">
                    <View className="flex-row items-center mb-2">
                      <Ionicons
                        name="location"
                        size={18}
                        className="!text-primary"
                      />
                      <Text
                        className="ml-2 text-base font-bold text-gray-900"
                        numberOfLines={1}
                      >
                        {booking?.fromAddress}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Ionicons
                        name="location"
                        size={18}
                        className="!text-primaryLight/50"
                      />
                      <Text
                        className="ml-2 text-base font-bold text-gray-900"
                        numberOfLines={1}
                      >
                        {booking.toAddress}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
              <View className="flex-row gap-2 justify-between">
                <View className="pt-4 space-y-2 border-t border-gray-100">
                  {/* Truck Type */}
                  <View className="flex-row items-center">
                    <FontAwesome5
                      name={
                        booking.bodyType?.toLowerCase() === "open"
                          ? "truck"
                          : booking.bodyType?.toLowerCase() === "container"
                            ? "truck-moving"
                            : "truck-pickup"
                      }
                      size={16}
                      color="#6B7280"
                      style={{ marginRight: 5 }}
                    />
                    <Text className="text-sm font-medium text-gray-600">
                      {booking.truckType} • {booking.bodyType}
                    </Text>
                  </View>
                  {/* Truck Height */}
                  <View className="flex-row gap-8 items-center mt-3">
                    <View className="flex-row items-center">
                      <Ionicons
                        name="resize-outline"
                        size={18}
                        color="#6B7280"
                      />
                      <Text className="ml-2 text-sm font-medium text-gray-600">
                        {booking.truckHeight
                          ? `${booking.truckHeight} feet`
                          : t("vehicles.notMentioned")}
                      </Text>
                    </View>
                    {/* Truck Width */}
                    <View className="flex-row items-center">
                      <Ionicons name="resize-sharp" size={18} color="#6B7280" />
                      <Text className="ml-2 text-sm font-medium text-gray-600">
                        {booking.truckLength
                          ? `${booking.truckLength} feet`
                          : t("vehicles.notMentioned")}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row gap-8 items-center mt-3">
                    {/* Traveled Distance */}
                    <View className="flex-row items-center">
                      <Ionicons
                        name="speedometer-outline"
                        size={18}
                        color="#6B7280"
                      />
                      <Text className="ml-2 text-sm font-medium text-gray-600">
                        {booking.estimatedKm} km
                      </Text>
                    </View>
                    {/* Load Capacity */}
                    <View className="flex-row items-center">
                      <Ionicons name="cube-outline" size={18} color="#6B7280" />
                      <Text className="ml-2 text-sm font-medium text-gray-600">
                        {booking.loadCapacity
                          ? `${booking.loadCapacity} ton`
                          : t("vehicles.unknownLoadCapacity")}
                      </Text>
                    </View>
                  </View>
                </View>
                <View className="flex-col gap-1 justify-evenly">
                  <View
                    className={`px-3 py-1.5 !rounded-lg ${
                      booking.status === "ACTIVE"
                        ? "bg-green-100"
                        : booking.status === "COMPLETED"
                          ? " !rounded-lg bg-primary/30"
                          : "bg-yellow-100"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        booking.status === "COMPLETED"
                          ? "text-green-700"
                          : booking.status === "FINISHED"
                            ? "text-primary"
                            : "text-yellow-700"
                      }`}
                    >
                      {booking.status.toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-row gap-3 justify-end mt-2">
                    {["PENDING"].includes(booking.status) && (
                      <TouchableOpacity
                        className="p-2 bg-purple-50 rounded-full"
                        onPress={() =>
                          router.push(`/(apps)/bookings/${booking.id}`)
                        }
                        activeOpacity={0.8}
                        accessibilityLabel={t("bidding.bookingDetail")}
                      >
                        <Ionicons
                          name="eye-outline"
                          size={20}
                          className="text-primary"
                        />
                      </TouchableOpacity>
                    )}
                    {["PENDING"].includes(booking.status) && (
                      <TouchableOpacity
                        className="p-2 bg-red-50 rounded-full"
                        onPress={() => setShowConfirmDelete(booking.id)}
                        activeOpacity={0.8}
                        accessibilityLabel="Delete booking"
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color="#EF4444"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View className="items-center py-16">
            <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
            <Text className="mt-4 text-base font-medium text-gray-500">
              {t("booking.noBookings")}
            </Text>
          </View>
        )}
        {/* Loader at the bottom when loading more */}
        {(isFetchingNextPage || (hasNextPage && bookings.length)) && (
          <View className="items-center py-4">
            <Text className="text-gray-500">
              {t("common.loading") || "Loading..."}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MyBookingScreen;
