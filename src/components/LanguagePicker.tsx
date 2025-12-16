import React from 'react';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback} from 'react-native';

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
                <Text className="text-center text-lg font-semibold text-gray-900">{t('settings.selectLanguage')}</Text>
              </View>

              <View className="p-4">
                {languages.map((lang, index) => {
                  const isSelected = storedLanguage === lang.code;
                  return (
                    <TouchableOpacity
                      key={lang.code}
                      onPress={() => handleLanguageSelect(lang.code)}
                      className={`mb-3 flex-row items-center justify-between rounded-xl border p-4 ${
                        isSelected ? 'border-[#3E6065] bg-[#3E6065]/5' : 'border-gray-100 bg-gray-50'
                      }`}>
                      <View className="flex-row items-center space-x-3">
                        <Text className="text-2xl">{lang.icon}</Text>
                        <Text className={`text-base ${isSelected ? 'font-semibold text-[#3E6065]' : 'text-gray-700'}`}>{lang.label}</Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={24} color="#3E6065" />}
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
