import React from 'react';
import {View, Text, Image, TouchableOpacity, Pressable} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {supabase} from '@/utils/supabase';
import {Link} from 'expo-router';

interface ServiceCardProps {
  id: string;
  title: string;
  description: string;
  price: number | null;
  images: string[];
  weekDays?: string[];
  distance?: number;
  isBookmarked: boolean;
  onBookmarkToggle: () => void;
}

export const ServiceCard = ({id, title, description, price, images, weekDays = [], distance, isBookmarked, onBookmarkToggle}: ServiceCardProps) => {
  const imageUrl = images && images.length > 0 ? supabase.storage.from('images').getPublicUrl(images[0]).data.publicUrl : null;

  const formatDistance = (meters?: number) => {
    if (!meters) return null;
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Link href={`/(user)/services/${id}`} asChild>
      <Pressable className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
        {/* Image Container - Full width, no padding */}
        <View className="relative w-full">
          {/* 4:3 Aspect Ratio Image */}
          <View className="aspect-[4/3] w-full border-b border-gray-200 bg-gray-200">
            {imageUrl ? (
              <Image source={{uri: imageUrl}} className="h-full w-full" resizeMode="cover" />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Ionicons name="image-outline" size={48} color="#9CA3AF" />
              </View>
            )}
          </View>

          {/* Price Badge - Bottom Left */}
          {price !== null && price > 0 && (
            <View className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1.5 shadow-sm">
              <Text className="font-nunito-bold text-base text-gray-900">${price}</Text>
            </View>
          )}

          {/* Bookmark Button - Top Right */}
          <TouchableOpacity
            onPress={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBookmarkToggle();
            }}
            className="absolute right-3 top-3 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
            activeOpacity={0.7}>
            <Ionicons name={isBookmarked ? 'heart' : 'heart-outline'} size={22} color={isBookmarked ? '#EF4444' : '#374151'} />
          </TouchableOpacity>
        </View>

        {/* Content Section */}
        <View className="p-4">
          {/* Title */}
          <Text className="mb-1 font-nunito-bold text-lg text-gray-900" numberOfLines={1}>
            {title}
          </Text>

          {/* Description */}
          <Text className="mb-3 font-nunito text-sm text-gray-600" numberOfLines={2}>
            {description}
          </Text>

          {/* Availability Pills */}
          {weekDays.length > 0 && (
            <View className="mb-2 flex-row flex-wrap gap-1.5">
              {dayLabels.map((day, index) => {
                const dayKey = day.toLowerCase().slice(0, 3);
                const isActive = weekDays.includes(dayKey);
                return (
                  <View key={index} className={`h-7 w-7 items-center justify-center rounded-full ${isActive ? 'bg-primary' : 'bg-gray-100'}`}>
                    <Text className={`font-nunito-bold text-xs ${isActive ? 'text-white' : 'text-gray-400'}`}>{day.charAt(0)}</Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Distance - Bottom Right */}
          {distance !== undefined && distance !== null && (
            <View className="flex-row justify-end">
              <View className="flex-row items-center">
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text className="ml-1 font-nunito text-xs text-gray-500">{formatDistance(distance)}</Text>
              </View>
            </View>
          )}
        </View>
      </Pressable>
    </Link>
  );
};
