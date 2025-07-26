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
      });
    }).catch(err => {
      console.log('Could not inject widget:', err);
    });
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