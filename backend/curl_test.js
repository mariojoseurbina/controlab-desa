require('dotenv').config();

async function run() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.models) {
    data.models.forEach(m => console.log(m.name, m.supportedGenerationMethods));
  } else {
    console.log("Error:", data);
  }
}
run();
