import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkStatus {
  isConnected: boolean | null;
  isLoading: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      setIsConnected(state.isConnected);
      setIsLoading(false);
    });

    // Subscribe to changes
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { isConnected, isLoading };
}
