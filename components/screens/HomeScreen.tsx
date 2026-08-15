import { Ionicons } from "@expo/vector-icons";
import { useInfiniteQuery } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
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
import HomeHeader from "../common/HomeHeader";
import PostItems from "../common/PostItem";
import VideoScreen from "./Home/VideoScreen";

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
const POSTS_PER_PAGE = 10;

const HomeScreen = () => {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  // React Query: get posts paginated
  const fetchPosts = async ({ pageParam = 1 }) => {
    const res = await apiService.getPosts({
      page: pageParam,
      limit: POSTS_PER_PAGE,
    });
    return {
      data: res?.data || [],
      total: res?.pagination?.total || 0,
      nextPage:
        res?.data && res.data.length === POSTS_PER_PAGE
          ? pageParam + 1
          : undefined,
      success: res?.success,
    };
  };

  // Infinite query for "load more" pagination
  const {
    data: postPages,
    isLoading: loading,
    isFetchingNextPage: loadingMore,
    refetch,
    hasNextPage,
    fetchNextPage,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ["get-all-posts"],
    queryFn: fetchPosts,
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => lastPage.nextPage,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2, // 2m cache
  });

  // Refetch posts when coming back to this screen
  useFocusEffect(
    useCallback(() => {
      // When screen is focused, refetch posts to ensure latest
      refetch();
    }, [refetch])
  );

  // Pull together posts, total, etc.
  const posts = postPages?.pages?.flatMap((page) => page.data) ?? [];
  const total = postPages?.pages?.[0]?.total ?? 0;
  // console.log("postPages", { firstPost: posts[0], total });

  // "Load More" handler for button
  const handleLoadMore = () => {
    if (hasNextPage && !loadingMore) {
      fetchNextPage();
    }
  };

  // Pagination with "Load More" feature
  // Removed unused local page/hasMore states, no longer needed

  return (
    <SafeAreaView className="flex-1 bg-screen">
      {/* Header */}
      <HomeHeader />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isRefetching}
            onRefresh={() => {
              setRefreshing(true);
              refetch().finally(() => setRefreshing(false));
            }}
          />
        }
      >
        <VideoScreen />

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
                refetch={refetch}
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
