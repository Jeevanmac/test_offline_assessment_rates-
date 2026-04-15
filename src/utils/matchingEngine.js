import { normalizeCity, getStateAbbr } from './normalize';

/**
 * Executes matching engine rules against normalized inputs.
 */
const ALLOWED_PREFIXES = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest', 'new', 'old'];

function getBaseCity(cityNorm) {
  if (!cityNorm) return '';
  const tokens = cityNorm.split(/\s+/);
  if (tokens.length > 1 && ALLOWED_PREFIXES.includes(tokens[0])) {
    return tokens.slice(1).join(' ');
  }
  return cityNorm;
}

export function matchCities(inputData, excelDataRows) {
  // 1. Build an optimized lookup structure
  const stateToCitiesMap = {};
  
  excelDataRows.forEach(row => {
    if (!row.stateAbbr) return;
    
    if (!stateToCitiesMap[row.stateAbbr]) {
      stateToCitiesMap[row.stateAbbr] = [];
    }
    
    stateToCitiesMap[row.stateAbbr].push(row);
  });

  // 2. Process inputs
  return inputData.map(input => {
    // Basic formatting validation (missing target parts)
    const parts = input.raw.split(',').map(s => s.trim());
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      return {
        ...input,
        status: 'Invalid',
        rate: '',
        metaMatchStrategy: 'Missing comma or parts'
      };
    }

    const cityPart = parts[0];
    const statePart = parts[1];

    const inputStateAbbr = getStateAbbr(statePart);
    const inputCityNorm = normalizeCity(cityPart);
    const inputCityBase = getBaseCity(inputCityNorm);
    
    // Compressed forms for spacing checks
    const inputRawCompressed = cityPart.toLowerCase().trim().replace(/\s+/g, '');
    const inputCityCompressed = inputCityNorm.replace(/\s+/g, '');
    const inputCityBaseCompressed = inputCityBase.replace(/\s+/g, '');

    // If state has no entries
    if (!stateToCitiesMap[inputStateAbbr]) {
      return {
        ...input,
        status: 'Not Found',
        rate: '',
        city: cityPart,
        state: statePart
      };
    }

    const targetList = stateToCitiesMap[inputStateAbbr];
    let bestMatch = null;
    let matchType = 4; // Lower is better. 1: Exact, 2: Clean, 3: Prefix Match
    let maxRate = -1;

    for (let i = 0; i < targetList.length; i++) {
        const row = targetList[i];
        
        const rowRawCompressed = (row.originalCity || '').toLowerCase().trim().replace(/\s+/g, '');
        const rowCityBaseCompressed = getBaseCity(row.cityNorm).replace(/\s+/g, '');
        
        let currentMatchType = 0;
        
        // 1. Exact Match (Raw compressed comparison)
        if (rowRawCompressed === inputRawCompressed) {
            currentMatchType = 1;
        } 
        // 2. Clean Match (after strict normalizing removes)
        else if (row.cityCompressed === inputCityCompressed || (row.aliasCompressed && row.aliasCompressed === inputCityCompressed)) {
            currentMatchType = 2;
        }
        // 3. Prefix Match (after strict prefix removes)
        else if (
            inputCityBaseCompressed === row.cityCompressed || 
            inputCityCompressed === rowCityBaseCompressed ||
            (inputCityBaseCompressed !== inputCityCompressed && rowCityBaseCompressed !== row.cityCompressed && inputCityBaseCompressed === rowCityBaseCompressed) || 
            (row.aliasCompressed && getBaseCity(row.aliasNorm).replace(/\s+/g, '') === inputCityBaseCompressed)
        ) {
            currentMatchType = 3;
        }

        if (currentMatchType > 0) {
            // Pick based on priority
            // If matchType is smaller (better priority), or same priority with higher rate
            if (currentMatchType < matchType || (currentMatchType === matchType && row.rateFloat > maxRate)) {
                bestMatch = row;
                matchType = currentMatchType;
                maxRate = row.rateFloat;
            }
        }
    }

    if (bestMatch) {
      return {
        ...input,
        status: 'Found',
        rate: bestMatch.rateStr,
        city: cityPart,
        state: statePart,
        metaMatchStrategy: matchType === 1 ? 'Exact' : matchType === 2 ? 'Clean' : 'Prefix Match'
      };
    }

    return {
      ...input,
      status: 'Not Found',
      rate: '',
      city: cityPart,
      state: statePart
    };
  });
}

/**
 * Parses raw text area string into an array of input objects
 */
export function parseRawInput(rawString) {
    if (!rawString) return [];
    
    // Split by line and remove empty lines
    return rawString.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => ({
           id: Math.random().toString(36).substring(2, 9),
           raw: line
        }));
}
