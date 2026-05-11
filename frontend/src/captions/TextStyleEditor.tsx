import { useState } from 'react';
import type { TextStyle } from './types';

interface TextStyleEditorProps {
  label: string;
  style: TextStyle;
  onChange: (updates: Partial<TextStyle>) => void;
}

export default function TextStyleEditor({ label, style, onChange }: TextStyleEditorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: '1px solid var(--border-color)' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          padding: '8px 0',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{label}</span>
        <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
          {open ? '[-]' : '[+]'}
        </span>
      </button>

      {open && (
        <div style={{ padding: '0 0 12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Font */}
          <GroupLabel text="Font" />
          <Row>
            <Field label="Size">
              <NumberInput value={style.font_size} min={8} max={200} onChange={(v) => onChange({ font_size: v })} />
            </Field>
            <Field label="Color">
              <ColorInput value={style.font_color} onChange={(v) => onChange({ font_color: v })} />
            </Field>
            <Field label="Weight">
              <ToggleButton
                options={['bold', 'regular']}
                value={style.font_weight}
                onChange={(v) => onChange({ font_weight: v as 'bold' | 'regular' })}
              />
            </Field>
          </Row>

          {/* Border */}
          <GroupLabel text="Border" />
          <Row>
            <Field label="Width">
              <NumberInput value={style.border_width} min={0} max={10} onChange={(v) => onChange({ border_width: v })} />
            </Field>
            <Field label="Color">
              <ColorInput value={style.border_color} onChange={(v) => onChange({ border_color: v })} />
            </Field>
          </Row>

          {/* Shadow */}
          <GroupLabel text="Shadow" />
          <Row>
            <Field label="X">
              <NumberInput value={style.shadow_x} min={-20} max={20} onChange={(v) => onChange({ shadow_x: v })} />
            </Field>
            <Field label="Y">
              <NumberInput value={style.shadow_y} min={-20} max={20} onChange={(v) => onChange({ shadow_y: v })} />
            </Field>
            <Field label="Color">
              <ColorInput value={style.shadow_color} onChange={(v) => onChange({ shadow_color: v })} />
            </Field>
          </Row>

          {/* Position */}
          <GroupLabel text="Position" />
          <Row>
            <Field label={`Y (${style.y_position})`}>
              <input
                type="range"
                min={0}
                max={1920}
                value={style.y_position}
                onChange={(e) => onChange({ y_position: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </Field>
            <Field label="Align">
              <ToggleButton
                options={['left', 'center', 'right']}
                value={style.alignment}
                onChange={(v) => onChange({ alignment: v as 'left' | 'center' | 'right' })}
              />
            </Field>
          </Row>

          {/* Appearance */}
          <GroupLabel text="Appearance" />
          <Row>
            <Field label={`Opacity (${style.opacity.toFixed(2)})`}>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={style.opacity}
                onChange={(e) => onChange({ opacity: Number(e.target.value) })}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </Field>
            <Field label="BG Color">
              <ColorInput
                value={style.background_color}
                onChange={(v) => onChange({ background_color: v })}
                allowEmpty
              />
            </Field>
            <Field label="BG Pad">
              <NumberInput value={style.background_padding} min={0} max={40} onChange={(v) => onChange({ background_padding: v })} />
            </Field>
          </Row>
        </div>
      )}
    </div>
  );
}

function GroupLabel({ text }: { text: string }) {
  return (
    <div style={{ color: 'var(--text-dim)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
      {text}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, minWidth: 60 }}>
      <div style={{ color: 'var(--text-dim)', fontSize: 10, marginBottom: 2 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)',
  fontSize: 12,
  padding: '3px 6px',
  borderRadius: 2,
  width: '100%',
  boxSizing: 'border-box',
};

function NumberInput({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      style={inputStyle}
    />
  );
}

function ColorInput({ value, onChange, allowEmpty }: { value: string; onChange: (v: string) => void; allowEmpty?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 24, height: 24, border: 'none', padding: 0, cursor: 'pointer', background: 'none' }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={allowEmpty ? 'none' : '#000000'}
        style={{ ...inputStyle, width: 72 }}
      />
      {allowEmpty && value && (
        <button
          onClick={() => onChange('')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          [x]
        </button>
      )}
    </div>
  );
}

function ToggleButton({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            background: value === opt ? 'var(--accent)' : 'var(--bg-primary)',
            color: value === opt ? 'var(--bg-primary)' : 'var(--text-dim)',
            border: '1px solid var(--border-color)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            padding: '3px 8px',
            cursor: 'pointer',
            borderRadius: 0,
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
