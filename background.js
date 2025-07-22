// Background script for debugging
console.log('WedConnect extension background script loaded');

// Listen for tab updates to ensure content script injection
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('whatsapp.com')) {
    console.log('WhatsApp Web tab detected:', tab.url);
  }
}); 