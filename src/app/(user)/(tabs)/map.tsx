import React, {useEffect, useRef, useState} from 'react';
import {View, ActivityIndicator, TouchableOpacity, Platform} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useQuery} from '@tanstack/react-query';
import {supabase} from '@/utils/supabase';
import {router} from 'expo-router';
import MapView, {Marker, PROVIDER_GOOGLE, Region} from 'react-native-maps';
import Supercluster from 'supercluster';
import {Feature, Point} from 'geojson';
import {useDebouncer} from '@/hooks';
import {useUserLocation} from '@/hooks';
import {Feather} from '@expo/vector-icons';
import {Body, Caption} from '@/components';

// Helper to convert zoom level to radius (approximate)
const getRadiusFromZoom = (zoom: number) => {
  return Math.max(1, 40000 / Math.pow(2, zoom));
};

export default function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [initialRegion, setInitialRegion] = useState<Region | null>(null);

  // State for fetching parameters (Debounced)
  const [fetchParams, setFetchParams, debouncedParams] = useDebouncer(
    {
      lat: 37.7749,
      lng: -122.4194,
      radius: 10,
      zoom: 14,
    },
    1000
  );

  // -- User Location Setup --
  const {location, isLoading: isLocationLoading} = useUserLocation();

  useEffect(() => {
    if (location) {
      const region = {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      };
      setInitialRegion(region);
      setFetchParams({lat: location.latitude, lng: location.longitude, radius: 10, zoom: 14});

      // Animate if map is ready
      mapRef.current?.animateToRegion(region, 1000);
    } else if (!isLocationLoading && !location) {
      // Default SF
      setInitialRegion({
        latitude: 37.7749,
        longitude: -122.4194,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  }, [location, isLocationLoading]);

  // -- Data Fetching --
  const {data: items, isLoading} = useQuery({
    staleTime: 1000 * 60 * 5,
    enabled: !!initialRegion,
    queryKey: ['map_items', debouncedParams.lat, debouncedParams.lng, debouncedParams.radius],
    queryFn: async () => {
      const radiusMeters = Math.round(debouncedParams.radius * 1000);
      console.log('Fetching map items:', {
        lat: debouncedParams.lat,
        lng: debouncedParams.lng,
        radiusKm: debouncedParams.radius,
        radiusMeters,
      });

      const {data, error} = await supabase.rpc('search_map_items', {
        user_lat: debouncedParams.lat,
        user_lng: debouncedParams.lng,
        radius_meters: radiusMeters,
      });

      if (error) {
        console.error('Map fetch error:', error);
        throw error;
      }
      console.log('Map items fetched:', data?.length);
      return data;
    },
  });

  const [currentZoom, setCurrentZoom] = useState(14);

  // Supercluster instance
  const index = new Supercluster({radius: 40, maxZoom: 20});
  const points = (items || [])
    .filter((i) => i.lat && i.lng)
    .map(
      (i) =>
        ({
          type: 'Feature',
          properties: {cluster: false, itemId: i.id, title: i.title, itemType: i.type},
          geometry: {type: 'Point', coordinates: [i.lng, i.lat]},
        }) as Feature<Point>
    );
  // @ts-ignore
  index.load(points);
  const clusters = index.getClusters([-180, -85, 180, 85], Math.floor(currentZoom));

  // -- Handlers --
  // Track current region for zooming
  const currentRegionRef = useRef<Region | null>(null);

  useEffect(() => {
    if (initialRegion) {
      currentRegionRef.current = initialRegion;
    }
  }, [initialRegion]);

  const onRegionChangeComplete = (region: Region) => {
    currentRegionRef.current = region;

    // Calculate zoom level approx
    const zoom = Math.round(Math.log(360 / region.longitudeDelta) / Math.LN2);
    setCurrentZoom(zoom);
    const newRadius = getRadiusFromZoom(zoom);

    setFetchParams({
      lat: parseFloat(region.latitude.toFixed(4)),
      lng: parseFloat(region.longitude.toFixed(4)),
      radius: newRadius,
      zoom: zoom,
    });
  };

  const handleClusterPress = (clusterId: number, coordinate: {latitude: number; longitude: number}) => {
    // Re-create index to get expansion zoom
    const index = new Supercluster({radius: 40, maxZoom: 20});
    const points = (items || [])
      .filter((i) => i.lat && i.lng)
      .map(
        (i) =>
          ({
            type: 'Feature',
            properties: {cluster: false, itemId: i.id, title: i.title, itemType: i.type},
            geometry: {type: 'Point', coordinates: [i.lng, i.lat]},
          }) as Feature<Point>
      );
    // @ts-ignore
    index.load(points);
    const expansionZoom = index.getClusterExpansionZoom(clusterId);

    mapRef.current?.animateCamera({center: coordinate, zoom: expansionZoom}, {duration: 500});
  };

  const handleZoomIn = () => {
    const region = currentRegionRef.current;
    if (!region || !mapRef.current) return;

    const newRegion = {
      ...region,
      latitudeDelta: region.latitudeDelta / 2,
      longitudeDelta: region.longitudeDelta / 2,
    };
    mapRef.current.animateToRegion(newRegion, 400);
  };

  const handleZoomOut = () => {
    const region = currentRegionRef.current;
    if (!region || !mapRef.current) return;

    const newRegion = {
      ...region,
      latitudeDelta: region.latitudeDelta * 2,
      longitudeDelta: region.longitudeDelta * 2,
    };
    mapRef.current.animateToRegion(newRegion, 400);
  };

  if (!initialRegion)
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#00594f" />
      </View>
    );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{flex: 1}}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        zoomControlEnabled={true}
        onRegionChangeComplete={onRegionChangeComplete}>
        {clusters.map((feature) => {
          const isCluster = feature.properties.cluster;
          const coordinate = {
            latitude: feature.geometry.coordinates[1],
            longitude: feature.geometry.coordinates[0],
          };

          if (isCluster) {
            return (
              <Marker key={`cluster-${feature.id}`} coordinate={coordinate} onPress={() => handleClusterPress(feature.id as number, coordinate)}>
                <View className="h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-orange-500">
                  <Body className="font-bold text-white">{feature.properties.point_count}</Body>
                </View>
              </Marker>
            );
          }

          return (
            <Marker
              key={`item-${feature.properties.itemId}`}
              coordinate={coordinate}
              pinColor={feature.properties.itemType === 'event' ? 'teal' : 'green'}
              title={feature.properties.title}
              onCalloutPress={() => {
                const path =
                  feature.properties.itemType === 'event'
                    ? `/(user)/events/${feature.properties.itemId}`
                    : `/(user)/services/${feature.properties.itemId}`;
                router.push(path as any);
              }}
            />
          );
        })}
      </MapView>

      {/* Loading Indicator */}
      {isLoading && (
        <View className="pointer-events-none absolute left-0 right-0 top-14 items-center">
          <View className="rounded-full bg-white px-4 py-2 shadow-sm">
            <ActivityIndicator size="small" color="#00594f" />
          </View>
        </View>
      )}

      {/* Zoom Controls (iOS Only - Android uses native zoomControlEnabled) */}
      {Platform.OS === 'ios' && (
        <View className="absolute bottom-32 right-4 gap-3">
          <TouchableOpacity
            onPress={handleZoomIn}
            className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg active:bg-gray-50">
            <Feather name="plus" size={24} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleZoomOut}
            className="h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg active:bg-gray-50">
            <Feather name="minus" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      )}

      {/* Legend */}
      <View className="absolute bottom-8 left-4 rounded-lg bg-white/90 p-3 shadow-lg">
        <View className="mb-2 flex-row items-center gap-2">
          <View className="h-3 w-3 rounded-full bg-primary" />
          <Caption className="font-medium text-gray-700">Services</Caption>
        </View>
        <View className="mb-2 flex-row items-center gap-2">
          <View className="h-3 w-3 rounded-full bg-sage" />
          <Caption className="font-medium text-gray-700">Events</Caption>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="h-3 w-3 rounded-full bg-orange-500" />
          <Caption className="font-medium text-gray-700">Cluster</Caption>
        </View>
      </View>
    </SafeAreaView>
  );
}
