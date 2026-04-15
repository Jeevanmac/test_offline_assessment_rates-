import { normalizeCity, getStateAbbr } from './normalize';

function getBaseCity(cityNorm) {
  if (!cityNorm) return '';
  const ALLOWED_PREFIXES = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest', 'new', 'old'];
  const tokens = cityNorm.split(/\s+/);
  if (tokens.length > 1 && ALLOWED_PREFIXES.includes(tokens[0])) {
    return tokens.slice(1).join(' ');
  }
  return cityNorm;
}

function getAllVariations(cityStr) {
  if (!cityStr) return [];
  // 1. Bracket Handling
  const parts = [];
  if (cityStr.includes('(') && cityStr.includes(')')) {
    const insideMatch = cityStr.match(/\(([^)]+)\)/);
    if (insideMatch) {
       parts.push(insideMatch[1].trim());
       parts.push(cityStr.replace(/\([^)]+\)/g, '').trim());
    } else {
       parts.push(cityStr.trim());
    }
  } else {
    parts.push(cityStr.trim());
  }

  const variations = [];
  parts.forEach(part => {
    if (!part) return;
    
    // Normalization rules: lowercase, replace hyphen
    let raw = part.toLowerCase().replace(/-/g, ' ');
    let compExact = raw.replace(/\s+/g, '');
    
    // Clean rules: remove county/borough/parish
    let cleanTokens = raw.split(/\s+/).filter(Boolean);
    let cleanTokensFiltered = cleanTokens.filter(t => !['county', 'borough', 'parish'].includes(t));
    let cleanComp = cleanTokensFiltered.join('');
    
    // Prefix rules: remove allowed prefixes
    const ALLOWED_PREFIXES = ['north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest', 'new', 'old'];
    let baseTokens = [...cleanTokensFiltered];
    if (baseTokens.length > 1 && ALLOWED_PREFIXES.includes(baseTokens[0])) {
      baseTokens.shift(); // remove prefix
    }
    let baseComp = baseTokens.join('');
    
    variations.push({
      exactComp: compExact,
      cleanComp: cleanComp,
      baseComp: baseComp
    });
  });
  
  return variations;
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
    const inputVariations = getAllVariations(cityPart);
    let allMatches = [];

    for (let i = 0; i < targetList.length; i++) {
        const row = targetList[i];
        const rowVariations = getAllVariations(String(row.originalCity || ''));
        
        let isMatch = false;
        let strat = '';

        for (const iVar of inputVariations) {
            for (const rVar of rowVariations) {
                // 1. Exact Match
                if (iVar.exactComp === rVar.exactComp && iVar.exactComp !== '') {
                    isMatch = true; strat = 'Exact'; break;
                }
                
                // 3. Prefix Match
                // "Remove prefix and compare again"
                if ((iVar.baseComp === rVar.cleanComp || iVar.cleanComp === rVar.baseComp) && iVar.baseComp !== '') {
                    isMatch = true; strat = 'Prefix Match'; break;
                }

                // 4. Clean Match
                if (iVar.cleanComp === rVar.cleanComp && iVar.cleanComp !== '') {
                    isMatch = true; strat = 'Clean Match'; break;
                }
            }
            if (isMatch) break;
        }

        // Handle alias if it didn't match the primary city
        if (!isMatch && row.originalAlias) {
            const aliasVariations = getAllVariations(String(row.originalAlias));
            for (const iVar of inputVariations) {
                for (const aVar of aliasVariations) {
                    if (iVar.exactComp === aVar.exactComp && iVar.exactComp !== '') {
                        isMatch = true; strat = 'Exact (Alias)'; break;
                    }
                    if ((iVar.baseComp === aVar.cleanComp || iVar.cleanComp === aVar.baseComp) && iVar.baseComp !== '') {
                        isMatch = true; strat = 'Prefix Match (Alias)'; break;
                    }
                    if (iVar.cleanComp === aVar.cleanComp && iVar.cleanComp !== '') {
                        isMatch = true; strat = 'Clean Match (Alias)'; break;
                    }
                }
                if (isMatch) break;
            }
        } else if (!isMatch && row.aliasCompressed) {
            // fallback if we just have aliasCompressed without originalAlias
            for (const iVar of inputVariations) {
               if (iVar.cleanComp === row.aliasCompressed && iVar.cleanComp !== '') {
                   isMatch = true; strat = 'Clean Match (Alias)'; break;
               }
            }
        }

        if (isMatch) {
            allMatches.push({ row, strat });
        }
    }

    if (allMatches.length > 0) {
        let bestMatch = allMatches[0];
        for (let m = 1; m < allMatches.length; m++) {
           if (allMatches[m].row.rateFloat > bestMatch.row.rateFloat) {
               bestMatch = allMatches[m];
           }
        }

        return {
            ...input,
            status: 'Found',
            rate: bestMatch.row.rateStr,
            city: cityPart,
            state: statePart,
            metaMatchStrategy: bestMatch.strat
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
