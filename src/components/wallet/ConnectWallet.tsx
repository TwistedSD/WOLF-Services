import React from 'react';
import LoadingAnimation from '../LoadingAnimation';
import primaryLogo from '../../assets/logo/primary.png';
import { Button } from '../ui/Button';

interface ConnectWalletProps {
  handleConnect: () => void;
  availableWallets: string[];
}

const ConnectWallet: React.FC<ConnectWalletProps> = ({ handleConnect, availableWallets }) => {
  const isMetaMaskAvailable = availableWallets.includes('METAMASK');

  return (
    <div className="h-screen mx-auto w-full max-w-[75%] relative flex flex-col items-center justify-center">
      <LoadingAnimation position="diagonal">
        <div
          className="border-2 border-primary h-[280px] w-[280px] relative cursor-pointer"
          onClick={handleConnect}
        >
          <div className="flex items-center justify-center h-full w-full p-4">
            <img
              src={primaryLogo}
              alt="WOLF Logo"
              className="max-h-full max-w-full object-contain"
              draggable={false}
            />
          </div>
          <div className="absolute flex items-center justify-center w-full -bottom-4">
            <div className="mx-auto uppercase bg-background-light text-primary border-2 border-primary p-2 flex items-center justify-center text-lg font-bold">
              WOLF
            </div>
          </div>
        </div>
      </LoadingAnimation>

      <div className="mb-10" />

      <div className="grid gap-2">
        {isMetaMaskAvailable && (
          <Button
            className="mx-auto"
            id="connect-metamask"
            onClick={handleConnect}
          >
            Connect with MetaMask
          </Button>
        )}
      </div>
    </div>
  );
};

export default ConnectWallet;
