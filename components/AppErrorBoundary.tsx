import { Text, TouchableOpacity, View } from 'react-native';
import ErrorBoundary from 'react-native-error-boundary';

function ErrorFallback({ error, resetError }: any) {
  return (
    <View className='flex-1 justify-center items-center px-6 bg-white'>
      <Text className='mb-3 text-xl font-bold text-red-600'>
        Something went wrong
      </Text>

      <Text className='mb-6 text-center text-gray-600'>
        {error?.message?.toString() || 'Unexpected error occurred'}
      </Text>

      <TouchableOpacity
        onPress={resetError}
        className='px-6 py-3 bg-blue-600 rounded'
      >
        <Text className='font-semibold text-white'>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AppErrorBoundary({ children }: any) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        console.error('App Crash:', error, info);
        // crashlytics().recordError(error)
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
