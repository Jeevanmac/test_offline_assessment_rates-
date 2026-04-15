# City Assessment Finder

A high-performance, client-side React application designed to match bulk city-state inputs against an uploaded Excel dataset. The core of the application is a robust, validation-first matching engine that ensures accuracy by strictly handling administrative keywords and directional variations.

## 🚀 Key Features

- **Admin Gateway**: Strict "County", "Borough", and "Parish" handling. If an input contains an admin word, the engine enforces a 1:1 exact match and blocks all fuzzy/prefix matching.
- **Controlled Prefix/Suffix Engine**: Tight list of allowed modifiers (`north`, `south`, `new`, `city`, `town`, etc.) used to identify base city names while preventing false positives.
- **Bulk Processing**: Optimized for large datasets using state-indexed lookup tables for O(N) performance.
- **Multivariate Matching**: Supports Exact Match, Prefix Match, Clean Match (ignoring spaces), and Alias Matching.
- **Premium UI**: Modern dark-themed interface with glassmorphism, fluid animations (Framer Motion), and real-time status updates.

## 🏗 Architecture

### 1. UI Layer (`src/App.jsx`)
Manages the global state, file upload handlers, and orchestrates the flow between the raw text input and the results table.

### 2. Matching Engine (`src/utils/matchingEngine.js`)
The "brain" of the project. It follows a two-tier safety protocol:
- **Tier 1 (The Gateway)**: Detects administrative keywords and applies a hard short-circuit if an exact match isn't found.
- **Tier 2 (Variation Generator)**: For normal cities, it generates multiple variations (Stripping allowed prefixes/suffixes) to find the best match with the highest assessment rate.

### 3. Data Pipeline (`src/utils/excelParser.js`)
Parses XLSX/XLS files into a normalized JSON format, ensuring headers like "Assessment Rate Reduction" are extracted correctly.

### 4. Normalization Layer (`src/utils/normalize.js`)
Handles low-level string cleaning, mapping full state names to abbreviations, and standardizing directional tokens.

## 🛠 Tech Stack

- **Framework**: React + Vite
- **Styling**: Vanilla CSS (Modern CSS Variables & Utilities)
- **Data Handling**: [XLSX](https://www.npmjs.com/package/xlsx)
- **Icons**: Lucide React
- **Animations**: Framer Motion

## 🚦 Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

## 📝 Matching Logic Rules

- **Strict Blocking**: A normal search for "Adams" will **never** match "Adams County" in your dataset.
- **Directional Support**: "North Delhi" or "Delhi Center" will correctly resolve to "Delhi" if "Delhi" is the record in the database.
- **Highest Rate Priority**: If multiple entries match (e.g., prefix match vs alias match), the system automatically selects the one with the highest reduction rate.
