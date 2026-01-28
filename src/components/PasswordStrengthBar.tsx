import React from 'react';
import {View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Caption} from './Typography';

type PasswordStrengthBarProps = {password: string; visible: boolean};

export const PasswordStrengthBar = ({password, visible}: PasswordStrengthBarProps) => {
  const {t} = useTranslation();

  const score = (() => {
    let score = 0;
    score += Math.min(30, (password.length / 10) * 30);
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;
    if (/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).*$/.test(password)) score += 10;
    return Math.min(100, score);
  })();

  const getStrengthColor = () => {
    if (score < 33) return '#FF4B4B';
    if (score < 66) return '#FFB74B';
    if (score < 100) return '#FFD700';
    return '#4CAF50';
  };

  const getStrengthLabel = () => {
    if (score < 33) return t('passwordStrength.weak');
    if (score < 66) return t('passwordStrength.fair');
    if (score < 100) return t('passwordStrength.good');
    return t('passwordStrength.strong');
  };

  return !visible ? null : (
    <View className="mb-2 px-2">
      <View className="mb-1 flex-row items-center justify-between">
        <Caption className="text-[14px] text-[#666]">{t('passwordStrength.label')}</Caption>
        <Caption className="font-nunito-bold text-[14px]" style={{color: getStrengthColor()}}>
          {getStrengthLabel()}
        </Caption>
      </View>

      <View className="h-[6px] overflow-hidden rounded-[3px] bg-[#E5E5E5]">
        <View className="h-full rounded-[3px]" style={{width: `${score}%`, backgroundColor: getStrengthColor()}} />
      </View>
    </View>
  );
};
