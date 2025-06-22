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
    </div>
  );
};

export default NetworkError;