import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import "setimmediate";
import { User } from "../../context/AuthContext";
import apiService from "../../services/api.service";
import socketService from "../../services/socket";
import HomeHeader from "../common/HomeHeader";
import PostItems from "../common/PostItem";

export interface Post {
  id: string;
  title: string;
  content: string;
  images: string[];
  likes: string[];
  userId: string;
  userName: string;
  createdAt: string;
  user?: User | null;
}

const HomeScreen = () => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPosts();
    setRefreshing(false);
  }, []);

  const [videos, setVideos] = useState<any[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Load posts on mount
  useEffect(() => {
    loadVideos();
    loadPosts();

    // Listen for new posts
    const handleNewPost = (data: any) => {
      setPosts((prev) => [data, ...prev]);
    };

    socketService.on("post:new", handleNewPost);

    return () => {
      socketService.off("post:new", handleNewPost);
    };
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const res = await apiService.getVideos?.();
      if (res && res.success) {
        setVideos(res.data);
      } else {
        setVideos([]);
      }
    } catch (error: any) {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  // Pagination with "Load More" feature
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const POSTS_PER_PAGE = 10;

  const loadPosts = async (pageNumber: number = 1, append: boolean = false) => {
    try {
      if (pageNumber === 1) setLoading(true);
      else setLoadingMore(true);

      const res = await apiService.getPosts({
        page: pageNumber,
        limit: POSTS_PER_PAGE,
      });
      if (res.success) {
        setTotal(res?.pagination?.total || 0);
        if (append) {
          setPosts((prev) => [...prev, ...(res.data || [])]);
        } else {
          setPosts(res.data || []);
        }
        setPage(pageNumber);
      }
    } catch (error: any) {
      if (!append) setPosts([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Function to load more posts for pagination
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadPosts(page + 1, true);
    }
  };

  // SQL query to insert videos with YouTube URL, title, and thumbnail:

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
    <SafeAreaView className="flex-1 bg-screen">
      {/* Header */}
      <HomeHeader />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* User Guide Section */}
        {videos.length > 0 && (
          <View className="px-2 py-6 my-4 bg-white shadow-sm">
            <View className="flex-row justify-between items-center pl-4 mb-5">
              <Text className="text-2xl font-bold text-gray-900">
                {t("home.userGuide")}
              </Text>
              <Ionicons
                name="play-circle"
                size={24}
                className="!text-primary"
              />
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
        )}

        {/* Posts Section */}
        <View className="px-5 pb-6 my-4">
          <View className="flex-row justify-between items-center mb-5">
            <Text className="text-2xl font-bold text-gray-900">
              {t("home.recentPosts")}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/(apps)/my-posts")}
            >
              <Text className="text-sm font-semibold text-primary">
                {t("common.seeAll")}
              </Text>
            </TouchableOpacity>
          </View>
          {loading ? (
            <View className="items-center p-12 bg-white rounded-xl shadow-sm">
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text className="mt-4 font-medium text-gray-500">
                Loading ...
              </Text>
            </View>
          ) : posts?.length > 0 ? (
            posts.map((post) => (
              <PostItems
                key={post.id}
                item={post}
                refetch={loadPosts}
                accessDelete={false}
                accessEdit={false}
              />
            ))
          ) : (
            // <FlatList
            //   data={posts}
            //   renderItem={renderPostItem}
            //   keyExtractor={(item) => item.id}
            //   scrollEnabled={false}
            // />
            <View className="items-center p-12 bg-white rounded-xl shadow-sm">
              <Ionicons
                name="document-text-outline"
                size={64}
                color="#D1D5DB"
              />
              <Text className="mt-4 text-base font-medium text-gray-500">
                {t("home.noPosts")}
              </Text>
            </View>
          )}
          {/* Show More button for pagination */}
          {posts && !loading && posts?.length > 0 && posts.length < total && (
            <TouchableOpacity
              className="justify-center items-center px-6 py-6 mt-4 rounded-lg bg-primary"
              activeOpacity={0.8}
              onPress={handleLoadMore}
            >
              <Text className="text-base font-semibold text-white">
                {t("common.showMore")}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;
