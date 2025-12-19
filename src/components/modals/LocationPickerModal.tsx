import React, {useState, useEffect} from 'react';
import {Modal, View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator} from 'react-native';
import {AppleMaps, GoogleMaps} from 'expo-maps';
import * as Location from 'expo-location';
import {Feather} from '@expo/vector-icons';
import {useTranslation} from 'react-i18next';

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (location: {lat: number; lng: number}) => void;
  initialLocation?: {lat: number; lng: number} | null;
}

export default function LocationPickerModal({visible, onClose, onConfirm, initialLocation}: LocationPickerModalProps) {
  const {t} = useTranslation();
  const MapComponent = Platform.OS === 'ios' ? AppleMaps.View : GoogleMaps.View;

  const [currentLocation, setCurrentLocation] = useState<{lat: number; lng: number} | null>(initialLocation || null);
  const [mapRegion, setMapRegion] = useState<{latitude: number; longitude: number; zoom: number} | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (visible && !initialLocation) {
      (async () => {
        setIsLoading(true);
        try {
          const {status} = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({});
            const coords = {latitude: location.coords.latitude, longitude: location.coords.longitude, zoom: 15};
            setMapRegion(coords);
            setCurrentLocation({lat: location.coords.latitude, lng: location.coords.longitude});
          } else {
            // Default to a known location (e.g. city center) if permission denied
            // For now just set a default or handle error
            setMapRegion({latitude: 37.7749, longitude: -122.4194, zoom: 12}); // SF Default
          }
        } catch (error) {
          console.error('Error getting location', error);
        } finally {
          setIsLoading(false);
        }
      })();
    } else if (visible && initialLocation) {
      setMapRegion({latitude: initialLocation.lat, longitude: initialLocation.lng, zoom: 15});
      setIsLoading(false);
    }
  }, [visible, initialLocation]);

  const handleCameraMove = (event: {coordinates: {latitude?: number; longitude?: number}}) => {
    // expo-maps API sends the camera state directly in the event object
    if (event.coordinates && event.coordinates.latitude !== undefined && event.coordinates.longitude !== undefined) {
      setCurrentLocation({
        lat: event.coordinates.latitude,
        lng: event.coordinates.longitude,
      });
    }
  };

  const handleConfirm = () => {
    if (currentLocation) {
      onConfirm(currentLocation);
      onClose();
    }
  };

  return (
    <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="pt-safe flex-row items-center justify-between border-b border-gray-100 px-4 py-2">
          <TouchableOpacity onPress={onClose} className="p-2">
            <Feather name="x" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Pick Location</Text>
          <View style={{width: 40}} />
        </View>

        <View className="relative flex-1">
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#15803d" />
            </View>
          ) : (
            <>
              {mapRegion && (
                <MapComponent
                  style={{flex: 1}}
                  cameraPosition={{
                    coordinates: {latitude: mapRegion.latitude, longitude: mapRegion.longitude},
                    zoom: mapRegion.zoom,
                  }}
                  onCameraMove={handleCameraMove}
                  uiSettings={{
                    myLocationButtonEnabled: true,
                    compassEnabled: true,
                  }}
                />
              )}
              {/* Center Marker Overlay */}
              <View pointerEvents="none" className="absolute bottom-0 left-0 right-0 top-0 items-center justify-center">
                <View className="mb-8">
                  <Feather name="map-pin" size={40} color="#15803d" />
                </View>
              </View>
            </>
          )}
        </View>

        {/* Footer Info */}
        <View className="mb-safe border-t border-gray-100 bg-white px-6 py-4">
          <Text className="mb-4 text-center text-xs text-gray-500">Move the map to place the pin at the service location.</Text>
          <TouchableOpacity onPress={handleConfirm} className="w-full items-center rounded-xl bg-green-700 py-4 shadow-lg shadow-green-200">
            <Text className="text-lg font-bold text-white">Set Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
