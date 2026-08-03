/**
 * Simple CSV parser utility that splits lines and parses headers.
 * Correctly handles quotes enclosing fields that contain commas.
 */
export const parseCSV = (csvText) => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const rowObj = {};
    headers.forEach((header, index) => {
      rowObj[header.trim()] = values[index] !== undefined ? values[index].trim() : '';
    });
    rows.push(rowObj);
  }

  return { headers, rows };
};

const parseCSVLine = (line) => {
  const result = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes; // Toggle quote state
    } else if (char === ',' && !inQuotes) {
      result.push(currentVal);
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  result.push(currentVal); // Push final value
  
  // Clean enclosing quotes
  return result.map(val => {
    let clean = val.trim();
    if (clean.startsWith('"') && clean.endsWith('"')) {
      clean = clean.substring(1, clean.length - 1);
    }
    return clean;
  });
};
