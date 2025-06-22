import styles from './NetworkError.module.scss';

interface NetworkErrorProps {
  error: string;
}

export const NetworkError = ({ error }: NetworkErrorProps) => {
  return (
    <div className={styles.container}>
      <div className={styles.errorMessage}>
        {error}
      </div>
      <button 
        className={styles.reloadButton}
        onClick={() => window.location.reload()}
      >
        Reload Page
      </button>
    </div>
  );
};

export default NetworkError;