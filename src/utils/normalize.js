/**
 * Normalizes strings according to the defined specifications.
 */

const STATE_MAP = {
  'al': 'alabama', 'ak': 'alaska', 'az': 'arizona', 'ar': 'arkansas', 'ca': 'california',
  'co': 'colorado', 'ct': 'connecticut', 'de': 'delaware', 'fl': 'florida', 'ga': 'georgia',
  'hi': 'hawaii', 'id': 'idaho', 'il': 'illinois', 'in': 'indiana', 'ia': 'iowa',
  'ks': 'kansas', 'ky': 'kentucky', 'la': 'louisiana', 'me': 'maine', 'md': 'maryland',
  'ma': 'massachusetts', 'mi': 'michigan', 'mn': 'minnesota', 'ms': 'mississippi', 'mo': 'missouri',
  'mt': 'montana', 'ne': 'nebraska', 'nv': 'nevada', 'nh': 'new hampshire', 'nj': 'new jersey',
  'nm': 'new mexico', 'ny': 'new york', 'nc': 'north carolina', 'nd': 'north dakota',
  'oh': 'ohio', 'ok': 'oklahoma', 'or': 'oregon', 'pa': 'pennsylvania', 'ri': 'rhode island',
  'sc': 'south carolina', 'sd': 'south dakota', 'tn': 'tennessee', 'tx': 'texas', 'ut': 'utah',
  'vt': 'vermont', 'va': 'virginia', 'wa': 'washington', 'wv': 'west virginia', 'wi': 'wisconsin',
  'wy': 'wyoming', 'dc': 'district of columbia'
};

/**
 * Main normalization function for city strings
 * ONLY apply:
 * 1. Lowercase everything
 * 2. Trim spaces (done via tokenization)
 * 3. Replace hyphens with space
 */
export function normalizeCity(str) {
  if (!str) return '';

  // 1. Lowercase and replace dots with spaces
  let normalized = str.toLowerCase().replace(/\./g, ' ');

  // 2. Abbreviation normalization (st -> saint, ft -> fort, mt -> mount)
  const abbrMap = {
    st: 'saint',
    ft: 'fort',
    mt: 'mount'
  };

  for (const [abbr, full] of Object.entries(abbrMap)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'g');
    normalized = normalized.replace(regex, full);
  }

  // 3. Replace hyphens with space
  normalized = normalized.replace(/-/g, ' ');

  // 4. normalize spacing
  let tokens = normalized.split(/\s+/).filter(Boolean);

  return tokens.join(' ');
}


export function compressCity(str) {
  if (!str) return '';
  return str.replace(/\s+/g, '');
}

export function normalizeState(str) {
  if (!str) return '';
  let normalized = str.toLowerCase().trim();
  // State might be "OH" or "Ohio"
  if (STATE_MAP[normalized]) {
    // If it's short, convert to full name for consistent matching if excel has full names
    // Actually wait, let's keep it normalized. Let's return the abbreviation always, or full name always.
    // The requirement says:
    // Support full name <-> abbreviation mapping.
    // Let's normalize everything to lowercased abbreviation if possible, or full name.
    // We will return lowercased abbreviation string.
  }
  
  // Reverse lookup: if they typed "ohio", return "oh"
  for (const [abbr, full] of Object.entries(STATE_MAP)) {
    if (normalized === full) {
      return abbr;
    }
  }
  
  // Otherwise, if it's already a 2-char code or something unrecognized, return as is.
  return normalized;
}

export function getStateAbbr(str) {
  const norm = normalizeState(str);
  return norm; 
}

export function getStateFullName(str) {
  if (!str) return '';
  const normalized = str.toLowerCase().trim();
  let fullName = STATE_MAP[normalized] || normalized;
  // If it was just passing "ohio", we might get "oh" if we used normalizeState.
  // Wait, if it's already "oh" (abbreviation), STATE_MAP gives "ohio".
  // If it's already "ohio", STATE_MAP doesn't have it, so we fallback to "ohio".
  
  // Let's accurately parse it:
  if (STATE_MAP[normalized]) {
    fullName = STATE_MAP[normalized];
  } else {
     // Check if it's already a full name
     let found = false;
     for (const [abbr, full] of Object.entries(STATE_MAP)) {
       if (normalized === full) {
         fullName = full;
         found = true;
         break;
       }
     }
     if (!found) fullName = normalized;
  }
  
  // Capitalize first letters
  return fullName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
