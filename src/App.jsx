import React, { useState } from 'react';
import { parseExcel } from './utils/excelParser';
import { parseRawInput, matchCities } from './utils/matchingEngine';
import InputSection from './components/InputSection';
import UploadSection from './components/UploadSection';
import ResultsTable from './components/ResultsTable';
import { Activity } from 'lucide-react';

function App() {
  const [rawInput, setRawInput] = useState('');
  const [excelData, setExcelData] = useState([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [results, setResults] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileSelected = async (file) => {
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const data = await parseExcel(file);
      setExcelData(data);
      setExcelFileName(file.name);
      
      // Auto-process if text is already present
      if (rawInput.trim().length > 0) {
          executeMatch(rawInput, data);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to parse Excel file. Please ensure it matches the required format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const executeMatch = (inputText, dataList) => {
      setIsProcessing(true);
      setErrorMsg('');
      
      // small delay to allow UI to update with "Processing..." spinner
      setTimeout(() => {
        try {
            const inputs = parseRawInput(inputText);
            const matchedRows = matchCities(inputs, dataList);
            setResults(matchedRows);
        } catch (e) {
            console.error(e);
            setErrorMsg('An error occurred during matching.');
        } finally {
            setIsProcessing(false);
        }
      }, 50);
  };

  const handleProcessBtn = () => {
    if (excelData.length === 0) {
        setErrorMsg('Please upload an Excel database first.');
        return;
    }
    if (rawInput.trim().length === 0) {
        setErrorMsg('Please enter cities and states to process.');
        return;
    }
    executeMatch(rawInput, excelData);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ background: 'var(--accent-blue)', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center' }}>
          <Activity color="white" size={24} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, letterSpacing: '-0.025em' }}>City Assessment Finder</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.875rem' }}>High-performance bulk matching engine</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34, 197, 94, 0.1)', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
             <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></div>
             <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 600 }}>System Online & Ready</span>
          </div>
        </div>
      </header>

      {errorMsg && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--accent-red)', padding: '1rem', marginBottom: '1.5rem', borderRadius: '4px', color: 'var(--text-main)', fontSize: '0.875rem' }}>
          {errorMsg}
        </div>
      )}

      {/* Top Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <InputSection 
          value={rawInput} 
          onChange={setRawInput} 
          onClear={() => { setRawInput(''); setResults([]); }} 
        />
        <UploadSection 
          onFileSelected={handleFileSelected} 
          dataCount={excelData.length} 
          fileName={excelFileName} 
        />
      </div>

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
        <button 
          onClick={handleProcessBtn}
          disabled={isProcessing}
          style={{
            background: 'var(--accent-blue)',
            color: 'white',
            border: 'none',
            padding: '0.75rem 3rem',
            fontSize: '1rem',
            fontWeight: 600,
            borderRadius: '8px',
            cursor: isProcessing ? 'wait' : 'pointer',
            opacity: isProcessing ? 0.7 : 1,
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            transition: 'transform 0.1s, background 0.2s',
          }}
          onMouseEnter={e => !isProcessing && (e.currentTarget.style.background = 'var(--accent-blue-hover)')}
          onMouseLeave={e => !isProcessing && (e.currentTarget.style.background = 'var(--accent-blue)')}
          onMouseDown={e => !isProcessing && (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={e => !isProcessing && (e.currentTarget.style.transform = 'scale(1)')}
        >
          {isProcessing ? 'Processing Engine...' : 'Run Matching Engine'}
        </button>
      </div>

      {/* Results */}
      <div style={{ flex: 1, minHeight: '400px' }}>
        <ResultsTable results={results} />
      </div>

    </div>
  );
}

export default App;
