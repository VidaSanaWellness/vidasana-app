import React from 'react';
import {TouchableOpacity, View, ActivityIndicator, TouchableOpacityProps} from 'react-native';
import {Body} from './Typography';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  label: string;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  label,
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) => {
  // Base utilities
  const baseClasses = 'flex-row items-center justify-center rounded-lg';

  // Size variations
  const sizeClasses = {
    sm: 'px-4 py-2',
    md: 'px-6 py-3.5',
    lg: 'px-8 py-4',
  };

  // Variant variations
  const variantClasses = {
    primary: 'bg-primary shadow-sm active:opacity-90',
    secondary: 'bg-secondary shadow-sm active:opacity-90',
    outline: 'bg-transparent border border-primary active:bg-primary/5',
    ghost: 'bg-transparent active:bg-gray-100',
  };

  // Text color based on variant
  const getTextClasses = () => {
    switch (variant) {
      case 'outline':
        return 'text-primary';
      case 'ghost':
        return 'text-gray-700';
      default:
        return 'text-white';
    }
  };

  // Text size based on button size
  const getTextSize = () => {
    switch (size) {
      case 'sm':
        return 'text-sm font-nunito-bold';
      case 'lg':
        return 'text-lg font-nunito-bold';
      default:
        return 'text-base font-nunito-bold'; // md
    }
  };

  return (
    <TouchableOpacity
      disabled={disabled || loading}
      className={`
        ${baseClasses} 
        ${sizeClasses[size]} 
        ${variantClasses[variant]} 
        ${fullWidth ? 'w-full' : 'self-start'} 
        ${disabled ? 'opacity-50' : ''}
        ${className}
      `}
      {...props}>
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' || variant === 'ghost' ? '#00594f' : 'white'} />
      ) : (
        <>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Body className={`${getTextClasses()} ${getTextSize()} text-center`}>{label}</Body>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  );
};
