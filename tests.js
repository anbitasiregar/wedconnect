// Test suite for WedConnect WhatsApp message parsing and RSVP updating

// Test data for various scenarios
const testData = {
  // WhatsApp message formats
  invitationMessages: [
    "The Wedding of John & Jane Dearest Mom & Dad",
    "The Wedding of Michael Charles Ludovico & Anbita Nadine Siregar\n\nDearest Test Guest,\n\nWith great pleasure, we cordially invite you...",
    "Dear Uncle Bob and Aunt Mary, please come to our wedding!",
    "The Wedding of Alex & Maria Dearest Cousin Sarah, and her husband Mike",
    "We are getting married!\n\nDearest Grandma,\n\nPlease come to our special day.",
    "Dearest Mom & Dad, please come to our wedding!",
    "The Wedding of Tom and Lisa Dearest Uncle Bob and Aunt Mary",
    "Dear Uncle Bob, we hope you can make it!"
  ],
  
  // Expected extracted names for each message
  expectedNames: [
    ["Mom", "Dad"],
    ["Test Guest"],
    ["Uncle Bob", "Aunt Mary"],
    ["Cousin Sarah", "her husband Mike"],
    ["Grandma"],
    ["Mom", "Dad"],
    ["Uncle Bob", "Aunt Mary"],
    ["Uncle Bob"]
  ],
  
  // RSVP responses
  rsvpResponses: [
    "1",
    "I'm coming!",
    "2",
    "Sorry, I can't come",
    "Yes, I'll be there!",
    "No, sorry",
    "Maybe",
    "I'm coming!",
    "Sorry, I can't come I'm sorry"
  ],
  
  // Expected AI analysis results
  expectedAnalysis: [
    { status: "YES", confidence: "HIGH" },
    { status: "YES", confidence: "HIGH" },
    { status: "NO", confidence: "HIGH" },
    { status: "NO", confidence: "HIGH" },
    { status: "YES", confidence: "MEDIUM" },
    { status: "NO", confidence: "MEDIUM" },
    { status: "UNSURE", confidence: "LOW" },
    { status: "YES", confidence: "HIGH" },
    { status: "NO", confidence: "HIGH" }
  ]
};

// Test functions
function runAllTests() {
  console.log('🧪 Starting WedConnect Test Suite...\n');
  
  testNameExtraction();
  testRSVPAnalysis();
  testSheetOperations();
  testErrorHandling();
  
  console.log('\n✅ All tests completed!');
}

// Test 1: Name extraction from invitation messages
function testNameExtraction() {
  console.log('📋 Test 1: Name Extraction from Invitation Messages');
  
  testData.invitationMessages.forEach((message, index) => {
    console.log(`\nTest ${index + 1}: "${message.substring(0, 50)}..."`);
    
    // Simulate the name extraction logic
    const extractedNames = simulateNameExtraction(message);
    const expectedNames = testData.expectedNames[index];
    
    const passed = JSON.stringify(extractedNames.sort()) === JSON.stringify(expectedNames.sort());
    
    console.log(`Expected: [${expectedNames.join(', ')}]`);
    console.log(`Extracted: [${extractedNames.join(', ')}]`);
    console.log(`Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!passed) {
      console.error(`❌ Name extraction failed for message ${index + 1}`);
    }
  });
}

// Test 2: RSVP analysis
function testRSVPAnalysis() {
  console.log('\n🤖 Test 2: RSVP Analysis');
  
  testData.rsvpResponses.forEach((response, index) => {
    console.log(`\nTest ${index + 1}: "${response}"`);
    
    // Simulate AI analysis
    const analysis = simulateRSVPAnalysis(response);
    const expected = testData.expectedAnalysis[index];
    
    const statusMatch = analysis.status === expected.status;
    const confidenceMatch = analysis.confidence === expected.confidence;
    
    console.log(`Expected: ${expected.status} (${expected.confidence})`);
    console.log(`Analyzed: ${analysis.status} (${analysis.confidence})`);
    console.log(`Result: ${statusMatch && confidenceMatch ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!statusMatch || !confidenceMatch) {
      console.error(`❌ RSVP analysis failed for response ${index + 1}`);
    }
  });
}

// Test 3: Sheet operations
function testSheetOperations() {
  console.log('\n📊 Test 3: Sheet Operations');
  
  const testCases = [
    {
      name: "Test Guest",
      format: "separate",
      firstName: "Test",
      lastName: "Guest",
      expectedRow: 5
    },
    {
      name: "Mom",
      format: "separate", 
      firstName: "Mom",
      lastName: "",
      expectedRow: 3
    },
    {
      name: "John Smith",
      format: "full",
      fullName: "John Smith",
      expectedRow: 7
    }
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`\nTest ${index + 1}: "${testCase.name}" (${testCase.format} format)`);
    
    // Simulate finding guest rows
    const foundRows = simulateFindGuestRows(testCase);
    
    const passed = foundRows.includes(testCase.expectedRow);
    
    console.log(`Expected row: ${testCase.expectedRow}`);
    console.log(`Found rows: [${foundRows.join(', ')}]`);
    console.log(`Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!passed) {
      console.error(`❌ Sheet operation failed for guest ${testCase.name}`);
    }
  });
}

// Test 4: Error handling
function testErrorHandling() {
  console.log('\n⚠️ Test 4: Error Handling');
  
  const errorCases = [
    {
      scenario: "Guest not found in sheet",
      input: "NonExistent Guest",
      expectedError: "Guest not found"
    },
    {
      scenario: "Invalid sheet configuration",
      input: { nameFormat: "invalid" },
      expectedError: "Invalid configuration"
    },
    {
      scenario: "Empty message",
      input: "",
      expectedError: "No names found"
    }
  ];
  
  errorCases.forEach((testCase, index) => {
    console.log(`\nTest ${index + 1}: ${testCase.scenario}`);
    
    // Simulate error handling
    const error = simulateErrorHandling(testCase.input);
    
    const passed = error.includes(testCase.expectedError);
    
    console.log(`Expected error: ${testCase.expectedError}`);
    console.log(`Actual error: ${error}`);
    console.log(`Result: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!passed) {
      console.error(`❌ Error handling failed for scenario ${index + 1}`);
    }
  });
}

// Simulation functions (these would be replaced with actual function calls in real testing)
function simulateNameExtraction(message) {
  // Simulate the extractNamesFromInvitation function
  const dearestMatch = message.match(/(?:Dearest|Dear)\s*[,\s]*\n*\s*([^,\n]+?)(?:\n\s*\n|,|$)/i);
  if (dearestMatch) {
    const namesAfterDearest = dearestMatch[1].trim();
    const nameList = namesAfterDearest.split(/[&,and]+/).map(name => name.trim()).filter(name => name);
    return [...new Set(nameList)];
  }
  return [];
}

function simulateRSVPAnalysis(response) {
  // Simulate AI analysis
  const lowerResponse = response.toLowerCase();
  
  if (lowerResponse.includes('1') || lowerResponse.includes("i'm coming") || lowerResponse.includes('yes')) {
    return { status: "YES", confidence: "HIGH" };
  } else if (lowerResponse.includes('2') || lowerResponse.includes("can't come") || lowerResponse.includes('no') || lowerResponse.includes('sorry')) {
    return { status: "NO", confidence: "HIGH" };
  } else if (lowerResponse.includes('maybe')) {
    return { status: "UNSURE", confidence: "LOW" };
  } else {
    return { status: "UNSURE", confidence: "MEDIUM" };
  }
}

function simulateFindGuestRows(testCase) {
  // Simulate finding guest rows in sheet
  const mockSheetData = {
    "Test Guest": [5],
    "Mom": [3],
    "John Smith": [7]
  };
  
  return mockSheetData[testCase.name] || [];
}

function simulateErrorHandling(input) {
  // Simulate error handling
  if (typeof input === 'string' && input === "") {
    return "No names found in message";
  } else if (typeof input === 'string' && input === "NonExistent Guest") {
    return "Guest not found in sheet";
  } else if (typeof input === 'object' && input.nameFormat === "invalid") {
    return "Invalid configuration";
  }
  return "Unknown error";
}

// Export for use in other files
window.runAllTests = runAllTests;
window.testNameExtraction = testNameExtraction;
window.testRSVPAnalysis = testRSVPAnalysis;
window.testSheetOperations = testSheetOperations;
window.testErrorHandling = testErrorHandling; 