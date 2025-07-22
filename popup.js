// Send a message to the content script to get WhatsApp messages
function fetchMessages() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getMessages' }, function (response) {
      const messagesDiv = document.getElementById('messages');
      if (response && response.messages && response.messages.length > 0) {
        messagesDiv.innerHTML = response.messages.map(msg => `<div style='margin-bottom:8px;'>${msg.replace(/\n/g, '<br>')}</div>`).join('');
      } else {
        messagesDiv.textContent = 'No messages found or not on WhatsApp Web.';
      }
    });
  });
}

document.getElementById('fetch-messages').addEventListener('click', fetchMessages);

// Google Sign-In button handler
import('./sheets.js');
document.getElementById('google-signin').addEventListener('click', function() {
  window.authenticateWithGoogle(function(token) {
    console.log('Google OAuth token:', token);
    // You can now use this token to call Google Sheets API
  });
});

// Load and save Google Sheets settings
document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.sync.get(['spreadsheetId', 'sheetName'], function(result) {
    if (result.spreadsheetId) {
      document.getElementById('spreadsheet-id').value = result.spreadsheetId;
    }
    if (result.sheetName) {
      document.getElementById('sheet-name').value = result.sheetName;
    }
  });
});

document.getElementById('save-settings').addEventListener('click', function() {
  const spreadsheetId = document.getElementById('spreadsheet-id').value;
  const sheetName = document.getElementById('sheet-name').value;
  chrome.storage.sync.set({ spreadsheetId, sheetName }, function() {
    alert('Settings saved!');
  });
});

// Read sheet data button handler
document.getElementById('read-sheet').addEventListener('click', function() {
  window.authenticateWithGoogle(async function(token) {
    chrome.storage.sync.get(['spreadsheetId', 'sheetName'], async function(result) {
      if (!result.spreadsheetId) {
        alert('Please save a Spreadsheet ID first.');
        return;
      }

      if (result.sheetName) {
        // Read from a specific sheet
        const data = await window.getSheetData(token, result.spreadsheetId, result.sheetName);
        console.log('Sheet data:', data);
      } else {
        // Read from all sheets
        const sheetNames = await window.getAllSheetNames(token, result.spreadsheetId);
        const allData = {};
        for (const sheetName of sheetNames) {
          allData[sheetName] = await window.getSheetData(token, result.spreadsheetId, sheetName);
        }
        console.log('All sheets data:', allData);
      }
    });
  });
}); 