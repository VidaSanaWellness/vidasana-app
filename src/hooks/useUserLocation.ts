import {useState, useEffect} from 'react';
import * as Location from 'expo-location';

export const useUserLocation = () => {
  const [location, setLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<Location.PermissionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLocation = async () => {
    try {
      setIsLoading(true);
      const {status: existingStatus} = await Location.getForegroundPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const {status: newStatus} = await Location.requestForegroundPermissionsAsync();
        finalStatus = newStatus;
      }

      setStatus(finalStatus);

      if (finalStatus === 'granted') {
        // Try last known first (faster, less error prone)
        let loc = await Location.getLastKnownPositionAsync({});
        if (!loc) {
          loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
        }
        if (loc) {
          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        } else {
          setErrorMsg('Unable to fetch location');
        }
      } else {
        setErrorMsg('Permission to access location was denied');
      }
    } catch (error) {
      console.log('Error fetching location:', error);
      setErrorMsg('Error fetching location');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  return {location, errorMsg, status, isLoading, refetch: fetchLocation};
};
