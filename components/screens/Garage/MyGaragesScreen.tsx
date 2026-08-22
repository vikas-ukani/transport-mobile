import { toast } from "@/lib/toast";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { RefreshControl, ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiService, getBaseUrl } from "../../../services/api.service";
import ConfirmPopup from "../../common/ConfirmPopup";

const MyGaragesScreen = () => {
  const { t } = useTranslation();
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(
    null,
  );
  const queryClient = useQueryClient();

  // React Query usage to fetch garages
  const {
    data,
    isLoading: loading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["my-garages"],
    queryFn: async () => {
      const response = await apiService.getMyGarages();
      if (!response.success) throw new Error("Failed to fetch garages");
      return response.data.garages;
    },
  });

  // Refetch garages whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handleDelete = async (id: string) => {
    try {
      const response = await apiService.deleteVehicle(id);
      if (response.success) {
        toast.success(t("garages.deleted"));
        queryClient.invalidateQueries({ queryKey: ["garages"] });
      }
    } catch (error) {
      console.error("Failed to delete item:", error);
    } finally {
      setShowConfirmDelete(null);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View
      key={item.id}
      className="p-5 mb-4 bg-white rounded-xl border border-gray-100 shadow-md"
    >
      <View className="flex flex-col gap-3">
        <View className="flex-row">
          {/* Garage Image - show first if available */}
          {item.images && item.images.length > 0 && (
            <Image
              source={{
                uri: item.images ? getBaseUrl() + item.images[0] : "",
              }}
              className="mr-4 w-28 h-28 rounded-xl"
              resizeMode="cover"
            />
          )}
          <View className="flex-1">
            <Text
              className="mb-1 text-lg font-bold text-gray-900"
              numberOfLines={2}
            >
              {item.name}
            </Text>

            <Text className="mb-1 text-sm text-gray-500">{item.address}</Text>

            <Text className="mb-1 text-sm text-gray-500">
              {t("garages.garageContact", { defaultValue: "Mobile" })}:{" "}
              {item.mobile}
            </Text>

            <Text className="mb-1 text-sm text-gray-600" numberOfLines={1}>
              {t("garages.ownerAadhaar", { defaultValue: "Aadhaar" })}:{" "}
              {item.ownerAadhaar}
            </Text>

            {/* Garage Types/Services */}
            {item.types && item.types.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mt-1">
                {item.types.map((type: string, idx: number) => (
                  <View
                    key={type + idx}
                    className="px-2 py-1 bg-blue-100 rounded"
                  >
                    <Text className="text-xs font-bold text-blue-700">
                      {type}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Coordinates */}
            <View className="flex-row gap-2 items-center mt-2">
              <Ionicons
                name="navigate-circle-outline"
                size={16}
                color="#6B7280"
              />
              <Text className="text-xs text-gray-500">{item.address}</Text>
            </View>
          </View>
        </View>

        <View className="flex-row gap-4 justify-between items-center mt-3">
          {/* Verification Status */}
          <View
            className={`px-4 py-2 items-center rounded-lg ${
              item.isVerified ? "bg-green-100" : "bg-yellow-100"
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                item.isVerified ? "text-green-700" : "text-yellow-700"
              }`}
            >
              {item.isVerified
                ? t("garages.verified", "Verified")
                : t("garages.pending", "Pending")}
            </Text>
          </View>

          <TouchableOpacity
            className="p-2 px-4 rounded bg-primaryLight"
            onPress={() => router.push(`/(apps)/garage/${item.id}`)}
            activeOpacity={0.8}
            accessibilityLabel="Update"
          >
            <Text className="text-base font-semibold text-white">
              {t("garages.updateGarage", "Update")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="p-2 px-4 bg-red-50 rounded"
            onPress={() => setShowConfirmDelete(item.id)}
            activeOpacity={0.8}
            accessibilityLabel="Delete Garage"
          >
            <Text className="text-base font-semibold text-danger">
              {t("garages.deleteGarage", "Delete")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-screen">
      <ConfirmPopup
        loading={loading}
        show={showConfirmDelete !== null}
        onCancel={() => setShowConfirmDelete(null)}
        onConfirm={() => handleDelete(showConfirmDelete!)}
        title="Delete?"
        subTitle="Are you sure you want to delete?"
      />
      <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-100 shadow-sm">
        <TouchableOpacity
          onPress={() => router.push("/(apps)/(tabs)/garages")}
          className="flex-row gap-4 justify-start items-center p-2 -ml-2"
          activeOpacity={0.7}
     
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
          <TouchableOpacity
            className="flex-row gap-4 justify-start items-center p-2 -ml-2"
            activeOpacity={0.7}
          >
            <Text className="text-xl font-bold text-gray-900">
              {t("garages.myGarages", "My Garages")}
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
        <View style={{ width: 40 }} />

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/(apps)/garage/create")}
        >
          <View
            className={`flex-row p-2 px-8 items-center !text-white gap-3 rounded-xl shadow-md bg-primary`}
          >
            <Ionicons name="add-circle-outline" size={22} color="white" />
            <Text className="text-lg font-semibold !text-white">
              {t("garages.addGarage", "New garage")}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading || isRefetching}
            onRefresh={refetch}
          />
        }
      >
        {data && data.length > 0 ? (
          data.map((item: any) => renderItem({ item: item }))
        ) : loading ? (
          <View className="items-center py-16" key={`loading-garages`}>
            <Ionicons name="car-outline" size={64} color="#D1D5DB" />
            <Text className="mt-4 text-base font-medium text-gray-500">
              {t("garages.loadingGarages", "Loading garages...")}
            </Text>
          </View>
        ) : (
          <View className="items-center py-16" key={`no-garages`}>
            <Ionicons name="car-outline" size={64} color="#D1D5DB" />
            <Text className="mt-4 text-base font-medium text-gray-500">
              {t("garages.noGarages")}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MyGaragesScreen;
