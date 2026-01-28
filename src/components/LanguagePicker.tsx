import React from 'react';
import {H3, Body} from './Typography';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Modal, View, TouchableOpacity, TouchableWithoutFeedback} from 'react-native';

interface LanguagePickerProps {
  visible: boolean;
  onClose: () => void;
}

export const LanguagePicker: React.FC<LanguagePickerProps> = ({visible, onClose}) => {
  const insets = useSafeAreaInsets();
  const {t, i18n} = useTranslation();

  const storedLanguage = i18n.language;

  const languages = [
    {code: 'en', label: t('languages.en'), icon: '🇺🇸'},
    {code: 'fr', label: t('languages.fr'), icon: '🇫🇷'},
    {code: 'es', label: t('languages.es'), icon: '🇪🇸'},
  ];

  const handleLanguageSelect = (code: string) => {
    i18n.changeLanguage(code);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-black/50">
          <TouchableWithoutFeedback>
            <View className="rounded-t-3xl bg-white" style={{paddingBottom: insets.bottom + 20}}>
              <View className="border-b border-gray-100 p-4">
                <H3 align="center" className="text-gray-900">
                  {t('settings.selectLanguage')}
                </H3>
              </View>

              <View className="p-4">
                {languages.map((lang, index) => {
                  const isSelected = storedLanguage === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      onPress={() => handleLanguageSelect(lang.code)}
                      className={`mb-3 flex-row items-center justify-between rounded-2xl border p-4 ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-gray-100 bg-gray-50'
                      }`}>
                      <View className="flex-row items-center space-x-3">
                        <Body className="text-2xl">{lang.icon}</Body>
                        <Body className={`${isSelected ? 'font-nunito-bold text-primary' : 'text-gray-700'}`}>{lang.label}</Body>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={24} color="#00594f" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
