import Toast from "react-native-toast-message";

export const toast = {
  success: (text1: string) => {
    Toast.show({
      type: "success",
      text1: text1,
    });
  },
  error: (text1: string, text2?: string) => {
    Toast.show({
      type: "error",
      text1: text1,
      ...(text2 ? { text2: text2 } : {}),
    });
  },
  remove: () => {
    Toast.hide();
  },
  dismiss: () => {
    Toast.hide();
  },
};
