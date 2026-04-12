import { toast } from "@backpackapp-io/react-native-toast";
import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { yupResolver } from "@hookform/resolvers/yup";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as Location from "expo-location";
import { router, useFocusEffect, useGlobalSearchParams } from "expo-router";
import { getPreciseDistance } from "geolib";
import { startTransition, useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as yup from "yup";
import {
  TRUCK_HEIGHT_OPTIONS,
  TRUCK_LENGTH_OPTIONS,
  TRUCK_LOAD_CAPACITY_OPTIONS,
} from "../../constants/vehicle";

import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import apiService from "../../services/api.service";
import MapLocationModal from "../common/MapLocationModal";

// Yup schema
const schema = yup.object().shape({
  fromAddress: yup.string().required("Pickup address is required").default(""),
  toAddress: yup.string().required("Drop address is required").default(""),
  fromLatitude: yup
    .number()
    .required("Latitude is required")
    .typeError("Latitude must be a number"),
  fromLongitude: yup
    .number()
    .required("Longitude is required")
    .typeError("Longitude must be a number"),
  toLatitude: yup
    .number()
    .required("Latitude is required")
    .typeError("Latitude must be a number"),
  toLongitude: yup
    .number()
    .required("Longitude is required")
    .typeError("Longitude must be a number"),
  bookingDate: yup.date().required("Booking date is required"),
  truckType: yup.string().required("Truck type is required"),
  bodyType: yup.string().required("Body type is required").default("container"),
  truckLength: yup.string().required("Truck length is required"),
  loadCapacity: yup.string().required("Load capacity is required"),
  truckHeight: yup.string().required("Truck height is required"),
  estimatedKm: yup.string().default("0.00"),
  driverNotes: yup.string().default(""),
});

const CreateBookingScreen = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useGlobalSearchParams();

  // State for vehicle registration photos (legacy/unused in this context but required by vehicle logic)
  const [loading, setLoading] = useState(false);
  const [showFromMap, setShowFromMap] = useState(false);
  const [showToMap, setShowToMap] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(new Date());
  const {
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isDirty },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      fromAddress: user?.address,
      fromLatitude: user?.latitude,
      fromLongitude: user?.longitude,
      toAddress: "",
      bookingDate: new Date(),
      truckType: "pickup",
      bodyType: "container",
      truckLength: "7",
      loadCapacity: "10",
      truckHeight: "10",
      estimatedKm: "0.00",
      driverNotes: "",
    },
  });

  useEffect(() => {
    if (id) {
      getBookingById(id as string);
    }
  }, [id]);

  const getBookingById = async (bookingId: string) => {
    try {
      setLoading(true);
      const resData = await apiService.getBookingById(bookingId);
      if (resData.success) {
        const { booking } = resData;

        // Populate form with booking data
        reset({
          fromAddress: booking.fromAddress,
          fromLatitude: booking.fromLatitude,
          fromLongitude: booking.fromLongitude,
          toAddress: booking.toAddress,
          toLatitude: booking.toLatitude,
          toLongitude: booking.toLongitude,
          bookingDate: new Date(booking.bookingDate),
          truckType: booking.truckType,
          bodyType: booking.bodyType,
          truckLength: booking.truckLength,
          loadCapacity: booking.loadCapacity,
          truckHeight: booking.truckHeight,
          estimatedKm: booking.estimatedKm,
          driverNotes: booking.driverNotes || "",
        });
      } else {
        toast.error(resData.message || t("common.failedToFetchBookingDetails"));
      }
    } catch (error: any) {
      console.log("Catch Error", error.message);
      toast.error(error.message || t("common.failedToFetchBookingDetails"));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      async function getCurrentLocation() {
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          // let { status } = await Location.requestForegroundPermissionsAsync();

          if (status !== "granted") {
            toast.error(t("common.pleaseEnableLocation"));
            return;
          }

          // Get current position only if region is not set
          const current = await Location.getCurrentPositionAsync({});
          const { latitude, longitude }: any = current.coords;
          const [place] = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });
          setValue("fromLatitude", latitude);
          setValue("fromLongitude", longitude);
          setValue("fromAddress", place?.formattedAddress || "");
        } catch (error) {
          toast.dismiss();
          toast.error(t("common.pleaseEnableLocation"));
          console.error("Error getting location:", error);
        }
      }
      getCurrentLocation();
    }, [setValue]),
  );

  const calculateDistanceInKM = () => {
    if (
      !getValues("fromLatitude") ||
      !getValues("fromLongitude") ||
      !getValues("toLatitude") ||
      !getValues("toLongitude")
    )
      return "0.00";

    const distance = getPreciseDistance(
      {
        latitude: getValues("fromLatitude")?.toString(),
        longitude: getValues("fromLongitude")?.toString(),
      },
      {
        latitude: getValues("toLatitude")?.toString(),
        longitude: getValues("toLongitude")?.toString(),
      },
    );
    const inKMs = (distance / 1000).toFixed(2);
    setValue("estimatedKm", inKMs);
    return inKMs;
  };

  // Submission handler (replace with your booking logic)
  const onSubmit = async (data: any) => {
    // You will want to actually submit the data to your apiService
    try {
      setLoading(true);

      // Here call your booking API (replace with real API call)
      const resData = await apiService.createBooking(data);
      console.log("resData", resData);
      if (resData.success) {
        toast.success(resData.message || t("common.BookingRequestSubmited"));
        reset();
        // clear address selections/maps maybe
        router.push("/(apps)/bookings");
      } else {
        toast.error(resData.message || t("common.bookingFailed"));
      }
    } catch (error: any) {
      console.log("Catch Error", error.message);
      toast.error(error.message || t("common.bookingFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center px-5 py-4 bg-white border-b border-gray-100 shadow-sm">
        <TouchableOpacity
          onPress={() => router.push("/(apps)/bookings")}
          className="flex-row gap-4 justify-start items-center p-2 -ml-2"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
          <Text className="text-xl font-bold text-gray-900">
            {t("common.bookVehicle")}
          </Text>
        </TouchableOpacity>
        <View style={{ width: 40 }} />
      </View>
      <View className="flex-1 bg-gray-50">
        <ScrollView
          className="flex-1 px-4 py-4"
          contentContainerStyle={{ paddingBottom: 30 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-6">
            <View className="flex-row gap-2 justify-between">
              <View className="flex-row gap-1 mb-3 text-sm font-bold text-gray-700">
                <Text className="font-bold"> {t("booking.fromLocation")} </Text>
                <Text className="items-start text-danger">*</Text>
                {errors.fromAddress && (
                  <Text className="ml-1 text-sm font-medium text-red-500">
                    {errors.fromAddress.message}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                className="flex-row gap-1 justify-center items-center mr-2 text-center rounded"
                onPress={() => setShowFromMap(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="location" size={18} color="#6D28D9" />
                <Text>{t("common.pickLocation")}</Text>
              </TouchableOpacity>
            </View>
            <Controller
              control={control}
              name="fromAddress"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="px-5 text-base font-medium bg-white rounded-xl border-2 border-gray-200"
                  placeholder={t("booking.selectFromLocation")}
                  textAlignVertical="top"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholderTextColor="#9CA3AF"
                />
              )}
            />
            {Platform.OS !== "web" && (
              <MapLocationModal
                show={showFromMap}
                onHide={() => setShowFromMap(false)}
                onLocationSelected={({ latitude, longitude, address }: any) => {
                  startTransition(() => {
                    setValue("fromAddress", address);
                    setValue("fromLatitude", latitude);
                    setValue("fromLongitude", longitude);
                    setShowFromMap(false);
                  });
                }}
                latitude={getValues("fromLatitude")}
                longitude={getValues("fromLongitude")}
                isSetDefaultCurrentLocation={true}
              />
            )}
          </View>

          <View className="mb-6">
            <View className="flex-row gap-2 justify-between w-full">
              <View className="flex-row gap-1 mb-3 text-sm font-bold text-gray-700">
                <Text className="font-bold">{t("booking.toLocation")}</Text>
                <Text className="items-start text-danger">*</Text>
                {errors.toAddress && (
                  <Text className="ml-1 text-sm font-medium text-red-500">
                    {errors.toAddress.message}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                className="flex-row gap-1 justify-center items-center mr-2 text-center rounded"
                onPress={() => setShowToMap(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="location-outline" size={18} color="#DC2626" />
                <Text>{t("common.pickLocation")}</Text>
              </TouchableOpacity>
            </View>
            <Controller
              control={control}
              name="toAddress"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="px-5 text-base font-medium bg-white rounded-xl border-2 border-gray-200"
                  placeholder={t("booking.selectToLocation")}
                  textAlignVertical="top"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholderTextColor="#9CA3AF"
                />
              )}
            />

            {Platform.OS !== "web" && (
              <MapLocationModal
                show={showToMap}
                onHide={() => setShowToMap(false)}
                onLocationSelected={({ latitude, longitude, address }: any) => {
                  setValue("toAddress", address);
                  setValue("toLatitude", latitude);
                  setValue("toLongitude", longitude);
                  setShowToMap(false);
                }}
                latitude={getValues("toLatitude") || getValues("fromLatitude")}
                longitude={
                  getValues("toLongitude") || getValues("fromLongitude")
                }
              />
            )}
          </View>

          {/* Booking Date */}
          <View className="mb-6">
            <View className="flex-row gap-2 justify-between w-full">
              <View className="flex-row gap-1 mb-3 text-sm font-bold text-gray-700">
                <Text className="font-bold">{t("booking.bookingDate")}</Text>
                <Text className="items-start text-danger">*</Text>
                {errors.bookingDate && (
                  <Text className="ml-1 text-sm font-medium text-red-500">
                    {errors.bookingDate.message}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                className="flex-row gap-1 justify-center items-center mr-2 text-center rounded"
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="calendar-outline" size={18} color="#059669" />
                <Text>{t("common.pickDate")}</Text>
              </TouchableOpacity>
            </View>
            <Controller
              control={control}
              name="bookingDate"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="py-4 text-base font-medium bg-white rounded-xl border-2 border-gray-200 placeholder:px-4"
                  placeholder={t("booking.selectBookingDate")}
                  value={
                    value instanceof Date
                      ? `${value.getDate()}/${
                          value.getMonth() + 1
                        }/${value.getFullYear()}`
                      : ""
                  }
                  placeholderTextColor="#9CA3AF"
                  pointerEvents="none"
                  editable={false}
                />
              )}
            />
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(e: any, dateVal: any) => {
                  setShowDatePicker(false);
                  if (dateVal) {
                    setValue("bookingDate", dateVal);
                    setDate(dateVal);
                  }
                }}
              />
            )}
          </View>

          {/* Truck Type */}
          <View className="mb-6">
            <Text className="mb-2 text-lg font-bold text-gray-800">
              {t("booking.truckType")}
            </Text>
            <Controller
              control={control}
              name="truckType"
              render={({ field: { onChange, value } }) => (
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className={`flex-1 flex-row items-center px-4 py-4 rounded-lg border ${
                      getValues("truckType") === "pickup"
                        ? "border-primary bg-primary/10"
                        : "border-gray-200 bg-white"
                    }`}
                    onPress={() => setValue("truckType", "pickup")}
                  >
                    <FontAwesome5
                      name="truck-pickup"
                      size={20}
                      color={
                        getValues("truckType") === "pickup"
                          ? "#7C3AED"
                          : "#1F2937"
                      }
                    />
                    <Text
                      className={`ml-2 text-base font-semibold ${
                        getValues("truckType") === "pickup"
                          ? "text-primary"
                          : "text-gray-900"
                      }`}
                    >
                      {t("vehicles.pickupSmall")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`flex-1 flex-row items-center px-4 py-4 rounded-lg border ${
                      getValues("truckType") === "truck"
                        ? "border-primary bg-primary/10"
                        : "border-gray-200 bg-white"
                    }`}
                    onPress={() => setValue("truckType", "truck")}
                  >
                    <FontAwesome5
                      name="truck-moving"
                      size={22}
                      color={
                        getValues("truckType") === "truck"
                          ? "#7C3AED"
                          : "#1F2937"
                      }
                    />
                    <Text
                      className={`ml-2 text-base font-semibold ${
                        getValues("truckType") === "truck"
                          ? "text-primary"
                          : "text-gray-900"
                      }`}
                    >
                      {t("vehicles.truck")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />
            {errors.truckType && (
              <Text className="mt-2 ml-1 text-sm font-medium text-red-500">
                {errors.truckType.message}
              </Text>
            )}
          </View>
          {/* Body Type */}
          <View className="mb-6">
            <Text className="mb-3 text-sm font-bold text-gray-700">
              {t("vehicles.bodyType")}
            </Text>
            <Controller
              control={control}
              name="bodyType"
              render={({ field: { onChange, value } }) => (
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className={`flex-1 flex-row items-center px-4 py-3 gap-2 rounded-lg border ${
                      getValues("bodyType") === "open"
                        ? "border-primary bg-primary/10"
                        : "border-gray-200 bg-white"
                    }`}
                    onPress={() => setValue("bodyType", "open")}
                  >
                    <MaterialCommunityIcons
                      name="truck-flatbed"
                      size={28}
                      className={
                        getValues("bodyType") === "open"
                          ? "!text-primary"
                          : "text-black"
                      }
                    />
                    <Text
                      className={`duration-300 text-center text-sm font-medium ${
                        getValues("bodyType") === "open"
                          ? "text-primary"
                          : "text-black"
                      }`}
                    >
                      {t("vehicles.open")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`flex-1 flex-row items-center gap-2 px-4 py-3 rounded-lg border ${
                      getValues("bodyType") === "container"
                        ? "border-primary bg-primary/10"
                        : "border-gray-200 bg-white"
                    }`}
                    onPress={() => setValue("bodyType", "container")}
                  >
                    <MaterialCommunityIcons
                      name="truck-cargo-container"
                      size={28}
                      color={
                        getValues("bodyType") === "container"
                          ? "#7C3AED"
                          : "#000000"
                      }
                    />
                    <Text
                      className={`duration-300 text-center text-sm font-medium ${
                        getValues("bodyType") === "container"
                          ? "text-primary"
                          : "text-black"
                      }`}
                    >
                      {t("vehicles.container")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />

            {errors.bodyType && (
              <Text className="mt-2 ml-1 text-sm font-medium text-red-500">
                {errors.bodyType.message}
              </Text>
            )}
          </View>

          {/* Truck Length */}
          <View className="mb-6">
            <Text className="mb-2 text-lg font-bold text-gray-800">
              {t("booking.truckLength")}
            </Text>
            <Controller
              control={control}
              name="truckLength"
              render={({ field: { onChange, value } }) => (
                <View className="overflow-hidden bg-white rounded-xl border-2 border-gray-200">
                  <Picker
                    selectedValue={value}
                    onValueChange={onChange}
                    style={{ height: 50 }}
                  >
                    {TRUCK_LENGTH_OPTIONS.map((opt) => (
                      <Picker.Item
                        key={opt.value}
                        label={opt.label}
                        value={opt.value}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            />
            {errors.truckLength && (
              <Text className="mt-2 ml-1 text-sm font-medium text-red-500">
                {errors.truckLength.message}
              </Text>
            )}
          </View>

          {/* Truck Height */}
          <View className="mb-6">
            <Text className="mb-2 text-lg font-bold text-gray-800">
              {t("vehicles.truckHeight")}
            </Text>
            <Controller
              control={control}
              name="truckHeight"
              render={({ field: { onChange, value } }) => (
                <View className="overflow-hidden bg-white rounded-xl border-2 border-gray-200">
                  <Picker
                    selectedValue={value}
                    onValueChange={onChange}
                    style={{ height: 50 }}
                  >
                    {TRUCK_HEIGHT_OPTIONS.map((opt) => (
                      <Picker.Item
                        key={opt.value}
                        label={opt.label}
                        value={opt.value}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            />
            {errors.truckHeight && (
              <Text className="mt-2 ml-1 text-sm font-medium text-red-500">
                {errors.truckHeight.message}
              </Text>
            )}
          </View>

          {/* Load Capacity */}
          <View className="mb-6">
            <Text className="mb-2 text-lg font-bold text-gray-800">
              {t("vehicles.loadCapacity")}
            </Text>
            <Controller
              control={control}
              name="loadCapacity"
              render={({ field: { onChange, value } }) => (
                <View className="overflow-hidden bg-white rounded-xl border-2 border-gray-200">
                  <Picker
                    selectedValue={value}
                    onValueChange={onChange}
                    style={{ height: 50 }}
                  >
                    {TRUCK_LOAD_CAPACITY_OPTIONS.map((opt) => (
                      <Picker.Item
                        key={opt.value}
                        label={opt.label}
                        value={opt.value}
                      />
                    ))}
                  </Picker>
                </View>
              )}
            />
          </View>

          {/* Distance and Estimated Price */}
          <View className="flex-row gap-4 mb-6">
            <View className="flex-1 items-start px-4 py-4 bg-white rounded-xl border-2 border-gray-200">
              <Text className="text-base font-semibold text-gray-600">
                {t("vehicles.estimatedKilometer")}
              </Text>
              <Text className="mt-1 text-2xl font-bold text-primary">
                {calculateDistanceInKM()} Km
              </Text>
            </View>
            {/* <View className='flex-1 items-start px-4 py-4 bg-white rounded-xl border-2 border-gray-200'>
              <Text className='text-base font-semibold text-gray-600'>
                {t('vehicles.estimatedPrice')}
              </Text>
              <Text className='mt-1 text-2xl font-bold text-green-600'>
                ₹ 00
              </Text>
            </View> */}
          </View>
          <View className="mb-6">
            <Text className="mb-2 text-lg font-bold text-gray-800">
              {t("booking.driverNotes") || "Special notes for driver"}
            </Text>
            <Controller
              control={control}
              name="driverNotes"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="px-5 py-4 text-base font-medium bg-white rounded-xl border-2 border-gray-200"
                  placeholder={
                    t("booking.driverNotesPlaceholder") ||
                    "Optional notes for your driver (e.g. loading instructions, timings...)"
                  }
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholderTextColor="#9CA3AF"
                />
              )}
            />
          </View>

          <TouchableOpacity
            className="flex-row justify-center items-center py-6 mb-4 rounded-xl shadow-lg bg-primary"
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
            activeOpacity={0.8}
          >
            <View className="flex-row gap-1 items-center">
              <Ionicons
                name="checkmark-circle-outline"
                size={22}
                color="#FFFFFF"
              />
              <Text className="ml-2 text-lg font-bold text-center text-white">
                {t("booking.bookNow")}
              </Text>
              {loading && <ActivityIndicator color="#fff" size="small" />}
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default CreateBookingScreen;
