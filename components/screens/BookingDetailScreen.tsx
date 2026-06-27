import { toast } from "@backpackapp-io/react-native-toast";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import apiService from "../../services/api.service";
import socketService from "../../services/socket";
import VehicleLiveLocationModal from "../common/VehicleLiveLocationModal";

// Small helper for formatting currency (assumes value is in cents)
function formatINR(minor?: number): string {
  if (typeof minor !== "number") return "₹0";
  return "₹" + minor.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

// Fallback/placeholder for driver photo
const DEFAULT_PHOTO =
  "https://ui-avatars.com/api/?name=Driver&background=random&size=128";

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [booking, setBooking] = useState<any>(null);
  const [liveLocation, setLiveLocation] = useState<any>({
    show: false,
  });
  const [showOtpModal, setShowOtpModal] = useState<any>(null);
  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);

  const pickupCoordinate = useMemo(() => {
    if (
      booking?.fromLatitude != null &&
      booking?.fromLongitude != null &&
      !isNaN(Number(booking.fromLatitude)) &&
      !isNaN(Number(booking.fromLongitude))
    ) {
      return {
        latitude: Number(booking.fromLatitude),
        longitude: Number(booking.fromLongitude),
      };
    }
    return null;
  }, [booking?.fromLatitude, booking?.fromLongitude]);
  const dropoffCoordinate = useMemo(() => {
    if (
      booking?.toLatitude != null &&
      booking?.toLongitude != null &&
      !isNaN(Number(booking.toLatitude)) &&
      !isNaN(Number(booking.toLongitude))
    ) {
      return {
        latitude: Number(booking.toLatitude),
        longitude: Number(booking.toLongitude),
      };
    }
    return null;
  }, [booking?.toLatitude, booking?.toLongitude]);
  // NEW: Collect all valid marker coordinates for fitToCoordinates
  const markerCoords = useMemo(() => {
    const coords = [];
    if (pickupCoordinate) coords.push(pickupCoordinate);
    if (dropoffCoordinate) coords.push(dropoffCoordinate);
    return coords;
  }, [pickupCoordinate, dropoffCoordinate]);

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

  const handleGenerateOtp = async () => {
    try {
      const data = await apiService.regenerateBookingOtp(id);
      if (data.success) {
        await loadBooking();
        toast.success(data.message || "OTP generated");
      }
    } catch (err: any) {
      toast.remove();
      toast.error(err.message || "Failed to generate OTP");
    }
  };

  const loadBooking = useCallback(async () => {
    if (!id) {
      setLoading(false);
      toast.error(t("bidding.loadFailed"));
      router.back();
      return;
    }
    setLoading(true);
    try {
      const res = await apiService.getBookingById(id);
      console.log("res", res.booking);
      if (res && res.success && res.booking) {
        setBooking(res.booking);
      } else {
        toast.error(res?.message || t("bidding.loadFailed"));
        // router.back();
      }
    } catch (err: any) {
      console.log("err?.message", err?.message);
      toast.error(err?.message || t("bidding.loadFailed"));
      // router.back();
    } finally {
      setLoading(false);
      console.log("data finally");
    }
  }, [id, t]); // dependencies used inside loadBooking

  useEffect(() => {
    if (!id) return;
    socketService.connect();
    socketService.emit("booking:subscribe", id);
    const refresh = () => loadBooking();
    socketService.on("booking:bid", refresh);
    socketService.on("booking:bid_accepted", refresh);
    socketService.on("booking:payment", refresh);
    refresh();
    return () => {
      socketService.emit("booking:unsubscribe", id);
      socketService.off("booking:bid", refresh);
      socketService.off("booking:bid_accepted", refresh);
      socketService.off("booking:payment", refresh);
    };
  }, [id]);

  const onAccept = async (bidId: string) => {
    if (!id) return;
    Alert.alert(t("bidding.acceptTitle"), t("bidding.acceptConfirm"), [
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
    ]);
  };

  // if (loading || !booking) {
  //   return (
  //     <SafeAreaView className="flex-1 justify-center items-center bg-screen">
  //       <ActivityIndicator size="large" color="#9333ea" />
  //     </SafeAreaView>
  //   );
  // }

  const isCustomer = user?.id === booking?.customerId;

  // Sort bids by createdAt descending (latest first)
  const sortedBids =
    booking?.bids
      ?.slice()
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ) ?? [];

  // Show detail block for the booking itself
  const detailBlock = (
    <View className="p-2 mb-4">
      {pickupCoordinate && dropoffCoordinate && (
        <View
          className="overflow-hidden rounded-xl border-2 border-primary"
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
            {/* Show PICKUP marker */}
            <Marker
              coordinate={pickupCoordinate}
              title={t("booking.pickup", "Pickup Location")}
              description={booking.fromAddress}
            >
              <FontAwesome5 name="map-marker" size={22} color="#4F46E5" />
            </Marker>
            {/* Show DROPOFF marker */}
            <Marker
              coordinate={dropoffCoordinate}
              title={t("booking.dropoff", "Drop Location")}
              description={booking.toAddress}
            >
              <FontAwesome5 name="map-marker" size={22} color="#6366F1" />
            </Marker>
          </MapView>

          <View className="absolute right-4 bottom-4 z-50">
            <TouchableOpacity
              onPress={() => {
                const fromLat = booking.fromLatitude;
                const fromLng = booking.fromLongitude;
                const toLat = booking.toLatitude;
                const toLng = booking.toLongitude;
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
      <View className="flex-col gap-2 items-center my-2 mt-4">
        <View className="flex-row gap-4 items-start">
          <FontAwesome5 name="map-marker" size={22} color="#4F46E5" />
          <Text className="flex-shrink text-base font-semibold text-primary">
            {booking?.fromAddress || "-"}
          </Text>
        </View>
        <Ionicons
          name="arrow-down"
          size={18}
          color="#6B7280"
          className="mx-2"
        />
        <View className="flex-row gap-4 items-start">
          <FontAwesome5 name="map-marker" size={22} color="#6366F1" />
          <Text className="flex-shrink text-base font-semibold text-gray-800">
            {booking?.toAddress || "-"}
          </Text>
        </View>
      </View>

      {/* Date/time block at top for better readability */}
      <View className="flex-row items-center my-2">
        <Ionicons
          name="calendar-outline"
          size={20}
          color="#7c3aed"
          className="mr-1"
        />
        <Text className="text-sm font-medium text-gray-600">
          {t("booking.date", "Date")}:{" "}
        </Text>
        <Text className="text-sm font-semibold text-gray-800">
          {booking?.bookingDate
            ? new Date(booking.bookingDate).toLocaleString()
            : "-"}
        </Text>
      </View>

      <View className="flex-row flex-wrap items-center px-2 py-2 mt-2 rounded-lg">
        {/* Status */}
        <View className="flex-row gap-1 items-center p-1 w-1/2">
          <Ionicons
            name={
              booking?.status === "COMPLETED"
                ? "checkmark-circle"
                : booking?.status === "CANCELLED"
                  ? "close-circle"
                  : booking?.status === "PENDING"
                    ? "time"
                    : "ellipse"
            }
            size={18}
            color={
              booking?.status === "COMPLETED"
                ? "#22c55e"
                : booking?.status === "CANCELLED"
                  ? "#ef4444"
                  : booking?.status === "PENDING"
                    ? "#fbbf24"
                    : "#64748b"
            }
            style={{ marginRight: 4 }}
          />
          <Text className="text-sm font-semibold text-gray-900">
            {t("booking.status", "Status")}:{" "}
            {booking?.status
              ? String(
                  t(`booking.status_${booking?.status}`, {
                    status: booking.status,
                    defaultValue:
                      booking.status.charAt(0).toUpperCase() +
                      booking.status.slice(1),
                  }),
                )
              : "-"}
          </Text>
        </View>
        {/* Payment */}
        <View className="flex-row gap-1 items-center p-1 w-1/2">
          <Ionicons
            name={
              booking?.paymentStatus === "paid"
                ? "wallet"
                : booking?.paymentStatus === "pending"
                  ? "card"
                  : "alert"
            }
            size={18}
            color={
              booking?.paymentStatus === "paid"
                ? "#22c55e"
                : booking?.paymentStatus === "pending"
                  ? "#fbbf24"
                  : "#ef4444"
            }
            style={{ marginRight: 4 }}
          />
          <Text className="text-sm font-semibold text-gray-900">
            {t("booking.payment", "Payment")}:{" "}
            {booking?.paymentStatus
              ? String(
                  t(`booking.paymentStatus_${booking?.paymentStatus}`, {
                    status: booking.paymentStatus,
                    defaultValue:
                      booking.paymentStatus.charAt(0).toUpperCase() +
                      booking.paymentStatus.slice(1),
                  }),
                )
              : "-"}
          </Text>
        </View>
        {/* Truck Type */}
        <View className="flex-row gap-1 items-center p-1 w-1/2">
          <Ionicons
            name="car-outline"
            size={18}
            color="#6366f1"
            style={{ marginRight: 4 }}
          />
          <Text className="text-sm text-gray-600">
            {t("bidding.truckType", "Truck Type")}:
          </Text>
          <Text className="text-sm font-semibold text-gray-900">
            {booking?.truckType || "-"}
          </Text>
        </View>
        {/* Body Type */}
        <View className="flex-row gap-1 items-center p-1 w-1/2">
          <Ionicons
            name="cube-outline"
            size={18}
            color="#38bdf8"
            style={{ marginRight: 4 }}
          />
          <Text className="text-sm text-gray-600">
            {t("bidding.bodyType", "Body Type")}:
          </Text>
          <Text className="text-sm font-semibold text-gray-900">
            {booking?.bodyType || "-"}
          </Text>
        </View>
        {/* Truck Length */}
        <View className="flex-row gap-1 items-center p-1 w-1/2">
          <Ionicons
            name="resize-outline"
            size={18}
            color="#7c3aed"
            style={{ marginRight: 4 }}
          />
          <Text className="text-sm text-gray-600">
            {t("bidding.truckLength", "Truck Length")}:
          </Text>
          <Text className="text-sm font-semibold text-gray-900">
            {booking?.truckLength || "-"}
          </Text>
        </View>
        {/* Load Capacity */}
        <View className="flex-row gap-1 items-center p-1 w-1/2">
          <Ionicons
            name="barbell-outline"
            size={18}
            color="#f59e42"
            style={{ marginRight: 4 }}
          />
          <Text className="text-sm text-gray-600">
            {t("bidding.loadCapacity", "Load Capacity")}:
          </Text>
          <Text className="text-sm font-semibold text-gray-900">
            {booking?.loadCapacity || "-"}
          </Text>
        </View>
        {/* Estimated KM */}
        <View className="flex-row gap-1 items-center p-1 w-1/2">
          <Ionicons
            name="speedometer-outline"
            size={18}
            color="#10b981"
            style={{ marginRight: 4 }}
          />
          <Text className="text-sm text-gray-600">
            {t("bidding.estimatedKm", "Estimated Km")}:
          </Text>
          <Text className="text-sm font-semibold text-gray-900">
            {booking?.estimatedKm || "-"} km
          </Text>
        </View>
      </View>

      {/* Improved and more prominent driver notes section */}
      {booking?.driverNotes ? (
        <View className="px-3 py-3 mt-4 bg-yellow-100 rounded-lg border-l-8 border-yellow-400 shadow-sm">
          <View className="flex-row items-center mb-2">
            <Ionicons
              name="information-circle"
              size={20}
              color="#b45309"
              className="mr-2"
            />
            <Text className="text-base font-bold text-yellow-900">
              {t("bidding.driverNote", "Driver Note")}
            </Text>
          </View>
          <Text className="text-sm italic leading-snug text-yellow-800">
            {booking.driverNotes}
          </Text>
        </View>
      ) : null}

      <View className="pt-2 mt-2 border-t border-gray-100">
        <Text className="text-xs text-gray-500">
          {t("booking.date")}:{" "}
          {booking?.bookingDate
            ? new Date(booking?.bookingDate).toLocaleString()
            : "-"}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-screen" edges={["top"]}>
      <View className="flex-row items-center px-4 py-2">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} className="!text-primary" />
        </TouchableOpacity>
        <Text className="flex-1 text-2xl font-bold text-primary">
          {t("bidding.bookingDetail")}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadBooking} />
        }
      >
        {detailBlock}

        <View className="mb-6">
          {/* List all bids, sorted by latest */}
          {sortedBids.length === 0 ? (
            <Text className="px-2 font-semibold text-primary">
              {t("bidding.noBidsYet")}
            </Text>
          ) : (
            <View className="mb-28">
              <Text className="mb-2 text-base font-bold text-primary">
                {t("booking.latestBids")}
              </Text>
              {sortedBids.map((bid: any) => (
                <View key={bid.id} className="flex-col gap-1 justify-start">
                  <View
                    className={`p-4 mb-3 rounded-xl border ${
                      bid.status === "ACCEPTED"
                        ? "bg-green-50 border-primary"
                        : "bg-white border-gray-100"
                    }  `}
                  >
                    <View className="flex-row gap-1 justify-between">
                      <View className="flex-row gap-1 items-center">
                        <View className="w-[34px] h-[34px] rounded-full bg-screen justify-center items-center ">
                          {bid?.driver?.photo ? (
                            <View className="w-[34px] h-[34px] rounded-full overflow-hidden">
                              <Image
                                source={{
                                  uri: bid?.driver?.photo || DEFAULT_PHOTO,
                                }}
                                className="w-8 h-8 bg-gray-200 rounded-full"
                                resizeMode="cover"
                              />
                            </View>
                          ) : (
                            <Text className="text-lg font-bold text-primary">
                              {bid?.driver.name?.[0]?.toUpperCase() || "U"}
                            </Text>
                          )}
                        </View>
                        <View className="flex-col !items-start gap-1 ml-2">
                          <Text className="font-bold text-gray-900">
                            {bid?.driver?.name ? (
                              bid?.driver.name
                            ) : (
                              <Text className="italic text-gray-500">
                                {t("booking.unknownUser")}
                              </Text>
                            )}
                          </Text>
                          {bid?.driver?.mobile && (
                            <View className="flex-row items-center">
                              <Text className="ml-1 text-xs text-gray-700">
                                {bid?.vehicle?.mobile || bid?.driver?.mobile}
                              </Text>
                            </View>
                          )}
                          <View className="flex-row items-center">
                            <Ionicons name="star" size={10} color="#fbbf24" />
                            <Text className="ml-1 text-xs text-gray-700">
                              {(bid?.driver?.rating ?? 0).toFixed(2)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View className="items-end ml-auto">
                        <Text className="mt-4 text-lg font-bold text-primary">
                          {formatINR(bid.amount)}
                        </Text>
                        {bid.status === "ACCEPTED" && (
                          <View className="flex-row items-center mt-1">
                            <Ionicons
                              name="checkmark-circle"
                              size={16}
                              color="#22c55e"
                            />
                            <Text className="ml-1 text-xs font-medium text-green-600">
                              {t("bidding.accepted")}
                            </Text>
                          </View>
                        )}
                      </View>
                      {/* Only show accept if customer, bid is pending, booking is open */}
                      {isCustomer &&
                        booking.biddingOpen &&
                        bid.status === "PENDING" && (
                          <TouchableOpacity
                            className="justify-center items-center self-center px-3 py-2 ml-4 rounded-lg bg-primary"
                            onPress={() => onAccept(bid.id)}
                            disabled={!!accepting}
                          >
                            {accepting === bid.id ? (
                              <ActivityIndicator color="#fff" />
                            ) : (
                              <Text className="text-sm font-semibold text-white">
                                {t("bidding.accept")}
                              </Text>
                            )}
                          </TouchableOpacity>
                        )}
                    </View>
                    {bid.status === "ACCEPTED" && (
                      <View>
                        <View className="flex-row gap-1 justify-between items-center p-1 mt-2 rounded-lg">
                          {/* <Text className="text-xs text-primary">
                              {t("bidding.vehicleInfo", "Vehicle Information")}
                            </Text> */}
                          {bid.vehicle ? (
                            <View className="flex-row gap-1 justify-between">
                              <View className="flex-1 gap-1 items-start">
                                <Text className="text-xs text-gray-600">
                                  {t(
                                    "bidding.vehicleDriverName",
                                    "Driver Name",
                                  )}
                                </Text>
                                <Text className="text-xs font-semibold text-gray-700">
                                  {bid.vehicle.driverName || "-"}
                                </Text>
                              </View>
                              <View className="flex-1 gap-1 items-start">
                                <Text className="text-xs text-gray-600">
                                  {t("bidding.vehicleRcNumber", "RC No.")}
                                </Text>
                                <Text className="text-xs font-semibold text-gray-700">
                                  {bid.vehicle.rcNumber || "-"}
                                </Text>
                              </View>
                              <View className="flex-1 gap-1 items-start">
                                <Text className="text-xs text-gray-600">
                                  {t("bidding.vehicleNumber", "Vehicle No.")}
                                </Text>
                                <Text className="text-xs font-semibold text-gray-700">
                                  {bid.vehicle.vehicleNumber || "-"}
                                </Text>
                              </View>
                              <View className="flex-1 gap-1 items-start">
                                <Text className="text-xs text-gray-600">
                                  {t("bidding.vehicleMobile", "Driver Mobile")}
                                </Text>
                                <Text className="text-xs font-semibold text-gray-700">
                                  {bid.vehicle.mobileNumber || "-"}
                                </Text>
                              </View>
                            </View>
                          ) : (
                            <Text className="flex-1 text-xs text-gray-400">
                              {t("bidding.noVehicleInfo") ||
                                "No vehicle information"}
                            </Text>
                          )}
                        </View>
                        <View className="mt-2">
                          {liveLocation.show && (
                            <VehicleLiveLocationModal
                              show={liveLocation.show}
                              onHide={() =>
                                setLiveLocation({
                                  show: false,
                                  latitude: liveLocation.latitude || 0,
                                  longitude: liveLocation.longitude || 0,
                                })
                              }
                              latitude={liveLocation.latitude || 0}
                              longitude={liveLocation.longitude || 0}
                            />
                          )}
                          <TouchableOpacity
                            className="flex-row justify-center items-center px-4 py-2 rounded-lg bg-primary"
                            onPress={() => {
                              setLiveLocation({
                                show: true,
                                latitude: bid?.driver?.latitude || 0,
                                longitude: bid?.driver?.longitude || 0,
                              });
                            }}
                          >
                            <Text className="font-semibold text-white">
                              {t(
                                "bidding.trackVehicle",
                                "Track Driver Live Location",
                              )}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* OTP Modal */}
        </View>
      </ScrollView>

      {/* Show 'Complete' and 'Pay' button fixed at the bottom using TailwindCSS */}
      {booking?.assignedDriverUserId && (
        <View className="absolute left-0 right-0 bottom-0 p-4 z-[1000] bg-white/95  shadow-lg">
          <TouchableOpacity
            className="flex-row justify-center items-center py-3 mb-2 w-full h-16 rounded-lg bg-primary"
            onPress={() => setShowOtpModal("complete")}
            activeOpacity={0.85}
          >
            <Text className="text-lg font-bold text-center text-white">
              {t("bidding.completeBooking", "Complete & Pay Remaining Amount")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showOtpModal && (
        <View className="absolute inset-0 !w-full z-[999] bg-black/45">
          <View className="flex-1 justify-center items-center px-6 bg-black/60">
            <View className="p-6 w-full max-w-sm bg-white rounded-xl shadow-xl">
              <Text className="mb-4 text-lg font-semibold text-center">
                {t("bidding.enterOtp", "OTP Code")}
              </Text>

              <View className="flex flex-col gap-2 justify-center items-center mb-4">
                <Ionicons name="warning" size={30} className="!text-danger" />
                <Text className="px-2 font-semibold leading-tight text-center text-md text-danger">
                  {t(
                    "bidding.remainingNote",
                    "When you share this OTP code with the driver. Your remaining amount will be deducted from your wallet.",
                  )}
                </Text>
              </View>

              {booking?.otpCode && (
                <View className="px-3 py-2 mb-4 w-full bg-white rounded-lg border border-primary">
                  <Text className="text-2xl font-bold tracking-widest text-center text-primary">
                    {booking.otpCode}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                className="px-3 py-2 mb-4 w-full rounded-lg border bg-primary border-primary"
                onPress={handleGenerateOtp}
              >
                <Text className="text-lg font-semibold text-center text-white">
                  {t("bidding.generateOtp", "Generate OTP")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="px-3 py-2 mb-4 w-full rounded-lg border-primary bg-screen"
                onPress={() => setShowOtpModal(null)}
              >
                <Text className="text-lg font-semibold text-center text-black">
                  {t("common.close", "Close")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
