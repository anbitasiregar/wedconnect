// Send a message to the content script to get WhatsApp messages
function fetchMessages() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'getMessages' }, function (response) {
      const messagesDiv = document.getElementById('messages');
      if (response && response.messages && response.messages.length > 0) {
        messagesDiv.innerHTML = response.messages.map(msg => `<div style='margin-bottom:8px;'>${msg.replace(/\n/g, '<br>')}</div>`).join('');
      } else {
        messagesDiv.textContent = 'No messages found or not on WhatsApp Web.';
      }
    });
  });
}

document.getElementById('fetch-messages').addEventListener('click', fetchMessages); 