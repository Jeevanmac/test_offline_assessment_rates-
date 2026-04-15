import * as XLSX from 'xlsx';
import { normalizeCity, getStateAbbr } from './normalize';

/**
 * Parses an uploaded Excel File using SheetJS
 * Returns an array of standardized objects
 */
export async function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Assume first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to json
        // Using defval: '' to ensure missing columns come back as empty strings
        let rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        // Normalize keys (handle slight variations in headers)
        const parsedData = rawData.map(row => {
          const lowerKeyRow = {};
          for (let key in row) {
            lowerKeyRow[key.toLowerCase().trim()] = row[key];
          }

          // Expected columns from requirements:
          // "states", "state abbr", "cities in <state>", "assessment rate reduction", "city alias"
          
          let state = lowerKeyRow['states'] || '';
          let stateAbbr = lowerKeyRow['state abbr'] || lowerKeyRow['state abbreviation'] || '';
          
          // "cities in <state>" might literally be "cities in ohio", finding the city key
          let cityRawStr = '';
          for (let key in lowerKeyRow) {
            if (key.includes('cities')) {
              cityRawStr = lowerKeyRow[key];
              break;
            }
          }
          if (!cityRawStr) cityRawStr = lowerKeyRow['city'] || '';

          let rate = lowerKeyRow['assessment rate reduction'] || lowerKeyRow['assessment rate'] || '';
          let aliasRawStr = lowerKeyRow['city alias'] || lowerKeyRow['alias'] || '';

          // Optional conversion of percentage string to number if needed
          let rateValue = rate;
          if (typeof rate === 'number') {
             // rate might be 0.2168
             rateValue = (rate * 100).toFixed(2) + '%';
          }

          // Generate numeric value for sorting/finding the highest rate
          let rateFloat = parseFloat(String(rate).replace(/[^0-9.]/g, '')) || 0;

          // Process the record
          return {
            originalState: state,
            stateAbbr: getStateAbbr(stateAbbr || state), // Normalize to lower abbr
            originalCity: cityRawStr,
            cityNorm: normalizeCity(String(cityRawStr)),
            cityCompressed: normalizeCity(String(cityRawStr)).replace(/\s+/g, ''),
            originalAlias: aliasRawStr,
            aliasNorm: normalizeCity(String(aliasRawStr)),
            aliasCompressed: normalizeCity(String(aliasRawStr)).replace(/\s+/g, ''),
            rateStr: rateValue,
            rateFloat: rateFloat
          };
        });

        resolve(parsedData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsBinaryString(file);
  });
}
