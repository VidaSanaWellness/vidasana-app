import React from 'react';
import {Feather} from '@expo/vector-icons';
import {H3, Caption, H2} from './Typography';
import {View, Image, TouchableOpacity} from 'react-native';

type BookingCardProps = {
  title: string;
  startTime: string;
  endTime?: string;
  description?: string;
  image?: string;

  price?: number;
  onPress?: () => void;
};

export const BookingCard = ({title, startTime, endTime, description, image, price, onPress}: BookingCardProps) => {
  return (
    <View className="mb-3 flex-row">
      {/* Card Content */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        className="flex-1 flex-row justify-between rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
        <View className="flex-1 pr-4">
          {/* Time */}
          <Caption className="text-gray-500">
            {startTime} {endTime ? `- ${endTime}` : ''}
          </Caption>

          {/* Title */}
          <H3 className="text-gray-900" numberOfLines={1}>
            {title}
          </H3>

          {/* Description */}
          <View className="mb-1 flex-1 flex-row">
            <Caption className="text-xs leading-4 text-gray-500" numberOfLines={2}>
              {description || 'No description available'}
            </Caption>
          </View>

          {/* Price / Relevant Info */}
          <View className="flex-row items-center">
            <H2 className="font-nunito-bold text-sm text-primary">{price ? `$${price}` : 'Free'}</H2>
          </View>
        </View>

        {/* Image */}
        {image ? (
          <Image source={{uri: image}} className="h-24 w-24 rounded-2xl bg-gray-200" />
        ) : (
          <View className="h-24 w-24 items-center justify-center rounded-2xl bg-gray-50">
            <Feather name="image" size={24} color="#D1D5DB" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};
