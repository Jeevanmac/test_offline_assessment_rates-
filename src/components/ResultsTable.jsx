import React, { useState, useMemo } from 'react';
import { Search, Filter, Download, Copy, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getStateFullName } from '../utils/normalize';

export default function ResultsTable({ results }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filteredResults = useMemo(() => {
    return results.filter(row => {
      // Apply status filter
      if (filter !== 'All' && row.status !== filter) return false;
      
      // Apply search
      if (search) {
        const q = search.toLowerCase();
        return (
          row.city?.toLowerCase().includes(q) ||
          row.state?.toLowerCase().includes(q) ||
          row.rate?.toLowerCase().includes(q)
        );
      }
      
      return true;
    });
  }, [results, filter, search]);

  const handleExport = () => {
    if (filteredResults.length === 0) return;
    const worksheet = XLSX.utils.json_to_sheet(filteredResults.map(r => ({
      City: r.city || '',
      State: r.state || '',
      Status: r.status,
      'Assessment Rate': r.rate || '',
      'Match Type': r.metaMatchStrategy || ''
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    XLSX.writeFile(workbook, 'City_Assessment_Results.xlsx');
  };

  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (row, uniqueId) => {
    if (!row.rate || row.rate === '-') return;
    
    navigator.clipboard.writeText(row.rate).then(() => {
      setCopiedId(uniqueId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleOnlineSearch = (row) => {
    const stateFullName = getStateFullName(row.state);
    const query = encodeURIComponent(`${row.city} ${stateFullName}`);
    window.open(`https://www.google.com/search?q=${query}`, '_blank');
  };

  if (results.length === 0) return null;

  return (
    <div className="glass-panel animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Header & Controls */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Results</h2>
            <span style={{ background: 'var(--bg-input)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {filteredResults.length} of {results.length}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Search results..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  padding: '0.5rem 1rem 0.5rem 2.25rem',
                  borderRadius: '6px',
                  outline: 'none',
                  width: '200px',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            {/* Filter Toggle */}
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                padding: '0.5rem',
                borderRadius: '6px',
                outline: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Found">Found</option>
              <option value="Not Found">Not Found</option>
              <option value="Invalid Format">Invalid</option>
            </select>

            <button 
              onClick={handleExport}
              style={{
                background: 'var(--accent-blue)',
                border: 'none',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.875rem',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-blue-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-blue)'}
            >
              <Download size={16} /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
          <thead style={{ background: 'var(--bg-input)', position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th style={{ padding: '0.75rem 1.5rem', fontWeight: 500, color: 'var(--text-muted)' }}>City</th>
              <th style={{ padding: '0.75rem 1.5rem', fontWeight: 500, color: 'var(--text-muted)' }}>State</th>
              <th style={{ padding: '0.75rem 1.5rem', fontWeight: 500, color: 'var(--text-muted)' }}>Status</th>
              <th style={{ padding: '0.75rem 1.5rem', fontWeight: 500, color: 'var(--text-muted)' }}>Rate Reduction</th>
              <th style={{ padding: '0.75rem 1.5rem', fontWeight: 500, color: 'var(--text-muted)', textAlign: 'center' }}>Online Search</th>
              <th style={{ padding: '0.75rem 1.5rem', fontWeight: 500, color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredResults.map((row, idx) => {
              const isInvalidFormat = row.status === 'Invalid Format';
              return (
                <tr 
                  key={row.id || idx}
                  style={{ 
                    borderBottom: '1px solid var(--border-color)', 
                    transition: 'background 0.2s',
                    backgroundColor: isInvalidFormat ? '#fff3cd' : 'transparent',
                    color: isInvalidFormat ? '#856404' : 'inherit'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isInvalidFormat ? '#ffeeba' : 'var(--bg-input)'}
                  onMouseLeave={e => e.currentTarget.style.background = isInvalidFormat ? '#fff3cd' : 'transparent'}
                >
                  <td style={{ padding: '0.75rem 1.5rem' }}>{row.city || '-'}</td>
                  <td style={{ padding: '0.75rem 1.5rem' }}>{row.state || '-'}</td>
                  <td style={{ padding: '0.75rem 1.5rem' }}>
                    {row.status === 'Found' && (
                      <span style={{ color: 'var(--accent-green)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.1rem 0.5rem', borderRadius: '1rem' }}>
                        <CheckCircle size={14} /> Found {row.metaMatchStrategy && <span style={{fontSize: '0.7rem', opacity: 0.7}}>({row.metaMatchStrategy})</span>}
                      </span>
                    )}
                    {row.status === 'Not Found' && (
                      <span style={{ color: 'var(--accent-red)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.1rem 0.5rem', borderRadius: '1rem' }}>
                        <AlertCircle size={14} /> Not Found
                      </span>
                    )}
                    {isInvalidFormat && (
                      <span style={{ color: '#856404', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(133, 100, 4, 0.1)', padding: '0.1rem 0.5rem', borderRadius: '1rem' }}>
                        <AlertCircle size={14} /> Invalid Format
                      </span>
                    )}
                  </td>
                <td style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}>{row.rate || '-'}</td>
                <td style={{ padding: '0.75rem 1.5rem', textAlign: 'center' }}>
                  {row.status === 'Not Found' && (
                     <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button 
                        onClick={() => handleOnlineSearch(row)}
                        title="Search Online for missing record"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', padding: '0.35rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500, transition: 'background 0.2s', whiteSpace: 'nowrap' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-input)'}
                      >
                        Search <ExternalLink size={14} />
                      </button>
                    </div>
                  )}
                </td>
                <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right' }}>
                  <button 
                    onClick={() => handleCopy(row, row.id || idx)}
                    title={copiedId === (row.id || idx) ? "Copied!" : "Copy Rate"}
                    style={{ 
                      background: 'transparent', 
                      border: 'none', 
                      color: copiedId === (row.id || idx) ? 'var(--accent-green)' : 'var(--text-muted)', 
                      cursor: 'pointer', 
                      padding: '0.25rem',
                      transition: 'all 0.2s'
                    }}
                  >
                    {copiedId === (row.id || idx) ? <CheckCircle size={16} /> : <Copy size={16} />}
                  </button>
                </td>
              </tr>
            )})}
            {filteredResults.length === 0 && (
              <tr>
                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No results match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
