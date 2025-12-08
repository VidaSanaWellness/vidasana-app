import {Text, View} from 'react-native';
import {ToastConfig} from 'react-native-toast-message';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export const toastConfig: ToastConfig = {
  success: (props: any) => (
    <View className="mt-2 flex-row items-center gap-3 rounded-full bg-white px-6 py-4 shadow-2xl">
      <MaterialCommunityIcons name="check-circle-outline" size={24} color="green" />
      <View className="gap-2">
        <Text className="text-[16px] font-medium">{props.text1}</Text>
        {props.text2 && <Text className="text-[14px] font-medium">{props.text2}</Text>}
      </View>
    </View>
  ),
  error: (props: any) => (
    <View className="mt-2 flex-row items-center gap-3 rounded-full bg-white px-6 py-4 shadow-2xl">
      <MaterialCommunityIcons name="close-circle-outline" size={24} color="red" />
      <View className="gap-2">
        <Text className="text-[16px] font-medium">{props.text1}</Text>
        {props.text2 && <Text className="text-[14px] font-medium">{props.text2}</Text>}
      </View>
    </View>
  ),
  info: (props: any) => (
    <View className="mt-2 flex-row items-center gap-3 rounded-full bg-white px-6 py-4 shadow-2xl">
      <MaterialCommunityIcons name="information-outline" size={24} color="blue" />
      <View className="gap-2">
        <Text className="text-[16px] font-medium">{props.text1}</Text>
        {props.text2 && <Text className="text-[14px] font-medium">{props.text2}</Text>}
      </View>
    </View>
  ),
};
