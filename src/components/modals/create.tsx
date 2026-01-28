import {Link} from 'expo-router';
import React, {useState} from 'react';
import {Ionicons} from '@expo/vector-icons';
import {Modal, Pressable, View} from 'react-native';
import {H3, Body} from '../Typography';

export const Create = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} className="flex-row items-center rounded-full bg-primary px-4 py-2 shadow-sm">
        <Ionicons name="add" size={16} className="text-white" />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="relative w-full rounded-3xl bg-white p-6 shadow-xl">
            <View className="mb-6 flex-row items-center justify-between">
              <H3 className="text-gray-900">Create New</H3>
              <Pressable onPress={() => setOpen(false)} className="rounded-full bg-gray-100 p-2">
                <Ionicons name="close" disabled size={18} className="text-gray-600" />
              </Pressable>
            </View>

            <Link href="/(provider)/events/create" asChild onPress={() => setOpen(false)}>
              <Pressable className="mb-3 flex-row items-center rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <Ionicons size={20} name="calendar" className="text-primary" />
                <Body className="ml-3 font-nunito-bold text-base text-gray-800">Create Event</Body>
              </Pressable>
            </Link>

            <Link href="/(provider)/services/create" asChild onPress={() => setOpen(false)}>
              <Pressable className="flex-row items-center rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <Ionicons size={20} name="briefcase" className="text-primary" />
                <Body className="ml-3 font-nunito-bold text-base text-gray-800">Create Service</Body>
              </Pressable>
            </Link>
          </View>
        </View>
      </Modal>
    </>
  );
};
