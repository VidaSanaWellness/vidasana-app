import React, {useEffect, useState} from 'react';
import {View, Text, ActivityIndicator} from 'react-native';
import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/utils/supabase';
import * as Location from 'expo-location';
import {AppleMaps, GoogleMaps} from 'expo-maps';
import {useRouter} from 'expo-router';
import {Platform} from 'react-native';

// Types
type Service = {
  id: string;
  title: string;
  price: number | null;
  lat: number;
  lng: number;
  provider: any;
  dist_meters?: number;
};

// Heuristic: Zoom level to Radius (meters)
const getRadiusFromZoom = (zoom: number) => {
  return Math.round(40000000 / Math.pow(2, zoom));
};

export default function MapScreen() {
  const router = useRouter();

  // -- State --
  const [initialCamera, setInitialCamera] = useState<{
    latitude: number;
    longitude: number;
    zoom: number;
  } | null>(null);

  // Viewport State for Fetching
  const [region, setRegion] = useState({latitude: 37.7749, longitude: -122.4194, zoom: 14});

  // Memoized Fetch Parameters
  const [debouncedFetchParams, setDebouncedFetchParams] = useState({
    lat: 37.7749,
    lng: -122.4194,
    radius: 5000,
  });

  // Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      const rLat = parseFloat(region.latitude.toFixed(3));
      const rLng = parseFloat(region.longitude.toFixed(3));
      const rRad = getRadiusFromZoom(region.zoom);

      setDebouncedFetchParams({lat: rLat, lng: rLng, radius: rRad});
    }, 500);
    return () => clearTimeout(handler);
  }, [region]);

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
          setRegion(newCamera);
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
  const {data: services, isLoading} = useQuery({
    queryKey: ['map_services', debouncedFetchParams.lat, debouncedFetchParams.lng, debouncedFetchParams.radius],
    queryFn: async () => {
      const {data, error} = await supabase.rpc('search_services', {
        search_query: null,
        target_lang: 'en',
        category_filter: null,
        day_filter: null,
        user_lat: debouncedFetchParams.lat,
        user_lng: debouncedFetchParams.lng,
        radius_meters: debouncedFetchParams.radius,
        sort_by: 'distance',
        page_offset: 0,
        page_limit: 50,
      });

      if (error) throw error;
      return data as Service[];
    },
    enabled: !!initialCamera,
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  // -- Handler --
  const onCameraMove = (event: {bearing: number; coordinates: {latitude?: number; longitude?: number}; tilt: number; zoom: number}) => {
    // expo-maps API sends the camera state directly in the event object
    if (event.coordinates) {
      setRegion({
        latitude: event.coordinates.latitude ?? region.latitude,
        longitude: event.coordinates.longitude ?? region.longitude,
        zoom: event.zoom ?? region.zoom,
      });
    }
  };

  const handleMarkerClick = (event: any) => {
    // The event should contain the ID of the marker clicked
    const markerId = event.nativeEvent?.id || event.id;
    if (markerId) router.push(`/(user)/services/${markerId}`);
  };

  if (!initialCamera)
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );

  // PREPARE MARKERS PROP
  const mapMarkers =
    services
      ?.filter((s) => s.lat && s.lng)
      .map((service) => ({id: service.id, title: service.title, coordinates: {latitude: service.lat, longitude: service.lng}})) || [];

  if (Platform.OS === 'ios') {
    return (
      <View className="relative flex-1">
        <AppleMaps.View
          style={{flex: 1}}
          cameraPosition={{zoom: initialCamera.zoom, coordinates: {latitude: initialCamera.latitude, longitude: initialCamera.longitude}}}
          markers={mapMarkers}
          onMarkerClick={handleMarkerClick}
          onCameraMove={onCameraMove}
          showUserLocation={true}
          showUserLocationButton={true}
        />
        {isLoading && (
          <View className="pointer-events-none absolute left-0 right-0 top-14 items-center">
            <View className="flex-row items-center space-x-2 rounded-full bg-white/90 px-4 py-2 shadow-md">
              <ActivityIndicator size="small" color="#15803d" />
              <Text className="ml-2 text-xs font-semibold text-gray-700">Searching area...</Text>
            </View>
          </View>
        )}
      </View>
    );
  } else {
    return (
      <View className="relative flex-1">
        <GoogleMaps.View
          style={{flex: 1}}
          cameraPosition={{zoom: initialCamera.zoom, coordinates: {latitude: initialCamera.latitude, longitude: initialCamera.longitude}}}
          markers={mapMarkers}
          onMarkerClick={handleMarkerClick}
          onCameraMove={onCameraMove}
          showUserLocation={true}
          showUserLocationButton={true}
        />
        {isLoading && (
          <View className="pointer-events-none absolute left-0 right-0 top-14 items-center">
            <View className="flex-row items-center space-x-2 rounded-full bg-white/90 px-4 py-2 shadow-md">
              <ActivityIndicator size="small" color="#15803d" />
              <Text className="ml-2 text-xs font-semibold text-gray-700">Searching area...</Text>
            </View>
          </View>
        )}
      </View>
    );
  }
}
