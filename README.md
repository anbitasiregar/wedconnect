# WedConnect - Wedding Planner Chrome Extension

A powerful Chrome extension that automates cross-app tasks for wedding planners, connecting WhatsApp, Google Sheets, Google Calendar, and Google Docs.

## 🎯 Core Features

### ✅ WhatsApp to Google Sheets Connector
- **Smart Message Parsing**: Extracts guest names from invitation messages
- **AI-Powered RSVP Analysis**: Automatically detects YES/NO/UNSURE responses
- **Automated Sheet Updates**: Updates guest RSVP status in your master spreadsheet
- **User Confirmation**: Review and edit AI suggestions before updating

### ✅ Google Sheets Integration
- **OAuth2 Authentication**: Secure Google account connection
- **Smart Sheet Analysis**: Automatically detects headers and column structure
- **Flexible Name Formats**: Supports separate first/last names or combined full names
- **RSVP Mapping**: Maps AI responses to your sheet's dropdown values

### ✅ AI Integration
- **Google Gemini AI**: Default AI provider for RSVP analysis
- **Swappable Providers**: Easy to switch between OpenAI, Gemini, or local models
- **Smart Prompts**: Optimized for wedding RSVP response analysis

## 🎨 User Interface

### Main Interface
- **Clean Design**: Minimal, focused interface with gradient background
- **Update RSVP Button**: Primary action to process WhatsApp messages
- **AI Results Display**: Shows analysis results directly below the button
- **Settings Menu**: Access all configuration options via the ⚙️ button

### Settings Menu (⚙️)
- **Sign in with Google**: Authenticate with Google services
- **Start RSVP Setup Wizard**: Configure your spreadsheet and AI settings
- **Run Test Suite**: Execute comprehensive tests to verify functionality

### Hidden Sections
- **Google Sheets Settings**: Accessible via settings menu
- **AI Settings**: Configure API keys and providers
- **Setup Wizard**: Step-by-step configuration process
- **Testing Tools**: Run diagnostics and tests

## 🚀 Quick Start

1. **Install Extension**: Load the extension in Chrome
2. **Sign in with Google**: Click ⚙️ → "Sign in with Google"
3. **Setup RSVP Tracking**: Click ⚙️ → "Start RSVP Setup Wizard"
4. **Configure Spreadsheet**: Provide your Google Sheets URL and configure columns
5. **Test Setup**: Verify everything works with the test entry
6. **Start Using**: Click "Update RSVP" to process WhatsApp messages

## 🔧 Configuration

### Required Setup
1. **Google OAuth2 Client ID**: Add your client ID to `manifest.json`
2. **AI API Key**: Get a Google Gemini API key for AI analysis
3. **Spreadsheet URL**: Provide your Google Sheets URL during setup

### Onboarding Process
1. **Sheet Analysis**: Extension analyzes your spreadsheet structure
2. **Header Detection**: Select which row contains your column headers
3. **Column Mapping**: Map first name, last name, and RSVP response columns
4. **RSVP Mapping**: Configure how AI responses map to your dropdown values
5. **Test Entry**: Verify the setup with a test guest entry

## 🧪 Testing

### Test Suite Features
- **Name Extraction Tests**: 8 different invitation message formats
- **RSVP Analysis Tests**: 9 different response types
- **Sheet Operations Tests**: 3 different name format scenarios
- **Error Handling Tests**: 3 edge case scenarios

### Running Tests
1. Click ⚙️ → "Run Test Suite"
2. Check browser console for detailed results
3. Look for ✅ PASS or ❌ FAIL indicators

## 🔄 WhatsApp Message Processing

### Message Format Requirements
- **Invitation Messages**: Must contain "Dear" or "Dearest" followed by guest names
- **RSVP Responses**: Any message after the invitation can be analyzed
- **Name Extraction**: Automatically finds names after "Dear" or "Dearest"

### Supported Formats
```
"The Wedding of John & Jane Dearest Mom & Dad"
"Dear Uncle Bob and Aunt Mary, please come to our wedding!"
"Dearest Test Guest, we hope you can make it!"
```

## 📊 Google Sheets Integration

### Supported Column Formats
- **Separate Names**: First Name column + Last Name column
- **Combined Names**: Full Name column
- **RSVP Column**: Dropdown with YES/NO options

### Data Flow
1. Extract names from WhatsApp invitation messages
2. Analyze RSVP responses with AI
3. Find matching guest rows in spreadsheet
4. Update RSVP status in correct columns
5. Provide user confirmation and editing options

## 🔐 Security & Permissions

### Required Permissions
- **identity**: Google OAuth2 authentication
- **storage**: Save user settings and configurations
- **tabs**: Access WhatsApp Web for message reading
- **host_permissions**: Google APIs for Sheets, Calendar, Docs

### Data Handling
- **Local Storage**: All settings stored in Chrome sync storage
- **No External Storage**: No data sent to external servers
- **Secure APIs**: All Google API calls use OAuth2 tokens

## 🛠️ Development

### File Structure
```
wedconnect/
├── manifest.json          # Extension configuration
├── popup.html            # Main UI interface
├── popup.js              # UI logic and event handlers
├── content.js            # WhatsApp Web content script
├── background.js         # Background script
├── sheets.js            # Google Sheets API functions
├── calendar.js           # Google Calendar API functions
├── docs.js              # Google Docs API functions
├── aiProvider.js        # AI provider interface
└── tests.js             # Test suite
```

### Key Functions
- **analyzeWhatsAppMessages()**: Main RSVP processing function
- **extractNamesFromInvitation()**: Name extraction from messages
- **parseRSVPAnalysis()**: AI response parsing
- **updateSheet()**: Google Sheets data updates
- **findGuestRows()**: Guest row matching logic

## 🎯 Next Features

### Planned Development
1. **Automated RSVP Follow-ups**: Deadline tracking and reminders
2. **Multi-channel Integration**: Email and SMS follow-ups
3. **Response Analytics**: Track response rates and trends
4. **Smart Scheduling**: Optimal timing for follow-up messages
5. **Personalized Messages**: Custom messages based on guest relationship

## 📝 Troubleshooting

### Common Issues
1. **"No messages found"**: Ensure you're on WhatsApp Web and in a chat
2. **"Guest not found"**: Check name spelling and sheet configuration
3. **"Authentication failed"**: Verify OAuth2 client ID in manifest.json
4. **"AI analysis failed"**: Check API key and quota limits

### Debug Steps
1. Open browser console for detailed error messages
2. Run test suite to verify functionality
3. Check Google API quotas and permissions
4. Verify spreadsheet URL and permissions

## 🤝 Contributing

### Development Setup
1. Clone the repository
2. Load as unpacked extension in Chrome
3. Configure OAuth2 client ID
4. Add AI API key for testing
5. Run test suite to verify setup

### Testing Guidelines
- Run full test suite before making changes
- Test with various message formats
- Verify Google API integrations
- Check error handling scenarios

---

**WedConnect** - Making wedding planning easier, one RSVP at a time! 💒