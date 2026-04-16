import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import puppeteer from 'puppeteer';

// PDF Generation API Route
// This endpoint generates a PDF from the resume data

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resumeId, preview = false, content, theme_config, title } = body;

    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let resumeContent = content;
    let resumeTheme = theme_config;
    let resumeTitle = title || 'resume';

    // If inline data is not provided, fallback to DB by resumeId
    if (!resumeContent || !resumeTheme) {
      if (!resumeId) {
        return NextResponse.json(
          { error: 'Resume ID is required' },
          { status: 400 }
        );
      }

      const { data: resume, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', resumeId)
        .single();

      if (error || !resume) {
        return NextResponse.json(
          { error: 'Resume not found' },
          { status: 404 }
        );
      }

      // Verify ownership
      if (resume.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      resumeContent = resume.content;
      resumeTheme = resume.theme_config;
      resumeTitle = resume.title || resumeTitle;
    }

    // Generate HTML for PDF
    const html = generateResumeHtml(resumeContent, resumeTheme);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      // Set content
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      // Determine page size
      const pageSize = resumeTheme.layout.pageSize || 'A4';
      const width = pageSize === 'Letter' ? '215.9mm' : '210mm';
      const height = pageSize === 'Letter' ? '279.4mm' : '297mm';

      // Generate PDF
      const pdf = await page.pdf({
        width,
        height,
        printBackground: true,
        margin: {
          top: '0px',
          right: '0px',
          bottom: '0px',
          left: '0px',
        },
      });

      const pageCountMatch = Buffer.from(pdf)
        .toString('latin1')
        .match(/\/Type\s*\/Page\b/g);
      const pageCount = pageCountMatch?.length || 1;

      // Return PDF as response
      return new NextResponse(pdf as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `${preview ? 'inline' : 'attachment'}; filename="${resumeTitle || 'resume'}.pdf"`,
          'Content-Length': pdf.length.toString(),
          'X-Page-Count': String(pageCount),
        },
      });
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

function generateResumeHtml(
  content: { personalInfo: any; sections: any[] },
  theme: any
): string {
  // Helper to convert pt to px for PDF
  const convertPtToPx = (pt: string): string => {
    const value = parseFloat(pt);
    if (isNaN(value)) return pt;
    return `${value * 1.333}px`;
  };

  const baseFontSize = convertPtToPx(theme.fontSizes.base);
  const headerFontSize = convertPtToPx(theme.fontSizes.header);
  const subHeaderFontSize = convertPtToPx(theme.fontSizes.subHeader);
  const smallFontSize = convertPtToPx(theme.fontSizes.small);

  // Default values for new theme properties if missing
  const margins = theme.spacing.margins || { top: '40px', right: '40px', bottom: '40px', left: '40px' };
  const photo = theme.photo || { visible: false };

  const renderSection = (section: any) => {
    if (!section.isVisible) return '';

    return `
      <section class="section" style="margin-bottom: ${theme.spacing.section};">
        <h2 class="section-title" style="
          font-size: ${subHeaderFontSize};
          color: ${theme.colors.primary};
          font-weight: bold;
          text-transform: uppercase;
          border-bottom: 1px solid ${theme.colors.border};
          padding-bottom: 4px;
          margin-bottom: 12px;
        ">
          ${section.title}
        </h2>
        
        <div class="section-items" style="display: flex; flex-direction: column; gap: ${theme.spacing.item};">
          ${section.items.map((item: any) => {
      const visibility = item.fieldVisibility || {
        title: true,
        subtitle: true,
        date: true,
        location: true,
        description: true
      };

      const isVisible = (field: string) => visibility[field] !== false;

      return `
            <div class="item">
              ${(isVisible('title') || isVisible('date')) ? `
                <div class="item-header" style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
                  ${isVisible('title') ? `
                    <h3 class="item-title" style="
                      font-size: ${baseFontSize};
                      font-weight: 600;
                      margin: 0;
                    ">${item.title || ''}</h3>
                  ` : '<div></div>'}
                  
                  ${isVisible('date') ? `
                    <div class="item-date" style="
                      font-size: ${smallFontSize};
                      color: ${theme.colors.muted};
                      text-align: right;
                      white-space: nowrap;
                    ">
                      ${item.date || ''}${item.current ? ' - Present' : item.dateEnd ? ` - ${item.dateEnd}` : ''}
                    </div>
                  ` : ''}
                </div>
              ` : ''}

              ${(isVisible('subtitle') || isVisible('location')) ? `
                <div class="item-subheader" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  ${isVisible('subtitle') ? `
                    <div class="item-subtitle" style="
                      font-size: ${smallFontSize};
                      color: ${theme.colors.muted};
                      font-weight: 500;
                    ">${item.subtitle || item.organization || ''}</div>
                  ` : '<div></div>'}
                  
                  ${isVisible('location') ? `
                    <div class="item-location" style="
                      font-size: ${smallFontSize};
                      color: ${theme.colors.muted};
                      text-align: right;
                    ">${item.location || ''}</div>
                  ` : ''}
                </div>
              ` : ''}
              
              ${isVisible('description') && item.description ? `
                <div class="item-description prose" style="
                  font-size: ${smallFontSize};
                  margin-top: 4px;
                  line-height: 1.4;
                ">${item.description}</div>
              ` : ''}
              
              ${item.bullets && item.bullets.length > 0 ? `
                <ul class="item-bullets" style="
                  margin-top: 4px;
                  padding-left: 18px;
                  margin-bottom: 0;
                  list-style-type: disc;
                ">
                  ${item.bullets.map((bullet: string) => `
                    <li class="bullet-item" style="
                      font-size: ${smallFontSize};
                      margin-bottom: 2px;
                      line-height: 1.4;
                    ">${bullet}</li>
                  `).join('')}
                </ul>
              ` : ''}
              
              ${item.tags && item.tags.length > 0 ? `
                <div class="item-tags" style="
                  display: flex;
                  flex-wrap: wrap;
                  gap: 4px;
                  margin-top: 6px;
                ">
                  ${item.tags.map((tag: string) => `
                    <span class="tag" style="
                      background-color: ${theme.colors.primary}15;
                      color: ${theme.colors.primary};
                      padding: 2px 8px;
                      border-radius: 4px;
                      font-size: ${Number(parseFloat(smallFontSize) * 0.9)}px;
                      font-weight: 500;
                    ">${tag}</span>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `;
    }).join('')}
        </div>
      </section>
    `;
  };

  const mainColumnTypes = ['experience', 'projects', 'education', 'custom'];
  const sidebarColumnTypes = ['skills', 'languages', 'certifications', 'interests'];

  let sectionsHtml = '';
  if (theme.layout.columns === 'double') {
    const mainSections = content.sections.filter(s => mainColumnTypes.includes(s.type));
    const sidebarSections = content.sections.filter(s => sidebarColumnTypes.includes(s.type));

    sectionsHtml = `
      <div class="columns-wrapper" style="display: flex; gap: 40px; align-items: flex-start;">
        <div class="main-column" style="flex: 2;">
          ${mainSections.map(renderSection).join('')}
        </div>
        <div class="sidebar-column" style="flex: 1; border-left: 1px solid ${theme.colors.border}; padding-left: 40px; height: 100%;">
          ${sidebarSections.map(renderSection).join('')}
        </div>
      </div>
    `;
  } else {
    sectionsHtml = `
      <div class="single-column">
        ${content.sections.map(renderSection).join('')}
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          margin: ${margins.top} ${margins.right} ${margins.bottom} ${margins.left};
        }
        
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
        }
        
        body {
          font-family: ${theme.fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: ${baseFontSize};
          color: ${theme.colors.text};
          background-color: ${theme.colors.background};
          margin: 0;
          padding: 0;
          line-height: 1.5;
          width: 100%;
        }

        .prose p { margin: 0; }
        .prose ul { margin: 0; padding-left: 18px; }
        .prose li { margin: 0; }
        
        .resume-header {
          padding-bottom: ${theme.spacing.section};
          border-bottom: 1px solid ${theme.colors.border};
          margin-bottom: ${theme.spacing.section};
          width: 100%;
        }

        .header-content {
          display: flex;
          align-items: flex-start;
          gap: 24px;
          flex-direction: ${theme.layout.headerAlign === 'right' ? 'row-reverse' : 'row'};
        }
        
        .header-text {
          flex: 1;
          text-align: ${theme.layout.headerAlign};
        }
        
        .resume-name {
          font-size: ${headerFontSize};
          color: ${theme.colors.primary};
          margin: 0;
          font-weight: bold;
          line-height: 1.2;
        }
        
        .resume-title {
          font-size: ${subHeaderFontSize};
          color: ${theme.colors.muted};
          margin: 4px 0 0 0;
        }
        
        .resume-contact {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 12px;
          font-size: ${smallFontSize};
          justify-content: ${theme.layout.headerAlign === 'center' ? 'center' : theme.layout.headerAlign === 'right' ? 'flex-end' : 'flex-start'};
          color: ${theme.colors.muted};
        }
        
        .resume-summary {
          margin-top: 12px;
          margin-bottom: ${theme.spacing.section};
          text-align: ${theme.layout.summaryAlign};
        }

        .resume-summary p {
          margin: 0;
        }

        .photo-container {
          flex-shrink: 0;
        }

        .photo {
          object-fit: cover;
          width: ${photo.size || '100px'};
          height: ${photo.size || '100px'};
          border-width: ${photo.borderWidth || '0px'};
          border-color: ${photo.borderColor || '#e5e7eb'};
          border-style: solid;
        }

        .photo.circle { border-radius: 50%; }
        .photo.rounded { border-radius: 8px; }
        .photo.grayscale { filter: grayscale(100%); }

        /* Page break controls */
        .section {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .item {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        h2, h3 {
          break-after: avoid;
          page-break-after: avoid;
        }

        ul, ol {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        /* Page numbers */
        @page {
          @bottom-center {
            content: counter(page) " of " counter(pages);
            font-size: 9pt;
            color: ${theme.colors.muted};
          }
        }
      </style>
    </head>
    <body>
      <div class="resume-header" style="${theme.layout.headerAlign === 'center' ? 'text-align: center;' : ''}">
        <div class="header-content" style="${theme.layout.headerAlign === 'center' ? 'flex-direction: column; align-items: center;' : ''}">
          ${photo.visible ? `
            <div class="photo-container">
              ${content.personalInfo.avatar ?
        `<img src="${content.personalInfo.avatar}" class="photo ${photo.shape || 'square'} ${photo.grayscale ? 'grayscale' : ''}" />` :
        `<div class="photo ${photo.shape || 'square'}" style="background: #e2e8f0; display: flex; align-items: center; justify-content: center; color: #94a3b8;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        </div>`
      }
            </div>
          ` : ''}

          <div class="header-text">
            <h1 class="resume-name">${content.personalInfo.name || 'Your Name'}</h1>
            <p class="resume-title">${content.personalInfo.title || ''}</p>
            
            <div class="resume-contact">
              ${content.personalInfo.contact.email ? `<span>${content.personalInfo.contact.email}</span>` : ''}
              ${content.personalInfo.contact.phone ? `<span>${content.personalInfo.contact.phone}</span>` : ''}
              ${content.personalInfo.contact.location ? `<span>${content.personalInfo.contact.location}</span>` : ''}
              ${content.personalInfo.contact.website ? `<span>${content.personalInfo.contact.website}</span>` : ''}
              ${content.personalInfo.contact.linkedin ? `<span>${content.personalInfo.contact.linkedin}</span>` : ''}
              ${content.personalInfo.contact.github ? `<span>${content.personalInfo.contact.github}</span>` : ''}
            </div>
          </div>
        </div>
      </div>
      
      ${content.personalInfo.summary ? `
        <div class="resume-summary prose">${content.personalInfo.summary}</div>
      ` : ''}

      <div class="resume-content">
        ${sectionsHtml}
      </div>
    </body>
    </html>
  `;
}
