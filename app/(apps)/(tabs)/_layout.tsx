import { FontAwesome } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { IconSymbol } from '../../../components/ui/icon-symbol';
import i18n from '../../../i18n/config';

export const unstable_settings = {
  initialRouteName: 'index',
  // The following anchor property is required for proper tab rendering on web in Expo Router v3+
  anchor: 'index', // Set to a valid anchor from ['bookings', 'index', 'profile', 'vehicles']
};

export default function AppTabLayout() {
  // Workaround for web - ensure Tabs always render
  // On web, the tabs may not show unless the layout file exports unstable_settings with anchor

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // Ensure tabBar is visible on web
        // tabBarVisible: true,
        // tabBarStyle:
        //   Platform.OS === 'web'
        //     ? { position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10 }
        //     : undefined,
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: i18n.t('common.home'),
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol
              size={28}
              name='house.fill'
              color={focused ? '#9333ea' : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='bookings'
        options={{
          title: i18n.t('common.booking'),
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome
              name='bookmark'
              size={24}
              color={focused ? '#9333ea' : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='vehicles'
        options={{
          title: i18n.t('common.myVehicles'),
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome
              name='truck'
              size={24}
              color={focused ? '#9333ea' : color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name='profile'
        options={{
          title: i18n.t('common.profile'),
          tabBarIcon: ({ color, focused }) => (
            <FontAwesome
              name='gear'
              size={24}
              color={focused ? '#9333ea' : color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
