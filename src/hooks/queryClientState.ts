import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useNetworkState } from 'expo-network';
import { focusManager, onlineManager } from '@tanstack/react-query';

export const useQueryClientState = () => {
  const { isInternetReachable } = useNetworkState();
  useEffect(() => {
    onlineManager.setOnline(!!isInternetReachable);
    const { remove } = AppState.addEventListener('change', (v) =>
      focusManager.setFocused(v === 'active')
    );
    return remove;
  }, [isInternetReachable]);
};
