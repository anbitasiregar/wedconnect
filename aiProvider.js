// aiProvider.js
// This file lets you swap out which AI provider is used for RSVP detection and chat.
// Edit the callAI function to use your preferred provider.

// --- Example: OpenAI GPT ---
async function callAI_OpenAI(prompt, apiKey) {
  console.log('OpenAI call started with API key:', apiKey ? 'Present' : 'Missing');
  console.log('Prompt:', prompt);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 512
      })
    });
    
    console.log('OpenAI response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      
      // Check for specific error types
      if (response.status === 429) {
        throw new Error('OpenAI quota exceeded. Please check your billing or switch to a different AI provider.');
      } else if (response.status === 401) {
        throw new Error('OpenAI API key invalid. Please check your API key.');
      } else {
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }
    }
    
    const data = await response.json();
    console.log('OpenAI response data:', data);
    
    const result = data.choices?.[0]?.message?.content || '';
    console.log('Extracted result:', result);
    
    return result;
  } catch (error) {
    console.error('OpenAI call failed:', error);
    throw error;
  }
}

// --- Google Gemini (Vertex AI) - Default ---
async function callAI_Gemini(prompt, apiKey) {
  console.log('Gemini call started with API key:', apiKey ? 'Present' : 'Missing');
  console.log('Prompt:', prompt);
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        contents: [{ 
          parts: [{ text: prompt }] 
        }] 
      })
    });
    
    console.log('Gemini response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      
      // Check for specific error types
      if (response.status === 429) {
        throw new Error('Gemini quota exceeded. Please check your usage limits or switch to a different AI provider.');
      } else if (response.status === 400) {
        throw new Error('Gemini API key invalid or request malformed. Please check your API key.');
      } else if (response.status === 404) {
        throw new Error('Gemini model not found. Please check the API endpoint or try a different model.');
      } else {
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }
    }
    
    const data = await response.json();
    console.log('Gemini response data:', data);
    
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Extracted result:', result);
    
    return result;
  } catch (error) {
    console.error('Gemini call failed:', error);
    throw error;
  }
}

// --- Example: Local LLM (Ollama, LM Studio, etc.) ---
// async function callAI_Local(prompt) {
//   const response = await fetch('http://localhost:11434/api/generate', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ model: 'llama2', prompt })
//   });
//   const data = await response.json();
//   return data.response || '';
// }

// --- Main export: choose your provider here ---
// To swap providers, change the implementation below.
async function callAI(prompt, apiKey) {
  console.log('callAI function called with prompt length:', prompt.length);
  // Default: Gemini
  return await callAI_Gemini(prompt, apiKey);
  // For OpenAI: return await callAI_OpenAI(prompt, apiKey);
  // For local: return await callAI_Local(prompt);
}

window.callAI = callAI; 