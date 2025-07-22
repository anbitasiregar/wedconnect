# wedconnect

## Onboarding for Other Users

### Setting up WhatsApp
To use this extension with your own WhatsApp account, you must set your WhatsApp display name in the code:

1. Open `content.js` in the extension folder.
2. Find the line:
   ```js
   const MY_NAME = "The Wedding Of Michael Ludovico & Anbita Nadine Siregar";
   ```
3. Change the value to match your WhatsApp display name exactly as it appears in your chat (including spaces, punctuation, and capitalization).
4. Save the file and reload the extension in Chrome.

This step is required so the extension can correctly identify which messages are sent by you and which are sent by others.

### Google Auth
Sign into your Google account to give access the extension to your master dashboards and documents.

## Swapping AI Providers

The extension is designed to let you easily change which AI service is used for RSVP detection and chat. To swap providers:

1. Open `aiProvider.js` in the extension folder.
2. Edit the `callAI` function to use your preferred AI API (OpenAI, Google Gemini, local LLM, etc.).
3. Save the file and reload the extension in Chrome.

See the comments in `aiProvider.js` for example implementations for different providers.