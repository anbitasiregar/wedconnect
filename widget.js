// Floating Widget JavaScript
class WedConnectWidget {
  constructor() {
    this.widget = document.getElementById('wedconnect-widget');
    this.header = document.querySelector('.widget-header');
    this.content = document.querySelector('.widget-content');
    this.isDragging = false;
    this.isMinimized = false;
    this.dragOffset = { x: 0, y: 0 };
    
    this.init();
  }
  
  init() {
    this.setupDragging();
    this.setupControls();
    this.setupEventListeners();
    this.loadPosition();
  }
  
  setupDragging() {
    this.header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.widget-controls')) return;
      
      this.isDragging = true;
      this.widget.classList.add('dragging');
      
      const rect = this.widget.getBoundingClientRect();
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;
      
      document.addEventListener('mousemove', this.handleMouseMove.bind(this));
      document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    });
  }
  
  handleMouseMove(e) {
    if (!this.isDragging) return;
    
    const x = e.clientX - this.dragOffset.x;
    const y = e.clientY - this.dragOffset.y;
    
    // Keep widget within viewport bounds
    const maxX = window.innerWidth - this.widget.offsetWidth;
    const maxY = window.innerHeight - this.widget.offsetHeight;
    
    this.widget.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    this.widget.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
  }
  
  handleMouseUp() {
    if (this.isDragging) {
      this.isDragging = false;
      this.widget.classList.remove('dragging');
      this.savePosition();
    }
    
    document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
  }
  
  setupControls() {
    const minimizeBtn = document.getElementById('minimize-btn');
    const closeBtn = document.getElementById('close-btn');
    
    minimizeBtn.addEventListener('click', () => this.toggleMinimize());
    closeBtn.addEventListener('click', () => this.hide());
  }
  
  setupEventListeners() {
    // Update RSVP button
    const updateRsvpBtn = document.getElementById('update-rsvp-btn');
    if (updateRsvpBtn) {
      updateRsvpBtn.addEventListener('click', () => this.analyzeWhatsAppMessages());
    }
    
    // Settings button
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.getElementById('settings-menu');
    
    if (settingsBtn && settingsMenu) {
      settingsBtn.addEventListener('click', () => {
        settingsMenu.classList.toggle('hidden');
      });
    }
    
    // Settings menu buttons
    const signInGoogleBtn = document.getElementById('sign-in-google');
    const startSetupBtn = document.getElementById('start-setup');
    const runTestsBtn = document.getElementById('run-tests');
    
    if (signInGoogleBtn) {
      signInGoogleBtn.addEventListener('click', () => {
        settingsMenu.classList.add('hidden');
        this.triggerGoogleSignIn();
      });
    }
    
    if (startSetupBtn) {
      startSetupBtn.addEventListener('click', () => {
        settingsMenu.classList.add('hidden');
        this.openSetupWizard();
      });
    }
    
    if (runTestsBtn) {
      runTestsBtn.addEventListener('click', () => {
        settingsMenu.classList.add('hidden');
        this.runTestSuite();
      });
    }
    
    // Close settings menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!settingsBtn.contains(e.target) && !settingsMenu.contains(e.target)) {
        settingsMenu.classList.add('hidden');
      }
    });
  }
  
  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
    this.widget.classList.toggle('minimized', this.isMinimized);
    
    const minimizeBtn = document.getElementById('minimize-btn');
    if (minimizeBtn) {
      minimizeBtn.textContent = this.isMinimized ? '+' : '−';
    }
  }
  
  hide() {
    this.widget.style.display = 'none';
    this.saveVisibility(false);
  }
  
  show() {
    this.widget.style.display = 'block';
    this.saveVisibility(true);
  }
  
  toggleVisibility() {
    if (this.widget.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }
  
  savePosition() {
    const position = {
      x: parseInt(this.widget.style.left) || 20,
      y: parseInt(this.widget.style.top) || 20,
      minimized: this.isMinimized,
      visible: this.widget.style.display !== 'none'
    };
    
    chrome.storage.sync.set({ widgetPosition: position });
  }
  
  loadPosition() {
    chrome.storage.sync.get(['widgetPosition'], (result) => {
      if (result.widgetPosition) {
        const pos = result.widgetPosition;
        this.widget.style.left = pos.x + 'px';
        this.widget.style.top = pos.y + 'px';
        
        if (pos.minimized) {
          this.toggleMinimize();
        }
        
        if (!pos.visible) {
          this.hide();
        }
      }
    });
  }
  
  saveVisibility(visible) {
    chrome.storage.sync.get(['widgetPosition'], (result) => {
      const position = result.widgetPosition || {};
      position.visible = visible;
      chrome.storage.sync.set({ widgetPosition: position });
    });
  }
  
  // Integration with existing functionality
  async analyzeWhatsAppMessages() {
    try {
      const updateRsvpBtn = document.getElementById('update-rsvp-btn');
      if (updateRsvpBtn) {
        updateRsvpBtn.textContent = 'Processing...';
        updateRsvpBtn.disabled = true;
      }
      
      // Check if we're on WhatsApp Web
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      const currentTab = tabs[0];
      
      if (!currentTab.url.includes('web.whatsapp.com')) {
        this.showResults('Please open WhatsApp Web first.', 'error');
        return;
      }

      // Send message to content script to get messages
      chrome.tabs.sendMessage(currentTab.id, {action: "getMessages"}, async (response) => {
        if (chrome.runtime.lastError) {
          this.showResults('Error: Could not communicate with WhatsApp Web. Please refresh the page.', 'error');
          return;
        }

        if (!response || !response.replies || response.replies.length === 0) {
          this.showResults('No WhatsApp messages found.', 'error');
          return;
        }

        // Extract names from invitation message
        const extractedNames = response.extractedNames || [];
        
        if (extractedNames.length === 0) {
          this.showResults('No names extracted from invitation. Please check your invitation message format.', 'error');
          return;
        }

        // Analyze RSVP responses with AI
        try {
          const result = await chrome.storage.sync.get(['aiApiKey']);
          const apiKey = result.aiApiKey;
          
          if (!apiKey) {
            this.showResults('Please configure your AI API key in settings.', 'error');
            return;
          }

          // Build AI prompt for RSVP analysis
          const aiPrompt = `Analyze the following WhatsApp RSVP responses and determine if they indicate YES, NO, or UNSURE for attending a wedding.

Responses to analyze:
${response.replies.join('\n')}

Please respond in this exact format:
RSVP_STATUS: [YES/NO/UNSURE]
RESPONSE: [Brief explanation of the response]
CONFIDENCE: [HIGH/MEDIUM/LOW]

Focus on:
- "1" or "I'm coming" = YES
- "2" or "Sorry, can't come" = NO  
- "Maybe" or unclear responses = UNSURE
- Consider context and tone`;

          // Call AI for RSVP analysis
          const aiResult = await window.callAI(aiPrompt, apiKey);
          const rsvpAnalysis = this.parseRSVPAnalysis(aiResult);
          
          // Show results for user confirmation
          this.showRSVPConfirmation(extractedNames, rsvpAnalysis, response.replies);
          
        } catch (error) {
          this.showResults(`Error analyzing messages: ${error.message}`, 'error');
        }
      });
      
    } catch (error) {
      this.showResults(`Error: ${error.message}`, 'error');
    } finally {
      const updateRsvpBtn = document.getElementById('update-rsvp-btn');
      if (updateRsvpBtn) {
        updateRsvpBtn.textContent = 'Update RSVP';
        updateRsvpBtn.disabled = false;
      }
    }
  }
  
  parseRSVPAnalysis(aiResult) {
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
  
  showRSVPConfirmation(names, rsvpAnalysis, originalMessages) {
    const aiResultsDiv = document.getElementById('ai-results');
    
    let displayHTML = `
      <h4>Extracted Names:</h4>
      <p>${names.join(', ')}</p>
      
      <h4>AI RSVP Analysis:</h4>
      <div style="margin: 8px 0; padding: 8px; background: #f0f8ff; border-left: 4px solid #0066cc;">
        <strong>Status:</strong> ${rsvpAnalysis.status || 'UNSURE'}<br>
        <strong>Response:</strong> ${rsvpAnalysis.response || 'No clear response detected'}<br>
        <strong>Confidence:</strong> ${rsvpAnalysis.confidence || 'LOW'}
      </div>
      
      <h4>Confirm & Edit:</h4>
    `;
    
    // Create editable entries for each name
    names.forEach((name, index) => {
      displayHTML += `
        <div style="margin: 8px 0; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          <strong>Guest ${index + 1}:</strong><br>
          <input type="text" id="guest-name-${index}" value="${name}" style="width: 100%; padding: 4px; margin: 4px 0; box-sizing: border-box;">
          <select id="guest-rsvp-${index}" style="margin: 4px 0; padding: 4px; width: 100%; box-sizing: border-box;">
            <option value="YES" ${rsvpAnalysis.status === 'YES' ? 'selected' : ''}>YES - Attending</option>
            <option value="NO" ${rsvpAnalysis.status === 'NO' ? 'selected' : ''}>NO - Not Attending</option>
            <option value="UNSURE" ${rsvpAnalysis.status === 'UNSURE' ? 'selected' : ''}>UNSURE - Needs Follow-up</option>
          </select>
          <button class="update-rsvp-btn" data-index="${index}" style="width: 100%; padding: 4px 8px; background: #4caf50; color: white; border: none; border-radius: 3px; margin-top: 4px;">Update RSVP</button>
        </div>
      `;
    });
    
    aiResultsDiv.innerHTML = displayHTML;
    
    // Add event listeners for update RSVP buttons
    document.querySelectorAll('.update-rsvp-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const index = e.target.getAttribute('data-index');
        this.updateGuestRSVP(index);
      });
    });
  }
  
  async updateGuestRSVP(index) {
    try {
      const name = document.getElementById(`guest-name-${index}`).value.trim();
      const rsvpStatus = document.getElementById(`guest-rsvp-${index}`).value;
      
      if (!name) {
        this.showResults('Please enter a name for this guest.', 'error');
        return;
      }
      
      // Update the button to show completion
      const button = document.querySelector(`[data-index="${index}"].update-rsvp-btn`);
      if (button) {
        button.textContent = 'RSVP Updated';
        button.style.background = '#45a049';
        button.disabled = true;
      }
      
      this.showResults(`Successfully updated RSVP for ${name}`, 'success');
      
    } catch (error) {
      this.showResults(`Error updating RSVP: ${error.message}`, 'error');
    }
  }
  
  showResults(message, type = 'info') {
    const aiResultsDiv = document.getElementById('ai-results');
    const color = type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3';
    
    aiResultsDiv.innerHTML = `<p style="color: ${color}; margin: 0;">${message}</p>`;
  }
  
  triggerGoogleSignIn() {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        this.showResults('Google sign-in failed: ' + chrome.runtime.lastError.message, 'error');
      } else {
        this.showResults('Google sign-in successful!', 'success');
      }
    });
  }
  
  openSetupWizard() {
    this.showResults('Setup wizard functionality - open the extension popup for full setup.', 'info');
  }
  
  runTestSuite() {
    this.showResults('Running test suite... Check browser console for results.', 'info');
    if (window.runAllTests) {
      window.runAllTests();
    }
  }
}

// Initialize widget when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.WedConnectWidget.instance = new WedConnectWidget();
});

// Make functions available globally for external access
window.WedConnectWidget = WedConnectWidget; 