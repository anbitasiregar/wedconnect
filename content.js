// This script will run in the context of WhatsApp Web and extract visible chat messages
console.log('WedConnect content script loaded on:', window.location.href);

// Set your WhatsApp display name here (must match exactly as it appears in data-pre-plain-text)
const MY_NAME = "The Wedding Of Michael Ludovico & Anbita Nadine Siregar";

function getWeddingInvitationAndReplies() {
  console.log('Starting message extraction...');
  
  // Try multiple selectors to find message containers
  let allMessages = Array.from(document.querySelectorAll('[data-pre-plain-text]'));
  console.log('Found messages with data-pre-plain-text:', allMessages.length);
  
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
  
  console.log('Total message containers found:', allMessages.length);
  
  // Debug: log the first few message containers
  allMessages.slice(0, 5).forEach((el, idx) => {
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

  // Get message text from an element
  function getMessageText(el) {
    const textElements = el.querySelectorAll('.copyable-text, .selectable-text');
    let text = '';
    if (textElements.length > 0) {
      textElements.forEach(el => {
        const t = el.innerText.trim();
        if (t) text += t + '\n';
      });
    } else {
      // Fallback: use the container's text content
      text = el.textContent.trim();
    }
    return text.trim();
  }

  // Find the user's wedding invitation message
  let weddingInvitationMessage = null;
  let weddingInvitationIndex = -1;
  
  for (let i = allMessages.length - 1; i >= 0; i--) {
    const sender = getSender(allMessages[i]);
    const messageText = getMessageText(allMessages[i]);
    
    if (sender === MY_NAME && messageText.toLowerCase().includes('the wedding of')) {
      weddingInvitationMessage = messageText;
      weddingInvitationIndex = i;
      console.log('Found wedding invitation message at index:', i);
      console.log('Wedding invitation text:', messageText);
      break;
    }
  }
  
  if (!weddingInvitationMessage) {
    console.log('No wedding invitation message found');
    return { invitationMessage: null, replies: [] };
  }
  
  // Extract names from the wedding invitation message
  const extractedNames = extractNamesFromInvitation(weddingInvitationMessage);
  console.log('Extracted names from invitation:', extractedNames);
  
  // Get recent replies after the wedding invitation
  const replies = [];
  for (let i = weddingInvitationIndex + 1; i < allMessages.length; i++) {
    const sender = getSender(allMessages[i]);
    if (sender !== MY_NAME) {
      const messageText = getMessageText(allMessages[i]);
      if (messageText) {
        replies.push(messageText);
      }
    }
  }
  
  console.log('Found replies after invitation:', replies);
  
  return {
    invitationMessage: weddingInvitationMessage,
    extractedNames: extractedNames,
    replies: replies
  };
}

// Extract names from wedding invitation message
function extractNamesFromInvitation(message) {
  const names = [];
  
  console.log('Extracting names from message:', message);
  
  // Look for "Dearest" or "Dear" anywhere in the message
  // This is the constant requirement - guest names come after these words
  const dearestMatch = message.match(/(?:Dearest|Dear)\s*[,\s]*\n*\s*([^,\n]+?)(?:\n\s*\n|,|$)/i);
  
  if (dearestMatch) {
    const namesAfterDearest = dearestMatch[1].trim();
    console.log('Names after Dearest/Dear:', namesAfterDearest);
    
    // Split by common separators for multiple guests
    // Handle "&", "and", and commas
    const nameList = namesAfterDearest.split(/[&,and]+/).map(name => name.trim()).filter(name => name);
    
    if (nameList.length > 0) {
      names.push(...nameList);
      console.log('Extracted guest names:', nameList);
    }
  } else {
    console.log('No "Dearest" or "Dear" found in the message');
    console.log('Full message for debugging:', message);
  }
  
  // Remove duplicates and return
  const uniqueNames = [...new Set(names)];
  console.log('Final unique guest names:', uniqueNames);
  return uniqueNames;
}

// Test function to debug name extraction
function testNameExtraction() {
  const testMessages = [
    // Standard format
    "The Wedding of John & Jane Dearest Mom & Dad",
    
    // Multi-line format
    `The Wedding of Michael Charles Ludovico & Anbita Nadine Siregar

Dearest Test Guest,

With great pleasure, we cordially invite you to our wedding reception`,
    
    // Different greeting format
    "Dear Mom & Dad, You are invited to our wedding!",
    
    // With commas
    "The Wedding of Alex & Maria Dearest Cousin Sarah, and her husband Mike",
    
    // Multiple guests with "and"
    "The Wedding of Tom and Lisa Dearest Uncle Bob and Aunt Mary",
    
    // Different invitation format
    `We are getting married!

Dearest Grandma,

Please come to our special day.`,
    
    // Simple format
    "Dearest Mom & Dad, please come to our wedding!",
    
    // Complex format
    `The Wedding of Michael Ludovico & Anbita Nadine Siregar

Dearest Mom & Dad,

With great pleasure, we cordially invite you to our wedding reception (syukuran) at The Dharmawangsa Hotel on December 6, 2025.`,
    
    // Different greeting style
    "Dear Uncle Bob and Aunt Mary, we hope you can make it!",
    
    // Single guest
    "The Wedding of John & Jane Dearest Alex"
  ];
  
  console.log('Testing name extraction with various formats:');
  testMessages.forEach((message, index) => {
    console.log(`\nTest ${index + 1}: "${message.substring(0, 100)}..."`);
    const names = extractNamesFromInvitation(message);
    console.log(`Extracted names: [${names.join(', ')}]`);
  });
}

// Run test when content script loads
testNameExtraction();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  if (request.action === 'getMessages') {
    try {
      const result = getWeddingInvitationAndReplies();
      console.log('Sending response with invitation and replies:', result);
      sendResponse(result);
    } catch (error) {
      console.error('Error in content script:', error);
      sendResponse({ invitationMessage: null, extractedNames: [], replies: [], error: error.message });
    }
  } else if (request.action === 'toggleWidget') {
    console.log('Content script received toggle widget message');
    // Forward the message to the widget if it exists
    if (window.WedConnectWidget && window.WedConnectWidget.instance) {
      window.WedConnectWidget.instance.toggleVisibility();
    }
    sendResponse({success: true});
  }
}); 