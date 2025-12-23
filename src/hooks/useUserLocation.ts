import {useState, useEffect} from 'react';
import * as Location from 'expo-location';

export const useUserLocation = () => {
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const {status} = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      } catch (error) {
        console.log('Error fetching location:', error);
      }
    })();
  }, []);

  return userLocation;
};
