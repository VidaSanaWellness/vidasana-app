import React, {useEffect, useState} from 'react';
import {View, Text, ActivityIndicator} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/utils/supabase';
import * as Location from 'expo-location';
import {GoogleMaps} from 'expo-maps';
import {useRouter} from 'expo-router';
import {useDebouncer} from '@/hooks/useDebounce';

// Types
type MapItem = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: 'service' | 'event' | 'selected';
};

// Heuristic: Zoom level to Radius (meters)
const getRadiusFromZoom = (zoom: number) => Math.round(40000000 / Math.pow(2, zoom));

export default function MapScreen() {
  const router = useRouter();

  const [initialCamera, setInitialCamera] = useState<{latitude: number; longitude: number; zoom: number} | null>(null);
  const [fetchParams, setFetchParams, debouncedParams] = useDebouncer({zoom: 14, lat: 37.7749, radius: 5000, lng: -122.4194}, 600);

  // -- User Location Setup --
  useEffect(() => {
    (async () => {
      try {
        const {status} = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          const newCamera = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            zoom: 14,
          };
          setInitialCamera(newCamera);
          setFetchParams({lat: newCamera.latitude, lng: newCamera.longitude, radius: getRadiusFromZoom(14), zoom: 14});
        } else {
          setInitialCamera({latitude: 37.7749, longitude: -122.4194, zoom: 14});
        }
      } catch (error) {
        console.log('Loc Error', error);
        setInitialCamera({latitude: 37.7749, longitude: -122.4194, zoom: 14});
      }
    })();
  }, []);

  // -- Data Fetching --
  const {data: items, isLoading} = useQuery({
    staleTime: 1000 * 60 * 5,
    enabled: !!initialCamera && debouncedParams.zoom >= 10,
    queryKey: ['map_items', debouncedParams.lat, debouncedParams.lng, debouncedParams.radius],
    queryFn: async () => {
      const {data, error} = await supabase.rpc('search_map_items', {
        user_lat: debouncedParams.lat,
        user_lng: debouncedParams.lng,
        radius_meters: debouncedParams.radius,
      });
      if (error) throw error;
      return data as MapItem[];
    },
  });

  // -- Handlers --

  // Simple Camera Move Handler (updates hook state directly)
  const onCameraMove = (event: {zoom: number; coordinates: {latitude: number; longitude: number}}) => {
    const newRadius = event.zoom ? getRadiusFromZoom(event.zoom) : fetchParams.radius;

    // Calculate distance from last update (to reduce state updates if needed, though hook handles debounce)
    // Optimization: Only set state if significantly moved to reduce React rendering even if hook handles debouncing downstream
    const dist = Math.sqrt(Math.pow(event.coordinates.latitude - fetchParams.lat, 2) + Math.pow(event.coordinates.longitude - fetchParams.lng, 2));

    // Update if moved > 0.0005 deg or radius changed significantly or zoom changed integer
    if (dist > 0.0005 || Math.abs(newRadius - fetchParams.radius) > 1000 || Math.round(event.zoom) !== Math.round(fetchParams.zoom)) {
      setFetchParams({
        radius: newRadius,
        zoom: event.zoom ? event.zoom : fetchParams.zoom,
        lat: parseFloat(event.coordinates.latitude.toFixed(4)),
        lng: parseFloat(event.coordinates.longitude.toFixed(4)),
      });
    }
  };

  const handleMarkerClick = (event: any) => {
    const markerId = event.nativeEvent?.id || event.id;
    if (!markerId) return;

    const item = items?.find((i) => i.id === markerId);
    if (item?.type === 'event') {
      router.push(`/(user)/events/${markerId}`);
    } else {
      router.push(`/(user)/services/${markerId}`);
    }
  };

  if (!initialCamera)
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );

  // -- Markers --
  // Use debounced zoom for showing/hiding markers so they match the data availability
  const showMarkers = debouncedParams.zoom >= 10;

  const mapMarkers =
    (showMarkers ? items : [])
      ?.filter((i) => i.lat && i.lng)
      .map((item) => ({
        id: item.id,
        title: item.title,
        coordinates: {latitude: item.lat, longitude: item.lng},
        markerColor: item.type === 'event' ? '#2DD4BF' : '#15803D',
      })) || [];

  const MapView = GoogleMaps.View;

  return (
    <View className="relative flex-1">
      <MapView
        style={{flex: 1}}
        markers={mapMarkers}
        showUserLocation={true}
        onCameraMove={onCameraMove}
        showUserLocationButton={true}
        onMarkerClick={handleMarkerClick}
        properties={{minZoomPreference: 2, maxZoomPreference: 20}}
        cameraPosition={{zoom: initialCamera.zoom, coordinates: {latitude: initialCamera.latitude, longitude: initialCamera.longitude}}}
      />

      {/* Map Legend */}
      <View className="absolute right-4 top-16 rounded-xl bg-white/90 p-3 shadow-md backdrop-blur-sm">
        <Text className="mb-2 text-xs font-bold text-gray-500">Legend</Text>
        <View className="mb-2 flex-row items-center gap-2">
          <View className="h-3 w-3 rounded-full bg-[#15803d]" />
          <Text className="text-xs font-semibold text-gray-700">Services</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="h-3 w-3 rounded-full bg-[#2dd4bf]" />
          <Text className="text-xs font-semibold text-gray-700">Events</Text>
        </View>
      </View>

      {/* Zoom Warning (Use instant params for immediate feedback) */}
      {fetchParams.zoom < 10 && (
        <View className="pointer-events-none absolute left-0 right-0 top-32 items-center">
          <View className="rounded-full bg-black/60 px-4 py-2">
            <Text className="text-xs font-semibold text-white">Zoom in to see results</Text>
          </View>
        </View>
      )}

      {isLoading && debouncedParams.zoom >= 10 && (
        <View className="pointer-events-none absolute left-0 right-0 top-14 items-center">
          <View className="flex-row items-center space-x-2 rounded-full bg-white/90 px-4 py-2 shadow-md">
            <ActivityIndicator size="small" color="#15803d" />
            <Text className="ml-2 text-xs font-semibold text-gray-700">Searching...</Text>
          </View>
        </View>
      )}
    </View>
  );
}
