import React from 'react';
import {View, Image, TouchableOpacity, Pressable} from 'react-native';
import {Ionicons, Feather} from '@expo/vector-icons';
import {supabase} from '@/utils/supabase';
import {Link} from 'expo-router';
import {Display, H1, Subtitle, Caption, H2, H3} from './Typography';
import {Avatar} from './Avatar';

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
  provider?: {
    name: string;
    image?: string | null;
    id?: string;
  } | null;
  rating?: number;
  basePath?: string;
  variant?: 'user' | 'provider';
  isActive?: boolean;
}

export const ServiceCard = ({
  id,
  title,
  price,
  images,
  weekDays = [],
  distance,
  isBookmarked,
  onBookmarkToggle,
  provider,
  rating,
  basePath,
  variant = 'user',
  isActive,
}: ServiceCardProps) => {
  const imageUrl = images && images.length > 0 ? supabase.storage.from('images').getPublicUrl(images[0]).data.publicUrl : null;

  // Default path logic
  const linkHref = basePath ? `${basePath}/${id}` : variant === 'provider' ? `/(provider)/services/${id}` : `/(user)/services/${id}`;

  const formatDistance = (meters?: number) => {
    if (!meters && meters !== 0) return null;
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const displayDays = weekDays && weekDays.length > 0 ? weekDays.slice(0, 3).map((d) => d.slice(0, 3).charAt(0).toUpperCase() + d.slice(1, 3)) : [];

  const showProvider = variant === 'user' && provider && provider.name && provider.name.trim().length > 0;

  return (
    <Link href={linkHref as any} asChild>
      <Pressable className="mb-5 block overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm shadow-gray-200 active:scale-[0.99]">
        {/* --- Hero Image Section --- */}
        <View className="relative aspect-[16/10] w-full bg-gray-100">
          {imageUrl ? (
            <Image
              source={{uri: imageUrl}}
              className={`h-full w-full ${variant === 'provider' && !isActive ? 'opacity-50' : ''}`}
              resizeMode="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center bg-gray-50">
              <Ionicons name="image-outline" size={36} color="#D1D5DB" />
            </View>
          )}

          {/* Provider: Active/Inactive Badge */}
          {variant === 'provider' && isActive !== undefined && (
            <View className={`absolute left-4 top-4 rounded-full px-2 py-1 ${isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Caption className={`font-nunito-bold text-xs ${isActive ? 'text-green-700' : 'text-gray-500'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </Caption>
            </View>
          )}

          {/* User: Like Button (Top Right) */}
          {variant === 'user' && (
            <TouchableOpacity
              onPress={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onBookmarkToggle();
              }}
              className="absolute right-4 top-4 h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm"
              activeOpacity={0.7}>
              <Ionicons name={isBookmarked ? 'heart' : 'heart-outline'} size={20} color={isBookmarked ? '#EF4444' : '#1F2937'} />
            </TouchableOpacity>
          )}
        </View>

        {/* --- Content Body --- */}
        <View className="flex-col gap-2 p-4">
          {/* Row 1: Provider & Rating */}
          <View className="flex-row items-center justify-between">
            {/* Provider (Left) - Only for User */}
            {showProvider ? (
              <View className="flex-1 flex-row items-center gap-2">
                <Avatar size={30} uri={provider!.image} name={provider!.name} className="bg-gray-100" />
                <H3 className="max-w-[150px] flex-1 capitalize text-gray-600" numberOfLines={1}>
                  {provider!.name}
                </H3>
              </View>
            ) : (
              // Spacer if no provider shown
              <View />
            )}

            {/* Rating (Right) - Shown for both */}
            {rating ? (
              <View className="flex-row items-center gap-1 rounded-md bg-yellow-50 px-1.5 py-0.5">
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Caption className="font-nunito-bold text-xs text-yellow-700">{rating}</Caption>
              </View>
            ) : null}
          </View>

          {/* Row 2: Title & Price */}
          <View className="flex-row items-start justify-between gap-2">
            <H2 className="flex-1 text-xl capitalize text-gray-900" numberOfLines={1}>
              {title}
            </H2>
            <View className="items-end">
              <H2 className="text-deep-teal">${price || 0}</H2>
            </View>
          </View>

          {/* Row 3: Weekdays & Distance */}
          <View className="flex-row items-end justify-between">
            {/* Weekdays (Left) */}
            <View className="flex-1 flex-row flex-wrap items-center gap-1.5">
              {displayDays.length > 0 ? (
                <>
                  <Feather name="calendar" size={14} color="#4B5563" />
                  {displayDays.map((day, i) => (
                    <View key={i} className="rounded bg-gray-100 px-1.5 py-[2px]">
                      <Caption className="font-nunito-bold text-[10px] text-gray-500">{day}</Caption>
                    </View>
                  ))}
                </>
              ) : (
                <View className="h-4 w-1/3 rounded bg-gray-50" />
              )}
            </View>

            {/* Distance (Right) - Only for User */}
            {variant === 'user' && distance !== undefined && distance !== null && (
              <View className="flex-row items-center gap-1 pl-2">
                <Feather name="map-pin" size={14} color="#4B5563" />
                <Subtitle className="text-[12px] text-gray-500">{formatDistance(distance)}</Subtitle>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </Link>
  );
};
