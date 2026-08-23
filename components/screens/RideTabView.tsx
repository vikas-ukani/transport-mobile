import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MyFinishedRidesScreen from "./MyFinishedRidesScreen";
import RidesScreen from "./RidesScreen";
import MyActiveRideScreen from "./MyActiveRideScreen";

// NOTE: This version removes any use of react-native-tab-view or material-top-tabs (and associated navigation APIs)
// to avoid the "Can't find ViewManager 'RNCViewPager'" error. Instead, it uses a simple stateful tab UI that works everywhere.

const RideTabView = () => {
  const { t } = useTranslation(); 
  const [index, setIndex] = useState(0); 

  const tabs = [ 
    { key: "rides", title: t("booking.allRideTab", "Rides") },
    { key: "active", title: t("booking.activeTab", "Active Rides") },
    { key: "finished", title: t("booking.finishedTab", "Finished") }, // Add more tabs if needed, e.g.
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <View className="flex-1">
        <View className="!w-full flex-row !justify-evenly border-b border-[#E5E7EB] bg-white px-2 shadow-xl">
          {tabs.map((tab, i) => (
            <Pressable
              key={tab.key}
              onPress={() => setIndex(i)}
              className="flex-1 justify-center items-center"
              accessibilityRole="tab"
              accessibilityState={index === i ? { selected: true } : {}}
            >
              <Text
                className={`
                  py-3 text-[15px] font-bold capitalize
                  ${index === i ? "w-full border-b-2 border-primary text-center text-primary" : "text-[#8CA2B6]"}
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
          {/* Add more tab screens below as needed */}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default RideTabView;
