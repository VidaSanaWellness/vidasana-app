import React from 'react';
import {AntDesign} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {ScrollView, TouchableOpacity, Image} from 'react-native';

type Props = {images?: string[]; onChange: (images: string[]) => void};

export function ImagePickerRow({images, onChange}: Props) {
  const pickImage = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({quality: 0.7, allowsEditing: true, mediaTypes: ImagePicker.MediaTypeOptions.Images});

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const updatedImages = [...(images || [])];
      updatedImages[index] = uri;
      onChange(updatedImages);
    }
  };

  const cards = [...(images || []), '']; // extra card for adding new image

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="my-2">
      {cards.map((img, idx) => (
        <TouchableOpacity
          key={idx}
          onPress={() => pickImage(idx)}
          className="m-1 h-36 w-36 items-center justify-center overflow-hidden rounded-lg bg-gray-200">
          {img ? (
            <Image source={{uri: img}} className="h-36 w-36 rounded-lg" resizeMode="cover" />
          ) : (
            <AntDesign name="plus" size={40} color="#4B5563" />
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
