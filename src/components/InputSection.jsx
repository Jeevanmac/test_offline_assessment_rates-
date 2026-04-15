import React from 'react';
import { Type, X } from 'lucide-react';

export default function InputSection({ value, onChange, onClear }) {
  return (
    <div className="glass-panel p-6 animate-fade-in" style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Type size={20} color="var(--accent-blue)" />
          Raw Input Data
        </h2>
        
        {value.length > 0 && (
          <button 
            onClick={onClear}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              borderRadius: '6px',
              padding: '0.25rem 0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Paste your bulk city and state lines here. Expected format: <code>City,StateAbbr</code> (e.g. <code>Warren,OH</code>)
      </p>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Warren,OH&#10;New-York,NY"
        style={{
          width: '100%',
          height: '250px',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '1rem',
          color: 'var(--text-main)',
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          resize: 'vertical',
          outline: 'none',
          transition: 'border 0.2s',
        }}
        onFocus={(e) => e.target.style.borderColor = 'var(--accent-blue)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
      />
      
      <div style={{ textAlign: 'right', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
        {value.split(/\r?\n/).filter(line => line.trim().length > 0).length} lines detected
      </div>
    </div>
  );
}
