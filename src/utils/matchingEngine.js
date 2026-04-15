import { normalizeCity, getStateAbbr } from './normalize';

const ADMIN_WORDS = ['county', 'borough', 'parish'];

const ALLOWED_KEYWORDS = [
  'north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest', 
  'new', 'old', 'city', 'town', 'township', 'center', 'centre'
];

/**
 * Robust detection of admin keywords
 */
function isSpecialAdminWord(cityStr) {
  if (!cityStr) return false;
  const lower = cityStr.toLowerCase().trim();
  const compressed = lower.replace(/[\s\t\n\r._-]+/g, ''); // no separators
  
  return ADMIN_WORDS.some(word => {
    // Check for exact word with boundaries OR concatenated substring
    const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
    return wordRegex.test(lower) || compressed.includes(word);
  });
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
    
    let cleanTokens = raw.split(/\s+/).filter(Boolean);
    let cleanComp = cleanTokens.join('');
    
    // Prefix/Suffix rules: remove ONLY the specific allowed keywords
    let baseTokens = [...cleanTokens];
    
    // Strip from start
    while (baseTokens.length > 1 && ALLOWED_KEYWORDS.includes(baseTokens[0])) {
      baseTokens.shift();
    }
    // Strip from end
    while (baseTokens.length > 1 && ALLOWED_KEYWORDS.includes(baseTokens[baseTokens.length - 1])) {
      baseTokens.pop();
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
        const rawLine = input.raw || '';
        const commaCount = (rawLine.match(/,/g) || []).length;
        const parts = rawLine.split(',').map(s => s.trim());
        
        const cityPart = parts[0] || '';
        const statePart = parts[1] || '';

        // --- Basic Format Validation ---
        const isValidFormat = (commaCount === 1 && parts.length === 2 && parts[0].length > 0 && parts[1].length > 0 && !rawLine.includes('.'));
        if (!isValidFormat) {
            return { ...input, city: '-', state: '-', status: 'Invalid Format', rate: '-', metaMatchStrategy: 'Invalid Format' };
        }

        const inputStateAbbr = getStateAbbr(statePart);
        const targetList = stateToCitiesMap[inputStateAbbr] || [];

        // ==========================================
        // 🚨 1. ADMIN GATEWAY (STRICT SHORT-CIRCUIT)
        // ==========================================
        if (isSpecialAdminWord(cityPart)) {
            // ONLY perform exact match against dataset city names
            // Normalize input minimally for comparison (lowercase + trim)
            const searchStr = cityPart.toLowerCase().trim();
            let exactMatch = null;

            for (const row of targetList) {
                const rowOrig = (row.originalCity || '').toLowerCase().trim();
                // Match exactly. No variations allowed for admin keywords.
                if (rowOrig === searchStr) {
                    if (!exactMatch || row.rateFloat > exactMatch.rateFloat) {
                        exactMatch = row;
                    }
                }
            }

            if (exactMatch) {
                return {
                    ...input,
                    status: 'Found',
                    rate: exactMatch.rateStr,
                    city: cityPart,
                    state: statePart,
                    metaMatchStrategy: 'Exact (Admin Gateway)'
                };
            }

            // Reject immediately if no exact match found
            return {
                ...input,
                status: 'Not Found',
                rate: '-',
                city: cityPart,
                state: statePart,
                metaMatchStrategy: 'Rejected (Admin Gateway Stop)'
            };
        }

        // ==========================================
        // 🔵 2. NORMAL MATCHING FLOW
        // ==========================================
        const inputVariations = getAllVariations(cityPart);
        let allMatches = [];

        for (let i = 0; i < targetList.length; i++) {
            const row = targetList[i];
            
            // 🔥 SAFETY VALVE: Do not match a normal input (passed the gateway above) 
            // to a database row that contains an admin word.
            // Example: "Adams" should NOT match "Adams County"
            const rowOrig = String(row.originalCity || '');
            if (isSpecialAdminWord(rowOrig)) {
                continue; // Skip this row in normal flow
            }

            const rowVariations = getAllVariations(rowOrig);
            let isMatch = false;
            let strat = '';

            for (const iVar of inputVariations) {
                for (const rVar of rowVariations) {
                    if (iVar.exactComp === rVar.exactComp && iVar.exactComp !== '') {
                        isMatch = true; strat = 'Exact'; break;
                    }
                    if ((iVar.baseComp === rVar.cleanComp || iVar.cleanComp === rVar.baseComp) && iVar.baseComp !== '') {
                        isMatch = true; strat = 'Prefix Match'; break;
                    }
                    if (iVar.cleanComp === rVar.cleanComp && iVar.cleanComp !== '') {
                        isMatch = true; strat = 'Clean Match'; break;
                    }
                }
                if (isMatch) break;
            }

            // Alias Matching
            if (!isMatch && row.originalAlias) {
                // Ensure alias isn't an admin word either
                if (!isSpecialAdminWord(String(row.originalAlias))) {
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
                }
            }

            if (isMatch) allMatches.push({ row, strat });
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

        return { ...input, status: 'Not Found', rate: '', city: cityPart, state: statePart };
    });
}


/**
 * Parses raw text area string into an array of input objects
 */
export function parseRawInput(rawString) {
    if (!rawString) return [];
    return rawString.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => ({
           id: Math.random().toString(36).substring(2, 9),
           raw: line
        }));
}
