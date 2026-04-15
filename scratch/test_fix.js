import { normalizeCity } from '../src/utils/normalize.js';
import { matchCities } from '../src/utils/matchingEngine.js';

const testCases = [
    "Ft.Sanders Historical,TN",
    "St.Michaels Mission,AZ",
    "St Peter,IL",
    "Saint Peter,IL"
];

console.log("--- Normalization Test ---");
testCases.forEach(input => {
    const cityPart = input.split(',')[0];
    console.log(`Input: "${cityPart}" -> Normalized: "${normalizeCity(cityPart)}"`);
});

console.log("\n--- Validation Test ---");
const inputData = testCases.map(raw => ({ raw }));
// Mock excel data - empty to just check format validation
const results = matchCities(inputData, []);

results.forEach(res => {
    console.log(`Input: "${res.raw}" -> Status: "${res.status}"`);
});
