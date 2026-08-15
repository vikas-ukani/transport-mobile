import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { apiService } from "../../../services/api.service";

const VideoScreen = () => {
  const { t } = useTranslation();
  const [videos, setVideos] = useState<any[]>([]);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const res = await apiService.getVideos?.();
      if (res && res.success) {
        setVideos(res.data);
      } else {
        setVideos([]);
      }
    } catch (error: any) {
      setVideos([]);
    }
  };

  const renderVideoItem = ({ item }: { item: any }) => (
    <TouchableOpacity className="mr-4" activeOpacity={0.7}>
      <View className="overflow-hidden justify-center items-center w-20 h-20 bg-gradient-to-br from-red-300 to-red-900 rounded-full shadow-lg">
        <View className="absolute inset-0 bg-red-500/80" />
        <Ionicons name="logo-youtube" size={36} color="#FFFFFF" />
      </View>
      <Text className="mt-3 text-sm font-medium text-center text-gray-700">
        {item.title}
      </Text>
    </TouchableOpacity>
  );

  return (
    videos.length > 0 && (
      <View className="px-2 py-6 my-4 shadow-sm bg-screen">
        <View className="flex-row justify-between items-center pl-4 mb-5">
          <Text className="text-2xl font-bold text-gray-900">
            {t("home.userGuide")}
          </Text>
          <Ionicons name="play-circle" size={24} className="!text-primary" />
        </View>
        <FlatList
          data={videos}
          renderItem={renderVideoItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16, paddingLeft: 8 }}
        />
      </View>
    )
  );
};

export default VideoScreen;
