const fs = require('fs');

let serverContent = fs.readFileSync('server.ts', 'utf8');

// The file currently starts with:
// 1: const Type = { STRING: 'string', INTEGER: 'integer', ARRAY: 'array', OBJECT: 'object', BOOLEAN: 'boolean', NUMBER: 'number' };
// 2: import express from "express";
// 3: import path from "path";
// 4: import { createServer as createViteServer } from "vite";
// 5: 
// 6: function getGeminiClient() { throw new Error("AI Removida"); }
// 7:     aiInstance = new GoogleGenAI({
// ... (some lines)
// 17: }
// 18: import { getApps } from "firebase-admin/app";

serverContent = serverContent.replace(
  /function getGeminiClient\(\) \{ throw new Error\("AI Removida"\); \}.*?\}\n/s,
  `function getGeminiClient(): any { throw new Error("AI Removida"); }\n`
);

fs.writeFileSync('server.ts', serverContent);
