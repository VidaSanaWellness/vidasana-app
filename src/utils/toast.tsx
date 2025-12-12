import {Text, View} from 'react-native';
import {ToastConfig} from 'react-native-toast-message';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export const toastConfig: ToastConfig = {
  success: (props: any) => (
    <View className="m-2 max-w-80 flex-row items-center gap-3 rounded-full bg-white px-6 py-4 shadow-2xl">
      <MaterialCommunityIcons name="check-circle-outline" size={24} color="green" />
      <View className="mr-2 flex-1">
        {props.text1 && <Text className="flex-1 text-xl font-medium">{props.text1}</Text>}
        {props.text2 && <Text className="flex-1 text-base font-medium">{props.text2}</Text>}
      </View>
    </View>
  ),
  error: (props: any) => (
    <View className="m-2 max-w-80 flex-row items-center gap-3 rounded-full bg-white px-6 py-4 shadow-2xl">
      <MaterialCommunityIcons name="close-circle-outline" size={24} color="red" />
      <View className="mr-2 flex-1">
        {props.text1 && <Text className="flex-1 text-xl font-medium">{props.text1}</Text>}
        {props.text2 && <Text className="flex-1 text-base font-medium">{props.text2}</Text>}
      </View>
    </View>
  ),
  info: (props: any) => (
    <View className="m-2 max-w-80 flex-row items-center gap-3 rounded-full bg-white px-6 py-4 shadow-2xl">
      <MaterialCommunityIcons name="information-outline" size={24} color="blue" />
      <View className="mr-2 flex-1">
        {props.text1 && <Text className="flex-1 text-xl font-medium">{props.text1}</Text>}
        {props.text2 && <Text className="flex-1 text-base font-medium">{props.text2}</Text>}
      </View>
    </View>
  ),
};
