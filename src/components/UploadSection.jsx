import React, { useRef } from 'react';
import { UploadCloud, CheckCircle2, FileSpreadsheet } from 'lucide-react';

export default function UploadSection({ onFileSelected, dataCount, fileName }) {
  const fileInputRef = useRef(null);

  const handleBoxClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelected(file);
    }
  };

  return (
    <div className="glass-panel p-6 animate-fade-in" style={{ padding: '1.5rem', height: '100%' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <FileSpreadsheet size={20} color="var(--accent-green)" />
        Excel Database
      </h2>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
        Upload the source Excel dataset (.xlsx) containing Assessment Rate Reductions.
      </p>

      <div 
        onClick={handleBoxClick}
        style={{
          border: '2px dashed var(--border-color)',
          borderRadius: '12px',
          padding: '2.5rem 1rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: 'var(--bg-input)',
          transition: 'all 0.2s ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          height: 'calc(100% - 90px)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-green)';
          e.currentTarget.style.background = 'rgba(16, 185, 129, 0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.background = 'var(--bg-input)';
        }}
      >
        <input 
          type="file" 
          accept=".xlsx, .xls"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {dataCount > 0 ? (
          <>
            <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '1rem', borderRadius: '50%' }}>
              <CheckCircle2 size={32} color="var(--accent-green)" />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--accent-green)', marginBottom: '0.25rem' }}>Dataset Loaded</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{fileName}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{dataCount} index rows parsed</div>
            </div>
          </>
        ) : (
          <>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '50%' }}>
              <UploadCloud size={32} color="var(--accent-blue)" />
            </div>
            <div>
              <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>Click to browse or drag file</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Supports .xlsx up to 50MB</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
