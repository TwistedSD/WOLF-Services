import { useState, useEffect, useCallback } from 'react';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { generateRandomness, jwtToAddress } from '@mysten/sui/zklogin';

export interface ZkLoginUser {
  address: string;
  characterId?: string;
  characterName?: string;
  tribeName?: string;
  tribeId?: number;
}

export interface ZkLoginState {
  user: ZkLoginUser | null;
  isLoading: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
}

// Environment configuration
const getZkLoginConfig = () => {
  return {
    clientId: import.meta.env.VITE_ZKLOGIN_CLIENT_ID || '',
    redirectUri: import.meta.env.VITE_ZKLOGIN_REDIRECT_URI || `${window.location.origin}/zklogin-callback`,
    network: import.meta.env.VITE_ZKLOGIN_NETWORK || 'testnet',
    oauthProvider: import.meta.env.VITE_ZKLOGIN_OAUTH_PROVIDER || 'google',
  };
};

// World API GraphQL endpoint
const getWorldApiUrl = (): string => {
  return import.meta.env.VITE_WORLD_API_HTTP || 'https://world-api-stillness.live.tech.evefrontier.com';
};

// GraphQL queries for player/tribe data
const PLAYER_PROFILE_QUERY = `
  query GetPlayerProfile($address: String!) {
    player(where: { walletAddress: { _eq: $address } }) {
      id
      name
      tribeId
      tribe {
        id
        name
      }
    }
  }
`;

const CHARACTER_QUERY = `
  query GetCharacter($address: String!) {
    character(where: { owner: { walletAddress: { _eq: $address } } }) {
      id
      name
      tribe {
        id
        name
      }
    }
  }
`;

// Fetch player/character data from World API
async function fetchPlayerData(address: string): Promise<{ characterName?: string; tribeName?: string; tribeId?: number; characterId?: string }> {
  const worldApiUrl = getWorldApiUrl();

  try {
    // Try player profile first
    const playerResponse = await fetch(`${worldApiUrl}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: PLAYER_PROFILE_QUERY,
        variables: { address },
      }),
    });

    if (playerResponse.ok) {
      const playerData = await playerResponse.json();
      if (playerData.data?.player?.[0]) {
        const player = playerData.data.player[0];
        return {
          characterName: player.name,
          tribeName: player.tribe?.name,
          tribeId: player.tribe?.id,
        };
      }
    }

    // Try character query as fallback
    const charResponse = await fetch(`${worldApiUrl}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: CHARACTER_QUERY,
        variables: { address },
      }),
    });

    if (charResponse.ok) {
      const charData = await charResponse.json();
      if (charData.data?.character?.[0]) {
        const character = charData.data.character[0];
        return {
          characterId: character.id,
          characterName: character.name,
          tribeName: character.tribe?.name,
          tribeId: character.tribe?.id,
        };
      }
    }

    return {};
  } catch (error) {
    console.error('Failed to fetch player data:', error);
    return {};
  }
}

// Generate OAuth URL for redirect
function generateOAuthUrl(config: {
  clientId: string;
  redirectUri: string;
  provider: string;
  nonce: string;
}): string {
  const baseUrl = config.provider === 'google' 
    ? 'https://accounts.google.com/o/oauth2/v2/auth'
    : config.provider === 'twitch'
    ? 'https://id.twitch.tv/oauth2/authorize'
    : 'https://accounts.google.com/o/oauth2/v2/auth';

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'id_token',
    scope: config.provider === 'google' 
      ? 'openid email profile'
      : 'openid user:read:email',
    nonce: config.nonce,
    state: config.nonce,
  });

  return `${baseUrl}?${params.toString()}`;
}

// Generate zkLogin session
function createZkLoginSession(): { keypair: Ed25519Keypair; randomness: string; nonce: string } {
  const keypair = new Ed25519Keypair();
  const randomness = generateRandomness();
  
  // Generate nonce from public key (simplified version)
  const nonce = `${keypair.getPublicKey().toBase64()}:${randomness}:${Date.now()}`;
  
  return { keypair, randomness, nonce };
}

// Derive Sui address from JWT token
function deriveAddressFromJwt(jwt: string, userSalt: string = 'salt'): string {
  try {
    // Use jwtToAddress from Sui zkLogin
    return jwtToAddress(jwt, userSalt);
  } catch (error) {
    console.error('Failed to derive address from JWT:', error);
    // Fallback: hash the JWT to create an address-like string
    let hash = 0;
    for (let i = 0; i < jwt.length; i++) {
      const char = jwt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `0x${Math.abs(hash).toString(16).padStart(40, '0').slice(0, 40)}`;
  }
}

export function useZkLogin(): ZkLoginState {
  const [user, setUser] = useState<ZkLoginUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    // Check localStorage for existing user
    const storedUser = localStorage.getItem('wolf-zklogin-user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('wolf-zklogin-user');
      }
    }

    // Check for OAuth callback - either from URL params or sessionStorage
    const params = new URLSearchParams(window.location.search);
    const idTokenFromUrl = params.get('id_token');
    const idTokenFromSession = sessionStorage.getItem('zklogin-id_token');
    
    if (idTokenFromUrl || idTokenFromSession) {
      processOAuthCallback();
    }
  }, []);

  // Process OAuth callback
  const processOAuthCallback = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check URL params first, then sessionStorage
      const params = new URLSearchParams(window.location.search);
      const idToken = params.get('id_token') || params.get('jwt') || sessionStorage.getItem('zklogin-id_token');

      if (!idToken) {
        throw new Error('No identity token received');
      }

      // Derive Sui address from JWT
      const address = deriveAddressFromJwt(idToken);
      
      // Fetch player/character data
      const playerData = await fetchPlayerData(address);
      
      const zkLoginUser: ZkLoginUser = {
        address,
        characterId: playerData.characterId,
        characterName: playerData.characterName || 'Unknown',
        tribeName: playerData.tribeName || 'No Tribe',
        tribeId: playerData.tribeId,
      };

      // Clear URL params and session storage
      window.history.replaceState({}, '', window.location.pathname);
      sessionStorage.removeItem('zklogin-id_token');
      sessionStorage.removeItem('zklogin-state');

      setUser(zkLoginUser);
      localStorage.setItem('wolf-zklogin-user', JSON.stringify(zkLoginUser));
    } catch (err) {
      console.error('OAuth callback error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process login');
    } finally {
      setIsLoading(false);
    }
  };

  // Connect with zkLogin - redirects to OAuth provider
  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const config = getZkLoginConfig();

      if (!config.clientId || config.clientId === 'your-google-client-id') {
        // Demo mode - use manual entry
        const demoAddress = prompt('Enter your Sui wallet address (demo mode):');
        if (demoAddress) {
          // Try to fetch player data
          const playerData = await fetchPlayerData(demoAddress);
          
          const demoUser: ZkLoginUser = {
            address: demoAddress,
            characterId: 'demo-character-id',
            characterName: playerData.characterName || 'Demo Character',
            tribeName: playerData.tribeName || 'Demo Tribe',
            tribeId: playerData.tribeId || 1,
          };

          setUser(demoUser);
          localStorage.setItem('wolf-zklogin-user', JSON.stringify(demoUser));
        }
        setIsLoading(false);
        return;
      }

      // Real zkLogin flow - create session
      const { randomness, nonce } = createZkLoginSession();
      
      // Store session data for verification
      sessionStorage.setItem('zklogin-randomness', randomness);
      sessionStorage.setItem('zklogin-nonce', nonce);
      sessionStorage.setItem('zklogin-config', JSON.stringify(config));

      // Generate OAuth URL
      const oauthUrl = generateOAuthUrl({
        clientId: config.clientId,
        redirectUri: config.redirectUri,
        provider: config.oauthProvider,
        nonce,
      });

      // Redirect to OAuth provider
      window.location.href = oauthUrl;
    } catch (err) {
      console.error('zkLogin error:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect with zkLogin');
      setIsLoading(false);
    }
  }, []);

  // Disconnect
  const disconnect = useCallback(() => {
    setUser(null);
    localStorage.removeItem('wolf-zklogin-user');
    sessionStorage.removeItem('zklogin-randomness');
    sessionStorage.removeItem('zklogin-nonce');
    sessionStorage.removeItem('zklogin-config');
  }, []);

  return {
    user,
    isLoading,
    error,
    connect,
    disconnect,
  };
}
