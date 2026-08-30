const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
  try {
    for await (const model of ai.models.list({ config: { pageSize: 50 } })) {
      console.log(model.name);
    }
  } catch (e) {
    console.error(e);
  }
}

run();
