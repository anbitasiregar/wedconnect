// Onboarding Wizard Logic
let currentStep = 1;
let sheetData = null;
let rsvpConfig = {};

// Check if setup is complete on page load
document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.sync.get(['rsvpConfig', 'spreadsheetId'], function(result) {
    if (result.rsvpConfig && result.spreadsheetId) {
      // Setup is complete, hide onboarding but show reset button
      document.getElementById('onboarding-steps').style.display = 'none';
      updateSetupStatus('success', '✅ Setup Complete: RSVP tracking is configured and ready to use!');
      
      // Make sure reset button is visible
      const resetBtn = document.getElementById('reset-setup');
      if (resetBtn) {
        resetBtn.style.display = 'inline-block';
      }
    } else {
      // Setup required, show onboarding
      showStep(1);
      updateSetupStatus('warning', 'Setup Required: Please configure your RSVP tracking system.');
      
      // Hide reset button if setup is not complete
      const resetBtn = document.getElementById('reset-setup');
      if (resetBtn) {
        resetBtn.style.display = 'none';
      }
    }
  });
});

// Setup wizard event listeners
document.getElementById('start-setup').addEventListener('click', function() {
  document.getElementById('onboarding-steps').style.display = 'block';
  showStep(1);
});

document.getElementById('analyze-sheet').addEventListener('click', function() {
  const spreadsheetInput = document.getElementById('setup-spreadsheet-id').value.trim();
  if (!spreadsheetInput) {
    alert('Please enter a Google Sheets URL first.');
    return;
  }
  
  // Extract spreadsheet ID from URL
  const urlMatch = spreadsheetInput.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const spreadsheetId = urlMatch ? urlMatch[1] : spreadsheetInput;
  
  analyzeSheetStructure(spreadsheetId);
});

document.getElementById('save-config').addEventListener('click', function() {
  saveRSVPConfiguration();
});

document.getElementById('test-rsvp').addEventListener('click', function() {
  testRSVPEntry();
});

document.getElementById('finish-setup').addEventListener('click', function() {
  finishSetup();
});

// Show specific step in the wizard
function showStep(step) {
  currentStep = step;
  document.querySelectorAll('.onboarding-step').forEach(el => el.classList.remove('active'));
  document.getElementById(`step-${step}`).classList.add('active');
}

// Update setup status display
function updateSetupStatus(type, message) {
  const statusDiv = document.getElementById('setup-status');
  statusDiv.className = `setup-status ${type}`;
  statusDiv.innerHTML = `<strong>${message}</strong>`;
}

// Analyze the Google Sheet structure
async function analyzeSheetStructure(spreadsheetId) {
  try {
    updateSetupStatus('warning', 'Analyzing sheet structure...');
    
    window.authenticateWithGoogle(async function(token) {
      try {
        // Get all sheet names
        const sheetNames = await window.getAllSheetNames(token, spreadsheetId);
        
        // Get data from the first sheet - fetch more rows to analyze structure
        const firstSheet = sheetNames[0];
        const sheetData = await window.getSheetData(token, spreadsheetId, firstSheet);
        
        if (!sheetData.values || sheetData.values.length === 0) {
          updateSetupStatus('error', 'No data found in the sheet. Please add some data first.');
          return;
        }
        
        // Store sheet data globally for re-analysis
        window.currentSheetData = sheetData.values;
        window.currentSheetName = firstSheet; // Store the sheet name
        
        // Analyze the structure with multiple rows
        const analysis = analyzeMultiRowStructure(sheetData.values);
        
        // Display analysis results
        document.getElementById('sheet-analysis').innerHTML = `
          <h5>Sheet Analysis Results:</h5>
          <p><strong>Sheet Name:</strong> ${firstSheet}</p>
          <p><strong>Rows Found:</strong> ${sheetData.values.length}</p>
          <p><strong>Columns Found:</strong> ${sheetData.values[0].length}</p>
          <div class="setup-status ${analysis.suggestions.length > 0 ? 'success' : 'warning'}">
            <strong>Initial Analysis:</strong><br>
            ${analysis.suggestions.join('<br>')}
          </div>
        `;
        
        // Populate header row selector
        populateHeaderRowSelector(sheetData.values);
        
        // Use the best suggested header row for initial column population
        const bestHeaderRow = analysis.potentialHeaderRows.length > 0 ? analysis.potentialHeaderRows[0].rowIndex : 0;
        const bestHeaders = sheetData.values[bestHeaderRow];
        populateColumnSelectors(bestHeaders, analysis);
        
        // Set the header row selector to the best suggested row
        document.getElementById('header-row-selector').value = bestHeaderRow;
        
        // Save spreadsheet ID
        chrome.storage.sync.set({ spreadsheetId }, function() {
          showStep(2);
          updateSetupStatus('success', 'Sheet analyzed successfully! Select the correct header row below.');
        });
        
      } catch (error) {
        updateSetupStatus('error', 'Error analyzing sheet: ' + error.message);
      }
    });
  } catch (error) {
    updateSetupStatus('error', 'Error: ' + error.message);
  }
}

// Analyze headers to suggest RSVP configuration
function analyzeHeaders(headers) {
  const suggestions = [];
  const analysis = {
    hasFirstNameColumn: false,
    hasLastNameColumn: false,
    hasFullNameColumn: false,
    hasRSVPResponseColumn: false,
    suggestions: []
  };
  
  headers.forEach((header, index) => {
    const lowerHeader = header.toLowerCase();
    
    if (lowerHeader.includes('first') && lowerHeader.includes('name')) {
      analysis.hasFirstNameColumn = true;
      suggestions.push(`✅ Found first name column: "${header}"`);
    } else if (lowerHeader.includes('last') && lowerHeader.includes('name')) {
      analysis.hasLastNameColumn = true;
      suggestions.push(`✅ Found last name column: "${header}"`);
    } else if (lowerHeader.includes('name') && !lowerHeader.includes('first') && !lowerHeader.includes('last')) {
      analysis.hasFullNameColumn = true;
      suggestions.push(`✅ Found full name column: "${header}"`);
    }
    
    if (lowerHeader.includes('rsvp') || lowerHeader.includes('response') || lowerHeader.includes('message') || lowerHeader.includes('note') || lowerHeader.includes('reply')) {
      analysis.hasRSVPResponseColumn = true;
      suggestions.push(`✅ Found RSVP response column: "${header}"`);
    }
  });
  
  // Determine name format
  if (analysis.hasFirstNameColumn && analysis.hasLastNameColumn) {
    suggestions.push(`📋 Name format detected: Separate first and last name columns`);
  } else if (analysis.hasFullNameColumn) {
    suggestions.push(`📋 Name format detected: Combined full name column`);
  } else {
    suggestions.push(`⚠️ No clear name columns found. Please check your column headers.`);
  }
  
  if (!analysis.hasRSVPResponseColumn) {
    suggestions.push(`⚠️ No RSVP response column found. Consider adding a "RSVP Response" or "Message" column.`);
  }
  
  analysis.suggestions = suggestions;
  return analysis;
}

// Analyze multi-row structure to suggest the best header row
function analyzeMultiRowStructure(rows) {
  const suggestions = [];
  const analysis = {
    hasNameColumn: false,
    hasRSVPColumn: false,
    hasResponseColumn: false,
    hasDateColumn: false,
    suggestions: [],
    potentialHeaderRows: []
  };
  
  // Analyze first few rows to find potential header rows
  const rowsToAnalyze = Math.min(5, rows.length);
  
  for (let i = 0; i < rowsToAnalyze; i++) {
    const row = rows[i];
    const headerScore = calculateHeaderScore(row);
    
    if (headerScore > 0) {
      analysis.potentialHeaderRows.push({
        rowIndex: i,
        score: headerScore,
        headers: row
      });
    }
  }
  
  // Sort by score (highest first)
  analysis.potentialHeaderRows.sort((a, b) => b.score - a.score);
  
  if (analysis.potentialHeaderRows.length > 0) {
    const bestRow = analysis.potentialHeaderRows[0];
    suggestions.push(`🎯 Suggested header row: Row ${bestRow.rowIndex + 1} (score: ${bestRow.score})`);
    suggestions.push(`📋 Headers: ${bestRow.headers.join(', ')}`);
    
    // Analyze the best row for RSVP columns
    const headerAnalysis = analyzeHeaders(bestRow.headers);
    analysis.suggestions = headerAnalysis.suggestions;
    analysis.hasNameColumn = headerAnalysis.hasNameColumn;
    analysis.hasRSVPColumn = headerAnalysis.hasRSVPColumn;
    analysis.hasResponseColumn = headerAnalysis.hasResponseColumn;
    analysis.hasDateColumn = headerAnalysis.hasDateColumn;
  } else {
    suggestions.push('⚠️ No clear header row found. Please manually select the row with column names.');
  }
  
  analysis.suggestions = suggestions;
  return analysis;
}

// Calculate how likely a row is to be a header row
function calculateHeaderScore(row) {
  if (!row || row.length === 0) return 0;
  
  let score = 0;
  const rowText = row.join(' ').toLowerCase();
  
  // Check for common header indicators
  if (rowText.includes('name') || rowText.includes('guest')) score += 3;
  if (rowText.includes('rsvp') || rowText.includes('attending')) score += 3;
  if (rowText.includes('email') || rowText.includes('phone')) score += 2;
  if (rowText.includes('date') || rowText.includes('time')) score += 2;
  if (rowText.includes('response') || rowText.includes('message')) score += 2;
  
  // Check for empty cells (headers often have some empty cells)
  const emptyCells = row.filter(cell => !cell || cell.trim() === '').length;
  const emptyRatio = emptyCells / row.length;
  if (emptyRatio > 0.2 && emptyRatio < 0.8) score += 1;
  
  // Check for short text (headers are usually short)
  const avgLength = row.reduce((sum, cell) => sum + (cell ? cell.length : 0), 0) / row.length;
  if (avgLength < 15) score += 1;
  
  return score;
}

// Populate column selectors with suggestions
function populateColumnSelectors(headers, analysis) {
  const selectors = ['first-name-column', 'last-name-column', 'full-name-column', 'rsvp-response-column'];
  
  selectors.forEach(selectorId => {
    const select = document.getElementById(selectorId);
    if (!select) return; // Skip if element doesn't exist
    
    select.innerHTML = '<option value="">Select column...</option>';
    
    headers.forEach((header, index) => {
      const option = document.createElement('option');
      option.value = String.fromCharCode(65 + index); // Convert to A, B, C, etc.
      option.textContent = header;
      select.appendChild(option);
    });
    
    // Auto-select based on analysis with improved detection
    if (selectorId === 'first-name-column' && analysis.hasFirstNameColumn) {
      const firstNameIndex = headers.findIndex(h => h.toLowerCase().includes('first') && h.toLowerCase().includes('name'));
      if (firstNameIndex >= 0) select.selectedIndex = firstNameIndex + 1;
    }
    
    if (selectorId === 'last-name-column' && analysis.hasLastNameColumn) {
      const lastNameIndex = headers.findIndex(h => h.toLowerCase().includes('last') && h.toLowerCase().includes('name'));
      if (lastNameIndex >= 0) select.selectedIndex = lastNameIndex + 1;
    }
    
    if (selectorId === 'full-name-column' && analysis.hasFullNameColumn) {
      const fullNameIndex = headers.findIndex(h => h.toLowerCase().includes('name') && !h.toLowerCase().includes('first') && !h.toLowerCase().includes('last'));
      if (fullNameIndex >= 0) select.selectedIndex = fullNameIndex + 1;
    }
    
    if (selectorId === 'rsvp-response-column' && analysis.hasRSVPResponseColumn) {
      // Try multiple variations for RSVP response column
      const rsvpVariations = ['rsvp', 'response', 'message', 'note', 'reply', 'comment'];
      let rsvpIndex = -1;
      
      for (const variation of rsvpVariations) {
        rsvpIndex = headers.findIndex(h => h.toLowerCase().includes(variation));
        if (rsvpIndex >= 0) break;
      }
      
      if (rsvpIndex >= 0) select.selectedIndex = rsvpIndex + 1;
    }
  });
  
  // Determine and set name format based on analysis
  if (analysis.hasFirstNameColumn && analysis.hasLastNameColumn) {
    document.getElementById('name-separate').checked = true;
    showNameFormatConfig('separate');
  } else if (analysis.hasFullNameColumn) {
    document.getElementById('name-combined').checked = true;
    showNameFormatConfig('combined');
  }
}

// Show/hide name format configuration sections
function showNameFormatConfig(format) {
  const separateConfig = document.getElementById('separate-name-config');
  const combinedConfig = document.getElementById('combined-name-config');
  
  if (format === 'separate') {
    separateConfig.style.display = 'block';
    combinedConfig.style.display = 'none';
  } else {
    separateConfig.style.display = 'none';
    combinedConfig.style.display = 'block';
  }
}

// Add event listeners for name format radio buttons
document.addEventListener('DOMContentLoaded', function() {
  const nameFormatRadios = document.querySelectorAll('input[name="name-format"]');
  nameFormatRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      showNameFormatConfig(this.value);
    });
  });
});

// Populate header row selector
function populateHeaderRowSelector(rows) {
  const selector = document.getElementById('header-row-selector');
  selector.innerHTML = '<option value="">Select header row...</option>';
  
  const rowsToShow = Math.min(10, rows.length);
  
  for (let i = 0; i < rowsToShow; i++) {
    const row = rows[i];
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `Row ${i + 1}: ${row.slice(0, 3).join(', ')}${row.length > 3 ? '...' : ''}`;
    selector.appendChild(option);
  }
  
  // Add event listener for header row selection
  selector.addEventListener('change', function() {
    const selectedRowIndex = parseInt(this.value);
    if (!isNaN(selectedRowIndex)) {
      refreshAnalysisWithHeaderRow(selectedRowIndex);
    }
  });
}

// Add event listener for refresh analysis button
document.getElementById('refresh-analysis').addEventListener('click', function() {
  const selectedRowIndex = document.getElementById('header-row-selector').value;
  if (selectedRowIndex) {
    refreshAnalysisWithHeaderRow(parseInt(selectedRowIndex));
  } else {
    alert('Please select a header row first.');
  }
});

// Refresh analysis with selected header row
function refreshAnalysisWithHeaderRow(rowIndex) {
  if (!window.currentSheetData || !window.currentSheetData[rowIndex]) {
    alert('No sheet data available. Please analyze the sheet again.');
    return;
  }
  
  const headers = window.currentSheetData[rowIndex];
  const analysis = analyzeHeaders(headers);
  
  // Update analysis display
  document.getElementById('sheet-analysis').innerHTML = `
    <h5>Sheet Analysis Results (Row ${rowIndex + 1}):</h5>
    <p><strong>Selected Headers:</strong> ${headers.join(', ')}</p>
    <div class="setup-status ${analysis.suggestions.length > 0 ? 'success' : 'warning'}">
      <strong>Analysis:</strong><br>
      ${analysis.suggestions.join('<br>')}
    </div>
  `;
  
  // Update column selectors
  populateColumnSelectors(headers, analysis);
  
  updateSetupStatus('success', `Analysis refreshed with row ${rowIndex + 1} headers!`);
}

// Save RSVP configuration
function saveRSVPConfiguration() {
  const nameFormat = document.querySelector('input[name="name-format"]:checked')?.value;
  
  if (!nameFormat) {
    alert('Please select a name format.');
    return;
  }
  
  const config = {
    nameFormat: nameFormat,
    headerRowIndex: parseInt(document.getElementById('header-row-selector').value) || 0,
    sheetName: window.currentSheetName || 'Sheet1' // Save the sheet name that was analyzed
  };
  
  if (nameFormat === 'separate') {
    config.firstNameColumn = document.getElementById('first-name-column').value;
    config.lastNameColumn = document.getElementById('last-name-column').value;
    
    if (!config.firstNameColumn || !config.lastNameColumn) {
      alert('Please select both First Name and Last Name columns.');
      return;
    }
  } else {
    config.fullNameColumn = document.getElementById('full-name-column').value;
    
    if (!config.fullNameColumn) {
      alert('Please select the Full Name column.');
      return;
    }
  }
  
  config.rsvpResponseColumn = document.getElementById('rsvp-response-column').value;
  
  if (!config.rsvpResponseColumn) {
    alert('Please select the RSVP Response column.');
    return;
  }
  
  // Save RSVP mapping configuration
  config.rsvpMapping = {
    yes: document.getElementById('yes-mapping').value,
    no: document.getElementById('no-mapping').value,
    unsure: document.getElementById('unsure-mapping').value
  };
  
  // Validate mapping configuration
  if (!config.rsvpMapping.yes || !config.rsvpMapping.no) {
    alert('Please configure the RSVP response mapping for YES and NO responses.');
    return;
  }
  
  chrome.storage.sync.set({ rsvpConfig: config }, function() {
    rsvpConfig = config;
    showStep(3);
    updateSetupStatus('success', 'Configuration saved! Ready to test.');
  });
}

// Test RSVP entry
async function testRSVPEntry() {
  try {
    chrome.storage.sync.get(['spreadsheetId', 'rsvpConfig'], async function(result) {
      if (!result.spreadsheetId || !result.rsvpConfig) {
        alert('Configuration not found. Please complete the setup first.');
        return;
      }
      
      window.authenticateWithGoogle(async function(token) {
        try {
          // First, check Google permissions
          const hasGooglePermissions = await checkGooglePermissions();
          if (!hasGooglePermissions) {
            throw new Error('Google account permissions not granted. Please sign in again.');
          }
          
          // Then, test if we have write permissions to the spreadsheet
          const hasPermissions = await window.testWritePermissions(token, result.spreadsheetId);
          if (!hasPermissions) {
            throw new Error('No write permissions to the spreadsheet. Please check your Google account permissions.');
          }
          
          const config = result.rsvpConfig;
          
          // Use the configured sheet name instead of getting it from API
          const sheetName = config.sheetName || 'Sheet1';
          console.log('Using configured sheet name:', sheetName);
          
          // Create test data based on name format
          let testName = 'Test Guest';
          let firstName = 'Test';
          let lastName = 'Guest';
          
          // Map test status to configured dropdown value
          let testStatus = 'YES';
          let rsvpValue = '';
          if (config.rsvpMapping && config.rsvpMapping.yes) {
            rsvpValue = config.rsvpMapping.yes;
          } else {
            rsvpValue = testStatus;
          }
          
          // Find the next empty row (ensure it's after headers)
          const headerRowIndex = config.headerRowIndex || 0;
          const nextEmptyRow = await window.findNextEmptyRow(token, result.spreadsheetId, sheetName, headerRowIndex + 1);
          
          // Verify the row is after headers and not the header row itself
          if (nextEmptyRow <= headerRowIndex) {
            throw new Error(`Invalid row calculation: next empty row (${nextEmptyRow}) must be after header row (${headerRowIndex + 1})`);
          }
          
          console.log(`Header row: ${headerRowIndex + 1}, Next empty row: ${nextEmptyRow}`);
          
          // Build the data array based on configured columns
          const rowData = [];
          const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']; // Support up to 10 columns
          
          // Find the highest column index needed
          const columnIndices = [];
          if (config.nameFormat === 'separate') {
            columnIndices.push(columns.indexOf(config.firstNameColumn));
            columnIndices.push(columns.indexOf(config.lastNameColumn));
          } else {
            columnIndices.push(columns.indexOf(config.fullNameColumn));
          }
          columnIndices.push(columns.indexOf(config.rsvpResponseColumn));
          
          const filteredIndices = columnIndices.filter(i => i >= 0);
          const maxColumnIndex = Math.max(...filteredIndices);
          
          // Use the next empty row for data insertion
          const range = `${sheetName}!A${nextEmptyRow}:${columns[maxColumnIndex]}${nextEmptyRow}`;
          
          console.log(`Inserting test data at range: ${range}`);
          
          // Build data row with proper column mapping
          for (let i = 0; i <= maxColumnIndex; i++) {
            const columnLetter = columns[i];
            let value = '';
            
            if (config.nameFormat === 'separate') {
              if (columnLetter === config.firstNameColumn) {
                value = firstName;
              } else if (columnLetter === config.lastNameColumn) {
                value = lastName;
              }
            } else {
              if (columnLetter === config.fullNameColumn) {
                value = testName;
              }
            }
            
            if (columnLetter === config.rsvpResponseColumn) {
              value = rsvpValue;
            }
            
            rowData.push(value);
          }
          
          console.log(`Test data to insert:`, rowData);
          
          const updateResult = await window.updateSheetData(token, result.spreadsheetId, range, [rowData]);
          console.log(`Update result:`, updateResult);
          
          document.getElementById('test-results').innerHTML = `
            <div class="setup-status success">
              ✅ Test successful! A test entry was added to your sheet.
              <br><strong>Test Data:</strong>
              <br>• Name: ${config.nameFormat === 'separate' ? `${firstName} ${lastName}` : testName}
              <br>• RSVP Status: ${rsvpValue}
              <br>• Row: ${nextEmptyRow} (after header row ${headerRowIndex + 1})
              <br>• Range: ${range}
              <br><small>You can delete this test entry from your sheet.</small>
            </div>
          `;
        } catch (error) {
          console.error('Test failed:', error);
          document.getElementById('test-results').innerHTML = `
            <div class="setup-status error">
              ❌ Test failed: ${error.message}
              <br><small>Check the console for more details.</small>
            </div>
          `;
        }
      });
    });
  } catch (error) {
    alert('Error testing RSVP entry: ' + error.message);
  }
}

// Finish setup
function finishSetup() {
  chrome.storage.sync.get(['rsvpConfig', 'spreadsheetId'], function(result) {
    if (result.rsvpConfig && result.spreadsheetId) {
      // Hide onboarding and show main interface
      document.getElementById('onboarding-steps').style.display = 'none';
      updateSetupStatus('success', '✅ Setup Complete: RSVP tracking is configured and ready to use!');
      
      // Make sure reset button is visible
      const resetBtn = document.getElementById('reset-setup');
      if (resetBtn) {
        resetBtn.style.display = 'inline-block';
      }
    } else {
      alert('Please complete the setup first.');
    }
  });
}

// Send a message to the content script to get WhatsApp messages
function fetchMessages() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    console.log('Current tab:', tabs[0]);
    
    if (!tabs[0]) {
      document.getElementById('messages').textContent = 'No active tab found.';
      return;
    }
    
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getMessages' }, function (response) {
      console.log('Popup received response:', response);
      const messagesDiv = document.getElementById('messages');
      
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        messagesDiv.textContent = 'Error: ' + chrome.runtime.lastError.message + '. Make sure you are on WhatsApp Web.';
        return;
      }
      
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
  let spreadsheetInput = document.getElementById('spreadsheet-id').value.trim();
  const sheetName = document.getElementById('sheet-name').value;

  // Extract spreadsheet ID from URL if a URL is provided
  const urlMatch = spreadsheetInput.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) {
    spreadsheetInput = urlMatch[1];
  }

  chrome.storage.sync.set({ spreadsheetId: spreadsheetInput, sheetName }, function() {
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

// AI API key save/load
document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.sync.get(['aiApiKey'], function(result) {
    if (result.aiApiKey) {
      document.getElementById('ai-api-key').value = result.aiApiKey;
    }
  });
});

document.getElementById('save-ai-key').addEventListener('click', function() {
  const aiApiKey = document.getElementById('ai-api-key').value;
  chrome.storage.sync.set({ aiApiKey }, function() {
    alert('AI API Key saved!');
  });
});

// Analyze WhatsApp messages with AI
import('./aiProvider.js');
document.getElementById('analyze-messages').addEventListener('click', function() {
  // Use the same message fetching logic as fetchMessages
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    console.log('Analyze - Current tab:', tabs[0]);
    
    if (!tabs[0]) {
      alert('No active tab found.');
      return;
    }
    
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getMessages' }, async function (response) {
      console.log('Analyze received response:', response);
      console.log('Invitation message:', response?.invitationMessage);
      console.log('Extracted names:', response?.extractedNames);
      console.log('Replies:', response?.replies);
      
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        alert('Error: ' + chrome.runtime.lastError.message + '. Make sure you are on WhatsApp Web.');
        return;
      }
      
      if (!response || !response.invitationMessage) {
        console.log('No wedding invitation message found');
        alert('No wedding invitation message found. Please make sure you have sent a message starting with "The Wedding of" in this chat.');
        return;
      }
      
      if (!response.extractedNames || response.extractedNames.length === 0) {
        console.log('No names extracted from invitation');
        alert('No guest names found in the wedding invitation. Please check if the invitation contains names after "Dearest" or "Dear".');
        return;
      }
      
      if (!response.replies || response.replies.length === 0) {
        console.log('No replies found');
        alert('No replies found after the wedding invitation. Please wait for guests to respond.');
        return;
      }
      
      // Log the actual data being processed
      console.log('Processing invitation:', response.invitationMessage);
      console.log('Processing names:', response.extractedNames);
      console.log('Processing replies:', response.replies);
      
      // Get AI API key
      chrome.storage.sync.get(['aiApiKey'], async function(result) {
        const apiKey = result.aiApiKey;
        if (!apiKey) {
          alert('Please save your AI API key first.');
          return;
        }
        
        try {
          console.log('Starting analysis with replies:', response.replies);
          
          // Step 1: Names are already extracted from the invitation message
          const extractedNames = response.extractedNames;
          console.log('Using extracted names:', extractedNames);
          
          // Step 2: Use AI only for RSVP analysis of the replies
          const aiPrompt = `You are an RSVP assistant for a wedding. The guests were given a prompt to reply to confirm their attendance to a wedding:

1. I'm coming!
2. Sorry, I can't come.

Previous responses to this have been just a number 1 or 2 (corresponding to the numbers in the options given above) or text like "i'm coming" or "i can't come I'm sorry". 

Analyze the following messages and provide analysis on whether this is a reply to the RSVP and, if so, whether this person likely RSVP'd yes or no. Provide a structured response in this format:
RSVP_STATUS: [YES/NO/UNSURE]
RESPONSE: [Brief summary of their response]
CONFIDENCE: [HIGH/MEDIUM/LOW]

Messages to analyze:
${response.replies.join('\n')}`;
          
          console.log('Sending RSVP analysis prompt to AI:', aiPrompt);
          
          // Call AI for RSVP analysis only
          const aiResult = await window.callAI(aiPrompt, apiKey);
          
          console.log('AI returned RSVP analysis:', aiResult);
          
          // Parse the AI result for RSVP status
          const rsvpAnalysis = parseRSVPAnalysis(aiResult);
          
          // Step 3: Show results for user confirmation
          showRSVPConfirmation(extractedNames, rsvpAnalysis, response.replies);
          
        } catch (error) {
          console.error('Analysis error:', error);
          const aiAnalysisDiv = document.getElementById('ai-analysis');
          aiAnalysisDiv.innerHTML = `<p style="color: red;">Error analyzing messages: ${error.message}</p>`;
        }
      });
    });
  });
});

// Parse AI response for RSVP analysis only
function parseRSVPAnalysis(aiResult) {
  const lines = aiResult.split('\n').map(line => line.trim()).filter(line => line);
  const result = {};
  
  lines.forEach(line => {
    if (line.startsWith('RSVP_STATUS:')) {
      result.status = line.split(':')[1].trim();
    } else if (line.startsWith('RESPONSE:')) {
      result.response = line.split(':')[1].trim();
    } else if (line.startsWith('CONFIDENCE:')) {
      result.confidence = line.split(':')[1].trim();
    }
  });
  
  return result;
}

// Show RSVP confirmation interface
function showRSVPConfirmation(names, rsvpAnalysis, originalMessages) {
  const aiAnalysisDiv = document.getElementById('ai-analysis');
  
  let displayHTML = `
    <h4>📋 Extracted Names:</h4>
    <p>${names.join(', ')}</p>
    
    <h4>🤖 AI RSVP Analysis:</h4>
    <div style="margin: 8px 0; padding: 8px; background: #f0f8ff; border-left: 4px solid #0066cc;">
      <strong>Status:</strong> ${rsvpAnalysis.status || 'UNSURE'}<br>
      <strong>Response:</strong> ${rsvpAnalysis.response || 'No clear response detected'}<br>
      <strong>Confidence:</strong> ${rsvpAnalysis.confidence || 'LOW'}
    </div>
    
    <h4>✏️ Confirm & Edit:</h4>
  `;
  
  // Create editable entries for each name
  names.forEach((name, index) => {
    displayHTML += `
      <div style="margin: 8px 0; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        <strong>Guest ${index + 1}:</strong><br>
        <input type="text" id="guest-name-${index}" value="${name}" style="width: 200px; padding: 4px; margin: 4px 0;">
        <button class="search-guest-btn" data-index="${index}" style="margin-left: 4px; padding: 4px 8px;">Search</button><br>
        <select id="guest-rsvp-${index}" style="margin: 4px 0; padding: 4px;">
          <option value="YES" ${rsvpAnalysis.status === 'YES' ? 'selected' : ''}>YES - Attending</option>
          <option value="NO" ${rsvpAnalysis.status === 'NO' ? 'selected' : ''}>NO - Not Attending</option>
          <option value="UNSURE" ${rsvpAnalysis.status === 'UNSURE' ? 'selected' : ''}>UNSURE - Needs Follow-up</option>
        </select>
        <button class="update-rsvp-btn" data-index="${index}" style="margin-left: 8px; padding: 4px 8px; background: #4caf50; color: white; border: none; border-radius: 3px;">Update RSVP</button>
      </div>
    `;
  });
  
  aiAnalysisDiv.innerHTML = displayHTML;
  
  // Add event listeners after the HTML is inserted
  addRSVPConfirmationEventListeners();
}

// Add event listeners for RSVP confirmation buttons
function addRSVPConfirmationEventListeners() {
  // Add event listeners for search buttons
  document.querySelectorAll('.search-guest-btn').forEach(button => {
    button.addEventListener('click', function() {
      const index = this.getAttribute('data-index');
      searchGuestName(index);
    });
  });
  
  // Add event listeners for update RSVP buttons
  document.querySelectorAll('.update-rsvp-btn').forEach(button => {
    button.addEventListener('click', function() {
      const index = this.getAttribute('data-index');
      updateGuestRSVP(index);
    });
  });
}

// Update guest RSVP in sheet
async function updateGuestRSVP(index) {
  try {
    const name = document.getElementById(`guest-name-${index}`).value.trim();
    const rsvpStatus = document.getElementById(`guest-rsvp-${index}`).value;
    
    if (!name) {
      alert('Please enter a name for this guest.');
      return;
    }
    
    // Use the existing updateSheet function
    await updateSheet(name, rsvpStatus);
    
    // Show success message
    const button = document.querySelector(`[data-index="${index}"].update-rsvp-btn`);
    if (button) {
      button.textContent = '✅ Updated!';
      button.style.background = '#4caf50';
      setTimeout(() => {
        button.textContent = 'Update RSVP';
        button.style.background = '#4caf50';
      }, 2000);
    }
    
  } catch (error) {
    console.error('Error updating guest RSVP:', error);
    alert('Error updating RSVP: ' + error.message);
  }
}

// Make the function available globally
window.updateGuestRSVP = updateGuestRSVP;

// Flag message for manual review
function flagForReview(name, response) {
  alert(`Flagged for review:\nName: ${name}\nResponse: ${response}\n\nPlease check this manually.`);
}

// Update Google Sheet with RSVP data
async function updateSheet(name, status) {
  try {
    chrome.storage.sync.get(['spreadsheetId', 'rsvpConfig'], async function(result) {
      if (!result.spreadsheetId) {
        alert('Please save a Spreadsheet ID first.');
        return;
      }
      
      if (!result.rsvpConfig) {
        alert('Please complete the RSVP setup first.');
        return;
      }
      
      window.authenticateWithGoogle(async function(token) {
        const config = result.rsvpConfig;
        
        // Use the configured sheet name instead of getting it from API
        const sheetName = config.sheetName || 'Sheet1';
        console.log('Using configured sheet name:', sheetName);
        
        // Parse name into first and last name if needed
        let firstName = '';
        let lastName = '';
        let fullName = '';
        
        if (config.nameFormat === 'separate') {
          const nameParts = name.trim().split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
          console.log(`Searching for separate names: First="${firstName}", Last="${lastName}"`);
        } else {
          fullName = name;
          console.log(`Searching for full name: "${fullName}"`);
        }
        
        // Map AI status to configured dropdown value
        let rsvpValue = '';
        if (status === 'YES' && config.rsvpMapping && config.rsvpMapping.yes) {
          rsvpValue = config.rsvpMapping.yes;
        } else if (status === 'NO' && config.rsvpMapping && config.rsvpMapping.no) {
          rsvpValue = config.rsvpMapping.no;
        } else if (status === 'UNSURE' && config.rsvpMapping && config.rsvpMapping.unsure) {
          rsvpValue = config.rsvpMapping.unsure;
        } else {
          // Fallback to original status if no mapping configured
          rsvpValue = status;
        }
        
        // Find the existing row(s) for this guest name
        const existingRows = await findGuestRows(token, result.spreadsheetId, sheetName, config, name, firstName, lastName, fullName);
        
        if (existingRows.length === 0) {
          alert(`Guest "${name}" not found in the sheet. Please check the spelling or add them manually.`);
          return;
        }
        
        console.log(`Found ${existingRows.length} row(s) for guest "${name}":`, existingRows);
        
        // Update RSVP response in each found row
        for (const rowNumber of existingRows) {
          const rsvpColumnLetter = config.rsvpResponseColumn;
          const range = `${sheetName}!${rsvpColumnLetter}${rowNumber}`;
          
          console.log(`Updating RSVP at range: ${range} with value: ${rsvpValue}`);
          
          try {
            const updateResult = await window.updateSheetData(token, result.spreadsheetId, range, [[rsvpValue]]);
            console.log(`Update result for row ${rowNumber}:`, updateResult);
          } catch (error) {
            console.error(`Error updating row ${rowNumber}:`, error);
            alert(`Error updating RSVP for row ${rowNumber}: ${error.message}`);
            return;
          }
        }
        
        alert(`✅ Updated RSVP for "${name}" to "${rsvpValue}" in ${existingRows.length} row(s)`);
        
      });
    });
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// Find existing rows for a guest name
async function findGuestRows(token, spreadsheetId, sheetName, config, fullName, firstName, lastName, fullNameParam) {
  try {
    console.log(`Searching for guest: "${fullName}"`);
    console.log(`Name format: ${config.nameFormat}`);
    console.log(`First name column: ${config.firstNameColumn}, Last name column: ${config.lastNameColumn}, Full name column: ${config.fullNameColumn}`);
    
    // Get all data from the sheet
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:Z`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to read sheet: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.values || data.values.length === 0) {
      console.log('No data found in sheet');
      return [];
    }
    
    const headerRowIndex = config.headerRowIndex || 0;
    const foundRows = [];
    
    console.log(`Searching rows ${headerRowIndex + 1} to ${data.values.length}`);
    
    // Search through all rows after the header
    for (let i = headerRowIndex + 1; i < data.values.length; i++) {
      const row = data.values[i];
      let rowName = '';
      let rowFirstName = '';
      let rowLastName = '';
      
      if (config.nameFormat === 'separate') {
        const firstNameCol = config.firstNameColumn ? config.firstNameColumn.charCodeAt(0) - 65 : 0;
        const lastNameCol = config.lastNameColumn ? config.lastNameColumn.charCodeAt(0) - 65 : 0;
        
        rowFirstName = row[firstNameCol] || '';
        rowLastName = row[lastNameCol] || '';
        rowName = `${rowFirstName} ${rowLastName}`.trim();
        
        console.log(`Row ${i + 1}: First="${rowFirstName}", Last="${rowLastName}", Combined="${rowName}"`);
        
        // Compare first and last names separately, or combined name
        const nameMatch = (rowFirstName.toLowerCase() === firstName.toLowerCase() && 
                          rowLastName.toLowerCase() === lastName.toLowerCase()) ||
                         (rowName.toLowerCase() === fullName.toLowerCase());
        
        if (nameMatch) {
          foundRows.push(i + 1); // Convert to 1-based row number
          console.log(`✅ Match found in row ${i + 1}`);
        }
      } else {
        const fullNameCol = config.fullNameColumn ? config.fullNameColumn.charCodeAt(0) - 65 : 0;
        rowName = row[fullNameCol] || '';
        
        console.log(`Row ${i + 1}: Full name="${rowName}"`);
        
        // Compare full names
        if (rowName.toLowerCase() === fullName.toLowerCase()) {
          foundRows.push(i + 1);
          console.log(`✅ Match found in row ${i + 1}`);
        }
      }
    }
    
    console.log(`Found rows for "${fullName}":`, foundRows);
    return foundRows;
    
  } catch (error) {
    console.error('Error finding guest rows:', error);
    return [];
  }
}

// Add event listener for RSVP response column selection
document.addEventListener('DOMContentLoaded', function() {
  const rsvpResponseSelect = document.getElementById('rsvp-response-column');
  if (rsvpResponseSelect) {
    rsvpResponseSelect.addEventListener('change', function() {
      if (this.value) {
        detectDropdownOptions(this.value);
      }
    });
  }
  
  // Add event listener for manual detect dropdowns button
  const detectDropdownsBtn = document.getElementById('detect-dropdowns');
  if (detectDropdownsBtn) {
    detectDropdownsBtn.addEventListener('click', function() {
      const rsvpColumn = document.getElementById('rsvp-response-column').value;
      if (rsvpColumn) {
        detectDropdownOptions(rsvpColumn);
      } else {
        alert('Please select an RSVP Response column first.');
      }
    });
  }
});

// Detect dropdown options from the selected RSVP response column
async function detectDropdownOptions(columnLetter) {
  try {
    chrome.storage.sync.get(['spreadsheetId', 'rsvpConfig'], async function(result) {
      if (!result.spreadsheetId) {
        console.error('No spreadsheet ID found');
        alert('Please save a Spreadsheet ID first.');
        return;
      }
      
      if (!result.rsvpConfig) {
        console.error('No RSVP config found');
        alert('Please complete the RSVP setup first.');
        return;
      }
      
      window.authenticateWithGoogle(async function(token) {
        try {
          // Use the configured sheet name
          const sheetName = result.rsvpConfig.sheetName || 'Sheet1';
          console.log(`Detecting dropdown options in sheet: "${sheetName}" column: ${columnLetter}`);
          
          const dropdownOptions = await window.getColumnDropdownOptions(token, result.spreadsheetId, sheetName, columnLetter);
          
          if (dropdownOptions.length > 0) {
            populateDropdownMapping(dropdownOptions);
            document.getElementById('rsvp-mapping-config').style.display = 'block';
          } else {
            // Show message when no options found
            const dropdownOptionsDiv = document.getElementById('dropdown-options');
            dropdownOptionsDiv.innerHTML = `
              <div class="setup-status warning">
                <strong>No dropdown options detected:</strong><br>
                No existing values found in column ${columnLetter} of sheet "${sheetName}".<br>
                You can manually configure the mapping below.
              </div>
            `;
            
            // Still show the mapping section with empty options
            populateDropdownMapping([]);
            document.getElementById('rsvp-mapping-config').style.display = 'block';
          }
        } catch (error) {
          console.error('Error detecting dropdown options:', error);
          alert('Error detecting dropdown options: ' + error.message);
        }
      });
    });
  } catch (error) {
    console.error('Error in detectDropdownOptions:', error);
    alert('Error: ' + error.message);
  }
}

// Populate the dropdown mapping interface
function populateDropdownMapping(options) {
  // Display detected options
  const dropdownOptionsDiv = document.getElementById('dropdown-options');
  if (options.length > 0) {
    dropdownOptionsDiv.innerHTML = `
      <div class="setup-status success">
        <strong>Detected Dropdown Options:</strong><br>
        ${options.map(option => `• ${option}`).join('<br>')}
      </div>
    `;
  }
  
  // Populate mapping selectors
  const mappingSelectors = ['yes-mapping', 'no-mapping', 'unsure-mapping'];
  
  mappingSelectors.forEach(selectorId => {
    const select = document.getElementById(selectorId);
    select.innerHTML = '<option value="">Select option...</option>';
    
    if (options.length > 0) {
      options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
      });
      
      // Auto-suggest mappings based on option names
      if (selectorId === 'yes-mapping') {
        const yesOption = options.find(opt => opt.toLowerCase().includes('yes') || opt.toLowerCase().includes('rsvp yes'));
        if (yesOption) select.value = yesOption;
      } else if (selectorId === 'no-mapping') {
        const noOption = options.find(opt => opt.toLowerCase().includes('no') || opt.toLowerCase().includes('rsvp no'));
        if (noOption) select.value = noOption;
      } else if (selectorId === 'unsure-mapping') {
        const unsureOption = options.find(opt => opt.toLowerCase().includes('needs') || opt.toLowerCase().includes('follow') || opt.toLowerCase().includes('fu'));
        if (unsureOption) select.value = unsureOption;
      }
    } else {
      // Add default options when no dropdown options are detected
      const defaultOptions = ['RSVP YES', 'RSVP NO', 'Needs FU', 'Invite Sent (WA)', 'Invite Sent (Text)', 'Invite Sent (Physical)'];
      defaultOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
      });
    }
  });
} 

// Check Google account permissions
async function checkGooglePermissions() {
  try {
    // Try to get a fresh token
    return new Promise((resolve) => {
      chrome.identity.getAuthToken({ interactive: true }, function(token) {
        if (chrome.runtime.lastError) {
          console.error('Google sign-in failed:', chrome.runtime.lastError);
          alert('Google sign-in failed: ' + chrome.runtime.lastError.message + '\n\nPlease try signing in again.');
          resolve(false);
          return;
        }
        
        if (!token) {
          alert('No Google token received. Please check your Google account permissions.');
          resolve(false);
          return;
        }
        
        console.log('Google token received successfully');
        resolve(true);
      });
    });
  } catch (error) {
    console.error('Error checking Google permissions:', error);
    return false;
  }
}

// Add event listener for reset setup button
document.addEventListener('DOMContentLoaded', function() {
  const resetSetupBtn = document.getElementById('reset-setup');
  if (resetSetupBtn) {
    resetSetupBtn.addEventListener('click', function() {
      resetSetup();
    });
  }
});

// Reset setup and return to onboarding
function resetSetup() {
  if (confirm('Are you sure you want to reset the setup? This will clear all your configuration and return you to the onboarding process.')) {
    // Clear stored configuration
    chrome.storage.sync.remove(['rsvpConfig', 'spreadsheetId'], function() {
      // Show onboarding again
      document.getElementById('onboarding-steps').style.display = 'block';
      showStep(1);
      updateSetupStatus('warning', 'Setup Required: Please configure your RSVP tracking system.');
      
      // Hide reset button
      const resetBtn = document.getElementById('reset-setup');
      if (resetBtn) {
        resetBtn.style.display = 'none';
      }
      
      // Clear any existing form data
      document.getElementById('setup-spreadsheet-id').value = '';
      document.getElementById('header-row-selector').innerHTML = '<option value="">Select header row...</option>';
      document.getElementById('rsvp-mapping-config').style.display = 'none';
      
      console.log('Setup reset successfully');
    });
  }
} 

// Add event listeners for Calendar and Docs functionality
document.addEventListener('DOMContentLoaded', function() {
  const testCalendarBtn = document.getElementById('test-calendar');
  const testDocsBtn = document.getElementById('test-docs');
  const createWeddingEventBtn = document.getElementById('create-wedding-event');
  const createPlanningDocBtn = document.getElementById('create-planning-doc');
  
  if (testCalendarBtn) {
    testCalendarBtn.addEventListener('click', testCalendarAccess);
  }
  
  if (testDocsBtn) {
    testDocsBtn.addEventListener('click', testDocsAccess);
  }
  
  if (createWeddingEventBtn) {
    createWeddingEventBtn.addEventListener('click', createWeddingEvent);
  }
  
  if (createPlanningDocBtn) {
    createPlanningDocBtn.addEventListener('click', createPlanningDocument);
  }
});

// Test Calendar access
async function testCalendarAccess() {
  try {
    window.authenticateWithGoogle(async function(token) {
      try {
        const calendars = await window.listCalendars(token);
        const primaryCalendar = await window.getPrimaryCalendar(token);
        
        document.getElementById('calendar-docs-results').innerHTML = `
          <div class="setup-status success">
            ✅ Calendar access confirmed!
            <br><strong>Primary Calendar:</strong> ${primaryCalendar.summary}
            <br><strong>Available Calendars:</strong> ${calendars.items.length}
            <br><small>You can now create calendar events.</small>
          </div>
        `;
      } catch (error) {
        document.getElementById('calendar-docs-results').innerHTML = `
          <div class="setup-status error">
            ❌ Calendar access failed: ${error.message}
          </div>
        `;
      }
    });
  } catch (error) {
    alert('Error testing calendar access: ' + error.message);
  }
}

// Test Docs access
async function testDocsAccess() {
  try {
    window.authenticateWithGoogle(async function(token) {
      try {
        const doc = await window.createDocument(token, 'Test Document');
        
        document.getElementById('calendar-docs-results').innerHTML = `
          <div class="setup-status success">
            ✅ Docs access confirmed!
            <br><strong>Test Document Created:</strong> ${doc.title}
            <br><strong>Document ID:</strong> ${doc.documentId}
            <br><small>You can now create and edit documents.</small>
          </div>
        `;
      } catch (error) {
        document.getElementById('calendar-docs-results').innerHTML = `
          <div class="setup-status error">
            ❌ Docs access failed: ${error.message}
          </div>
        `;
      }
    });
  } catch (error) {
    alert('Error testing docs access: ' + error.message);
  }
}

// Create a wedding event
async function createWeddingEvent() {
  try {
    window.authenticateWithGoogle(async function(token) {
      try {
        const eventDetails = {
          title: 'Wedding Ceremony',
          description: 'Our special day!',
          startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
          endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
          timeZone: 'UTC'
        };
        
        const event = await window.createWeddingEvent(token, 'primary', eventDetails);
        
        document.getElementById('calendar-docs-results').innerHTML = `
          <div class="setup-status success">
            ✅ Wedding event created!
            <br><strong>Event:</strong> ${event.summary}
            <br><strong>Start:</strong> ${event.start.dateTime}
            <br><strong>Event ID:</strong> ${event.id}
            <br><small>Check your Google Calendar to see the event.</small>
          </div>
        `;
      } catch (error) {
        document.getElementById('calendar-docs-results').innerHTML = `
          <div class="setup-status error">
            ❌ Failed to create wedding event: ${error.message}
          </div>
        `;
      }
    });
  } catch (error) {
    alert('Error creating wedding event: ' + error.message);
  }
}

// Create a planning document
async function createPlanningDocument() {
  try {
    window.authenticateWithGoogle(async function(token) {
      try {
        const doc = await window.createWeddingPlanningDoc(token, 'Wedding Planning Document');
        
        document.getElementById('calendar-docs-results').innerHTML = `
          <div class="setup-status success">
            ✅ Planning document created!
            <br><strong>Document:</strong> ${doc.title}
            <br><strong>Document ID:</strong> ${doc.documentId}
            <br><strong>URL:</strong> <a href="https://docs.google.com/document/d/${doc.documentId}" target="_blank">Open Document</a>
            <br><small>Check your Google Docs to see the document.</small>
          </div>
        `;
      } catch (error) {
        document.getElementById('calendar-docs-results').innerHTML = `
          <div class="setup-status error">
            ❌ Failed to create planning document: ${error.message}
          </div>
        `;
      }
    });
  } catch (error) {
    alert('Error creating planning document: ' + error.message);
  }
} 

// Search for guest names in the sheet and provide autocomplete
async function searchGuestName(index) {
  try {
    chrome.storage.sync.get(['spreadsheetId', 'rsvpConfig'], async function(result) {
      if (!result.spreadsheetId || !result.rsvpConfig) {
        alert('Please complete the RSVP setup first.');
        return;
      }
      
      const inputField = document.getElementById(`guest-name-${index}`);
      const searchTerm = inputField.value.trim();
      
      if (!searchTerm) {
        alert('Please enter a name to search for.');
        return;
      }
      
      window.authenticateWithGoogle(async function(token) {
        try {
          const config = result.rsvpConfig;
          const sheetName = config.sheetName || 'Sheet1';
          
          // Get all data from the sheet to search for names
          const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${result.spreadsheetId}/values/${encodeURIComponent(sheetName)}!A:Z`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to read sheet: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (!data.values || data.values.length === 0) {
            alert('No data found in the sheet to search.');
            return;
          }
          
          // Extract names based on the configured name format
          const names = [];
          const headerRowIndex = config.headerRowIndex || 0;
          
          for (let i = headerRowIndex + 1; i < data.values.length; i++) {
            const row = data.values[i];
            let name = '';
            
            if (config.nameFormat === 'separate') {
              const firstNameCol = config.firstNameColumn ? config.firstNameColumn.charCodeAt(0) - 65 : 0;
              const lastNameCol = config.lastNameColumn ? config.lastNameColumn.charCodeAt(0) - 65 : 0;
              
              const firstName = row[firstNameCol] || '';
              const lastName = row[lastNameCol] || '';
              name = `${firstName} ${lastName}`.trim();
            } else {
              const fullNameCol = config.fullNameColumn ? config.fullNameColumn.charCodeAt(0) - 65 : 0;
              name = row[fullNameCol] || '';
            }
            
            if (name && name.toLowerCase().includes(searchTerm.toLowerCase())) {
              names.push(name);
            }
          }
          
          if (names.length > 0) {
            // Show autocomplete suggestions
            const suggestions = names.slice(0, 5); // Limit to 5 suggestions
            const suggestionText = suggestions.map(name => `• ${name}`).join('\n');
            
            if (confirm(`Found ${names.length} matching names:\n\n${suggestionText}\n\nWould you like to use the first match: "${suggestions[0]}"?`)) {
              inputField.value = suggestions[0];
            }
          } else {
            alert(`No names found matching "${searchTerm}". You can manually enter the name.`);
          }
        } catch (error) {
          console.error('Error searching for names:', error);
          alert('Error searching for names: ' + error.message);
        }
      });
    });
  } catch (error) {
    console.error('Error in searchGuestName:', error);
    alert('Error: ' + error.message);
  }
}

// Make the search function available globally
window.searchGuestName = searchGuestName; 