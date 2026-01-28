import React, {useState} from 'react';
import {View, Image, Dimensions, StyleSheet} from 'react-native';
import {Feather} from '@expo/vector-icons';
import {supabase} from '@/utils/supabase';
import Carousel from 'react-native-reanimated-carousel';

interface ImageCarouselProps {
  images: string[] | null | undefined;
  height?: number; // Optional, defaults to aspect-square or specific height
  aspectRatio?: 'square' | 'video' | 'wide'; // Preset ratios
}

const {width: SCREEN_WIDTH} = Dimensions.get('window');

export default function ImageCarousel({images, aspectRatio = 'square'}: ImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Filter valid images
  const validImages = images?.filter((img) => typeof img === 'string' && img.length > 0) || [];

  // Logic to resolve image URL (Supabase storage or direct URL)
  const getImageUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    return supabase.storage.from('images').getPublicUrl(path).data.publicUrl;
  };

  const getHeight = () => {
    if (aspectRatio === 'square') return SCREEN_WIDTH;
    if (aspectRatio === 'video') return SCREEN_WIDTH * (9 / 16);
    return 300; // default/wide
  };

  const carouselHeight = getHeight();

  if (validImages.length === 0) {
    return (
      <View style={[styles.container, {height: carouselHeight, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center'}]}>
        <Feather name="image" size={40} color="gray" />
      </View>
    );
  }

  return (
    <View style={[styles.container, {height: carouselHeight}]}>
      <Carousel
        loop={false}
        width={SCREEN_WIDTH}
        height={carouselHeight}
        data={validImages}
        scrollAnimationDuration={1000}
        onSnapToItem={(index) => setActiveIndex(index)}
        renderItem={({item}) => (
          <View style={{flex: 1}}>
            <Image source={{uri: getImageUrl(item)}} style={{width: '100%', height: '100%'}} resizeMode="cover" />
          </View>
        )}
      />

      {/* Pagination Dots */}
      {validImages.length > 1 && (
        <View style={styles.paginationContainer}>
          {validImages.map((_, index) => (
            <View key={index} style={[styles.dot, {backgroundColor: index === activeIndex ? '#ffffff' : 'rgba(255, 255, 255, 0.5)'}]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
