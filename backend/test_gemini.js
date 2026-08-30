const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    const chat = ai.chats.create({
      model: 'gemini-1.5-flash',
      config: {
        systemInstruction: {
          role: "system",
          parts: [{ text: "You are a helpful assistant" }]
        },
        tools: [{
          functionDeclarations: [{
            name: 'getWeather',
            description: 'Get weather',
            parameters: { type: 'OBJECT', properties: { location: { type: 'STRING' } } }
          }]
        }]
      }
    });

    console.log("Sending prompt to chat...");
    let response = await chat.sendMessage("What is the weather in Paris?");
    console.log("Model response:", response.functionCalls);

    if (response.functionCalls) {
      const call = response.functionCalls[0];
      messages.push(response.candidates[0].content); // Append model's tool call

      messages.push({
        role: "user",
        parts: [{
          functionResponse: {
            name: call.name,
            response: { result: "Sunny" }
          }
        }]
      });

      console.log("Sending tool response manually...");
      let finalResponse = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: messages
      });
      console.log("Final response:", finalResponse.text);
    }
  } catch (e) {
    console.error("Error:", e.stack);
  }
}

run();
