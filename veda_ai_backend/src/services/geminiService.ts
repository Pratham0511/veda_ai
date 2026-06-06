import dotenv from 'dotenv';
dotenv.config();

/**
 * Build a strict structured prompt from the assignment config.
 */
function buildPrompt(config: any) {
  const { title, subject, difficulty, questionRows, additionalInfo, timeLimit } = config;

  const questionSpec = questionRows
    .map((r: any) => `- ${r.count} ${r.type} question(s), ${r.marks} mark(s) each`)
    .join('\n');

  return `You are an expert teacher creating a formal exam question paper.

Assignment: "${title}"
Subject: ${subject}
Overall Difficulty: ${difficulty}
Time Limit: ${timeLimit} minutes
${additionalInfo ? `Additional Instructions: ${additionalInfo}` : ''}

Question Structure Required:
${questionSpec}

Instructions:
1. Group questions into logical sections (Section A, Section B, etc.) based on question type.
2. Each section should have a clear title and a short instruction line.
3. Vary difficulty within each section — mix easy, medium, hard appropriately based on the overall difficulty setting.
4. For MCQ questions, provide 4 options labeled A, B, C, D.
5. Every question must have a difficulty tag: "easy", "medium", or "hard".
6. Do NOT include answers.
7. Make questions academically appropriate, specific, and well-worded.

IMPORTANT: Respond ONLY with valid JSON matching this exact structure, no markdown, no explanation:

{
  "sections": [
    {
      "title": "Section A",
      "instruction": "Attempt all questions. Each question carries 1 mark.",
      "questions": [
        {
          "text": "Question text here",
          "type": "mcq",
          "difficulty": "easy",
          "marks": 1,
          "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"]
        }
      ]
    }
  ],
  "totalMarks": 50,
  "totalQuestions": 17
}`;
}

/**
 * Call OpenRouter and parse the structured JSON response.
 */
export async function generateQuestionPaper(config: any) {
  const prompt = buildPrompt(config);
  const apiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.replace(/^["']|["']$/g, '') : '';

  if (!apiKey) {
    throw new Error('API Key is missing in environment variables.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Veda AI',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash:free',
      messages: [
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errText}`);
  }

  const data = (await response.json()) as any;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenRouter returned an empty response.');
  }

  // Strip markdown code fences if wrapped in ```json ... ```
  const cleaned = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`OpenRouter returned invalid JSON: ${cleaned.substring(0, 200)}`);
  }

  if (!parsed.sections || !Array.isArray(parsed.sections)) {
    throw new Error('OpenRouter response missing sections array');
  }

  return parsed;
}
