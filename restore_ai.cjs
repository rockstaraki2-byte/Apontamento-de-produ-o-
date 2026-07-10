const fs = require('fs');

let serverContent = fs.readFileSync('server.ts', 'utf8');

serverContent = serverContent.replace(
  /const Type = \{[^}]*\};\n/,
  ''
);

serverContent = 'import { GoogleGenAI, Type } from "@google/genai";\n' + serverContent;

serverContent = serverContent.replace(
  /function getGeminiClient\(\): any \{ throw new Error\("AI Removida"\); \}\n/,
  `let aiInstance: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}\n`
);

fs.writeFileSync('server.ts', serverContent);
