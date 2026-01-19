import React from 'react';
import {Text, TextProps} from 'react-native';

interface TypographyProps extends TextProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Primary: Deep Wellness Green (#00594f)
   * Secondary: Vital Energy Orange (#eb3300)
   * Sage: Soft Sage (#9dc6bc)
   * Default: Dark Gray/Black for text
   */
  color?: 'primary' | 'secondary' | 'sage' | 'default' | 'white' | 'gray';
  align?: 'left' | 'center' | 'right';
}

const getColorClass = (color: TypographyProps['color']) => {
  switch (color) {
    case 'primary':
      return 'text-primary';
    case 'secondary':
      return 'text-secondary';
    case 'sage':
      return 'text-sage';
    case 'white':
      return 'text-white';
    case 'gray':
      return 'text-gray-600';
    default:
      return 'text-gray-900';
  }
};

const getAlignClass = (align: TypographyProps['align']) => {
  switch (align) {
    case 'center':
      return 'text-center';
    case 'right':
      return 'text-right';
    default:
      return 'text-left';
  }
};

/**
 * 900 Weight - Logo / Brand Title
 */
export const Display = ({children, className = '', color = 'default', align, ...props}: TypographyProps) => {
  return (
    <Text className={`font-nunito-black text-4xl tracking-tight ${getColorClass(color)} ${getAlignClass(align)} ${className}`} {...props}>
      {children}
    </Text>
  );
};

/**
 * 800 Weight - Primary Heading (Screen Titles)
 */
export const H1 = ({children, className = '', color = 'default', align, ...props}: TypographyProps) => {
  return (
    <Text className={`font-nunito-extra-bold text-3xl tracking-tight ${getColorClass(color)} ${getAlignClass(align)} ${className}`} {...props}>
      {children}
    </Text>
  );
};

/**
 * 700 Weight - Subheading
 */
export const H2 = ({children, className = '', color = 'default', align, ...props}: TypographyProps) => {
  return (
    <Text className={`font-nunito-bold text-2xl ${getColorClass(color)} ${getAlignClass(align)} ${className}`} {...props}>
      {children}
    </Text>
  );
};

/**
 * 600 Weight - Section Header
 */
export const H3 = ({children, className = '', color = 'default', align, ...props}: TypographyProps) => {
  return (
    <Text className={`font-nunito-semibold text-lg ${getColorClass(color)} ${getAlignClass(align)} ${className}`} {...props}>
      {children}
    </Text>
  );
};

/**
 * 500 Weight - Subtitle / Descriptors
 */
export const Subtitle = ({children, className = '', color = 'gray', align, ...props}: TypographyProps) => {
  return (
    <Text className={`font-nunito-medium text-base ${getColorClass(color)} ${getAlignClass(align)} ${className}`} {...props}>
      {children}
    </Text>
  );
};

/**
 * 400 Weight - Standard Body Text
 */
export const Body = ({children, className = '', color = 'default', align, ...props}: TypographyProps) => {
  return (
    <Text className={`font-nunito text-base leading-6 ${getColorClass(color)} ${getAlignClass(align)} ${className}`} {...props}>
      {children}
    </Text>
  );
};

/**
 * 300 Weight - Emphasis / Quotes / Light
 */
export const Light = ({children, className = '', color = 'default', align, ...props}: TypographyProps) => {
  return (
    <Text className={`font-nunito-light text-base italic ${getColorClass(color)} ${getAlignClass(align)} ${className}`} {...props}>
      {children}
    </Text>
  );
};

/**
 * 200 Weight - Caption / Fine Print
 */
export const Caption = ({children, className = '', color = 'gray', align, ...props}: TypographyProps) => {
  return (
    <Text className={`font-nunito-light text-sm ${getColorClass(color)} ${getAlignClass(align)} ${className}`} {...props}>
      {children}
    </Text>
  );
};
