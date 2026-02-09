import React from 'react';
import {useAppStore} from '@/store';
import {Display, Subtitle, Body} from './';
import {Ionicons} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';
import {View, Modal, TouchableOpacity, Linking} from 'react-native';

export const SOSFAB = () => {
  const setSOSOpen = useAppStore((s) => s.setSOSOpen);

  return (
    <TouchableOpacity
      onPress={() => setSOSOpen(true)}
      className="elevation-5 bottom-safe-offset-16 android:mb-4 absolute right-5 z-50 h-14 w-14 items-center justify-center rounded-full bg-red-600 shadow-lg">
      <Ionicons name="medical" size={28} color="white" />
    </TouchableOpacity>
  );
};

export const SOSModal = () => {
  const {t} = useTranslation();
  const isSOSOpen = useAppStore((s) => s.isSOSOpen);
  const setSOSOpen = useAppStore((s) => s.setSOSOpen);

  const handleCall = (number: string) => Linking.openURL(`tel:${number}`);
  const handleText = (number: string) => Linking.openURL(`sms:${number}`);

  return (
    <Modal visible={isSOSOpen} transparent animationType="slide" onRequestClose={() => setSOSOpen(false)}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="rounded-t-3xl bg-white p-6 pb-10 shadow-xl">
          {/* Header */}
          <View className="mb-6 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Ionicons name="warning" size={24} color="#EF4444" />
              </View>
              <Display className="text-xl font-bold text-red-600">{t('sos.title')}</Display>
            </View>
            <TouchableOpacity onPress={() => setSOSOpen(false)} className="rounded-full bg-gray-100 p-2">
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>

          {/* Primary Instruction */}
          <View className="mb-6 rounded-xl bg-red-50 p-4">
            <Body className="font-bold text-red-800">{t('sos.dangerWarning')}</Body>
          </View>

          {/* Emergency Services */}
          <Subtitle className="mb-3 font-bold text-gray-900">{t('sos.emergencyServices')}</Subtitle>
          <TouchableOpacity onPress={() => handleCall('911')} className="mb-2 w-full flex-row items-center justify-center rounded-xl bg-red-600 py-4">
            <Ionicons name="call" size={24} color="white" className="mr-3" />
            <Body className="text-lg font-bold text-white">{t('sos.call911')}</Body>
          </TouchableOpacity>
          <Body className="mb-6 text-center text-sm text-gray-500">{t('sos.useThisRisk')}</Body>

          {/* Crisis Support */}
          <Subtitle className="mb-3 font-bold text-gray-900">{t('sos.crisisSupport')}</Subtitle>

          {/* Mexico */}
          <View className="mb-4 rounded-xl border border-gray-200 p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Body className="font-bold text-gray-900">{t('sos.mexicoTitle')}</Body>
              <TouchableOpacity onPress={() => handleCall('8009112000')} className="rounded-full bg-green-100 px-4 py-2">
                <Body className="font-bold text-green-700">{t('sos.call')}</Body>
              </TouchableOpacity>
            </View>
            <Body className="mb-1 text-lg font-bold text-gray-800">800 911 2000</Body>
            <Body className="text-sm text-gray-600">{t('sos.mexicoDesc')}</Body>
          </View>

          {/* United States */}
          <View className="mb-6 rounded-xl border border-gray-200 p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Body className="font-bold text-gray-900">{t('sos.usTitle')}</Body>
              <View className="flex-row">
                <TouchableOpacity onPress={() => handleText('988')} className="mr-2 rounded-full bg-blue-100 px-4 py-2">
                  <Body className="font-bold text-blue-700">{t('sos.text')}</Body>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleCall('988')} className="rounded-full bg-green-100 px-4 py-2">
                  <Body className="font-bold text-green-700">{t('sos.call')}</Body>
                </TouchableOpacity>
              </View>
            </View>
            <Body className="mb-1 text-lg font-bold text-gray-800">988</Body>
            <Body className="text-sm text-gray-600">{t('sos.usDesc')}</Body>
          </View>

          {/* Supportive Closing */}
          <Body className="text-center text-sm italic text-gray-500">{t('sos.supportiveClosing')}</Body>

          <View className="h-4" />
        </View>
      </View>
    </Modal>
  );
};
