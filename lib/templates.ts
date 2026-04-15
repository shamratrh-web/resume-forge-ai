import { ThemeConfig } from "@/types/resume";

export interface Template {
  id: string;
  name: string;
  description: string;
  config: ThemeConfig;
}

export const TEMPLATES: Template[] = [
  {
    id: 'ats-classic',
    name: 'ATS Professional',
    description: 'Ultra-clean, single column layout optimized for scanner compatibility and readability.',
    config: {
      fontFamily: 'Arial',
      colors: {
        primary: '#000000',
        text: '#000000',
        background: '#ffffff',
        muted: '#4b5563',
        border: '#e5e7eb',
      },
      fontSizes: {
        base: '10pt',
        header: '22pt',
        subHeader: '12pt',
        small: '9pt',
      },
      spacing: {
        section: '12px',
        item: '8px',
        margins: { top: '50px', right: '50px', bottom: '50px', left: '50px' },
        padding: '0px',
      },
      layout: {
        columns: 'single',
        leftColWidth: '0%',
        headerAlign: 'left',
        pageSize: 'A4',
      },
      photo: {
        visible: false,
        shape: 'square',
        size: '0px',
        borderWidth: '0px',
        borderColor: '#000000',
        borderRadius: '0px',
        grayscale: false,
      },
    }
  },
  {
    id: 'modern-sidebar',
    name: 'Modern Two-Column',
    description: 'Elegant layout with a dedicated sidebar for contact info and skills.',
    config: {
      fontFamily: 'Inter',
      colors: {
        primary: '#2563eb',
        text: '#1f2937',
        background: '#ffffff',
        muted: '#6b7280',
        border: '#f3f4f6',
      },
      fontSizes: {
        base: '10.5pt',
        header: '26pt',
        subHeader: '13pt',
        small: '9.5pt',
      },
      spacing: {
        section: '20px',
        item: '14px',
        margins: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
        padding: '40px',
      },
      layout: {
        columns: 'double',
        leftColWidth: '32%',
        headerAlign: 'left',
        pageSize: 'A4',
      },
      photo: {
        visible: true,
        shape: 'circle',
        size: '120px',
        borderWidth: '4px',
        borderColor: '#ffffff',
        borderRadius: '100%',
        grayscale: false,
      },
    }
  },
  {
    id: 'executive-dark',
    name: 'Executive Dark',
    description: 'Sophisticated design with high-contrast elements for leadership roles.',
    config: {
      fontFamily: 'Georgia',
      colors: {
        primary: '#1e293b',
        text: '#334155',
        background: '#ffffff',
        muted: '#64748b',
        border: '#cbd5e1',
      },
      fontSizes: {
        base: '11pt',
        header: '28pt',
        subHeader: '14pt',
        small: '10pt',
      },
      spacing: {
        section: '24px',
        item: '16px',
        margins: { top: '60px', right: '60px', bottom: '60px', left: '60px' },
        padding: '0px',
      },
      layout: {
        columns: 'single',
        leftColWidth: '0%',
        headerAlign: 'center',
        pageSize: 'A4',
      },
      photo: {
        visible: false,
        shape: 'square',
        size: '0px',
        borderWidth: '0px',
        borderColor: '#000000',
        borderRadius: '0px',
        grayscale: false,
      },
    }
  },
  {
    id: 'creative-minimal',
    name: 'Creative Minimal',
    description: 'Playful yet professional with vibrant accents and modern typography.',
    config: {
      fontFamily: 'Verdana',
      colors: {
        primary: '#db2777',
        text: '#111827',
        background: '#ffffff',
        muted: '#4b5563',
        border: '#fbcfe8',
      },
      fontSizes: {
        base: '10.5pt',
        header: '32pt',
        subHeader: '12pt',
        small: '9.5pt',
      },
      spacing: {
        section: '18px',
        item: '12px',
        margins: { top: '40px', right: '40px', bottom: '40px', left: '40px' },
        padding: '0px',
      },
      layout: {
        columns: 'single',
        leftColWidth: '0%',
        headerAlign: 'left',
        pageSize: 'Letter',
      },
      photo: {
        visible: true,
        shape: 'rounded',
        size: '90px',
        borderWidth: '2px',
        borderColor: '#db2777',
        borderRadius: '12px',
        grayscale: true,
      },
    }
  }
];
