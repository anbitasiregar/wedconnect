// Chatbot Onboarding System
class ChatbotOnboarding {
  constructor() {
    this.currentStep = 0;
    this.weddingInfo = {
      sheets: [],
      dataStructure: {},
      context: {}
    };
    this.isActive = false;
  }

  // Start the onboarding process
  async startOnboarding() {
    this.isActive = true;
    this.currentStep = 0;
    this.weddingInfo = {
      sheets: [],
      dataStructure: {},
      context: {}
    };

    // Clear existing chat
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.innerHTML = '';
    }

    // Add welcome message
    this.addBotMessage(`🎉 Welcome to the Wedding Chatbot Setup!

I'm here to help you configure your wedding information system. I'll learn about your Google Sheets and how your wedding data is organized so I can answer questions about your wedding.

Let's start by connecting to your Google Sheets. What's the URL or ID of your main wedding dashboard sheet?`);
  }

  // Add a bot message to the chat
  addBotMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message bot-message';
      
      const messageContent = document.createElement('div');
      messageContent.className = 'message-content';
      messageContent.innerHTML = message;
      
      messageDiv.appendChild(messageContent);
      chatMessages.appendChild(messageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  // Add a user message to the chat
  addUserMessage(message) {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message user-message';
      
      const messageContent = document.createElement('div');
      messageContent.className = 'message-content';
      messageContent.textContent = message;
      
      messageDiv.appendChild(messageContent);
      chatMessages.appendChild(messageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  // Process user input during onboarding
  async processOnboardingInput(userInput) {
    this.addUserMessage(userInput);

    switch (this.currentStep) {
      case 0:
        // Step 0: Get main sheet URL/ID
        await this.handleMainSheetInput(userInput);
        break;
      case 1:
        // Step 1: Analyze sheet structure
        await this.handleSheetAnalysis(userInput);
        break;
      case 2:
        // Step 2: Get additional sheets
        await this.handleAdditionalSheets(userInput);
        break;
      case 3:
        // Step 3: Configure data understanding
        await this.handleDataUnderstanding(userInput);
        break;
      case 4:
        // Step 4: Test and finalize
        await this.handleFinalization(userInput);
        break;
      default:
        this.addBotMessage("I'm not sure what step we're on. Let me restart the onboarding process.");
        this.currentStep = 0;
    }
  }

  // Handle main sheet input
  async handleMainSheetInput(userInput) {
    const sheetId = this.extractSheetId(userInput);
    
    if (!sheetId) {
      this.addBotMessage(`I couldn't find a valid Google Sheets ID in your input. Please provide either:
- A Google Sheets URL (like https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit)
- Or just the Sheet ID (the long string of letters and numbers)`);
      return;
    }

    this.weddingInfo.mainSheetId = sheetId;
    this.addBotMessage(`Great! I found the sheet ID: ${sheetId}

Now I'll analyze your sheet to understand its structure. This might take a moment...`);

    try {
      // Analyze the sheet structure
      const sheetData = await this.analyzeSheetStructure(sheetId);
      this.weddingInfo.mainSheet = sheetData;
      
      this.addBotMessage(`📊 I've analyzed your sheet! Here's what I found:

**Sheets:** ${sheetData.sheets.map(s => s.name).join(', ')}

**Sample Data Structure:**
${this.formatSheetAnalysis(sheetData)}

Is this correct? Also, do you have any other Google Sheets with wedding information that I should know about?`);
      
      this.currentStep = 1;
    } catch (error) {
      this.addBotMessage(`❌ I couldn't access your sheet. Please make sure:
1. The sheet is shared with your Google account
2. You're signed in to Google
3. The sheet ID is correct

Error: ${error.message}`);
    }
  }

  // Handle sheet analysis confirmation
  async handleSheetAnalysis(userInput) {
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('yes') || lowerInput.includes('correct') || lowerInput.includes('right')) {
      this.addBotMessage(`Perfect! Now let's add any additional sheets you might have.

Do you have other Google Sheets with wedding information? For example:
- Guest list
- Vendor contacts
- Budget tracking
- Timeline/schedule
- Venue details

If yes, please share the URLs or IDs. If no, just say "no" or "that's all".`);
      this.currentStep = 2;
    } else if (lowerInput.includes('no') || lowerInput.includes('wrong')) {
      this.addBotMessage(`No problem! Let me know what's incorrect and I'll adjust my understanding.`);
      // Stay on current step
    } else {
      this.addBotMessage(`I'm not sure if that's a yes or no. Could you clarify?`);
    }
  }

  // Handle additional sheets input
  async handleAdditionalSheets(userInput) {
    const lowerInput = userInput.toLowerCase();
    
    if (lowerInput.includes('no') || lowerInput.includes('that\'s all') || lowerInput.includes('none')) {
      this.addBotMessage(`Got it! Now let me understand your wedding context better.

Tell me about your wedding - when is it, where is it, and what kind of information do you think people will ask me about? This helps me provide better answers.`);
      this.currentStep = 3;
    } else {
      // Try to extract sheet IDs from the input
      const sheetIds = this.extractMultipleSheetIds(userInput);
      
      if (sheetIds.length > 0) {
        this.addBotMessage(`I found ${sheetIds.length} additional sheet(s). Let me analyze them...`);
        
        for (const sheetId of sheetIds) {
          try {
            const sheetData = await this.analyzeSheetStructure(sheetId);
            this.weddingInfo.sheets.push(sheetData);
            this.addBotMessage(`✅ Analyzed sheet: ${sheetData.sheets[0]?.name || sheetId}`);
          } catch (error) {
            this.addBotMessage(`❌ Couldn't access sheet ${sheetId}: ${error.message}`);
          }
        }
        
        this.addBotMessage(`Now let me understand your wedding context better.

Tell me about your wedding - when is it, where is it, and what kind of information do you think people will ask me about? This helps me provide better answers.`);
        this.currentStep = 3;
      } else {
        this.addBotMessage(`I couldn't find any valid Google Sheets URLs or IDs in your message. Please provide the URLs or IDs of your additional sheets, or say "no" if you don't have any more.`);
      }
    }
  }

  // Handle data understanding
  async handleDataUnderstanding(userInput) {
    this.weddingInfo.context.weddingInfo = userInput;
    
    this.addBotMessage(`Perfect! Now let me create a comprehensive understanding of your wedding data.

I'll save all this information so I can answer questions about your wedding. Here's what I've learned:

${this.formatWeddingSummary()}

**Testing:** Let me ask you a few questions to make sure I understand everything correctly. What would you like to know about your wedding?`);
    
    this.currentStep = 4;
  }

  // Handle finalization
  async handleFinalization(userInput) {
    // Save the wedding information
    await this.saveWeddingInfo();
    
    this.addBotMessage(`🎉 Setup complete! I've saved all your wedding information.

I can now answer questions about:
- Guest information and RSVPs
- Wedding details and logistics
- Vendor information
- Timeline and schedule
- And more!

Try asking me something like:
- "How many guests are attending?"
- "What's the wedding date?"
- "Who are our vendors?"
- "What's the timeline for the day?"

The onboarding is complete! You can now use me as your wedding assistant.`);
    
    this.isActive = false;
    this.currentStep = 0;
  }

  // Extract sheet ID from URL or direct ID
  extractSheetId(input) {
    // Try to extract from Google Sheets URL
    const urlMatch = input.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) {
      return urlMatch[1];
    }
    
    // Check if it's already a sheet ID format
    const idMatch = input.match(/^[a-zA-Z0-9-_]{20,}$/);
    if (idMatch) {
      return idMatch[0];
    }
    
    return null;
  }

  // Extract multiple sheet IDs
  extractMultipleSheetIds(input) {
    const sheetIds = [];
    
    // Find all Google Sheets URLs
    const urlMatches = input.match(/\/d\/([a-zA-Z0-9-_]+)/g);
    if (urlMatches) {
      urlMatches.forEach(match => {
        const sheetId = match.replace('/d/', '');
        if (sheetId && !sheetIds.includes(sheetId)) {
          sheetIds.push(sheetId);
        }
      });
    }
    
    // Find standalone sheet IDs
    const idMatches = input.match(/[a-zA-Z0-9-_]{20,}/g);
    if (idMatches) {
      idMatches.forEach(id => {
        if (!sheetIds.includes(id)) {
          sheetIds.push(id);
        }
      });
    }
    
    return sheetIds;
  }

  // Analyze sheet structure
  async analyzeSheetStructure(sheetId) {
    try {
      // Get Google OAuth token
      const token = await this.getGoogleToken();
      
      // Get sheet metadata
      const metadataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!metadataResponse.ok) {
        throw new Error(`Failed to get sheet metadata: ${metadataResponse.status}`);
      }
      
      const metadata = await metadataResponse.json();
      
      // Get sample data from each sheet
      const sheets = [];
      for (const sheet of metadata.sheets) {
        const sheetName = sheet.properties.title;
        
        // Get first few rows to understand structure
        const dataResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(sheetName)}!A1:Z10`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (dataResponse.ok) {
          const data = await dataResponse.json();
          sheets.push({
            name: sheetName,
            data: data.values || [],
            headers: data.values?.[0] || []
          });
        }
      }
      
      return {
        id: sheetId,
        title: metadata.properties.title,
        sheets: sheets
      };
    } catch (error) {
      throw new Error(`Failed to analyze sheet: ${error.message}`);
    }
  }

  // Get Google OAuth token
  async getGoogleToken() {
    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(token);
        }
      });
    });
  }

  // Format sheet analysis for display
  formatSheetAnalysis(sheetData) {
    let analysis = '';
    
    for (const sheet of sheetData.sheets) {
      analysis += `**${sheet.name}:**\n`;
      if (sheet.headers.length > 0) {
        analysis += `Columns: ${sheet.headers.join(', ')}\n`;
      }
      if (sheet.data.length > 1) {
        analysis += `Rows: ${sheet.data.length - 1} (excluding header)\n`;
      }
      analysis += '\n';
    }
    
    return analysis;
  }

  // Format wedding summary
  formatWeddingSummary() {
    let summary = '';
    
    if (this.weddingInfo.mainSheet) {
      summary += `**Main Dashboard:** ${this.weddingInfo.mainSheet.title}\n`;
    }
    
    if (this.weddingInfo.sheets.length > 0) {
      summary += `**Additional Sheets:** ${this.weddingInfo.sheets.length}\n`;
      this.weddingInfo.sheets.forEach(sheet => {
        summary += `- ${sheet.title}\n`;
      });
    }
    
    if (this.weddingInfo.context.weddingInfo) {
      summary += `**Wedding Context:** ${this.weddingInfo.context.weddingInfo}\n`;
    }
    
    return summary;
  }

  // Save wedding information
  async saveWeddingInfo() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ 
        weddingChatbotInfo: this.weddingInfo 
      }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  // Load wedding information
  async loadWeddingInfo() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(['weddingChatbotInfo'], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          this.weddingInfo = result.weddingChatbotInfo || {
            sheets: [],
            dataStructure: {},
            context: {}
          };
          resolve(this.weddingInfo);
        }
      });
    });
  }

  // Reset wedding information
  async resetWeddingInfo() {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.remove(['weddingChatbotInfo'], () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          this.weddingInfo = {
            sheets: [],
            dataStructure: {},
            context: {}
          };
          resolve();
        }
      });
    });
  }
}

// Make it globally available
window.ChatbotOnboarding = ChatbotOnboarding; 