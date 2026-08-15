import { Ionicons } from "@expo/vector-icons";
import { Controller } from "react-hook-form";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

const CustomInput = ({
  label,
  name,
  control,
  errors,
  placeholder,
  autoCapitalize = "none",
  editable = true,
  keyboardType = "default",
  maxLength,
  numberOfLines,
  multiline,
  frontIcon,
  frontIconColor,
  backIcon,
  backIconColor,
  onBackIconPress,
  secureTextEntry = false,
}: any) => {
  return (
    <View className="mb-4">
      <View className="flex-row gap-1 mb-3 text-sm font-bold text-gray-700">
        <Text>{label} </Text>
        <Text className="items-start text-danger">*</Text>
        {errors?.[name] && (
          <Text className="ml-1 text-sm font-medium text-red-500">
            {errors?.[name].message}
          </Text>
        )}
      </View>

      <Controller
        control={control}
        name={name}
        render={({ field: { onChange, onBlur, value } }) => (
          <View className="flex-row items-center px-0 py-0 bg-white rounded-xl border-2 border-primary">
            {frontIcon && (
              <View className="mr-1 ml-2">
                <Ionicons
                  name={frontIcon}
                  size={20}
                  className="!text-primary"
                  color={frontIconColor ? frontIconColor : "#c084fc"}
                />
              </View>
            )}
            {secureTextEntry}

            <TextInput
              style={{
                flex: 1,
                ...(multiline
                  ? { minHeight: 100, textAlignVertical: "top" }
                  : {}),
              }}
              className="px-3 py-3.5 w-full text-base font-medium text-primary"
              placeholder={placeholder}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              autoCapitalize={autoCapitalize}
              editable={editable}
              keyboardType={keyboardType}
              //   {...(typeof secureTextEntry !== "undefined"
              //     ? { secureTextEntry }
              //     : {})}
              secureTextEntry={secureTextEntry}
              // Set maxLength prop dynamically if provided in props
              {...(typeof maxLength !== "undefined" ? { maxLength } : {})}
              {...(typeof numberOfLines !== "undefined"
                ? { numberOfLines }
                : {})}
              {...(typeof multiline !== "undefined" ? { multiline } : {})}
            />
            {backIcon && (
              <TouchableOpacity
                style={{ position: "absolute", right: 16 }}
                onPress={onBackIconPress}
                className="p-1"
              >
                <View>
                  <Ionicons
                    name={backIcon}
                    size={20}
                    className="!text-primary"
                    color={backIconColor ? backIconColor : "#c084fc"}
                  />
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
};

export default CustomInput;
