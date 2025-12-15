import React, {useMemo} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';

type PasswordStrengthBarProps = {password: string; visible: boolean};

const PasswordStrengthBar = ({password, visible}: PasswordStrengthBarProps) => {
  const {t} = useTranslation();
  if (!visible) return null;

  // Calculate password strength score (0-100)
  const strengthScore = useMemo(() => {
    let score = 0;

    score += Math.min(30, (password.length / 12) * 30);

    if (/[A-Z]/.test(password)) score += 15; // Uppercase
    if (/[a-z]/.test(password)) score += 15; // Lowercase
    if (/[0-9]/.test(password)) score += 15; // Numbers
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15; // Special chars
    if (/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).*$/.test(password)) {
      score += 10; // All character types bonus
    }

    return Math.min(100, score);
  }, [password]);

  const getStrengthColor = () => {
    if (strengthScore < 33) return '#FF4B4B'; // Red
    if (strengthScore < 66) return '#FFB74B'; // Orange
    if (strengthScore < 100) return '#FFD700'; // Yellow
    return '#4CAF50'; // Green
  };

  const getStrengthLabel = () => {
    if (strengthScore < 33) return t('passwordStrength.weak');
    if (strengthScore < 66) return t('passwordStrength.fair');
    if (strengthScore < 100) return t('passwordStrength.good');
    return t('passwordStrength.strong');
  };

  const strengthLabel = getStrengthLabel();
  const strengthColor = getStrengthColor();

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{t('passwordStrength.label')}</Text>
        <Text style={[styles.strengthLabel, {color: strengthColor}]}>{strengthLabel}</Text>
      </View>
      <View style={styles.barBackground}>
        <View style={[styles.strengthBar, {width: `${strengthScore}%`, backgroundColor: strengthColor}]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  strengthLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  barBackground: {
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthBar: {
    height: '100%',
    borderRadius: 3,
  },
});

export default PasswordStrengthBar;
