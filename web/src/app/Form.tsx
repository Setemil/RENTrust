import { useId, useState, type FormEvent, type InputHTMLAttributes } from "react";
import styles from "./Form.module.css";

// Drawn in the 1.5px pen weight. Crossed means the password is visible and the button will hide it.
function EyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
      {crossed && (
        <>
          <path d="M4 4l16 16" stroke="#fff" strokeWidth="4" />
          <path d="M4 4l16 16" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

type FieldProps =InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  hint?: string;
  error?: string;
};

export function Field({ label, hint, error, type = "text", ...input }: FieldProps) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  // The error replaces the hint, so the same advice never shows twice.
  const showHint = hint && !error;
  const describedBy = (error && `${id}-error`) || (showHint && `${id}-hint`) || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.control}>
        <input
          id={id}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...input}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.reveal}
            aria-pressed={revealed}
            aria-label={revealed ? "Hide password" : "Show password"}
            onClick={() => setRevealed((r) => !r)}
          >
            <EyeIcon crossed={revealed} />
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      )}
      {showHint && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
    </div>
  );
}

type ChoiceGroupProps<T extends string> = {
  legend: string;
  name: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
};

export function ChoiceGroup<T extends string>({ legend, name, value, options, onChange }: ChoiceGroupProps<T>) {
  return (
    <fieldset className={styles.choices}>
      <legend className={styles.label}>{legend}</legend>
      <div className={styles.tiles}>
        {options.map((option) => (
          <label key={option.value} className={styles.tile}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

// Clears a field's error as soon as the user edits it. Pass the result to the <form>'s onInput.
export function clearErrorOnInput<K extends string>(setErrors: (update: (prev: Partial<Record<K, string>>) => Partial<Record<K, string>>) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    const name = (event.target as HTMLInputElement).name as K;
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  };
}

export { styles as formStyles };
