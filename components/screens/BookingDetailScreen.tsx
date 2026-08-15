import { toast } from "@backpackapp-io/react-native-toast";
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
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
import ConfirmPopup from "../common/ConfirmPopup";
import VehicleLiveLocationModal from "../common/VehicleLiveLocationModal";

// Small helper for formatting currency (assumes value is in cents)
function formatINR(minor?: number): string {
  if (typeof minor !== "number") return "₹0";
  return "₹" + minor.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [acceptBidId, setAcceptBidId] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState<boolean>(false);
  const [liveLocation, setLiveLocation] = useState<any>({
    show: false,
  });
  const [showOtpModal, setShowOtpModal] = useState<any>(null);
  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);

  // Double confirmation state for close booking
  const [isCancelConfirm, setIsCancelConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Improved: Use React Query useQuery to fetch booking by id - better error handling, clearer state, and data shape for future-friendly "Priya" UI refresh

  // Booking query with error and status refactoring
  const {
    data,
    isLoading: loading,
    refetch: refetchBooking,
  } = useQuery({
    queryKey: ["booking-detail", id],
    enabled: !!id,
    queryFn: async () => {
      if (!id)
        throw new Error(t("bidding.loadFailed", "Failed to load booking."));
      const res = await apiService.getBookingById(id);
      if (res?.success && res.booking) return res.booking;
      throw new Error(
        res?.message || t("bidding.loadFailed", "Failed to load booking."),
      );
    },
    // Always refetch every open/close
    // Disable all cache, always get fresh data from DB
    refetchOnMount: "always",
    staleTime: 1000 * 60 * 2, // 2m cache    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Consistent variable for current booking for Priya UI/logic upgrade
  const bookingData = data ?? null;

  useEffect(() => {
    refetchBooking();
  }, []);

  // Replace every usage of `booking` with `bookingData`
  const pickupCoordinate = useMemo(() => {
    if (
      bookingData?.fromLatitude != null &&
      bookingData?.fromLongitude != null &&
      !isNaN(Number(bookingData.fromLatitude)) &&
      !isNaN(Number(bookingData.fromLongitude))
    ) {
      return {
        latitude: Number(bookingData.fromLatitude),
        longitude: Number(bookingData.fromLongitude),
      };
    }
    return null;
  }, [bookingData?.fromLatitude, bookingData?.fromLongitude]);
  const dropoffCoordinate = useMemo(() => {
    if (
      bookingData?.toLatitude != null &&
      bookingData?.toLongitude != null &&
      !isNaN(Number(bookingData.toLatitude)) &&
      !isNaN(Number(bookingData.toLongitude))
    ) {
      return {
        latitude: Number(bookingData.toLatitude),
        longitude: Number(bookingData.toLongitude),
      };
    }
    return null;
  }, [bookingData?.toLatitude, bookingData?.toLongitude]);
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
        await refetchBooking();
        toast.success(data.message || "OTP generated");
      }
    } catch (err: any) {
      toast.remove();
      toast.error(err.message || "Failed to generate OTP");
    }
  };

  const onAccept = async (bidId: string) => {
    if (!id) return;
    setIsAccepting(true);
    toast.dismiss();
    try {
      const res = await apiService.acceptBookingBid(id, bidId);
      if (res?.success) {
        toast.success(res.message || t("bidding.accepted"));
        await refetchBooking();
      } else {
        toast.error(res?.message || t("bidding.acceptFailed"));
      }
    } catch (e: any) {
      toast.error(e?.message || t("bidding.acceptFailed"));
    } finally {
      setIsAccepting(false);
      setAcceptBidId(null);
    }
  };

  // if (loading || !booking) {
  //   return (
  //     <SafeAreaView className="flex-1 justify-center items-center bg-screen">
  //       <ActivityIndicator size="large" color="#9333ea" />
  //     </SafeAreaView>
  //   );
  // }

  const isCustomer = user?.id === bookingData?.customerId;

  // Sort bids by createdAt descending (latest first)
  const sortedBids =
    bookingData?.bids?.slice().sort(
      (a: any, b: any) => (a.amount ?? 0) - (b.amount ?? 0),
      // .sort(
      //   (a: any, b: any) =>
      //     new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ) ?? [];

  // Show detail block for the booking itself
  const detailBlock = (
    <View className="p-2 mb-2">
      {pickupCoordinate && dropoffCoordinate && (
        <View
          className="overflow-hidden rounded-xl border-2 border-primary"
          style={{ height: 380 }}
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
            showsMyLocationButton={true}
            onMapReady={() => setMapReady(true)}
            zoomControlEnabled={true}
            showsUserLocation={true}
            userLocationCalloutEnabled
          >
            {/* Show PICKUP marker */}
            <Marker
              coordinate={pickupCoordinate}
              title={t("booking.pickup", "Pickup Location")}
              description={bookingData?.fromAddress}
            >
              <FontAwesome5
                name="map-marker"
                size={22}
                className="!text-pickPin"
              />
            </Marker>
            {/* Show DROPOFF marker */}
            <Marker
              coordinate={dropoffCoordinate}
              title={t("booking.dropoff", "Drop Location")}
              description={bookingData?.toAddress}
            >
              <MaterialIcons
                name="pin-drop"
                size={30}
                className="!text-dropPin"
              />
              {/* <FontAwesome5 name="map-marker" size={22} color="#6366F1" /> */}
            </Marker>
          </MapView>

          <View className="absolute bottom-4 z-50 px-4 text-center">
            <TouchableOpacity
              onPress={() => {
                const fromLat = bookingData?.fromLatitude;
                const fromLng = bookingData?.fromLongitude;
                const toLat = bookingData?.toLatitude;
                const toLng = bookingData?.toLongitude;
                let url = `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&travelmode=driving`;
                Linking.openURL(url);
              }}
              className="flex-row justify-center items-center py-4 w-full h-full text-center rounded-xl shadow bg-primary"
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
                size={20}
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

      {/* Address Journey Block */}
      <View className="flex flex-col gap-4 items-center px-2 mt-6 mb-4 w-full">
        <View className="flex flex-row gap-3 items-center w-full max-w-md">
          <View className="flex flex-row flex-1 items-center">
            {/* Match from pin color to map: #ef4444 */}
            <FontAwesome5
              name="map-marker-alt"
              size={22}
              className="!text-pickPin"
            />
            <Text
              className="flex-1 ml-3 text-lg font-bold text-primary"
              numberOfLines={2}
            >
              {bookingData?.fromAddress || "-"}
            </Text>
          </View>
        </View>

        <View className="flex flex-row gap-3 items-center w-full max-w-md">
          <View className="flex flex-row flex-1 items-center">
            {/* Match to pin color to map: #6366F1 */}
            <FontAwesome5
              name="map-marker-alt"
              size={22}
              className="!text-dropPin"
            />
            <Text
              className="flex-1 ml-3 text-lg font-bold text-gray-800"
              numberOfLines={2}
            >
              {bookingData?.toAddress || "-"}
            </Text>
          </View>
        </View>
      </View>

      {/* Date/Time Block */}
      <View className="flex-row gap-2 py-2 mx-3 mb-3">
        <Ionicons name="calendar-outline" size={20} className="text-primary" />
        <Text className="text-base font-medium">
          {t("booking.date", "Date")}:
        </Text>
        <Text className="text-base font-bold text-primary">
          {bookingData?.bookingDate
            ? new Date(bookingData.bookingDate).toLocaleString()
            : "-"}
        </Text>
      </View>

      {/* Stats Card Grid */}
      <View className="flex flex-row flex-wrap rounded-xl">
        {/* Status */}
        <View className="flex flex-row gap-2 items-center py-2 w-1/2">
          <Ionicons
            name={
              bookingData?.status === "COMPLETED"
                ? "checkmark-circle"
                : bookingData?.status === "CANCELED"
                  ? "close-circle"
                  : bookingData?.status === "PENDING" ||
                      bookingData?.status === "ACTIVE"
                    ? "time"
                    : "ellipse"
            }
            size={20}
            className={
              bookingData?.status === "COMPLETED"
                ? "!text-green-500"
                : bookingData?.status === "CANCELED"
                  ? "!text-red-400"
                  : bookingData?.status === "PENDING" ||
                      bookingData?.status === "ACTIVE"
                    ? "!text-yellow-500"
                    : "!text-slate-400"
            }
          />
          <Text className="text-base font-semibold text-gray-600">
            {t("booking.status", "Status")}:
          </Text>
          <Text className="text-base font-bold text-gray-800 uppercase">
            {bookingData?.status
              ? t(`booking.status_${bookingData?.status}`, {
                  status: bookingData.status,
                  defaultValue:
                    bookingData.status.charAt(0).toUpperCase() +
                    bookingData.status.slice(1),
                })
              : "-"}
          </Text>
        </View>
        {/* Payment */}
        <View className="flex flex-row gap-2 items-center py-2 w-1/2">
          <Ionicons
            name={
              bookingData?.paymentStatus === "paid"
                ? "wallet"
                : bookingData?.paymentStatus === "pending"
                  ? "card"
                  : "alert-circle"
            }
            size={20}
            className={
              bookingData?.paymentStatus === "paid"
                ? "!text-green-500"
                : bookingData?.paymentStatus === "pending"
                  ? "!text-yellow-400"
                  : "!text-red-400"
            }
          />
          <Text className="text-base font-semibold text-gray-600">
            {t("booking.payment", "Payment")}:
          </Text>
          <Text className="w-full text-base font-bold text-gray-800 uppercase">
            {bookingData?.paymentStatus
              ? t(`booking.paymentStatus_${bookingData?.paymentStatus}`, {
                  status: bookingData.paymentStatus,
                  defaultValue:
                    bookingData.paymentStatus.charAt(0).toUpperCase() +
                    bookingData.paymentStatus.slice(1),
                })
              : "-"}
          </Text>
        </View>
        {/* Truck Type */}
        <View className="flex flex-row gap-2 items-center py-2 w-1/2">
          <Ionicons name="car-outline" size={20} className="!text-indigo-500" />
          <Text className="text-base font-semibold text-gray-600">
            {t("bidding.truckType", "Truck Type")}:
          </Text>
          <Text className="w-full text-base font-bold text-gray-800 uppercase">
            {bookingData?.truckType || "-"}
          </Text>
        </View>
        {/* Body Type */}
        <View className="flex flex-row gap-2 items-center py-2 w-1/2">
          <Ionicons
            name="cube-outline"
            size={20}
            className="!text-indigo-500"
          />
          <Text className="text-base font-semibold text-gray-600">
            {t("bidding.bodyType", "Body Type")}:
          </Text>
          <Text className="w-full text-base font-bold text-gray-800 uppercase">
            {bookingData?.bodyType || "-"}
          </Text>
        </View>
        {/* Truck Length */}
        <View className="flex flex-row gap-2 items-center py-2 w-1/2">
          <Ionicons
            name="resize-outline"
            size={20}
            className="!text-indigo-500"
          />
          <Text className="text-base font-semibold text-gray-600">
            {t("bidding.truckLength", "Truck Length")}:
          </Text>
          <Text className="w-full text-base font-bold text-gray-800">
            {bookingData?.truckLength ? `${bookingData.truckLength} ft` : "-"}
          </Text>
        </View>
        {/* Load Capacity */}
        <View className="flex flex-row gap-2 items-center py-2 w-1/2">
          <Ionicons
            name="barbell-outline"
            size={20}
            className="!text-indigo-500"
          />
          <Text className="text-base font-semibold text-gray-600">
            {t("bidding.loadCapacity", "Load Capacity")}:
          </Text>
          <Text className="w-full text-base font-bold text-gray-800">
            {bookingData?.loadCapacity
              ? `${bookingData.loadCapacity} ton`
              : "-"}
          </Text>
        </View>
        {/* Estimated KM */}
        <View className="flex flex-row gap-2 items-center py-2 w-1/2">
          <Ionicons
            name="speedometer-outline"
            size={20}
            className="!text-primary"
          />
          <Text className="text-base font-semibold text-gray-600">
            {t("bidding.estimatedKm", "Estimated Km")}:
          </Text>
          <Text className="text-base font-bold text-gray-800">
            {bookingData?.estimatedKm || "-"} km
          </Text>
        </View>
      </View>

      {/* Driver Notes Section */}
      {/* {bookingData?.driverNotes ? (
        <View className="px-4 py-4 mb-4 bg-yellow-50/80 rounded-xl border-l-2 !border-yellow-300 shadow">
          <View className="flex flex-row items-center mb-2">
            <Ionicons
              name="information-circle"
              size={22}
              className="mr-2 !text-yellow-600"
            />
            <Text className="text-lg font-extrabold text-yellow-900">
              {t("bidding.driverNote", "Driver Note")}
            </Text>
          </View>
          <Text className="text-base italic text-yellow-900">
            {bookingData.driverNotes}
          </Text>
        </View>
      ) : null} */}
    </View>
  );

  const bidSection = (
    <View className="mb-4">
      {/* List all bids, sorted by latest */}
      {sortedBids.length === 0 ? (
        <Text className="px-2 font-semibold text-primary">
          {t("bidding.noBidsYet")}
        </Text>
      ) : (
        <View className="mb-28">
          <Text className="mb-2 text-xl font-bold text-primary">
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
                    <View className="w-[34px] h-[34px] border !border-primary rounded-full bg-screen justify-center items-center ">
                      <Text className="text-lg font-bold text-primary">
                        {bid?.driver.name?.[0]?.toUpperCase() || "U"}
                      </Text>
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
                      {/* {bid?.driver?.mobile && (
                        <View className="flex-row items-center">
                          <Text className="ml-1 text-xs text-gray-700">
                            {bid?.vehicle?.mobile || bid?.driver?.mobile}
                          </Text>
                        </View>
                      )} */}

                      <View className="flex-row items-center">
                        <Ionicons name="star" size={10} color="#fbbf24" />
                        <Text className="ml-1 text-xs text-gray-700">
                          {(bid?.driver?.rating ?? 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="items-end ml-auto">
                    <View className="flex-1 gap-2 items-center w-full">
                      <Text className="mt-2 text-lg font-bold text-primary">
                        {formatINR(bid.amount)}
                      </Text>
                      {bid.status === "ACCEPTED" && (
                        <View className="flex-row items-center">
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            className="!text-primary"
                          />
                          <Text className="ml-1 text-xs font-medium text-green-600">
                            {t("bidding.accepted")}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  {/* Only show accept if customer, bid is pending, booking is open */}
                  {isCustomer &&
                    bookingData?.biddingOpen &&
                    bid.status === "PENDING" && (
                      <TouchableOpacity
                        className="justify-center items-center self-center px-3 py-2 ml-4 rounded-lg bg-primary"
                        onPress={() => setAcceptBidId(bid.id)}
                        // onPress={() => onAccept(bid.id)}
                        disabled={!!acceptBidId}
                      >
                        <Text className="text-sm font-semibold text-white">
                          {t("bidding.accept")}
                        </Text>
                      </TouchableOpacity>
                    )}
                </View>
                {bid.status === "ACCEPTED" && (
                  <View>
                    {/* <Text className="text-xs text-primary">
                      {t("bidding.vehicleInfo", "Vehicle Information")}
                    </Text> */}
                    <View className="flex-row gap-1 justify-between items-center p-1 mt-2 rounded-lg">
                      {bid.vehicle ? (
                        <View className="flex-row w-full">
                          <View className="flex-1 gap-1 items-start w-1/4">
                            <Text className="text-xs text-gray-600">
                              {t("bidding.vehicleDriverName", "Driver Name")}
                            </Text>
                            <Text className="text-xs font-semibold text-gray-700">
                              {bid.vehicle.driverName || "-"}
                            </Text>
                          </View>
                          <View className="flex-1 gap-1 items-start w-1/4">
                            <Text className="text-xs text-gray-600">
                              {t("bidding.vehicleRcNumber", "Vehicle No.")}
                            </Text>
                            <Text className="text-xs font-semibold text-gray-700">
                              {bid.vehicle.rcNumber || "-"}
                            </Text>
                          </View>
                          {/* <View className="flex-1 gap-1 items-start w-1/4">
                            <Text className="text-xs text-gray-600">
                              {t("bidding.vehicleNumber", "Vehicle No.")}
                            </Text>
                            <Text className="text-xs font-semibold text-gray-700">
                              {bid.vehicle.vehicleNumber || "-"}
                            </Text>
                          </View> */}
                          {bookingData?.paymentId && (
                            <View className="flex-1 gap-1 items-start w-1/4">
                              <Text className="text-xs text-gray-600">
                                {t("bidding.vehicleMobile", "Driver Mobile")}
                              </Text>
                              <Text className="text-xs font-semibold text-gray-700">
                                {bid.vehicle.mobileNumber || "-"}
                              </Text>
                            </View>
                          )}
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
                      {bookingData.status !== "COMPLETED" && (
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
                      )}

                      <View className="flex-row justify-center items-center mt-2">
                        <Ionicons
                          name="time-outline"
                          size={20}
                          className={`${bookingData?.paymentId == null ? " !text-danger" : "!text-primary"} `}
                        />
                        <Text
                          className={`ml-1 text-sm ${bookingData?.paymentId == null ? "!text-danger" : "text-primary"}`}
                        >
                          {bookingData.status === "COMPLETED"
                            ? t(
                                "bidding.rideHasBeenFinished",
                                "Your ride is complete. The driver has finished the trip.",
                              )
                            : bookingData?.paymentId == null
                              ? t(
                                  "bidding.rideNotStartedYet",
                                  "The driver has not started the ride yet.",
                                )
                              : t(
                                  "bidding.driverOnTheWay",
                                  "The driver is on the way.",
                                )}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
                {bid.status === "CANCELED" && (
                  <View className="flex-row justify-end items-center mt-1">
                    <Ionicons name="close-circle" size={16} color="#ef4444" />
                    <Text className="ml-1 text-xs font-medium text-red-600">
                      Driver has canceled this ride.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* OTP Modal */}
    </View>
  );

  const onCloseBooking = async (id: string) => {
    try {
      setIsCancelConfirm(true);
      toast.dismiss();
      // Call the close booking API endpoint and handle the result
      const response = await apiService.closeBooking(id);
      if (response.success) {
        toast.success(
          t("booking.closeBookingSuccess", "Booking closed successfully."),
        );
        refetchBooking?.(); // Optionally refresh booking details if such method exists
        // Redial to the main screen (booking list) after successful close
        router.replace("/(apps)/bookings");
      } else {
        toast.error(
          response.message ??
            t("booking.closeBookingFailed", "Failed to close booking."),
        );
      }
    } catch (error: any) {
      console.error(error.message);
      toast.error(t("booking.closeBookingFailed", "Failed to close booking."));
    } finally {
      setIsCancelConfirm(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-screen">
      <ConfirmPopup
        show={acceptBidId !== null}
        loading={isAccepting}
        onCancel={() => setAcceptBidId(null)}
        onConfirm={() => acceptBidId && onAccept(acceptBidId)}
        subTitle={t(
          "booking.cancelRideSubTitle",
          "Are you sure you want to confirm this driver and lock in the agreed price?",
        )}
        title={t("booking.acceptRide", "Confirm Ride?")}
        confirmText={t("booking.accept", "Accept")}
        cancelText={t("booking.cancel", "Cancel")}
      />
      {/* First confirmation for closing booking */}

      {/* Second (final) confirmation for closing booking */}
      <ConfirmPopup
        loading={isCancelConfirm}
        show={showCloseConfirm}
        onCancel={() => setShowCloseConfirm(false)}
        onConfirm={() => {
          setShowCloseConfirm(false);
          onCloseBooking(bookingData.id);
        }}
        subTitle={t(
          "bidding.closeBookingConfirm2",
          "Do you really want to close this booking?",
        )}
        title={t("bidding.closeBooking", "Close Booking")}
        confirmText={t("bidding.closeBooking", "Close Booking")}
        cancelText={t("common.cancel", "Cancel")}
      />

      <View className="flex-row items-center px-5 py-4 bg-white border-b border-gray-100 shadow-lg">
        <TouchableOpacity
          onPress={() => router.push("/(apps)/bookings")}
          className="flex-row gap-4 justify-start items-center p-2 -ml-2"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
          <Text className="text-xl font-bold text-gray-900">
            {t("common.bookingDetail")}
          </Text>
        </TouchableOpacity>
        <View style={{ width: 40 }} />
      </View>

      <View className="flex-1 bg-screen">
        <ScrollView
          className="flex-1 px-4"
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetchBooking} />
          }
        >
          {detailBlock}

          {bidSection}

          {(!bookingData?.assignedDriverUserId ||
            bookingData?.assignedDriverUserId === null) &&
            bookingData?.status !== "CANCELED" && (
              <View className="">
                <TouchableOpacity
                  className="flex-row justify-center items-center py-3 mb-2 w-full h-16 bg-red-600 rounded-lg"
                  onPress={() => setShowCloseConfirm(true)}
                  activeOpacity={0.85}
                >
                  <Text className="text-lg font-bold text-center text-white">
                    {t("bidding.closeBooking", "Close Booking")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
        </ScrollView>

        {/* Show 'Complete' and 'Pay' button fixed at the bottom using TailwindCSS */}
        {bookingData?.assignedDriverUserId &&
          bookingData.status !== "COMPLETED" && (
            <View className="absolute left-0 right-0 bottom-0 p-4 z-[1000] bg-white/95  shadow-lg">
              <TouchableOpacity
                className="flex-row justify-center items-center py-3 mb-2 w-full h-16 rounded-lg bg-primary"
                onPress={() => setShowOtpModal("complete")}
                activeOpacity={0.85}
              >
                <Text className="text-lg font-bold text-center text-white">
                  {t("bidding.completeBooking", "Finish Booking")}
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
                  <Text className="px-2 w-full text-sm font-semibold leading-tight text-start text-danger">
                    {t(
                      "bidding.remainingNote",
                      "Share this otp with driver to complete the booking.",
                    )}
                  </Text>
                </View>

                {bookingData?.otpCode && (
                  <View className="px-3 py-2 mb-4 w-full bg-white rounded-lg border border-primary">
                    <Text className="text-2xl font-bold tracking-widest text-center text-primary">
                      {bookingData.otpCode}
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
                  onPress={() => {
                    setShowOtpModal(null);
                    bookingData.otpCode && refetchBooking();
                  }}
                >
                  <Text className="text-lg font-semibold text-center text-black">
                    {t("common.close", "Close")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
