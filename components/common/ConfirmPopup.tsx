import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Text, View } from 'react-native';

interface ConfirmPopupProps {
  show: boolean;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  subTitle: string;
  confirmText?: string;
  cancelText?: string;
  confirmClassName?: string;
}

const ConfirmPopup = ({
  show,
  loading,
  title = 'Are you sure?',
  subTitle = 'Are you sure you want to logout?',
  confirmText = 'Yes, Proceed',
  cancelText = 'Cancel',
  confirmClassName = '',
  onCancel,
  onConfirm,
}: ConfirmPopupProps) => {
  return (
    <Modal
      animationType='fade'
      transparent
      visible={show}
      onRequestClose={onCancel}
    >
      <View className='flex-1 justify-center items-center bg-black/50'>
        <View className='p-6 w-96 bg-white rounded-xl'>
          <View className='flex-row justify-center w-full text-center'>
            <Ionicons
              name='warning-outline'
              size={40}
              className='!text-primary'
            />
          </View>
          <Text className='my-4 text-xl font-bold text-center'>{title}</Text>
          <Text className='mb-6 text-center text-gray-600'>{subTitle}</Text>

          <View className='flex-row justify-between'>
            <Pressable
              className='bg-gray-300 px-4 py-2 rounded-md w-[45%]'
              onPress={onCancel}
            >
              <Text className='font-semibold text-center'>{cancelText}</Text>
            </Pressable>

            <Pressable
              className={`${confirmClassName} bg-primary px-4 py-2 rounded-md w-[45%]`}
              onPress={onConfirm}
              disabled={loading}
            >
              <Text className='font-semibold text-center text-white'>
                {confirmText} {loading && '...'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ConfirmPopup;
