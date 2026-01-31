import {Body, Caption} from './Typography';
import {UnifiedImage} from '@/types/service';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import {Control, Controller} from 'react-hook-form';
import {AntDesign, Feather} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {View, ScrollView, TouchableOpacity, Image} from 'react-native';

type Props = {name: string; label: string; control: Control<any>};

export function ImageInput({control, name, label}: Props) {
  const {t} = useTranslation();
  const pickImages = async (value: UnifiedImage[], onChange: (images: UnifiedImage[]) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      const validImages: ImagePicker.ImagePickerAsset[] = [];
      let rejectedCount = 0;

      result.assets.forEach((asset) => {
        if (asset.fileSize && asset.fileSize <= MAX_SIZE) {
          validImages.push(asset);
        } else {
          rejectedCount++;
        }
      });

      if (rejectedCount > 0) {
        Toast.show({type: 'error', text1: 'File too large', text2: `${rejectedCount} image(s) skipped (>5MB).`});
      }

      if (validImages.length > 0) {
        const newImages: UnifiedImage[] = validImages.map((asset) => ({type: 'new', file: asset, id: asset.uri, uri: asset.uri}));
        // Ensure we append to existing
        onChange([...(value || []), ...newImages]);
      }
    }
  };

  return (
    <View className="mb-4">
      <Body className="mb-1 font-nunito-bold text-sm text-gray-700">{label}</Body>
      <Controller
        name={name}
        control={control}
        rules={{validate: (val) => val?.length > 0 || 'At least one image is required'}}
        render={({field: {onChange, value}, fieldState: {error}}) => (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2 flex-row">
              {value?.map((img: UnifiedImage, index: number) => (
                <View key={img.id || index} className="relative mr-2">
                  <Image source={{uri: img.uri}} className="h-24 w-24 rounded-lg bg-gray-100" />
                  <TouchableOpacity
                    onPress={() => onChange(value.filter((_: any, i: number) => i !== index))}
                    className="absolute right-1 top-1 rounded-full bg-red-500 p-1">
                    <AntDesign name="close" size={12} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                onPress={() => pickImages(value, onChange)}
                className="h-24 w-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                <Feather name="camera" size={24} color="gray" />
                <Caption className="mt-1 text-gray-500">{t('common.addPhotos')}</Caption>
              </TouchableOpacity>
            </ScrollView>
            {error?.message && <Caption className="mt-1 text-red-500">{error.message as string}</Caption>}
          </>
        )}
      />
    </View>
  );
}
