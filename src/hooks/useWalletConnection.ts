import { useState, useEffect } from 'react';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const useWalletConnection = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<string[]>([]);

  useEffect(() => {
    // Check for MetaMask
    if (typeof window.ethereum !== 'undefined') {
      setAvailableWallets(['METAMASK']);
      
      // Check if already connected
      const storedAddress = localStorage.getItem('wolf-wallet-address');
      if (storedAddress) {
        window.ethereum
          .request({ method: 'eth_accounts' })
          .then((accounts: string[]) => {
            if (accounts.length > 0 && accounts[0].toLowerCase() === storedAddress.toLowerCase()) {
              setWalletAddress(accounts[0]);
              setIsConnected(true);
            }
          })
          .catch((error: any) => {
            console.error('Error checking wallet connection:', error);
          });
      }

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          handleDisconnect();
        } else {
          setWalletAddress(accounts[0]);
          localStorage.setItem('wolf-wallet-address', accounts[0]);
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners?.('accountsChanged');
        window.ethereum.removeAllListeners?.('chainChanged');
      }
    };
  }, []);

  const handleConnect = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsConnected(true);
          localStorage.setItem('wolf-wallet-address', accounts[0]);
        }
      } catch (error) {
        console.error('Error connecting wallet:', error);
      }
    } else {
      alert('Please install MetaMask to connect your wallet');
    }
  };

  const handleDisconnect = () => {
    setWalletAddress(null);
    setIsConnected(false);
    localStorage.removeItem('wolf-wallet-address');
  };

  return {
    walletAddress,
    isConnected,
    availableWallets,
    handleConnect,
    handleDisconnect,
  };
};
