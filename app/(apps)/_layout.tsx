import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          statusBarHidden: false,
          statusBarAnimation: 'slide',
          statusBarStyle: 'dark',
        }}
      >
        <Stack.Screen name='index' options={{ title: 'Home Page' }} />
        {/* <Stack.Screen name='create-post' options={{ title: 'Create Post' }} /> */}
        <Stack.Screen name='notifications' />
      </Stack>
    </>
  );
}
