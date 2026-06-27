import { toast } from "@backpackapp-io/react-native-toast";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Linking,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import MapView, { Marker } from "react-native-maps";
import { useAuth } from "../../context/AuthContext";
import apiService from "../../services/api.service";
import socketService from "../../services/socket";

const MyActiveRideScreen = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);

  // Track that fitToSuppliedMarkers has been run once after map is ready
  const [mapReady, setMapReady] = useState(false);
  const [otpPopup, showOtpPopup] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const { data, isLoading, isError, refetch, error } = useQuery({
    queryKey: ["my-active-ride"],
    queryFn: () => apiService.getMyActiveRide(),
    staleTime: 60 * 1000, // 1 minute,
    placeholderData: keepPreviousData,
  });
  const activeRide = data?.activeRide || null;

  // Memoize coordinates
  const userCoordinate = useMemo(() => {
    if (
      user?.latitude != null &&
      user?.longitude != null &&
      !isNaN(Number(user.latitude)) &&
      !isNaN(Number(user.longitude))
    ) {
      return {
        latitude: Number(user.latitude),
        longitude: Number(user.longitude),
      };
    }
    return null;
  }, [user?.latitude, user?.longitude]);

  const pickupCoordinate = useMemo(() => {
    if (
      activeRide?.fromLatitude != null &&
      activeRide?.fromLongitude != null &&
      !isNaN(Number(activeRide.fromLatitude)) &&
      !isNaN(Number(activeRide.fromLongitude))
    ) {
      return {
        latitude: Number(activeRide.fromLatitude),
        longitude: Number(activeRide.fromLongitude),
      };
    }
    return null;
  }, [activeRide?.fromLatitude, activeRide?.fromLongitude]);

  const dropoffCoordinate = useMemo(() => {
    if (
      activeRide?.toLatitude != null &&
      activeRide?.toLongitude != null &&
      !isNaN(Number(activeRide.toLatitude)) &&
      !isNaN(Number(activeRide.toLongitude))
    ) {
      return {
        latitude: Number(activeRide.toLatitude),
        longitude: Number(activeRide.toLongitude),
      };
    }
    return null;
  }, [activeRide?.toLatitude, activeRide?.toLongitude]);

  // NEW: Collect all valid marker coordinates for fitToCoordinates
  const markerCoords = useMemo(() => {
    const coords = [];
    if (userCoordinate) coords.push(userCoordinate);
    if (pickupCoordinate) coords.push(pickupCoordinate);
    if (dropoffCoordinate) coords.push(dropoffCoordinate);
    return coords;
  }, [userCoordinate, pickupCoordinate, dropoffCoordinate]);

  // Ensure ALL markers are visible (user, pickup, dropoff) once MapView is ready and coords available
  useEffect(() => {
    if (mapReady && mapRef.current) {
      // delay to ensure markers render before fitting
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(markerCoords, {
          edgePadding: {
            top: 60,
            bottom: 60,
            left: 60,
            right: 60,
          },
          animated: true,
        });
      }, 400);
    }
  }, [mapReady, markerCoords]);

  // Live socket updates for bookings
  useFocusEffect(
    useCallback(() => {
      socketService.connect();
      const onBookingUpdate = () => refetch();
      socketService.on("booking:updated", onBookingUpdate);
      socketService.on("booking:started", onBookingUpdate);
      socketService.on("booking:live", onBookingUpdate);
      socketService.on("booking:completed", onBookingUpdate);
      return () => {
        socketService.off("booking:updated", onBookingUpdate);
        socketService.off("booking:started", onBookingUpdate);
        socketService.off("booking:live", onBookingUpdate);
        socketService.off("booking:completed", onBookingUpdate);
      };
    }, [refetch]),
  );

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleOtp = async () => {
    // Use apiService to verify the customer's OTP for the active booking.
    // You may need to pass bookingId and OTP code.

    try {
      toast.remove();
      // If using a single activeBooking:
      if (!activeRide || !otpCode) return;

      const response = await apiService.verifyRideWithCustomer(
        activeRide.id,
        otpCode,
      );
      if (response.success) {
        // OTP verified successfully
        showOtpPopup(false); // Close OTP popup
        setOtpCode("");
        // Optionally trigger a refetch of bookings to update ride status
        refetch?.();
        toast.success(response.message);
      } else {
        // Handle unsuccessful verification (e.g., show error to user)
        toast.error(
          t(
            "booking.invalidOtp",
            "The OTP code you entered is incorrect. Please try again.",
          ),
        );
      }
      // Assuming response.data.success, adjust as needed
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

  return (
    <>
      {/* OTP Popup Modal */}
      <ScrollView className="flex-1 bg-screen">
        {otpPopup && (
          <View className="absolute inset-0 z-[999] bg-black/45 justify-center items-center">
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
              <Text className="mb-4 text-base text-center text-gray-700">
                {t(
                  "booking.enterOtpMessage",
                  "To complete this ride, verify with the customer's OTP code",
                )}
              </Text>
              <View className="flex-row justify-center items-center mb-4">
                <TextInput
                  className="w-2/3 h-16 rounded-lg border-2 border-primary bg-white text-[22px] font-bold text-primary text-center mx-0 tracking-widest"
                  maxLength={6}
                  keyboardType="numeric"
                  value={otpCode.replace(/[^0-9]/g, "")}
                  onChangeText={(text) =>
                    setOtpCode(text.replace(/[^0-9]/g, ""))
                  }
                  returnKeyType="done"
                  inputMode="numeric"
                />
              </View>

              <Text className="mb-4 text-sm text-center text-gray-500">
                {t(
                  "booking.otpInstruction",
                  "Ask the customer for the OTP code they have. Enter here for completion the ride.",
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
                    {t("Cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 items-center py-3 rounded-xl bg-primary disabled:!bg-danger duration-200"
                  onPress={() => {
                    handleOtp();
                  }}
                  disabled={otpCode.length !== 6}
                  activeOpacity={0.85}
                >
                  <Text className="font-bold text-white">{t("Confirm")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        <ScrollView
          className="flex-1 px-5 py-5 bg-screen"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
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
                <Text className="text-white">
                  {t("booking.retry", "Retry")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : !activeRide ? (
            <View className="items-center py-16">
              <Ionicons
                name="document-text-outline"
                size={64}
                color="#D1D5DB"
              />
              <Text className="mt-4 text-base font-medium text-gray-500">
                {t(
                  "booking.noActiveRide",
                  "You are not running any active ride",
                )}
              </Text>
            </View>
          ) : (
            <View className="overflow-hidden flex-col bg-white rounded-2xl border border-gray-200 shadow-lg">
              {pickupCoordinate && dropoffCoordinate && (
                <View
                  className="overflow-hidden mx-4 mt-5 mb-1 rounded-xl border border-gray-200"
                  style={{ height: 250 }}
                >
                  <MapView
                    style={{ flex: 1, minHeight: 220, minWidth: "100%" }}
                    ref={mapRef}
                    scrollEnabled={true}
                    zoomEnabled={true}
                    pitchEnabled={false}
                    rotateEnabled={false}
                    showsPointsOfInterest={false}
                    showsBuildings={false}
                    showsIndoors={false}
                    showsMyLocationButton={false}
                    onMapReady={() => setMapReady(true)}
                    // Remove initialRegion (so fitToCoordinates works consistently)
                    // Instead, even on first render, fit to all markers programmatically
                  >
                    {/* Show USER marker, if available */}
                    {userCoordinate && (
                      <Marker
                        coordinate={userCoordinate}
                        title={t("Your Location")}
                      >
                        <FontAwesome5
                          name="map-marker-alt"
                          size={25}
                          className="!text-red-500"
                        />
                      </Marker>
                    )}
                    {/* Show PICKUP marker */}
                    <Marker
                      coordinate={pickupCoordinate}
                      title={t("booking.pickup", "Pickup Location")}
                      description={activeRide.fromAddress}
                    >
                      <FontAwesome5
                        name="map-marker"
                        size={22}
                        color="#4F46E5"
                      />
                    </Marker>
                    {/* Show DROPOFF marker */}
                    <Marker
                      coordinate={dropoffCoordinate}
                      title={t("booking.dropoff", "Drop Location")}
                      description={activeRide.toAddress}
                    >
                      <FontAwesome5
                        name="map-marker"
                        size={22}
                        color="#6366F1"
                      />
                    </Marker>
                  </MapView>

                  <View className="absolute right-4 bottom-4 z-50">
                    <TouchableOpacity
                      onPress={() => {
                        const fromLat = activeRide.fromLatitude;
                        const fromLng = activeRide.fromLongitude;
                        const toLat = activeRide.toLatitude;
                        const toLng = activeRide.toLongitude;
                        let url = `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=driving`;
                        Linking.openURL(url);
                      }}
                      className="bg-primary rounded-3xl px-[20px] py-[8px] flex-row items-center shadow"
                      style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 5,
                        elevation: 2,
                      }}
                      activeOpacity={0.85}
                    >
                      <FontAwesome5
                        name="directions"
                        size={18}
                        color="#ffffff"
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={{
                          color: "#fff",
                          fontWeight: "bold",
                          fontSize: 16,
                        }}
                      >
                        {t("Get Direction")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View className="flex-row gap-4 items-center px-5 pt-5">
                <View className="flex-1">
                  <View className="flex-row gap-2 items-center">
                    <FontAwesome5 name="map-marker" size={22} color="#4F46E5" />
                    <Text
                      className="text-base font-semibold text-gray-900"
                      numberOfLines={1}
                    >
                      {activeRide.fromAddress}
                    </Text>
                  </View>
                  <View className="h-4 border-l-2 border-dashed border-gray-300 ml-[9px]" />
                  <View className="flex-row gap-2 items-center">
                    <FontAwesome5 name="map-marker" size={22} color="#6366F1" />
                    <Text
                      className="text-base font-semibold text-gray-700"
                      numberOfLines={1}
                    >
                      {activeRide.toAddress}
                    </Text>
                  </View>
                </View>
                <View className="items-end"></View>
              </View>

              {/* Customer/User Info */}
              <View className="flex-row items-center px-5 mt-5">
                <View className="flex overflow-hidden justify-center items-center w-10 h-10 rounded-full border bg-primary/10 border-primary">
                  <Text className="text-lg font-bold text-primary">
                    {(activeRide.owner?.name || "U")[0]}
                  </Text>
                </View>
                <View className="flex-1 ml-3">
                  <Text className="font-bold text-gray-900">
                    {activeRide.owner?.name ||
                      t("booking.unknownUser", "Customer")}
                  </Text>
                  {activeRide.owner?.mobile && (
                    <Text className="text-sm text-gray-400">
                      {activeRide.owner.mobile}
                    </Text>
                  )}
                </View>
                {activeRide.estimatedKm && (
                  <View className="items-end">
                    <Text className="text-lg font-bold text-primary">
                      {activeRide.estimatedKm} km
                    </Text>
                    <Text className="text-xs text-gray-400 mt-0.5">
                      {t("booking.estimatedKm", "Est. km")}
                    </Text>
                  </View>
                )}
              </View>

              {/* Ride Details */}
              <View className="px-5 pb-3 mt-5">
                <View className="flex-row flex-wrap gap-3 justify-between">
                  <View className="flex-row items-center mb-2">
                    <FontAwesome5
                      name={
                        activeRide.bodyType?.toLowerCase() === "open"
                          ? "truck"
                          : activeRide.bodyType?.toLowerCase() === "container"
                            ? "truck-moving"
                            : "truck-pickup"
                      }
                      size={16}
                      color="#4B5563"
                      style={{ marginRight: 6 }}
                    />
                    <Text className="text-sm font-medium text-gray-600">
                      {activeRide.truckType} • {activeRide.bodyType}
                    </Text>
                  </View>
                  {/* Height  */}
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="resize-outline" size={16} color="#4B5563" />
                    <Text className="ml-2 text-sm text-gray-600">
                      {activeRide.truckHeight
                        ? `${activeRide.truckHeight} ft`
                        : t("vehicles.notMentioned", "Not mentioned")}
                    </Text>
                  </View>
                  {/* Length */}
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="resize-sharp" size={16} color="#4B5563" />
                    <Text className="ml-2 text-sm text-gray-600">
                      {activeRide.truckLength
                        ? `${activeRide.truckLength} ft`
                        : t("vehicles.notMentioned", "Not mentioned")}
                    </Text>
                  </View>
                  {/* Load Capacity */}
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="cube-outline" size={16} color="#4B5563" />
                    <Text className="ml-2 text-sm text-gray-600">
                      {activeRide.loadCapacity
                        ? `${activeRide.loadCapacity} kg`
                        : t(
                            "vehicles.unknownLoadCapacity",
                            "Unknown load capacity",
                          )}
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
                      {activeRide.estimatedKm} km
                    </Text>
                  </View>
                  {/* Date/Time */}
                  {activeRide.bookingDate && (
                    <View className="flex-row items-center mb-2">
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color="#4B5563"
                      />
                      <Text className="ml-2 text-sm text-gray-600">
                        {new Date(activeRide.bookingDate).toLocaleDateString()}{" "}
                        {new Date(activeRide.bookingDate).toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </Text>
                    </View>
                  )}
                  {/* Status */}
                  <View className="flex-row items-center mb-2">
                    <Ionicons
                      name="radio-button-on-outline"
                      size={16}
                      color="#10B981"
                    />
                    <Text className="ml-2 text-sm font-semibold text-green-700">
                      {activeRide?.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Payment Status & Driver Note */}
              <View className="flex-col gap-2 px-5 pb-5">
                <View className="flex-row justify-between items-center mt-2">
                  <Text className="font-medium text-gray-600">
                    {t("booking.paymentStatus", "Payment Status")}
                  </Text>
                  <Text
                    className={`font-bold ${
                      activeRide.paymentStatus === "paid"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {t(`booking.paymentStatus.${activeRide.paymentStatus}`, {
                      defaultValue: activeRide.paymentStatus,
                    })}
                  </Text>
                </View>
                {!!activeRide.driverNotes && (
                  <View className="mt-2">
                    <Text className="font-medium text-gray-600">
                      {t("booking.driverNotes", "Driver's Notes")}
                    </Text>
                    <Text className="mt-1 text-base text-gray-900">
                      {activeRide.driverNotes}
                    </Text>
                  </View>
                )}
              </View>

              {/* Complete Ride Button with Customer Verification */}
              <View className="px-5 my-4">
                <TouchableOpacity
                  onPress={async () => {
                    showOtpPopup(true);
                  }}
                  className="flex-row flex-1 justify-center items-center px-3 py-3 mb-4 w-full h-14 rounded-lg border bg-primary border-primary"
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
              </View>
            </View>
          )}
        </ScrollView>
      </ScrollView>
    </>
  );
};

export default MyActiveRideScreen;
