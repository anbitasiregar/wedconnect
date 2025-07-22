// Onboarding Wizard Logic
let currentStep = 1;
let sheetData = null;
let rsvpConfig = {};

// Check if setup is complete on page load
document.addEventListener('DOMContentLoaded', function() {
  chrome.storage.sync.get(['rsvpConfig', 'spreadsheetId'], function(result) {
    if (result.rsvpConfig && result.spreadsheetId) {
      // Setup is complete, hide onboarding
      document.querySelector('.section:first-child').style.display = 'none';
      document.getElementById('onboarding-steps').style.display = 'none';
      updateSetupStatus('success', '✅ Setup Complete: RSVP tracking is configured and ready to use!');
    } else {
      // Setup required, show onboarding
      showStep(1);
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
        // Get all sheet names and metadata
        const sheetNames = await window.getAllSheetNames(token, spreadsheetId);
        
        // Get sheet metadata to check for hidden columns
        const metadata = await window.getSheetMetadata(token, spreadsheetId);
        const firstSheet = sheetNames[0];
        const sheetMetadata = metadata.sheets.find(sheet => sheet.properties.title === firstSheet);
        
        // Get data from the first sheet - fetch more rows to analyze structure
        const sheetData = await window.getSheetData(token, spreadsheetId, firstSheet);
        
        if (!sheetData.values || sheetData.values.length === 0) {
          updateSetupStatus('error', 'No data found in the sheet. Please add some data first.');
          return;
        }
        
        // Filter out hidden columns
        const visibleColumns = [];
        if (sheetMetadata && sheetMetadata.properties.gridProperties) {
          const columnCount = sheetMetadata.properties.gridProperties.columnCount;
          for (let i = 0; i < columnCount; i++) {
            const columnMetadata = sheetMetadata.properties.columnMetadata && 
                                 sheetMetadata.properties.columnMetadata[i];
            if (!columnMetadata || !columnMetadata.hiddenByUser) {
              visibleColumns.push(i);
            }
          }
        } else {
          // If no metadata available, assume all columns are visible
          visibleColumns.push(...Array.from({length: sheetData.values[0].length}, (_, i) => i));
        }
        
        // Filter sheet data to only include visible columns
        const filteredData = sheetData.values.map(row => 
          visibleColumns.map(colIndex => row[colIndex] || '')
        );
        
        // Store filtered sheet data globally for re-analysis
        window.currentSheetData = filteredData;
        window.visibleColumns = visibleColumns;
        
        // Analyze the structure with multiple rows
        const analysis = analyzeMultiRowStructure(filteredData);
        
        // Display analysis results
        document.getElementById('sheet-analysis').innerHTML = `
          <h5>Sheet Analysis Results:</h5>
          <p><strong>Sheet Name:</strong> ${firstSheet}</p>
          <p><strong>Rows Found:</strong> ${filteredData.length}</p>
          <p><strong>Visible Columns:</strong> ${visibleColumns.length} of ${sheetData.values[0].length}</p>
          <div class="setup-status ${analysis.suggestions.length > 0 ? 'success' : 'warning'}">
            <strong>Initial Analysis:</strong><br>
            ${analysis.suggestions.join('<br>')}
          </div>
        `;
        
        // Populate header row selector
        populateHeaderRowSelector(filteredData);
        
        // Use the best suggested header row for initial column population
        const bestHeaderRow = analysis.potentialHeaderRows.length > 0 ? analysis.potentialHeaderRows[0].rowIndex : 0;
        const bestHeaders = filteredData[bestHeaderRow];
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
    hasDateColumn: false,
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
    
    if (lowerHeader.includes('rsvp') || lowerHeader.includes('response') || lowerHeader.includes('message') || lowerHeader.includes('note')) {
      analysis.hasRSVPResponseColumn = true;
      suggestions.push(`✅ Found RSVP response column: "${header}"`);
    }
    
    if (lowerHeader.includes('date') || lowerHeader.includes('time')) {
      analysis.hasDateColumn = true;
      suggestions.push(`✅ Found date column: "${header}"`);
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
  const selectors = ['first-name-column', 'last-name-column', 'full-name-column', 'rsvp-response-column', 'date-column'];
  
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
    
    // Auto-select based on analysis
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
      const rsvpIndex = headers.findIndex(h => h.toLowerCase().includes('rsvp') || h.toLowerCase().includes('response') || h.toLowerCase().includes('message'));
      if (rsvpIndex >= 0) select.selectedIndex = rsvpIndex + 1;
    }
    
    if (selectorId === 'date-column' && analysis.hasDateColumn) {
      const dateIndex = headers.findIndex(h => h.toLowerCase().includes('date') || h.toLowerCase().includes('time'));
      if (dateIndex >= 0) select.selectedIndex = dateIndex + 1;
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
    dateColumn: document.getElementById('date-column').value
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
          // Test with sample data
          const testData = [
            ['Test Guest', 'YES', 'I\'m coming!', new Date().toISOString()]
          ];
          
          const range = `Sheet1!${result.rsvpConfig.nameColumn}1:${result.rsvpConfig.dateColumn}1`;
          await window.updateSheetData(token, result.spreadsheetId, range, testData);
          
          document.getElementById('test-results').innerHTML = `
            <div class="setup-status success">
              ✅ Test successful! A test entry was added to your sheet.
              <br><small>You can delete this test entry from your sheet.</small>
            </div>
          `;
        } catch (error) {
          document.getElementById('test-results').innerHTML = `
            <div class="setup-status error">
              ❌ Test failed: ${error.message}
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
      document.querySelector('.section:first-child').style.display = 'none';
      document.getElementById('onboarding-steps').style.display = 'none';
      updateSetupStatus('success', '✅ Setup Complete: RSVP tracking is configured and ready to use!');
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
      
      if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
        alert('Error: ' + chrome.runtime.lastError.message + '. Make sure you are on WhatsApp Web.');
        return;
      }
      
      if (!response || !response.messages || response.messages.length === 0) {
        alert('No WhatsApp messages found.');
        return;
      }
      
      // Get AI API key
      chrome.storage.sync.get(['aiApiKey'], async function(result) {
        const apiKey = result.aiApiKey;
        if (!apiKey) {
          alert('Please save your AI API key first.');
          return;
        }
        
        try {
          console.log('Starting AI analysis with messages:', response.messages);
          
          // Build prompt for RSVP detection with better structure
          const prompt = `You are an RSVP assistant for a wedding. Analyze the following WhatsApp messages and determine if they are RSVP responses.

For each message, provide a structured response in this format:
RSVP_STATUS: [YES/NO/UNSURE]
NAME: [Extracted name or "Unknown"]
RESPONSE: [Brief summary of their response]
CONFIDENCE: [HIGH/MEDIUM/LOW]

If multiple messages, analyze each separately and separate with "---".

Messages to analyze:
${response.messages.join('\n')}`;
          
          console.log('Sending prompt to AI:', prompt);
          
          // Call AI
          const aiResult = await window.callAI(prompt, apiKey);
          
          console.log('AI returned result:', aiResult);
          
          // Parse the AI result and suggest actions
          const parsedResult = parseAIResponse(aiResult);
          
          // Show result in dedicated AI analysis section
          const aiAnalysisDiv = document.getElementById('ai-analysis');
          if (aiResult && aiResult.trim()) {
            let displayHTML = `<h4>AI Analysis:</h4><pre>${aiResult}</pre>`;
            
            if (parsedResult.length > 0) {
              displayHTML += `<h4>Suggested Actions:</h4>`;
              parsedResult.forEach((result, index) => {
                if (result.status === 'YES') {
                  displayHTML += `<div style="margin: 8px 0; padding: 8px; background: #e8f5e8; border-left: 4px solid #4caf50;">
                    <strong>✅ RSVP YES</strong><br>
                    Name: ${result.name}<br>
                    Response: ${result.response}<br>
                    <button class="action-btn" data-action="update-sheet" data-name="${result.name}" data-status="YES" style="margin-top: 4px;">Add to Sheet as Attending</button>
                  </div>`;
                } else if (result.status === 'NO') {
                  displayHTML += `<div style="margin: 8px 0; padding: 8px; background: #ffeaea; border-left: 4px solid #f44336;">
                    <strong>❌ RSVP NO</strong><br>
                    Name: ${result.name}<br>
                    Response: ${result.response}<br>
                    <button class="action-btn" data-action="update-sheet" data-name="${result.name}" data-status="NO" style="margin-top: 4px;">Add to Sheet as Not Attending</button>
                  </div>`;
                } else {
                  displayHTML += `<div style="margin: 8px 0; padding: 8px; background: #fff3cd; border-left: 4px solid #ffc107;">
                    <strong>❓ UNSURE</strong><br>
                    Name: ${result.name}<br>
                    Response: ${result.response}<br>
                    <button class="action-btn" data-action="flag-review" data-name="${result.name}" data-response="${result.response}" style="margin-top: 4px;">Flag for Manual Review</button>
                  </div>`;
                }
              });
            }
            
            aiAnalysisDiv.innerHTML = displayHTML;
            
            // Add event listeners to the buttons
            aiAnalysisDiv.addEventListener('click', function(e) {
              if (e.target.classList.contains('action-btn')) {
                const action = e.target.dataset.action;
                const name = e.target.dataset.name;
                const status = e.target.dataset.status;
                const response = e.target.dataset.response;
                
                if (action === 'update-sheet') {
                  updateSheet(name, status);
                } else if (action === 'flag-review') {
                  flagForReview(name, response);
                }
              }
            });
            
            console.log('Displayed AI result in popup');
          } else {
            aiAnalysisDiv.innerHTML = '<p>No analysis result received from AI.</p>';
            console.log('No AI result to display');
          }
        } catch (error) {
          console.error('AI analysis error:', error);
          const aiAnalysisDiv = document.getElementById('ai-analysis');
          aiAnalysisDiv.innerHTML = `<p style="color: red;">Error analyzing messages: ${error.message}</p>`;
        }
      });
    });
  });
}); 

// Parse AI response into structured data
function parseAIResponse(aiResult) {
  const results = [];
  const sections = aiResult.split('---').map(s => s.trim()).filter(s => s);
  
  sections.forEach(section => {
    const lines = section.split('\n').map(line => line.trim()).filter(line => line);
    const result = {};
    
    lines.forEach(line => {
      if (line.startsWith('RSVP_STATUS:')) {
        result.status = line.split(':')[1].trim();
      } else if (line.startsWith('NAME:')) {
        result.name = line.split(':')[1].trim();
      } else if (line.startsWith('RESPONSE:')) {
        result.response = line.split(':')[1].trim();
      } else if (line.startsWith('CONFIDENCE:')) {
        result.confidence = line.split(':')[1].trim();
      }
    });
    
    if (result.status) {
      results.push(result);
    }
  });
  
  return results;
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
        const sheetName = 'Sheet1'; // Default sheet name
        
        // Parse name into first and last name if needed
        let firstName = '';
        let lastName = '';
        let fullName = '';
        
        if (config.nameFormat === 'separate') {
          const nameParts = name.trim().split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        } else {
          fullName = name;
        }
        
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
        columnIndices.push(columns.indexOf(config.dateColumn));
        
        const filteredIndices = columnIndices.filter(i => i >= 0);
        const maxColumnIndex = Math.max(...filteredIndices);
        
        // Use the configured header row + 1 for data insertion (next row after headers)
        const dataRowIndex = (config.headerRowIndex || 0) + 1;
        const range = `${sheetName}!A${dataRowIndex}:${columns[maxColumnIndex]}${dataRowIndex}`;
        
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
              value = fullName;
            }
          }
          
          if (columnLetter === config.rsvpResponseColumn) {
            value = status;
          } else if (columnLetter === config.dateColumn) {
            value = new Date().toISOString();
          }
          
          rowData.push(value);
        }
        
        try {
          await window.updateSheetData(token, result.spreadsheetId, range, [rowData]);
          alert(`Added ${name} as ${status === 'YES' ? 'attending' : 'not attending'}`);
        } catch (error) {
          alert('Error updating sheet: ' + error.message);
        }
      });
    });
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

// Flag message for manual review
function flagForReview(name, response) {
  alert(`Flagged for review:\nName: ${name}\nResponse: ${response}\n\nPlease check this manually.`);
}

// Make functions available globally for onclick handlers
window.updateSheet = updateSheet;
window.flagForReview = flagForReview; 