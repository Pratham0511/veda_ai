import dotenv from 'dotenv';
dotenv.config();
import { GoogleGenerativeAI } from '@google/generative-ai';

async function test() {
  const apiKey = process.env.GEMINI_API_KEY.replace(/^["']|["']$/g, '');
  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const res = await model.generateContent('hello');
    console.log('Success with gemini-flash-latest:', res.response.text());
  } catch(e) {
    console.error('Error with gemini-flash-latest:', e.message);
  }
}
test();
