// Google Docs API integration for Chrome Extension

// Create a new document
async function createDocument(token, title) {
  try {
    const response = await fetch('https://docs.googleapis.com/v1/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: title
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Docs API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error creating document:', error);
    throw error;
  }
}

// Read document content
async function readDocument(token, documentId) {
  try {
    const response = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to read document: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error reading document:', error);
    throw error;
  }
}

// Update document content
async function updateDocument(token, documentId, requests) {
  try {
    const response = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: requests
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Docs API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
}

// Create a wedding planning document
async function createWeddingPlanningDoc(token, title = 'Wedding Planning Document') {
  try {
    // Create the document
    const doc = await createDocument(token, title);
    
    // Add initial content
    const requests = [
      {
        insertText: {
          location: {
            index: 1
          },
          text: 'Wedding Planning Document\n\n'
        }
      },
      {
        insertText: {
          location: {
            index: 25
          },
          text: 'Guest List:\n'
        }
      },
      {
        insertText: {
          location: {
            index: 37
          },
          text: 'RSVP Responses:\n'
        }
      },
      {
        insertText: {
          location: {
            index: 52
          },
          text: 'Tasks and Deadlines:\n'
        }
      }
    ];
    
    await updateDocument(token, doc.documentId, requests);
    
    return doc;
  } catch (error) {
    console.error('Error creating wedding planning document:', error);
    throw error;
  }
}

// Add RSVP response to document
async function addRSVPToDocument(token, documentId, guestName, response, date) {
  try {
    // First, read the document to find where to insert
    const doc = await readDocument(token, documentId);
    
    // Find the RSVP section (simplified - in practice you'd want more sophisticated parsing)
    const requests = [
      {
        insertText: {
          location: {
            index: doc.body.content[0].endIndex - 1
          },
          text: `\n${guestName}: ${response} (${date})`
        }
      }
    ];
    
    await updateDocument(token, documentId, requests);
    
    return true;
  } catch (error) {
    console.error('Error adding RSVP to document:', error);
    throw error;
  }
}

// Create guest list document
async function createGuestListDoc(token, guestList) {
  try {
    const doc = await createDocument(token, 'Wedding Guest List');
    
    let content = 'Wedding Guest List\n\n';
    guestList.forEach((guest, index) => {
      content += `${index + 1}. ${guest.name} - ${guest.status || 'Pending'}\n`;
    });
    
    const requests = [
      {
        insertText: {
          location: {
            index: 1
          },
          text: content
        }
      }
    ];
    
    await updateDocument(token, doc.documentId, requests);
    
    return doc;
  } catch (error) {
    console.error('Error creating guest list document:', error);
    throw error;
  }
}

// Export functions for use in popup.js
window.createDocument = createDocument;
window.readDocument = readDocument;
window.updateDocument = updateDocument;
window.createWeddingPlanningDoc = createWeddingPlanningDoc;
window.addRSVPToDocument = addRSVPToDocument;
window.createGuestListDoc = createGuestListDoc; 