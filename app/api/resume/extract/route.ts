import { NextRequest, NextResponse } from 'next/server';
import { DeepSeekAPI } from '@/lib/ai/DeepSeek';
import { config as aiConfig } from '@/lib/ai/deep-config';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Save file to temp directory
    const buffer = Buffer.from(await file.arrayBuffer());
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `${uuidv4()}-${file.name}`);
    fs.writeFileSync(tempFilePath, buffer);

    const api = new DeepSeekAPI();
    await api.init();

    // 1. Upload file
    const fileInfo = await api.uploadReferenceFile(tempFilePath);
    
    // 2. Wait for file to be ready
    await api.waitForFileReady(fileInfo.id);

    // 3. Create session
    const sessionId = await api.createSession();

    // 4. Extract data
    const prompt = `Extract the following information from the attached resume PDF into a JSON format.
The JSON must follow this exact structure:
{
  "personalInfo": {
    "name": "Full Name",
    "title": "Professional Title",
    "summary": "Professional Summary",
    "contact": {
      "email": "email",
      "phone": "phone",
      "location": "location",
      "website": "website",
      "linkedin": "linkedin",
      "github": "github"
    }
  },
  "sections": [
    {
      "type": "experience | education | skills | projects | certifications | languages | interests | custom",
      "title": "Section Title",
      "items": [
        {
          "title": "Item Title",
          "subtitle": "Organization/Subtitle",
          "location": "Location",
          "date": "Start Date (YYYY-MM)",
          "dateEnd": "End Date (YYYY-MM) or empty if current",
          "current": boolean,
          "description": "Short description",
          "bullets": ["bullet 1", "bullet 2"]
        }
      ]
    }
  ]
}
If a section doesn't fit standard types, use "custom".
Return ONLY the JSON block. No preamble or postamble.`;

    let fullContent = '';
    for await (const chunk of api.chatCompletion(sessionId, prompt, false, [fileInfo.id])) {
      if (chunk.content) {
        fullContent += chunk.content;
      }
    }

    // Cleanup temp file
    fs.unlinkSync(tempFilePath);

    // Parse JSON
    const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to extract JSON from AI response', raw: fullContent }, { status: 500 });
    }

    const extractedData = JSON.parse(jsonMatch[0]);

    // Ensure IDs and valid structure
    if (extractedData.sections) {
      extractedData.sections = extractedData.sections.map((section: any) => ({
        ...section,
        id: uuidv4(),
        isVisible: true,
        items: (section.items || []).map((item: any) => ({
          ...item,
          id: uuidv4(),
          bullets: item.bullets || []
        }))
      }));
    }

    return NextResponse.json(extractedData);
  } catch (error: any) {
    console.error('Extraction error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
