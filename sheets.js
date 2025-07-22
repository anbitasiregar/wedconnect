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
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  return data.sheets.map(sheet => sheet.properties.title);
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
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });
  return response.json();
}

window.getSheetData = getSheetData;
window.updateSheetData = updateSheetData;
window.getAllSheetNames = getAllSheetNames; 