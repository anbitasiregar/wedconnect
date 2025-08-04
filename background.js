// Background script for WedConnect extension
console.log('WedConnect background script loaded');

// Listen for extension icon clicks
chrome.action.onClicked.addListener((tab) => {
  // Toggle widget visibility
  chrome.tabs.sendMessage(tab.id, { action: "toggleWidget" });
});

// Listen for tab updates to inject widget
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Auto-inject widget on WhatsApp Web and other suitable sites
    if (tab.url.includes('web.whatsapp.com') || tab.url.includes('google.com') || tab.url.includes('docs.google.com')) {
      console.log('Auto-injecting widget on:', tab.url);
      
      // Inject widget into the page
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['widget.js']
      }).then(() => {
        // Inject widget HTML and CSS
        chrome.scripting.insertCSS({
          target: { tabId: tabId },
          files: ['widget.css']
        });
        
        // Create widget element
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          function: createWidget
        }).then(() => {
          // Ensure widget is visible by default
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            function: () => {
              const widget = document.getElementById('wedconnect-widget');
              if (widget) {
                widget.classList.remove('minimized');
                widget.style.display = 'block';
                widget.style.visibility = 'visible';
              }
            }
          });
        });
      }).catch(err => {
        console.log('Could not inject widget:', err);
      });
    }
  }
});

// Function to create widget element
function createWidget() {
  // Check if widget already exists
  if (document.getElementById('wedconnect-widget')) {
    return;
  }
  
  // Create widget container
  const widgetHTML = `
    <div id="wedconnect-widget" class="widget-container">
      <div class="widget-header">
        <div class="widget-title">WedConnect</div>
        <div class="widget-controls">
          <button id="minimize-btn" class="control-btn">−</button>
          <button id="close-btn" class="control-btn">×</button>
        </div>
      </div>
      
      <div class="widget-content">
        <div class="main-actions">
          <button id="update-rsvp-btn" class="primary-btn">Update RSVP</button>
          <button id="settings-btn" class="secondary-btn">⚙️</button>
        </div>
        
        <div id="ai-results" class="results-area"></div>
        
        <!-- Chatbot Interface -->
        <div id="chatbot-section" class="chatbot-section">
          <div class="chat-header">
            <span class="chat-title">🤖 AI Assistant</span>
            <button id="toggle-chat" class="chat-toggle-btn">💬</button>
          </div>
          
          <div id="chat-container" class="chat-container hidden">
            <div id="chat-messages" class="chat-messages">
              <div class="message bot-message">
                <div class="message-content">
                  Hi! I'm your wedding planning assistant. I can help you with:
                  <ul>
                    <li>📋 Upload WhatsApp attachments to Google Drive</li>
                    <li>📅 Create calendar events</li>
                    <li>📊 Update RSVP responses</li>
                    <li>📝 Create planning documents</li>
                    <li>🔍 Search and organize files</li>
                  </ul>
                  What would you like me to help you with?
                </div>
              </div>
            </div>
            
            <div class="chat-input-container">
              <input type="text" id="chat-input" class="chat-input" placeholder="Ask me anything...">
              <button id="send-message" class="send-btn">Send</button>
            </div>
          </div>
        </div>
        
        <div id="settings-menu" class="settings-menu hidden">
          <button id="sign-in-google">Sign in with Google</button>
          <button id="start-setup">Start RSVP Setup Wizard</button>
          <button id="run-tests">Run Test Suite</button>
        </div>
      </div>
    </div>
  `;
  
  // Insert widget into page
  document.body.insertAdjacentHTML('beforeend', widgetHTML);
  
  // Initialize widget
  if (window.WedConnectWidget) {
    new window.WedConnectWidget();
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleWidget") {
    chrome.tabs.sendMessage(sender.tab.id, { action: "toggleWidget" }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Widget toggle failed:', chrome.runtime.lastError.message);
        // Try to inject widget first
        chrome.scripting.executeScript({
          target: { tabId: sender.tab.id },
          files: ['widget.js']
        }).then(() => {
          chrome.scripting.insertCSS({
            target: { tabId: sender.tab.id },
            files: ['widget.css']
          });
          chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            function: createWidget
          });
        });
      }
    });
  }
}); 