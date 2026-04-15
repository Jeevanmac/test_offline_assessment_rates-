import { normalizeCity, getStateAbbr } from './normalize';

const ADMIN_WORDS = ['county', 'borough', 'parish'];

const ALLOWED_KEYWORDS = [
  'north', 'south', 'east', 'west', 'northeast', 'northwest', 'southeast', 'southwest', 
  'new', 'old', 'city', 'town', 'township', 'center', 'centre'
];

/**
 * Robust detection of admin keywords in RAW input.
 * Must detect: case insensitive, with or without spaces (e.g. "warrencounty")
 */
function isSpecialAdminWord(cityStr) {
  if (!cityStr) return false;
  const lower = cityStr.toLowerCase().trim();
  const compressed = lower.replace(/[\s\t\n\r._-]+/g, '');
  
  return ADMIN_WORDS.some(word => {
    // Check for exact word with boundaries OR compressed substring
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
    
    // Normalization: lowercase + replace hyphen ONLY
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
  // 1. Pre-fetch target list by state
  const stateToCitiesMap = {};
  excelDataRows.forEach(row => {
    if (!row.stateAbbr) return;
    if (!stateToCitiesMap[row.stateAbbr]) {
      stateToCitiesMap[row.stateAbbr] = [];
    }
    stateToCitiesMap[row.stateAbbr].push(row);
  });

  return inputData.map(input => {
    const rawLine = input.raw || '';
    const parts = rawLine.split(',').map(s => s.trim());
    const cityPart = parts[0] || '';
    const statePart = parts[1] || '';

    // ==========================================
    // 🚨 STEP 1: ADMIN WORD GATEWAY (HARD BLOCK)
    // ==========================================
    // Must use RAW cityPart before ANY normalization
    if (isSpecialAdminWord(cityPart)) {
      console.log("ADMIN BLOCK TRIGGERED:", cityPart);
      
      const inputStateAbbr = getStateAbbr(statePart);
      const targetList = stateToCitiesMap[inputStateAbbr] || [];
      
      // RUN ONLY EXACT MATCH (Lowercase + Trim ONLY)
      // DO NOT call normalizeCity()
      const rawSearch = cityPart.toLowerCase().trim();
      let bestMatch = null;

      for (const row of targetList) {
        const rowOriginal = (row.originalCity || '').toLowerCase().trim();
        if (rowOriginal === rawSearch) {
          if (!bestMatch || row.rateFloat > bestMatch.rateFloat) {
            bestMatch = row;
          }
        }
      }

      // SHORT-CIRCUIT: STOP execution completely
      if (bestMatch) {
        return {
          ...input,
          status: 'Found',
          rate: bestMatch.rateStr,
          city: cityPart,
          state: statePart,
          metaMatchStrategy: 'Exact (Admin Gateway)'
        };
      }

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
    // 🔵 STEP 2: NORMAL FLOW (NO ADMIN WORD)
    // ==========================================
    console.log("NORMAL MATCH FLOW:", cityPart);

    // Validation
    const commaCount = (rawLine.match(/,/g) || []).length;
    const isValidFormat = (commaCount === 1 && parts.length === 2 && parts[0].length > 0 && parts[1].length > 0 && !rawLine.includes('.'));
    if (!isValidFormat) {
      return { ...input, city: '-', state: '-', status: 'Invalid Format', rate: '-', metaMatchStrategy: 'Invalid Format' };
    }

    const inputStateAbbr = getStateAbbr(statePart);
    const targetList = stateToCitiesMap[inputStateAbbr] || [];
    
    const inputVariations = getAllVariations(cityPart);
    let allMatches = [];

    for (const row of targetList) {
      const rowOrig = String(row.originalCity || '');
      
      // Safety: Never match a normal input against an Admin database record
      if (isSpecialAdminWord(rowOrig)) continue;

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
