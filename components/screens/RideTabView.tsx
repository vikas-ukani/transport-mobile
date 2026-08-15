import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Import the PagerView explicitly if needed (per react-native-tab-view 3.x+ guidance)

import MyActiveRideScreen from "./MyActiveRideScreen";
import MyFinishedRidesScreen from "./MyFinishedRidesScreen";
import RidesScreen from "./RidesScreen";

// Fallback for deprecated SceneMap usage, provide functions directly
const RideTabView = () => {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  const tabs = [
    { key: "active", title: t("booking.activeTab", "Active") },
    { key: "my", title: t("booking.myTab", "My") },
    { key: "finished", title: t("booking.finishedTab", "Finished") },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      {/* Content */}
      <View className="flex-1">
        <View className="flex-row border-b !w-full !justify-evenly border-[#E5E7EB] shadow-xl bg-white px-2">
          {tabs.map((tab, i) => (
            <Pressable
              key={tab.key}
              onPress={() => setIndex(i)}
              className="flex-1 justify-center items-center"
            >
              <Text
                className={`
                  font-bold text-[15px] capitalize py-3
                  ${index === i ? "text-primary border-b-2 w-full text-center border-primary" : "text-[#8CA2B6]"}
                `}
              >
                {tab.title}
              </Text>
            </Pressable>
          ))}
        </View>
        <View className="flex-1">
          {index === 0 && <RidesScreen />}
          {index === 1 && <MyActiveRideScreen />}
          {index === 2 && <MyFinishedRidesScreen />}
        </View>
      </View>

      {/* <View className="flex-1">{renderScene}</View> */}
    </SafeAreaView>
  );
};

export default RideTabView;
