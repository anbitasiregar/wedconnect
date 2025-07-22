# wedconnect

## Onboarding for Other Users

To use this extension with your own WhatsApp account, you must set your WhatsApp display name in the code:

1. Open `content.js` in the extension folder.
2. Find the line:
   ```js
   const MY_NAME = "The Wedding Of Michael Ludovico & Anbita Nadine Siregar";
   ```
3. Change the value to match your WhatsApp display name exactly as it appears in your chat (including spaces, punctuation, and capitalization).
4. Save the file and reload the extension in Chrome.

This step is required so the extension can correctly identify which messages are sent by you and which are sent by others.