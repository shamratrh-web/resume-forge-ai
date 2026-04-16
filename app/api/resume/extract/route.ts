import { NextRequest, NextResponse } from 'next/server';
import { DeepSeekAPI } from '@/lib/ai/DeepSeek';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { spawnSync } from 'child_process';

export const runtime = 'nodejs';
type WritingMode = 'strict' | 'smart';

const normalizeSectionType = (rawType: unknown, title: unknown) => {
  const normalized = String(rawType || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

  const titleNorm = String(title || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

  const genericRawTypes = new Set(['', 'custom', 'other', 'misc', 'additional', 'general']);
  const candidate = genericRawTypes.has(normalized) ? titleNorm : (normalized || titleNorm);

  if (['experience', 'workexperience', 'professionalexperience', 'employment'].includes(candidate)) {
    return 'experience';
  }
  if (['education', 'academic', 'academics', 'qualification', 'qualifications'].includes(candidate)) {
    return 'education';
  }
  if (['skills', 'technicalskills', 'corecompetencies', 'competencies'].includes(candidate)) {
    return 'skills';
  }
  if (['project', 'projects', 'personalprojects', 'keyprojects', 'keyproject', 'featuredprojects', 'majorprojects'].includes(candidate)) {
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

const toSafeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => toSafeString(typeof entry === 'string' ? entry : String(entry ?? '')))
      .filter((entry): entry is string => Boolean(entry));
  }

  if (typeof value === 'string') {
    return value
      .split(/\n|•/)
      .map((entry) => entry.trim().replace(/^-+\s*/, ''))
      .filter(Boolean);
  }

  return [];
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeItem = (item: any) => {
  if (typeof item === 'string') {
    const text = toSafeString(item) || '';
    return {
      id: uuidv4(),
      title: '',
      subtitle: '',
      location: '',
      date: '',
      dateEnd: '',
      description: text,
      current: false,
      bullets: [],
      tags: [],
    };
  }

  if (!isPlainObject(item)) {
    return {
      id: uuidv4(),
      title: '',
      subtitle: '',
      location: '',
      date: '',
      dateEnd: '',
      description: '',
      current: false,
      bullets: [],
      tags: [],
    };
  }

  const bullets = [
    ...toStringArray(item?.bullets),
    ...toStringArray(item?.highlights),
    ...toStringArray(item?.achievements),
    ...toStringArray(item?.responsibilities),
  ];

  const tags = [
    ...toStringArray(item?.tags),
    ...toStringArray(item?.technologies),
    ...toStringArray(item?.techStack),
    ...toStringArray(item?.skills),
  ];

  return {
    ...item,
    id: uuidv4(),
    title:
      toSafeString(item?.title) ||
      toSafeString(item?.name) ||
      toSafeString(item?.projectName) ||
      toSafeString(item?.project) ||
      '',
    subtitle:
      toSafeString(item?.subtitle) ||
      toSafeString(item?.organization) ||
      toSafeString(item?.company) ||
      toSafeString(item?.institution) ||
      '',
    location: toSafeString(item?.location) || '',
    date: toSafeString(item?.date) || toSafeString(item?.startDate) || '',
    dateEnd: toSafeString(item?.dateEnd) || toSafeString(item?.endDate) || '',
    description:
      toSafeString(item?.description) ||
      toSafeString(item?.summary) ||
      toSafeString(item?.details) ||
      toSafeString(item?.content) ||
      '',
    current: Boolean(item?.current),
    bullets: Array.from(new Set(bullets)),
    tags: Array.from(new Set(tags)),
  };
};

const normalizeSectionItems = (section: any): any[] => {
  if (Array.isArray(section?.items)) return section.items;
  if (Array.isArray(section?.projects)) return section.projects;
  if (Array.isArray(section?.entries)) return section.entries;
  if (Array.isArray(section?.highlights)) return section.highlights.map((value: unknown) => ({ description: value }));

  const sectionContent = toSafeString(section?.content) || toSafeString(section?.description);
  if (sectionContent) return [{ description: sectionContent }];

  if (isPlainObject(section?.items)) return Object.values(section.items);
  if (isPlainObject(section?.projects)) return Object.values(section.projects);
  if (isPlainObject(section?.entries)) return Object.values(section.entries);

  return [];
};

const normalizeTopLevelProjectItems = (extractedData: any): any[] => {
  const topLevelSources = [
    extractedData?.keyProjects,
    extractedData?.projects,
    extractedData?.project,
    extractedData?.personalProjects,
    extractedData?.featuredProjects,
  ];

  for (const source of topLevelSources) {
    if (Array.isArray(source)) return source;
    if (typeof source === 'string') return [{ description: source }];
  }

  return [];
};

const normalizeTopLevelSectionCandidates = (extractedData: any): Array<{ type: string; title: string; items: any[] }> => {
  const ignoredKeys = new Set([
    'personalInfo',
    'sections',
    'title',
    'name',
    'summary',
    'contact',
    'meta',
    'metadata',
  ]);

  const candidates: Array<{ type: string; title: string; items: any[] }> = [];

  for (const [rawKey, rawValue] of Object.entries(extractedData || {})) {
    if (ignoredKeys.has(rawKey)) continue;

    const keyTitle = String(rawKey)
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const keyType = normalizeSectionType(rawKey, keyTitle);
    let items: any[] = [];

    if (Array.isArray(rawValue)) {
      items = rawValue;
    } else if (typeof rawValue === 'string') {
      items = [{ description: rawValue }];
    } else if (isPlainObject(rawValue)) {
      if (Array.isArray((rawValue as any).items)) items = (rawValue as any).items;
      else if (Array.isArray((rawValue as any).entries)) items = (rawValue as any).entries;
      else if (Array.isArray((rawValue as any).projects)) items = (rawValue as any).projects;
      else items = Object.values(rawValue);
    }

    if (items.length > 0) {
      candidates.push({
        type: keyType,
        title: keyType === 'projects' ? 'Projects' : keyTitle || defaultSectionTitleByType[keyType] || 'Custom Section',
        items,
      });
    }
  }

  return candidates;
};

const mergeSectionByTypeAndTitle = (sections: any[]) => {
  const map = new Map<string, any>();

  for (const section of sections) {
    const type = section.type || 'custom';
    const title = toSafeString(section.title) || defaultSectionTitleByType[type] || 'Custom Section';
    const key = `${type}::${title.toLowerCase()}`;

    if (!map.has(key)) {
      map.set(key, {
        ...section,
        type,
        title,
        id: section.id || uuidv4(),
        isVisible: true,
        items: Array.isArray(section.items) ? section.items : [],
      });
      continue;
    }

    const current = map.get(key);
    const existingFingerprints = new Set(
      (current.items || []).map((item: any) => JSON.stringify({
        title: item.title || '',
        subtitle: item.subtitle || '',
        description: item.description || '',
        bullets: item.bullets || [],
      }))
    );

    for (const item of section.items || []) {
      const fp = JSON.stringify({
        title: item.title || '',
        subtitle: item.subtitle || '',
        description: item.description || '',
        bullets: item.bullets || [],
      });
      if (!existingFingerprints.has(fp)) {
        current.items.push(item);
        existingFingerprints.add(fp);
      }
    }
  }

  return Array.from(map.values());
};

const normalizePersonalInfo = (rawPersonalInfo: any = {}) => {
  const rawContact = rawPersonalInfo?.contact || {};

  return {
    ...rawPersonalInfo,
    name: toSafeString(rawPersonalInfo?.name) || '',
    title: toSafeString(rawPersonalInfo?.title) || '',
    summary: toSafeString(rawPersonalInfo?.summary) || '',
    contact: {
      email: toSafeString(rawContact?.email) || toSafeString(rawPersonalInfo?.email) || '',
      phone: toSafeString(rawContact?.phone) || toSafeString(rawPersonalInfo?.phone) || '',
      location: toSafeString(rawContact?.location) || toSafeString(rawPersonalInfo?.location) || '',
      website: toSafeString(rawContact?.website) || toSafeString(rawPersonalInfo?.website) || '',
      linkedin: toSafeString(rawContact?.linkedin) || toSafeString(rawPersonalInfo?.linkedin) || '',
      github: toSafeString(rawContact?.github) || toSafeString(rawPersonalInfo?.github) || '',
    },
  };
};

const buildModeInstruction = (mode: WritingMode) => {
  if (mode === 'smart') {
    return `Writing mode: SMART
- Rewrite for natural human professional tone (formal, concise, credible, non-generic).
- Keep sentences short and scannable for recruiters and hiring managers.
- Prefer action + impact wording where impact already exists in source.
- Remove robotic/AI phrasing and fluff.
- Do NOT invent metrics, dates, tools, titles, responsibilities, or achievements.
- Do NOT change factual meaning.`;
  }

  return `Writing mode: STRICT
- Preserve source meaning and phrasing as closely as possible.
- Perform only minimal grammar/format cleanup needed for readability.
- Do NOT add, infer, or embellish any facts.`;
};

const buildJobDescriptionInstruction = (jobDescription: string) => {
  if (!jobDescription.trim()) {
    return `Job tailoring: OFF`;
  }

  return `Job tailoring: ON
Target job description:
"""${jobDescription.trim()}"""
Tailoring rules:
- Align wording, keyword emphasis, and ordering to match the target role.
- Keep all edits truthful to source resume content.
- If source does not support a requirement, do not fabricate it.
- Preserve original experience scope while improving relevance.`;
};

const buildPolishPrompt = (mode: WritingMode, jobDescription: string, extractedData: any) => `You are polishing extracted resume JSON.
Return ONLY JSON in the exact same structure.
Do not remove sections/items.
Do not invent facts.
Do not change factual meaning.

${buildModeInstruction(mode)}
${buildJobDescriptionInstruction(jobDescription)}

Polish only text fields for readability and recruiter scanning:
- personalInfo.summary
- section.title
- item.title, item.subtitle, item.description, item.bullets[]

Preserve all dates, chronology, role scope, organization names, and evidence.
If a field is empty, keep it empty.

Input JSON:
${JSON.stringify(extractedData)}`;

const hasSectionType = (sections: any[], type: string) =>
  Array.isArray(sections) && sections.some((section) => section?.type === type);

const extractPdfTextWithPython = (pdfPath: string): string => {
  const pythonScript = `
import sys
from pypdf import PdfReader
path = sys.argv[1]
reader = PdfReader(path)
text = "\\n".join((page.extract_text() or "") for page in reader.pages)
print(text)
`;

  const result = spawnSync('python3', ['-c', pythonScript, pdfPath], {
    encoding: 'utf-8',
    maxBuffer: 8 * 1024 * 1024,
  });

  if (result.status !== 0) {
    return '';
  }

  return (result.stdout || '').trim();
};

const parseSectionBlocksFromPdfText = (text: string): Array<{ title: string; body: string }> => {
  if (!text) return [];

  const lines = text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((line) => !/^\d+\s+of\s+\d+$/i.test(line));

  const looksLikeHeading = (line: string) => {
    if (line.length < 3 || line.length > 60) return false;
    if (!/[A-Z]/.test(line)) return false;
    if (!/^[A-Z0-9&/(),.\-+\s]+$/.test(line)) return false;
    const alphaOnly = line.replace(/[^A-Za-z]/g, '');
    if (alphaOnly.length < 3) return false;
    const upperRatio = alphaOnly.replace(/[^A-Z]/g, '').length / alphaOnly.length;
    return upperRatio > 0.9;
  };

  const blocks: Array<{ title: string; lines: string[] }> = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const line of lines) {
    if (looksLikeHeading(line)) {
      if (current && current.lines.length > 0) blocks.push(current);
      current = { title: line, lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }

  if (current && current.lines.length > 0) blocks.push(current);

  return blocks.map((block) => ({
    title: block.title,
    body: block.lines.join('\n').trim(),
  }));
};

const buildFallbackSectionsFromPdf = (pdfText: string, existingSections: any[]) => {
  const blocks = parseSectionBlocksFromPdfText(pdfText);
  if (blocks.length === 0) return [];

  const existingKeys = new Set(
    (existingSections || []).map((section: any) => {
      const type = normalizeSectionType(section?.type, section?.title);
      const title = toSafeString(section?.title) || defaultSectionTitleByType[type] || 'Custom Section';
      return `${type}::${title.toLowerCase()}`;
    })
  );

  const fallbackSections: any[] = [];

  for (const block of blocks) {
    const type = normalizeSectionType('', block.title);
    const title = toSafeString(block.title) || defaultSectionTitleByType[type] || 'Custom Section';
    const key = `${type}::${title.toLowerCase()}`;
    if (existingKeys.has(key)) continue;

    if (!block.body) continue;

    const lines = block.body.split('\n').map((line) => line.trim()).filter(Boolean);
    let item: any = {
      title: '',
      subtitle: '',
      location: '',
      date: '',
      dateEnd: '',
      current: false,
      description: block.body,
      bullets: [],
    };

    // For project-like fallback sections, use first line as editable project title.
    if (type === 'projects' && lines.length >= 1) {
      item = {
        ...item,
        title: lines[0],
        description: lines.slice(1).join(' ') || lines[0],
      };
    }

    fallbackSections.push({
      id: uuidv4(),
      type,
      title,
      isVisible: true,
      items: [normalizeItem(item)],
    });
  }

  return fallbackSections;
};

export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null;
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const rawMode = String(formData.get('mode') || 'strict').toLowerCase();
    const mode: WritingMode = rawMode === 'smart' ? 'smart' : 'strict';
    const jobDescription = String(formData.get('jobDescription') || '').trim();

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Save file to temp directory
    const buffer = Buffer.from(await file.arrayBuffer());
    const tempDir = os.tmpdir();
    tempFilePath = path.join(tempDir, `${uuidv4()}-${file.name}`);
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
- Read and extract content from ALL pages of the PDF, not just page 1.
- ALWAYS include a Projects section if project-like content exists (e.g., "Project", "Projects", "Personal Projects", "Academic Projects").
- Treat headings like "Key Project", "Key Projects", "Featured Projects", and "Major Projects" as Projects.
- Use type "projects" for all project sections.
- Do not drop sections just because heading names differ.
- Never omit non-empty sections, items, or bullets from the resume.
- If a section doesn't fit standard types, use "custom".
- For any custom field that does not exactly fit this schema, preserve it inside the closest item's "description" or "bullets" so no important information is lost.
${buildModeInstruction(mode)}
${buildJobDescriptionInstruction(jobDescription)}
Return ONLY the JSON block. No preamble or postamble.`;

    let fullContent = '';
    for await (const chunk of api.chatCompletion(sessionId, prompt, false, [fileInfo.id])) {
      if (chunk.content) {
        fullContent += chunk.content;
      }
    }

    // Parse JSON
    const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to extract JSON from AI response', raw: fullContent }, { status: 500 });
    }

    const extractedData = JSON.parse(jsonMatch[0]);

    // 5. Recovery pass: ask for missing sections explicitly, then merge.
    const recoveryPrompt = `You previously extracted resume JSON.
Find ANY sections that may be missing from the first extraction, especially from later pages.
Focus on headings like KEY PROJECTS / FEATURED PROJECTS / ACHIEVEMENTS / VOLUNTEERING / PUBLICATIONS.
Return JSON only in this structure:
{
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
If nothing is missing, return {"sections":[]}.`;

    let recoveryContent = '';
    for await (const chunk of api.chatCompletion(sessionId, recoveryPrompt, false, [fileInfo.id])) {
      if (chunk.content) recoveryContent += chunk.content;
    }

    let recoveryData: any = { sections: [] };
    const recoveryMatch = recoveryContent.match(/\{[\s\S]*\}/);
    if (recoveryMatch) {
      try {
        recoveryData = JSON.parse(recoveryMatch[0]);
      } catch {
        recoveryData = { sections: [] };
      }
    }

    extractedData.personalInfo = normalizePersonalInfo(extractedData.personalInfo);

    // Ensure IDs, canonical section types, and valid structure
    const primarySections = Array.isArray(extractedData.sections) ? extractedData.sections : [];
    const secondarySections = Array.isArray(recoveryData.sections) ? recoveryData.sections : [];

    const normalizeSections = (sections: any[]) =>
      sections
        .map((section: any) => {
          const mappedType = normalizeSectionType(section?.type, section?.title);
          const normalizedItems = normalizeSectionItems(section);

          return {
            ...section,
            id: uuidv4(),
            type: mappedType,
            title: section?.title || defaultSectionTitleByType[mappedType] || 'Custom Section',
            isVisible: true,
            items: normalizedItems.map((item: any) => normalizeItem(item)),
          };
        });

    extractedData.sections = normalizeSections([...primarySections, ...secondarySections]);

    // Recovery path: if AI returns projects at top-level (outside "sections"), preserve them.
    const hasProjectsSection = extractedData.sections.some((section: any) => section.type === 'projects');
    if (!hasProjectsSection) {
      const topLevelProjects = normalizeTopLevelProjectItems(extractedData);
      if (topLevelProjects.length > 0) {
        extractedData.sections.push({
          id: uuidv4(),
          type: 'projects',
          title: 'Projects',
          isVisible: true,
          items: topLevelProjects.map((item: any) => normalizeItem(item)),
        });
      }
    }

    // Recovery path: if AI returns extra top-level section-like fields, convert and merge them.
    const topLevelCandidates = normalizeTopLevelSectionCandidates(extractedData).map((candidate) => ({
      id: uuidv4(),
      type: candidate.type,
      title: candidate.title,
      isVisible: true,
      items: candidate.items.map((item) => normalizeItem(item)),
    }));

    extractedData.sections = mergeSectionByTypeAndTitle([...extractedData.sections, ...topLevelCandidates])
      .filter((section: any) => Array.isArray(section.items) && section.items.length > 0);

    // Hard guard: if projects are still missing, run a targeted extraction for project-like headings only.
    if (!hasSectionType(extractedData.sections, 'projects')) {
      const projectsOnlyPrompt = `Extract ONLY project-related sections from the attached resume PDF.
Project-related headings include:
- PROJECTS
- KEY PROJECT / KEY PROJECTS
- FEATURED PROJECTS
- MAJOR PROJECTS
- PERSONAL PROJECTS
- ACADEMIC PROJECTS

Rules:
- Read ALL pages.
- If any project-related heading exists, you MUST return at least one section with type "projects".
- Keep facts exactly from source. Do not invent.
- Return JSON only in this format:
{
  "sections": [
    {
      "type": "projects",
      "title": "Projects",
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
If there is truly no project-related heading/content, return {"sections":[]}.`;

      let projectsOnlyContent = '';
      for await (const chunk of api.chatCompletion(sessionId, projectsOnlyPrompt, false, [fileInfo.id])) {
        if (chunk.content) projectsOnlyContent += chunk.content;
      }

      const projectsOnlyMatch = projectsOnlyContent.match(/\{[\s\S]*\}/);
      if (projectsOnlyMatch) {
        try {
          const projectsOnlyData = JSON.parse(projectsOnlyMatch[0]);
          const projectSections = Array.isArray(projectsOnlyData?.sections) ? projectsOnlyData.sections : [];
          const normalizedProjectSections = projectSections.map((section: any) => {
            const mappedType = normalizeSectionType(section?.type, section?.title);
            const normalizedItems = normalizeSectionItems(section);
            return {
              ...section,
              id: uuidv4(),
              type: mappedType,
              title: section?.title || defaultSectionTitleByType[mappedType] || 'Projects',
              isVisible: true,
              items: normalizedItems.map((item: any) => normalizeItem(item)),
            };
          });

          extractedData.sections = mergeSectionByTypeAndTitle([
            ...extractedData.sections,
            ...normalizedProjectSections,
          ]).filter((section: any) => Array.isArray(section.items) && section.items.length > 0);
        } catch {
          // no-op: keep existing data if targeted parse fails
        }
      }
    }

    // Deterministic fallback: ensure no text section from PDF disappears if AI misses it.
    if (tempFilePath) {
      const pdfText = extractPdfTextWithPython(tempFilePath);
      if (pdfText) {
        const fallbackSections = buildFallbackSectionsFromPdf(pdfText, extractedData.sections);
        if (fallbackSections.length > 0) {
          extractedData.sections = mergeSectionByTypeAndTitle([...extractedData.sections, ...fallbackSections])
            .filter((section: any) => Array.isArray(section.items) && section.items.length > 0);
        }
      }
    }

    // Final controlled polish pass. Keeps structure/facts intact while improving wording based on mode and job description.
    if (mode === 'smart' || jobDescription) {
      const polishPrompt = buildPolishPrompt(mode, jobDescription, extractedData);
      let polishContent = '';
      for await (const chunk of api.chatCompletion(sessionId, polishPrompt, false)) {
        if (chunk.content) polishContent += chunk.content;
      }

      const polishMatch = polishContent.match(/\{[\s\S]*\}/);
      if (polishMatch) {
        try {
          const polished = JSON.parse(polishMatch[0]);
          if (polished && Array.isArray(polished.sections)) {
            // Re-normalize polished payload to enforce our schema guarantees.
            const polishedSections = Array.isArray(polished.sections) ? polished.sections : [];
            const normalizedPolishedSections = polishedSections.map((section: any) => {
              const mappedType = normalizeSectionType(section?.type, section?.title);
              const normalizedItems = normalizeSectionItems(section);
              return {
                ...section,
                id: uuidv4(),
                type: mappedType,
                title: section?.title || defaultSectionTitleByType[mappedType] || 'Custom Section',
                isVisible: true,
                items: normalizedItems.map((item: any) => normalizeItem(item)),
              };
            });

            extractedData.sections = mergeSectionByTypeAndTitle(normalizedPolishedSections)
              .filter((section: any) => Array.isArray(section.items) && section.items.length > 0);
            extractedData.personalInfo = normalizePersonalInfo(polished.personalInfo || extractedData.personalInfo);
          }
        } catch {
          // If polish parse fails, keep the extractedData we already validated.
        }
      }
    }

    return NextResponse.json(extractedData);
  } catch (error: any) {
    console.error('Extraction error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {
        // Best-effort cleanup.
      }
    }
  }
}
