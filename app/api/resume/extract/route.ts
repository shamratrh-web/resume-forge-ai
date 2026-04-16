import { NextRequest, NextResponse } from 'next/server';
import { DeepSeekAPI } from '@/lib/ai/DeepSeek';
import { config as aiConfig } from '@/lib/ai/deep-config';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

const normalizeSectionType = (rawType: unknown, title: unknown) => {
  const normalized = String(rawType || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

  const titleNorm = String(title || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

  const candidate = normalized || titleNorm;

  if (['experience', 'workexperience', 'professionalexperience', 'employment'].includes(candidate)) {
    return 'experience';
  }
  if (['education', 'academic', 'academics', 'qualification', 'qualifications'].includes(candidate)) {
    return 'education';
  }
  if (['skills', 'technicalskills', 'corecompetencies', 'competencies'].includes(candidate)) {
    return 'skills';
  }
  if (['project', 'projects', 'personalprojects', 'keyprojects'].includes(candidate)) {
    return 'projects';
  }
  if (['certification', 'certifications', 'licenses', 'awards'].includes(candidate)) {
    return 'certifications';
  }
  if (['language', 'languages'].includes(candidate)) {
    return 'languages';
  }
  if (['interest', 'interests', 'hobbies'].includes(candidate)) {
    return 'interests';
  }

  return 'custom';
};

const defaultSectionTitleByType: Record<string, string> = {
  experience: 'Work Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  languages: 'Languages',
  interests: 'Interests',
  custom: 'Custom Section',
};

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
Critical rules:
- ALWAYS include a Projects section if project-like content exists (e.g., "Project", "Projects", "Personal Projects", "Academic Projects").
- Use type "projects" for all project sections.
- Do not drop sections just because heading names differ.
- If a section doesn't fit standard types, use "custom".
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

    // Ensure IDs, canonical section types, and valid structure
    if (Array.isArray(extractedData.sections)) {
      extractedData.sections = extractedData.sections
        .map((section: any) => {
          const mappedType = normalizeSectionType(section?.type, section?.title);
          const normalizedItems = Array.isArray(section?.items) ? section.items : [];

          return {
            ...section,
            id: uuidv4(),
            type: mappedType,
            title: section?.title || defaultSectionTitleByType[mappedType] || 'Custom Section',
            isVisible: true,
            items: normalizedItems.map((item: any) => ({
              ...item,
              id: uuidv4(),
              bullets: Array.isArray(item?.bullets) ? item.bullets : [],
            })),
          };
        });
    }

    return NextResponse.json(extractedData);
  } catch (error: any) {
    console.error('Extraction error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
