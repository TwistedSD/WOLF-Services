import { useState, useEffect, useCallback } from 'react';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

export interface ZkLoginUser {
  address: string;
  characterId?: string;
  characterName?: string;
  tribeName?: string;
  tribeId?: number;
}

// Create a Sui client for future use (when implementing real zkLogin)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getSuiClient = () => new SuiClient({ url: getFullnodeUrl('testnet') });

export function useZkLogin() {
  const [user, setUser] = useState<ZkLoginUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session
  useEffect(() => {
    const storedUser = localStorage.getItem('wolf-zklogin-user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('wolf-zklogin-user');
      }
    }
  }, []);

  // Connect with zkLogin - redirects to OAuth provider
  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // For zkLogin, we need to redirect to the Sui zkLogin URL
      // The flow is:
      // 1. Generate a random nonce
      // 2. Redirect to the OAuth provider (Google, Twitch, etc.)
      // 3. After OAuth, user is redirected back with credentials
      // 4. We parse the credentials to get the Sui address
      
      // Generate a random nonce for the zkLogin session
      const nonce = crypto.randomUUID();
      
      // Store nonce for verification
      sessionStorage.setItem('zklogin-nonce', nonce);
      
      // For demo purposes, allow manual address entry
      // In production, this would redirect to actual zkLogin
      const demoAddress = prompt('Enter your Sui wallet address (demo mode):');
      if (demoAddress) {
        const demoUser: ZkLoginUser = {
          address: demoAddress,
          characterId: 'demo-character-id',
          characterName: 'Demo Character',
          tribeName: 'Demo Tribe',
          tribeId: 1,
        };
        
        setUser(demoUser);
        localStorage.setItem('wolf-zklogin-user', JSON.stringify(demoUser));
      }
    } catch (err) {
      console.error('zkLogin error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect with zkLogin');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    setUser(null);
    localStorage.removeItem('wolf-zklogin-user');
  }, []);

  return {
    user,
    isLoading,
    error,
    connect,
    disconnect,
  };
}
