import {FC} from 'react';
import {ActivityIndicator, View} from 'react-native';

type LoaderProps = {visible: boolean};

export const Loader: FC<LoaderProps> = ({visible}) => {
  return (
    !!visible && (
      <View className="absolute left-0 top-0 z-50 h-screen w-screen items-center justify-center bg-black/20">
        <ActivityIndicator size="large" color="#00594f" />
      </View>
    )
  );
};
