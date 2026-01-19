import React from 'react';
import {ScrollView, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Display, H1, H2, H3, Subtitle, Body, Caption} from '@/components/Typography';
import {Button} from '@/components/Button';
import {Feather} from '@expo/vector-icons';

export default function DesignSystemScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{padding: 24, paddingBottom: 100}}>
        <Display color="primary" className="mb-2">
          VidaSana
        </Display>
        <Subtitle className="mb-8">Design System v1.0</Subtitle>

        <H2 className="mb-4 text-gray-400">Typography</H2>
        <View className="mb-8 space-y-4 rounded-3xl bg-gray-50 p-6">
          <Display>Display (Nunito 900)</Display>
          <H1>Heading 1 (Nunito 800)</H1>
          <H2>Heading 2 (Nunito 700)</H2>
          <H3>Heading 3 (Nunito 600)</H3>
          <Subtitle>Subtitle (Nunito 500)</Subtitle>
          <Body>Body text is here. Nunito 400 is optimized for readability on mobile screens. We use it for descriptions and content.</Body>
          <Caption>Caption / Fine print (Nunito 200/300)</Caption>
        </View>

        <H2 className="mb-4 text-gray-400">Colors</H2>
        <View className="mb-8 flex-row flex-wrap gap-4">
          <View className="items-center">
            <View className="h-16 w-16 rounded-2xl bg-primary shadow-sm" />
            <Caption className="mt-2 text-xs">Primary</Caption>
          </View>
          <View className="items-center">
            <View className="h-16 w-16 rounded-2xl bg-secondary shadow-sm" />
            <Caption className="mt-2 text-xs">Secondary</Caption>
          </View>
          <View className="items-center">
            <View className="h-16 w-16 rounded-2xl bg-sage shadow-sm" />
            <Caption className="mt-2 text-xs">Sage</Caption>
          </View>
          <View className="items-center">
            <View className="h-16 w-16 rounded-2xl bg-peach shadow-sm" />
            <Caption className="mt-2 text-xs">Peach</Caption>
          </View>
        </View>

        <H2 className="mb-4 text-gray-400">Buttons</H2>
        <View className="space-y-4">
          <Button label="Primary Button" onPress={() => {}} />
          <Button label="Secondary Button" variant="secondary" onPress={() => {}} />
          <Button label="Outline Button" variant="outline" onPress={() => {}} />
          <Button label="Ghost Button" variant="ghost" onPress={() => {}} />
          <Button label="Button with Icon" leftIcon={<Feather name="check-circle" size={20} color="white" />} onPress={() => {}} />
          <Button label="Loading State" loading onPress={() => {}} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
