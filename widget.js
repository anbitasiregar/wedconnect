// Floating Widget JavaScript
if (typeof WedConnectWidget === 'undefined') {
  class WedConnectWidget {
  constructor() {
    console.log('WedConnectWidget constructor called');
    this.widget = document.getElementById('wedconnect-widget');
    this.header = document.querySelector('.widget-header');
    this.content = document.querySelector('.widget-content');
    this.isDragging = false;
    this.isMinimized = false;
    this.dragOffset = { x: 0, y: 0 };
    this.chatHistory = [];
    
    console.log('Widget elements found:', {
      widget: !!this.widget,
      header: !!this.header,
      content: !!this.content
    });
    
    this.init();
    this.loadVisibility();
    
    // Ensure widget starts expanded by default
    if (this.widget) {
      this.widget.classList.remove('minimized');
    }
  }
  
  init() {
    this.setupDragging();
    this.setupControls();
    this.setupEventListeners();
    this.loadPosition();
    
    // Setup chatbot after a short delay to ensure DOM is ready
    setTimeout(() => {
      this.setupChatbot();
      
      // Ensure chat toggle button is visible and working
      const toggleChatBtn = document.getElementById('toggle-chat');
      if (toggleChatBtn) {
        toggleChatBtn.style.display = 'block';
        toggleChatBtn.style.visibility = 'visible';
        console.log('Chat toggle button made visible');
      } else {
        console.log('Chat toggle button not found during init');
      }
    }, 100);
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
    const resetChatbotBtn = document.getElementById('reset-chatbot');
    const runTestsBtn = document.getElementById('run-tests');
    
    if (signInGoogleBtn) {
      signInGoogleBtn.addEventListener('click', () => {
        settingsMenu.classList.add('hidden');
        this.triggerGoogleSignIn();
      });
    }
    
    if (resetChatbotBtn) {
      resetChatbotBtn.addEventListener('click', () => {
        settingsMenu.classList.add('hidden');
        this.startChatbotOnboarding();
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
  
  setupChatbot() {
    console.log('Setting up chatbot...');
    
    // Function to setup chatbot elements
    const setupChatbotElements = () => {
      const toggleChatBtn = document.getElementById('toggle-chat');
      const chatContainer = document.getElementById('chat-container');
      const chatInput = document.getElementById('chat-input');
      const sendBtn = document.getElementById('send-message');
      
      console.log('Chatbot elements found:', {
        toggleChatBtn: !!toggleChatBtn,
        chatContainer: !!chatContainer,
        chatInput: !!chatInput,
        sendBtn: !!sendBtn
      });
      
      if (toggleChatBtn && chatContainer) {
        console.log('Adding click listener to toggle chat button');
        toggleChatBtn.addEventListener('click', () => {
          console.log('Toggle chat button clicked');
          chatContainer.classList.toggle('hidden');
          if (!chatContainer.classList.contains('hidden')) {
            if (chatInput) chatInput.focus();
          }
        });
      } else {
        console.error('Chatbot elements not found:', {
          toggleChatBtn: toggleChatBtn,
          chatContainer: chatContainer
        });
      }
      
      if (sendBtn && chatInput) {
        console.log('Adding event listeners to chat input and send button');
        sendBtn.addEventListener('click', () => this.sendMessage());
        
        chatInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            this.sendMessage();
          }
        });
      } else {
        console.error('Send button or chat input not found');
      }
    };
    
    // Try immediately
    setupChatbotElements();
    
    // If elements not found, try again after a delay
    if (!document.getElementById('toggle-chat')) {
      console.log('Chatbot elements not found immediately, retrying...');
      setTimeout(setupChatbotElements, 200);
      
      // Try again with longer delay
      setTimeout(setupChatbotElements, 500);
      
      // Final attempt
      setTimeout(setupChatbotElements, 1000);
    }
  }
  
  async sendMessage() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    this.addMessage(message, 'user');
    chatInput.value = '';
    
    // Show typing indicator
    this.showTypingIndicator();
    
    try {
      // Process the message with AI
      const response = await this.processUserMessage(message);
      this.hideTypingIndicator();
      this.addMessage(response, 'bot');
    } catch (error) {
      this.hideTypingIndicator();
      this.addMessage('Sorry, I encountered an error. Please try again.', 'bot');
      console.error('Chatbot error:', error);
    }
  }
  
  addMessage(content, sender) {
    const chatMessages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = content;
    
    messageDiv.appendChild(messageContent);
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Store in history
    this.chatHistory.push({ content, sender, timestamp: Date.now() });
  }
  
  showTypingIndicator() {
    const chatMessages = document.getElementById('chat-messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing';
    typingDiv.id = 'typing-indicator';
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.textContent = 'Thinking';
    
    typingDiv.appendChild(messageContent);
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }
  
  async processUserMessage(message) {
    // Get AI API key
    const result = await chrome.storage.sync.get(['aiApiKey']);
    const apiKey = result.aiApiKey;
    
    if (!apiKey) {
      return 'Please configure your AI API key in settings to use the chatbot.';
    }
    
    // Build AI prompt for task understanding
    const aiPrompt = `You are a wedding planning assistant. Analyze the user's request and respond with a JSON object in this exact format:

{
  "task": "TASK_TYPE",
  "action": "ACTION_DESCRIPTION",
  "response": "USER_FRIENDLY_RESPONSE",
  "requires_whatsapp": true/false,
  "requires_google": true/false
}

Available task types:
- UPLOAD_ATTACHMENT: Upload WhatsApp attachment to Google Drive
- CREATE_EVENT: Create calendar event
- UPDATE_RSVP: Update RSVP response
- CREATE_DOCUMENT: Create planning document
- SEARCH_FILES: Search and organize files
- GENERAL_HELP: General assistance

User request: "${message}"

Respond only with the JSON object, no additional text.`;

    try {
      // Call AI for task analysis
      const aiResult = await window.callAI(aiPrompt, apiKey);
      const taskAnalysis = this.parseTaskAnalysis(aiResult);
      
      // Execute the task
      return await this.executeTask(taskAnalysis, message);
    } catch (error) {
      console.error('AI processing error:', error);
      return 'I had trouble understanding your request. Could you please rephrase it?';
    }
  }
  
  parseTaskAnalysis(aiResult) {
    try {
      // Try to extract JSON from AI response
      const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // Fallback parsing
      const task = aiResult.toLowerCase().includes('upload') ? 'UPLOAD_ATTACHMENT' :
                   aiResult.toLowerCase().includes('calendar') ? 'CREATE_EVENT' :
                   aiResult.toLowerCase().includes('rsvp') ? 'UPDATE_RSVP' :
                   aiResult.toLowerCase().includes('document') ? 'CREATE_DOCUMENT' :
                   aiResult.toLowerCase().includes('search') ? 'SEARCH_FILES' : 'GENERAL_HELP';
      
      return {
        task: task,
        action: 'Process user request',
        response: aiResult,
        requires_whatsapp: task === 'UPLOAD_ATTACHMENT',
        requires_google: ['UPLOAD_ATTACHMENT', 'CREATE_EVENT', 'CREATE_DOCUMENT', 'SEARCH_FILES'].includes(task)
      };
    } catch (error) {
      console.error('Task analysis parsing error:', error);
      return {
        task: 'GENERAL_HELP',
        action: 'Process user request',
        response: aiResult,
        requires_whatsapp: false,
        requires_google: false
      };
    }
  }
  
  async executeTask(taskAnalysis, originalMessage) {
    const { task, action, response, requires_whatsapp, requires_google } = taskAnalysis;
    
    // Check requirements
    if (requires_whatsapp && !window.location.href.includes('web.whatsapp.com')) {
      return 'This task requires WhatsApp Web. Please open WhatsApp Web first.';
    }
    
    if (requires_google) {
      try {
        await chrome.identity.getAuthToken({ interactive: false });
      } catch (error) {
        return 'This task requires Google access. Please sign in with Google first.';
      }
    }
    
    // Execute specific tasks
    switch (task) {
      case 'UPLOAD_ATTACHMENT':
        return await this.handleUploadAttachment(originalMessage);
      
      case 'CREATE_EVENT':
        return await this.handleCreateEvent(originalMessage);
      
      case 'UPDATE_RSVP':
        return await this.handleUpdateRSVP(originalMessage);
      
      case 'CREATE_DOCUMENT':
        return await this.handleCreateDocument(originalMessage);
      
      case 'SEARCH_FILES':
        return await this.handleSearchFiles(originalMessage);
      
      default:
        return response || 'I understand your request. How can I help you with that?';
    }
  }
  
  async handleUploadAttachment(message) {
    // Check if we're on WhatsApp Web
    if (!window.location.href.includes('web.whatsapp.com')) {
      return 'Please open WhatsApp Web to upload attachments.';
    }
    
    // Look for attachments in the current chat
    const attachments = this.findWhatsAppAttachments();
    
    if (attachments.length === 0) {
      return 'No attachments found in the current chat. Please make sure there are files, images, or documents in the chat.';
    }
    
    // For now, return a helpful message
    return `I found ${attachments.length} attachment(s) in this chat. To upload them to Google Drive, I'll need to:
1. Extract the attachment URLs
2. Download the files
3. Upload to your specified Google Drive folder

Would you like me to proceed with uploading these attachments?`;
  }
  
  findWhatsAppAttachments() {
    // Look for common WhatsApp attachment selectors
    const attachmentSelectors = [
      '[data-testid="media-canvas"]',
      '[data-testid="media-document"]',
      '[data-testid="media-image"]',
      '.media-container',
      '.document-container'
    ];
    
    const attachments = [];
    attachmentSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        attachments.push({
          type: selector.includes('image') ? 'image' : 'document',
          element: el
        });
      });
    });
    
    return attachments;
  }
  
  async handleCreateEvent(message) {
    return 'I can help you create calendar events. Please provide the event details like date, time, and description.';
  }
  
  async handleUpdateRSVP(message) {
    return 'I can help you update RSVP responses. Let me analyze the current WhatsApp messages for RSVP updates.';
  }
  
  async handleCreateDocument(message) {
    return 'I can help you create planning documents in Google Docs. What type of document would you like to create?';
  }
  
  async handleSearchFiles(message) {
    return 'I can help you search and organize files in Google Drive. What are you looking for?';
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
    
    // Send state update to background script
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'updateWidgetState',
        state: { isVisible: false }
      });
    }
  }
  
  show() {
    console.log('Showing widget');
    this.widget.style.display = 'block';
    
    // Ensure widget is positioned correctly
    if (!this.widget.style.left || !this.widget.style.top) {
      this.widget.style.left = '20px';
      this.widget.style.top = '20px';
    }
    
    // Ensure widget is on top
    this.widget.style.zIndex = '10000';
    
    this.saveVisibility(true);
    
    // Send state update to background script
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'updateWidgetState',
        state: { isVisible: true }
      });
    }
    
    console.log('Widget should now be visible');
  }
  
  toggleVisibility() {
    console.log('Toggling widget visibility');
    console.log('Current display style:', this.widget.style.display);
    
    if (this.widget.style.display === 'none' || this.widget.style.display === '') {
      console.log('Showing widget');
      this.show();
    } else {
      console.log('Hiding widget');
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
    
    // Also send to background script for cross-tab persistence
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        action: 'updateWidgetState',
        state: { 
          position: { x: position.x, y: position.y },
          isVisible: position.visible
        }
      });
    }
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
  
  loadVisibility() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(['widgetPosition'], (result) => {
        const position = result.widgetPosition || {};
        // Default to visible (true) if no saved state
        const shouldBeVisible = position.visible !== undefined ? position.visible : true;
        
        if (shouldBeVisible) {
          this.show();
        } else {
          this.hide();
        }
      });
    } else {
      // If Chrome API not available, default to visible
      this.show();
    }
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
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        this.showResults('Chrome API not available. Please use this from the extension popup.', 'error');
        return;
      }
      
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
  
  // Chatbot onboarding methods
  async startChatbotOnboarding() {
    try {
      // Initialize onboarding if not already done
      if (!window.chatbotOnboarding) {
        window.chatbotOnboarding = new ChatbotOnboarding();
      }
      
      // Reset any existing onboarding data
      await window.chatbotOnboarding.resetWeddingInfo();
      
      // Start the onboarding process
      await window.chatbotOnboarding.startOnboarding();
      
      // Show the chat interface
      const chatContainer = document.getElementById('chat-container');
      if (chatContainer) {
        chatContainer.classList.remove('hidden');
      }
      
      this.showResults('Chatbot onboarding started! Please follow the instructions in the chat.', 'info');
    } catch (error) {
      this.showResults(`Error starting onboarding: ${error.message}`, 'error');
    }
  }
  
  // Enhanced message processing for onboarding
  async processUserMessage(message) {
    // Check if onboarding is active
    if (window.chatbotOnboarding && window.chatbotOnboarding.isActive) {
      await window.chatbotOnboarding.processOnboardingInput(message);
      return;
    }
    
    // Get AI API key
    const result = await chrome.storage.sync.get(['aiApiKey']);
    const apiKey = result.aiApiKey;
    
    if (!apiKey) {
      return 'Please configure your AI API key in settings to use the chatbot.';
    }
    
    // Load wedding information for context
    let weddingContext = '';
    try {
      const weddingInfo = await this.loadWeddingInfo();
      if (weddingInfo && weddingInfo.mainSheet) {
        weddingContext = `\n\nWedding Information Context:\n${JSON.stringify(weddingInfo, null, 2)}`;
      }
    } catch (error) {
      console.log('No wedding info loaded:', error.message);
    }
    
    // Build enhanced prompt with wedding context
    const enhancedPrompt = `You are a wedding planning assistant. You have access to wedding information stored in Google Sheets.

${weddingContext}

User Question: ${message}

Please provide a helpful response based on the wedding information available. If you need more specific information, ask the user to provide it.`;
    
    try {
      const response = await window.callAI(enhancedPrompt, apiKey);
      return response;
    } catch (error) {
      console.error('Chatbot error:', error);
      return 'Sorry, I encountered an error. Please try again.';
    }
  }
  
  // Load wedding information
  async loadWeddingInfo() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(['weddingChatbotInfo'], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result.weddingChatbotInfo || null);
        }
      });
    });
  }
}

// Initialize widget when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.WedConnectWidget.instance = new WedConnectWidget();
});

// Make functions available globally for external access
window.WedConnectWidget = WedConnectWidget;
} 