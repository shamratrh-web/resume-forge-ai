import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import puppeteer from 'puppeteer';

// PDF Generation API Route
// This endpoint generates a PDF from the resume data

export async function POST(request: NextRequest) {
  try {
    const { resumeId } = await request.json();

    if (!resumeId) {
      return NextResponse.json(
        { error: 'Resume ID is required' },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch resume from database
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

    // Generate HTML for PDF
    const html = generateResumeHtml(resume.content, resume.theme_config);

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
      const pageSize = resume.theme_config.layout.pageSize || 'A4';
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

      // Return PDF as response
      return new NextResponse(pdf as any, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${resume.title || 'resume'}.pdf"`,
          'Content-Length': pdf.length.toString(),
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

  const sectionsHtml = content.sections
    .filter((section: any) => section.isVisible)
    .map((section: any) => `
      <div class="section" style="margin-bottom: ${theme.spacing.section};">
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
          ${section.items.map((item: any) => `
            <div class="item">
              <div class="item-header" style="display: flex; justify-content: space-between; align-items: baseline;">
                <div class="item-title-wrapper">
                  <h3 class="item-title" style="
                    font-size: ${baseFontSize};
                    font-weight: 600;
                    margin: 0;
                  ">${item.title || ''}</h3>
                  ${(item.subtitle || item.organization) ? `
                    <p class="item-subtitle" style="
                      font-size: ${smallFontSize};
                      color: ${theme.colors.muted};
                      margin: 0;
                      font-weight: 500;
                    ">${item.subtitle || item.organization}</p>
                  ` : ''}
                </div>
                
                <div class="item-date-wrapper" style="text-align: right;">
                  ${(item.date || item.dateEnd) ? `
                    <p class="item-date" style="
                      font-size: ${smallFontSize};
                      color: ${theme.colors.muted};
                      margin: 0;
                    ">${item.date}${item.current ? ' - Present' : item.dateEnd ? ` - ${item.dateEnd}` : ''}</p>
                  ` : ''}
                  ${item.location ? `
                    <p class="item-location" style="
                      font-size: ${smallFontSize};
                      color: ${theme.colors.muted};
                      margin: 0;
                    ">${item.location}</p>
                  ` : ''}
                </div>
              </div>
              
              ${item.description ? `
                <div class="item-description prose" style="
                  font-size: ${smallFontSize};
                  margin-top: 4px;
                ">${item.description}</div>
              ` : ''}
              
              ${item.bullets && item.bullets.length > 0 ? `
                <ul class="item-bullets" style="
                  margin-top: 4px;
                  padding-left: 16px;
                  margin-bottom: 0;
                  list-style-type: disc;
                ">
                  ${item.bullets.map((bullet: string) => `
                    <li class="bullet-item" style="
                      font-size: ${smallFontSize};
                      margin-bottom: 2px;
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
          `).join('')}
        </div>
      </div>
    `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: ${theme.fontFamily}, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: ${baseFontSize};
          color: ${theme.colors.text};
          background-color: ${theme.colors.background};
          margin: 0;
          padding-top: ${margins.top};
          padding-right: ${margins.right};
          padding-bottom: ${margins.bottom};
          padding-left: ${margins.left};
          line-height: 1.5;
        }

        .prose p { margin: 0; }
        .prose ul { margin: 0; padding-left: 16px; }
        .prose li { margin: 0; }
        
        .resume-header {
          padding-bottom: ${theme.spacing.section};
          border-bottom: 1px solid ${theme.colors.border};
          margin-bottom: ${theme.spacing.section};
        }

        .header-content {
          display: flex;
          align-items: flex-start;
          gap: 24px;
        }
        
        .header-text {
          flex: 1;
        }
        
        .resume-name {
          font-size: ${headerFontSize};
          color: ${theme.colors.primary};
          margin: 0;
          text-align: ${theme.layout.headerAlign};
          font-weight: bold;
          line-height: 1.2;
        }
        
        .resume-title {
          font-size: ${subHeaderFontSize};
          color: ${theme.colors.muted};
          margin: 4px 0 0 0;
          text-align: ${theme.layout.headerAlign};
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
          text-align: ${theme.layout.headerAlign};
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
      </style>
    </head>
    <body>
      <div class="resume-header">
        <div class="header-content">
          ${photo.visible && theme.layout.headerAlign === 'left' ? `
            <div class="photo-container">
              ${content.personalInfo.avatar ?
        `<img src="${content.personalInfo.avatar}" class="photo ${photo.shape || 'square'} ${photo.grayscale ? 'grayscale' : ''}" />` :
        `<div class="photo ${photo.shape || 'square'}" style="background: #e2e8f0;"></div>`
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
            </div>
            
            ${content.personalInfo.summary ? `
              <div class="resume-summary prose">${content.personalInfo.summary}</div>
            ` : ''}
          </div>

          ${photo.visible && theme.layout.headerAlign !== 'left' ? `
            <div class="photo-container">
              ${content.personalInfo.avatar ?
        `<img src="${content.personalInfo.avatar}" class="photo ${photo.shape || 'square'} ${photo.grayscale ? 'grayscale' : ''}" />` :
        `<div class="photo ${photo.shape || 'square'}" style="background: #e2e8f0;"></div>`
      }
            </div>
          ` : ''}
        </div>
      </div>
      
      <div class="resume-sections">
        ${sectionsHtml}
      </div>
    </body>
    </html>
  `;
}
