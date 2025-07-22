// This script will run in the context of WhatsApp Web and extract visible chat messages
console.log('WedConnect content script loaded on:', window.location.href);

// Set your WhatsApp display name here (must match exactly as it appears in data-pre-plain-text)
const MY_NAME = "The Wedding Of Michael Ludovico & Anbita Nadine Siregar";

function getLastIncomingMessagesAfterMyLastMessage() {
  // Try multiple selectors to find message containers
  let allMessages = Array.from(document.querySelectorAll('[data-pre-plain-text]'));
  
  if (allMessages.length === 0) {
    // Try alternative selectors
    allMessages = Array.from(document.querySelectorAll('[data-testid="msg-container"]'));
    console.log('Trying data-testid selector, found:', allMessages.length);
  }
  
  if (allMessages.length === 0) {
    // Try looking for copyable-text elements directly
    allMessages = Array.from(document.querySelectorAll('.copyable-text'));
    console.log('Trying copyable-text selector, found:', allMessages.length);
  }
  
  if (allMessages.length === 0) {
    // Try looking for any div with message-like content
    allMessages = Array.from(document.querySelectorAll('div')).filter(div => {
      return div.textContent && div.textContent.length > 10 && 
             !div.textContent.includes('WhatsApp') && 
             !div.textContent.includes('web.whatsapp.com');
    });
    console.log('Trying generic div selector, found:', allMessages.length);
  }
  
  console.log('Found message containers:', allMessages.length);
  
  // Debug: log the first few message containers
  allMessages.slice(0, 3).forEach((el, idx) => {
    console.log(`Message[${idx}] data-pre-plain-text:`, el.getAttribute('data-pre-plain-text'));
    console.log(`Message[${idx}] classes:`, el.className);
    console.log(`Message[${idx}] text:`, el.textContent.substring(0, 100));
  });

  // Parse sender from data-pre-plain-text or try to infer from context
  function getSender(el) {
    const pre = el.getAttribute('data-pre-plain-text');
    if (pre) {
      const match = pre.match(/\] ([^:]+):/);
      return match ? match[1].trim() : null;
    }
    
    // If no data-pre-plain-text, try to infer from text content
    const text = el.textContent;
    if (text.includes(MY_NAME)) {
      return MY_NAME;
    }
    return null;
  }

  let lastMyMsgIdx = -1;
  for (let i = allMessages.length - 1; i >= 0; i--) {
    if (getSender(allMessages[i]) === MY_NAME) {
      lastMyMsgIdx = i;
      break;
    }
  }

  console.log('Last my message index:', lastMyMsgIdx);

  // Collect all consecutive incoming messages after the last outgoing message
  const result = [];
  for (let i = lastMyMsgIdx + 1; i < allMessages.length; i++) {
    if (getSender(allMessages[i]) !== MY_NAME) {
      const textElements = allMessages[i].querySelectorAll('.copyable-text, .selectable-text');
      let text = '';
      if (textElements.length > 0) {
        textElements.forEach(el => {
          const t = el.innerText.trim();
          if (t) text += t + '\n';
        });
      } else {
        // Fallback: use the container's text content
        text = allMessages[i].textContent.trim();
      }
      text = text.trim();
      if (text) result.push(text);
    } else {
      break;
    }
  }
  
  console.log('Extracted messages:', result);
  return result;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  if (request.action === 'getMessages') {
    try {
      const messages = getLastIncomingMessagesAfterMyLastMessage();
      console.log('Sending response:', messages);
      sendResponse({ messages });
    } catch (error) {
      console.error('Error in content script:', error);
      sendResponse({ messages: [], error: error.message });
    }
  }
}); 