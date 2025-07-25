// Google Sheets API integration for Chrome Extension

// Authenticate and get OAuth token
function authenticateWithGoogle(callback) {
  chrome.identity.getAuthToken({ interactive: true }, function(token) {
    if (chrome.runtime.lastError) {
      alert('Google sign-in failed: ' + chrome.runtime.lastError.message);
      return;
    }
    callback(token);
  });
}

// Export for use in popup.js
window.authenticateWithGoogle = authenticateWithGoogle;

// Get all sheet names from a spreadsheet
async function getAllSheetNames(token, spreadsheetId) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title,sheets.properties.hidden`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  // Only return names of sheets that are not hidden
  return data.sheets.filter(sheet => !sheet.properties.hidden).map(sheet => sheet.properties.title);
}

// Get detailed sheet metadata including column information
async function getSheetMetadata(token, spreadsheetId) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties,sheets.columnMetadata`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}

// Read data from Google Sheet
async function getSheetData(token, spreadsheetId, range) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
}

// Write data to Google Sheet
async function updateSheetData(token, spreadsheetId, range, values) {
  console.log(`updateSheetData called with:`, { spreadsheetId, range, values });
  
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error('Update failed:', response.status, response.statusText, errorData);
    throw new Error(`Update failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
  }
  
  return response.json();
}

// Get dropdown options from a specific column
async function getColumnDropdownOptions(token, spreadsheetId, sheetName, columnLetter) {
  try {
    // URL encode the sheet name to handle special characters
    const encodedSheetName = encodeURIComponent(sheetName);
    console.log(`Getting dropdown options from sheet: "${sheetName}" column ${columnLetter}`);
    
    // Get the column data to analyze for dropdown options
    const range = `${encodedSheetName}!${columnLetter}:${columnLetter}`;
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to read column ${columnLetter} from sheet "${sheetName}": ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    
    if (!data.values || data.values.length === 0) {
      return [];
    }
    
    // Extract unique values from the column (skip empty cells)
    const uniqueValues = [...new Set(data.values.flat().filter(value => value && value.trim() !== ''))];
    console.log(`Found ${uniqueValues.length} unique dropdown options in column ${columnLetter}`);
    return uniqueValues;
  } catch (error) {
    console.error('Error getting dropdown options:', error);
    return [];
  }
}

// Find the next empty row in a sheet
async function findNextEmptyRow(token, spreadsheetId, sheetName, startRow = 1) {
  try {
    // URL encode the sheet name to handle special characters
    const encodedSheetName = encodeURIComponent(sheetName);
    console.log(`Finding next empty row in sheet: "${sheetName}" (encoded: "${encodedSheetName}")`);
    
    // Get all data from the sheet to find the last row with data
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheetName}!A:A`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to read sheet "${sheetName}": ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    
    if (!data.values || data.values.length === 0) {
      console.log(`Sheet "${sheetName}" is empty, starting at row ${startRow}`);
      return startRow;
    }
    
    // Find the last row with any data
    let lastRowWithData = 0;
    for (let i = data.values.length - 1; i >= 0; i--) {
      const row = data.values[i];
      if (row && row.some(cell => cell && cell.toString().trim() !== '')) {
        lastRowWithData = i + 1; // Convert to 1-based index
        break;
      }
    }
    
    // Return the next row after the last row with data, but ensure it's at least startRow
    const nextRow = Math.max(lastRowWithData + 1, startRow);
    console.log(`Sheet "${sheetName}": Last row with data: ${lastRowWithData}, Next empty row: ${nextRow}, Start row: ${startRow}`);
    return nextRow;
  } catch (error) {
    console.error('Error finding next empty row:', error);
    return startRow;
  }
}

// Test if token has write permissions to the spreadsheet
async function testWritePermissions(token, spreadsheetId) {
  try {
    // Try to read the spreadsheet first to test basic access
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to read spreadsheet: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Spreadsheet access confirmed:', data.properties.title);
    console.log('Available sheets:', data.sheets.map(s => s.properties.title));
    
    // Get the first sheet name (or use 'Sheet1' as fallback)
    const firstSheetName = data.sheets[0]?.properties.title || 'Sheet1';
    console.log('Using sheet name:', firstSheetName);
    
    // Try a small write test to verify permissions
    const testRange = `${firstSheetName}!A1`;
    const testData = [['Write Test']];
    
    console.log('Testing write with range:', testRange);
    
    const writeResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${testRange}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: testData })
    });
    
    if (!writeResponse.ok) {
      const errorData = await writeResponse.json();
      throw new Error(`Write permission denied: ${writeResponse.status} ${writeResponse.statusText} - ${JSON.stringify(errorData)}`);
    }
    
    console.log('Write permissions confirmed');
    return true;
  } catch (error) {
    console.error('Permission test failed:', error);
    return false;
  }
}

window.getSheetData = getSheetData;
window.updateSheetData = updateSheetData;
window.getAllSheetNames = getAllSheetNames;
window.getSheetMetadata = getSheetMetadata;
window.getColumnDropdownOptions = getColumnDropdownOptions;
window.findNextEmptyRow = findNextEmptyRow;
window.testWritePermissions = testWritePermissions; 