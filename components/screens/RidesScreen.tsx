import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";

import { toast } from "@backpackapp-io/react-native-toast";
import { useTranslation } from "react-i18next";
import { User } from "../../context/AuthContext";
import apiService from "../../services/api.service";
import socketService from "../../services/socket";

interface Booking {
  id: string;
  bookingDate: string;
  status: string;
  driverNotes?: string;

  // Customer details
  customerId: string;

  driver?: any; // Or a more detailed interface for Driver if available
  driverId?: number;

  // Shipment details
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

  // Pricing & Payment
  estimatedKm?: string;
  paymentStatus: string;

  shipment?: any[]; // Or a more detailed interface if you have it

  createdAt: string;
  updatedAt: string;

  driverBookingRequests?: any[]; // Or a more detailed interface if you have it

  owner: User | null;
}

const RidesScreen = () => {
  const { t } = useTranslation();

  const [rides, setRides] = useState<Booking[] | []>([]);
  const [loading, setLoading] = useState(false);
  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRides = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      setRefreshing(pageNum === 1 && append === false);

      const data = await apiService.getDriverRides({
        page: pageNum,
        limit: 10,
      });
      if (data.success) {
        const newRides = data.rides || [];
        setHasMore(newRides.length >= 10);

        setRides((prev) =>
          pageNum === 1 || !append ? newRides : [...prev, ...newRides],
        );
        setPage(pageNum);
      } else {
        toast.error(data.message || "Failed to load rides");
      }
    } catch (error) {
      console.error("Failed to fetch rides:", error);
      return [];
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRides();
  }, [loadRides]);

  const onRefresh = useCallback(() => {
    loadRides(1, false);
  }, [loadRides]);

  useFocusEffect(
    useCallback(() => {
      socketService.connect();
      const onNew = () => loadRides(1, false);
      socketService.on("booking:created", onNew);
      socketService.on("booking:updated", onNew);
      return () => {
        socketService.off("booking:created", onNew);
        socketService.off("booking:updated", onNew);
      };
    }, [loadRides]),
  );

  // Adds infinite scroll/pagination logic for loading more rides
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      loadRides(page + 1, true);
    }
  };

  const filteredRides = [...rides].sort((a, b) => {
    if (a.status < b.status) return 1;
    if (a.status > b.status) return -1;
    return 0;
  });

  return (
    <SafeAreaView className="flex-1 bg-screen">
      <View className="flex-row justify-between items-center px-5 py-4 bg-white border-b border-gray-100 shadow-sm">
        <Text className="text-xl font-bold text-gray-900">
          {t("booking.availableRides")}
        </Text>

        {/* <TouchableOpacity
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
        </TouchableOpacity>*/}
      </View>

      <ScrollView
        className="flex-1 px-5 py-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      >
        {filteredRides.length > 0 ? (
          filteredRides.map((booking: Booking) => (
            <View
              key={`booking-${booking.id}-${booking.createdAt ?? ""}`}
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
                  <View className="items-end">
                    {/* Ride Status */}
                    {/* <View
                      className={`px-3 py-1 rounded-full ${
                        booking.status === "success"
                          ? "bg-green-100"
                          : booking.status === "finished"
                            ? "bg-blue-100"
                            : booking.status === "pending"
                              ? "bg-yellow-100"
                              : "bg-gray-100"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          booking.status === "success"
                            ? "text-green-700"
                            : booking.status === "finished"
                              ? "text-blue-700"
                              : booking.status === "pending"
                                ? "text-yellow-600"
                                : "text-gray-500"
                        }`}
                      >
                        {booking.status.charAt(0).toUpperCase() +
                          booking.status.slice(1)}
                      </Text>
                    </View> */}
                  </View>
                </View>

                {/* Booking User Info Card */}
                <View className="flex-row items-center px-5 mt-5">
                  <View className="flex overflow-hidden justify-center items-center w-10 h-10 rounded-full border bg-primary/10 border-primary">
                    {/* Assume we have booking.bookedBy?.avatar or show initials */}
                    <Text className="text-lg font-bold text-primary">
                      {(booking.owner?.name || "U")[0]}
                    </Text>
                    {/* {booking.own?.avatar ? (
                      <Image
                        source={{ uri: booking.own.avatar }}
                        className="w-10 h-10 rounded-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <Text className="text-lg font-bold text-primary">
                        {(booking.bookedBy?.name || "U")[0]}
                      </Text>
                    )} */}
                  </View>
                  <View className="flex-1 ml-3">
                    <Text className="font-bold text-gray-900">
                      {booking.owner?.name || t("booking.unknownUser")}
                    </Text>
                    {booking.owner?.mobile && (
                      <Text className="text-sm text-gray-400">
                        {booking.owner.mobile}
                      </Text>
                    )}
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
                    onPress={() => {
                      // Implement driver request to take this ride logic here
                      // For now, navigate to ride details or trigger ride accept function
                      router.push(`/(apps)/rides/${booking.id}`);
                    }}
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
      </ScrollView>
    </SafeAreaView>
  );
};

export default RidesScreen;
