// This script will run in the context of WhatsApp Web and extract visible chat messages

// Set your WhatsApp display name here (must match exactly as it appears in data-pre-plain-text)
const MY_NAME = "The Wedding Of Michael Ludovico & Anbita Nadine Siregar";

function getLastIncomingMessagesAfterMyLastMessage() {
  const allMessages = Array.from(document.querySelectorAll('[data-pre-plain-text]'));
  // Parse sender from data-pre-plain-text
  function getSender(el) {
    const pre = el.getAttribute('data-pre-plain-text');
    if (!pre) return null;
    // Format: [11:10 AM, 7/17/2025] Sender Name: 
    const match = pre.match(/\] ([^:]+):/);
    return match ? match[1].trim() : null;
  }

  let lastMyMsgIdx = -1;
  for (let i = allMessages.length - 1; i >= 0; i--) {
    if (getSender(allMessages[i]) === MY_NAME) {
      lastMyMsgIdx = i;
      break;
    }
  }

  // Collect all consecutive incoming messages after the last outgoing message
  const result = [];
  for (let i = lastMyMsgIdx + 1; i < allMessages.length; i++) {
    if (getSender(allMessages[i]) !== MY_NAME) {
      const textElements = allMessages[i].querySelectorAll('.copyable-text, .selectable-text');
      let text = '';
      textElements.forEach(el => {
        const t = el.innerText.trim();
        if (t) text += t + '\n';
      });
      text = text.trim();
      if (text) result.push(text);
    } else {
      break;
    }
  }
  return result;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getMessages') {
    sendResponse({ messages: getLastIncomingMessagesAfterMyLastMessage() });
  }
}); 