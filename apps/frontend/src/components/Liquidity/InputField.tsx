import styles from './InputField.module.scss';

interface InputFieldProps {
  value: number;
  onChange: (value: number) => void;
  placeholder: string;
  disabled?: boolean;
}

export const InputField = ({
  value,
  onChange,
  placeholder,
  disabled = false,
}: InputFieldProps) => (
  <div className={styles.inputGroup}>
    <input
      type="number"
      step="0.01"
      value={value === 0 ? '' : value.toString()}
      onChange={(e) => {
        if (disabled) return;
        const value = e.target.value;
        if (value === '') {
          onChange(0);
          return;
        }
        const numValue = Number(value);
        if (isNaN(numValue)) {
          alert('Please enter a valid number');
          return;
        }
        onChange(numValue);
      }}
      placeholder={placeholder}
      className={styles.input}
      autoFocus={false}
      disabled={disabled}
    />
  </div>
);
