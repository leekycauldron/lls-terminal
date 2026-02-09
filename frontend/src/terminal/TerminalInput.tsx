import { useState, useRef, useEffect, type KeyboardEvent } from 'react';

interface TerminalInputProps {
  prompt?: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  allowEmpty?: boolean;
}

export default function TerminalInput({
  prompt = '>',
  placeholder = '',
  onSubmit,
  disabled = false,
  autoFocus = true,
  allowEmpty = false,
}: TerminalInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (allowEmpty || value.trim())) {
      onSubmit(value.trim());
      setValue('');
    }
  };

  return (
    <div className="terminal-input-wrapper">
      <span className="terminal-input-prompt">{prompt}</span>
      <input
        ref={inputRef}
        className="terminal-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
      />
    </div>
  );
}
