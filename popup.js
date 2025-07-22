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
    chrome.storage.sync.get(['spreadsheetId', 'sheetName'], async function(result) {
      if (!result.spreadsheetId) {
        alert('Please save a Spreadsheet ID first.');
        return;
      }
      
      window.authenticateWithGoogle(async function(token) {
        const sheetName = result.sheetName || 'Sheet1';
        const values = [[name, status, new Date().toISOString()]];
        
        try {
          await window.updateSheetData(token, result.spreadsheetId, `${sheetName}!A:C`, values);
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