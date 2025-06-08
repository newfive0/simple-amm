import React from 'react';
import styles from './WalletInfo.module.scss';

interface WalletInfoProps {
  account: string;
  ethBalance: string;
  tokenBalance: string;
  tokenSymbol: string;
  tokenName: string;
}

export const WalletInfo: React.FC<WalletInfoProps> = ({
  account,
  ethBalance,
  tokenBalance,
  tokenSymbol,
  tokenName,
}) => {
  return (
    <div className={styles.walletInfo}>
      <p>
        <strong>Connected Account:</strong> {account}
      </p>
      <p>
        <strong>ETH Balance:</strong> {parseFloat(ethBalance).toFixed(4)} ETH
      </p>
      <p>
        <strong>Token Balance:</strong> {parseFloat(tokenBalance).toFixed(4)}{' '}
        {tokenSymbol}
      </p>
      <p>
        <strong>Token Name:</strong> {tokenName}
      </p>
    </div>
  );
};

export default WalletInfo;
