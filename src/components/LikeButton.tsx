import React from 'react';
import {TouchableOpacity, ActivityIndicator} from 'react-native';
import {Ionicons} from '@expo/vector-icons';

interface LikeButtonProps {
  isLiked: boolean;
  onToggle: () => void;
  isLoading?: boolean;
  size?: number;
}

export const LikeButton: React.FC<LikeButtonProps> = ({isLiked, onToggle, isLoading = false, size = 24}) => {
  return (
    <TouchableOpacity onPress={onToggle} disabled={isLoading} className="rounded-full bg-black/30 p-2 backdrop-blur-md">
      {isLoading ? (
        <ActivityIndicator size="small" color="white" />
      ) : (
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={size}
          color={isLiked ? '#ef4444' : 'white'} // Red-500
        />
      )}
    </TouchableOpacity>
  );
};
