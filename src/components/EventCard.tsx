import React from 'react';
import {View, Image, TouchableOpacity, Pressable} from 'react-native';
import {Ionicons, Feather} from '@expo/vector-icons';
import {supabase} from '@/utils/supabase';
import {Link} from 'expo-router';
import {H3, Subtitle, Caption, H2} from './Typography';
import {Avatar} from './Avatar';

interface EventCardProps {
  id: string;
  title: string;
  description: string;
  price?: number | null;
  images: string[] | null;
  startAt: string;
  distance?: number;
  provider?: {
    name: string;
    image?: string | null;
  } | null;
  basePath?: string;
  rating?: number;
  variant?: 'user' | 'provider';
  isActive?: boolean;
}

export const EventCard = ({
  id,
  title,
  description,
  price,
  images,
  startAt,
  distance,
  provider,
  basePath,
  rating,
  variant = 'user',
  isActive,
}: EventCardProps) => {
  const imageUrl = images && images.length > 0 ? supabase.storage.from('images').getPublicUrl(images[0]).data.publicUrl : null;
  const startDate = new Date(startAt);
  const linkHref = basePath ? `${basePath}/${id}` : variant === 'provider' ? `/(provider)/events/${id}` : `/(user)/events/${id}`;

  const formatDistance = (meters?: number) => {
    if (!meters && meters !== 0) return null;
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)} km`;
  };

  // Date Badge Info
  const month = startDate.toLocaleString('default', {month: 'short'}).toUpperCase();
  const day = startDate.getDate();
  const time = startDate.toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit', hour12: true});

  // Theme Color (~Deep Teal)
  const THEME_COLOR = '#045D56';

  return (
    <Link href={linkHref} asChild>
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
              <Feather name="calendar" size={36} color="#D1D5DB" />
            </View>
          )}

          {/* Date Badge (Overlay) - Always Top Left */}
          <View className="absolute left-4 top-4 overflow-hidden rounded-xl bg-white/95 shadow-sm backdrop-blur-md">
            <View className="items-center px-3 py-2">
              <Caption className="font-nunito-bold text-xs uppercase text-red-500">{month}</Caption>
              <H3 className="font-nunito-extrabold text-xl leading-5 text-gray-900">{day}</H3>
            </View>
          </View>

          {/* Provider: Active/Inactive Badge (Top Right) */}
          {variant === 'provider' && isActive !== undefined && (
            <View className={`absolute right-4 top-4 rounded-full px-2 py-1 ${isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Caption className={`font-nunito-bold text-xs ${isActive ? 'text-green-700' : 'text-gray-500'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </Caption>
            </View>
          )}

          {/* User: Like Button (Top Right) */}
          {variant === 'user' && (
            <TouchableOpacity
              className="absolute right-4 top-4 h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm"
              activeOpacity={0.7}>
              <Ionicons name="heart-outline" size={20} color="#1F2937" />
            </TouchableOpacity>
          )}
        </View>

        {/* --- Content Body --- */}
        <View className="flex-col gap-2 p-4">
          {/* Row 1: Title & Rating */}
          <View className="flex-row items-center justify-between">
            {/* Title (Left) */}
            <H2 className="flex-1 text-xl capitalize text-gray-900" numberOfLines={1}>
              {title}
            </H2>

            {/* Rating (Right) */}
            {rating ? (
              <View className="flex-row items-center gap-1 rounded-md bg-yellow-50 px-1.5 py-0.5">
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Caption className="font-nunito-bold text-xs text-yellow-700">{rating}</Caption>
              </View>
            ) : null}
          </View>

          {/* Row 2: Provider/Desc & Price */}
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1 flex-row items-center gap-2">
              {variant === 'user' && provider?.image && <Avatar size={20} uri={provider.image} name={provider.name} />}
              <Caption className="max-w-[150px] flex-1 text-gray-500" numberOfLines={1}>
                {variant === 'user' ? provider?.name : description}
              </Caption>
            </View>

            <View className="items-end">
              <H2 style={{color: THEME_COLOR}}>${price || 0}</H2>
            </View>
          </View>

          {/* Row 3: Time & Location */}
          <View className="flex-row items-end justify-between border-t border-gray-50 pt-2">
            {/* Time (Left) */}
            <View className="flex-1 flex-row items-center gap-1.5">
              <Feather name="clock" size={14} color="#4B5563" />
              <Caption className="font-nunito-bold text-[11px] text-gray-600">{time}</Caption>
            </View>

            {/* Distance (Right) - Only User */}
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
