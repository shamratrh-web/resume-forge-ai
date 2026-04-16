import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import {
  ResumeData,
  ResumeSection,
  ResumeItem,
  SectionType,
  ThemeConfig,
  PersonalInfo,
  ContactInfo,
} from '@/types/resume';
import { generateId } from '@/lib/utils';

// Default theme configuration
const defaultTheme: ThemeConfig = {
  fontFamily: 'Inter',
  colors: {
    primary: '#2563eb',
    text: '#1f2937',
    background: '#ffffff',
    muted: '#6b7280',
    border: '#e5e7eb',
  },
  fontSizes: {
    base: '10.5pt',
    header: '24pt',
    subHeader: '12pt',
    small: '9pt',
  },
  spacing: {
    section: '15px',
    item: '14px',
    margins: {
      top: '40px',
      right: '40px',
      bottom: '40px',
      left: '40px',
    },
    padding: '20px',
  },
  layout: {
    columns: 'single',
    leftColWidth: '30%',
    headerAlign: 'left',
    summaryAlign: 'left',
    pageSize: 'A4',
  },
  photo: {
    visible: false,
    shape: 'square',
    size: '100px',
    borderWidth: '0px',
    borderColor: '#e5e7eb',
    borderRadius: '0px',
    grayscale: false,
  },
};

// Default personal info
const defaultPersonalInfo: PersonalInfo = {
  name: 'Your Name',
  title: 'Professional Title',
  contact: {
    email: 'email@example.com',
    phone: '+1 (555) 123-4567',
    location: 'City, Country',
    website: 'https://yourwebsite.com',
  },
};

// Default sections
const createDefaultSections = (): ResumeSection[] => [
  {
    id: uuidv4(),
    type: 'experience',
    title: 'Work Experience',
    isVisible: true,
    items: [
      {
        id: uuidv4(),
        title: 'Senior Position',
        subtitle: 'Company Name',
        date: '2022-01',
        dateEnd: '',
        current: true,
        location: 'City, Country',
        description: 'Describe your responsibilities and achievements...',
        bullets: ['Key responsibility or achievement', 'Another accomplishment'],
      },
    ],
  },
  {
    id: uuidv4(),
    type: 'education',
    title: 'Education',
    isVisible: true,
    items: [
      {
        id: uuidv4(),
        title: 'Bachelor of Science',
        subtitle: 'University Name',
        date: '2018-09',
        dateEnd: '2022-05',
        location: 'City, Country',
        description: 'Major: Computer Science, GPA: 3.8/4.0',
      },
    ],
  },
  {
    id: uuidv4(),
    type: 'skills',
    title: 'Skills',
    isVisible: true,
    items: [
      {
        id: uuidv4(),
        title: 'Technical Skills',
        bullets: ['JavaScript / TypeScript', 'React / Next.js', 'Node.js', 'Python'],
      },
    ],
  },
];

interface ResumeState {
  // Data
  resume: ResumeData;
  
  // History
  past: ResumeData[];
  future: ResumeData[];
  
  // UI State
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  selectedSectionId: string | null;
  selectedItemId: string | null;
  
  // Actions
  setResume: (resume: ResumeData) => void;
  resetResume: () => void;
  updateTitle: (title: string) => void;
  
  // Undo/Redo Actions
  undo: () => void;
  redo: () => void;
  pushToHistory: () => void;
  
  // Personal Info Actions
  updatePersonalInfo: (field: keyof PersonalInfo, value: string | ContactInfo) => void;
  updateContactInfo: (field: string, value: string) => void;
  
  // Theme Actions
  updateTheme: (path: string, value: any) => void;
  updateThemeColors: (colors: Partial<ThemeConfig['colors']>) => void;
  setTheme: (theme: ThemeConfig) => void;
  
  // Section Actions
  addSection: (type: SectionType) => void;
  removeSection: (sectionId: string) => void;
  updateSection: (sectionId: string, field: 'title' | 'isVisible', value: string | boolean) => void;
  reorderSections: (activeId: string, overId: string) => void;
  
  // Item Actions
  addItem: (sectionId: string) => void;
  removeItem: (sectionId: string, itemId: string) => void;
  updateItem: (sectionId: string, itemId: string, field: keyof ResumeItem, value: string | string[] | boolean) => void;
  toggleItemField: (sectionId: string, itemId: string, field: string) => void;
  updateBullet: (sectionId: string, itemId: string, bulletIndex: number, value: string) => void;
  updateTag: (sectionId: string, itemId: string, tagIndex: number, value: string) => void;
  addBullet: (sectionId: string, itemId: string, bullet: string) => void;
  removeBullet: (sectionId: string, itemId: string, bulletIndex: number) => void;
  reorderItems: (sectionId: string, activeId: string, overId: string) => void;
  
  // Selection Actions
  selectSection: (sectionId: string | null) => void;
  selectItem: (itemId: string | null) => void;
  
  // Save Actions
  setSaving: (isSaving: boolean) => void;
  setUnsavedChanges: (hasChanges: boolean) => void;
  toggleDraft: (isDraft: boolean) => void;
}

const initialResume: ResumeData = {
  title: 'Untitled Resume',
  is_draft: true,
  personalInfo: defaultPersonalInfo,
  sections: createDefaultSections(),
  theme: defaultTheme,
};

export const useResumeStore = create<ResumeState>()(
  immer((set, get) => ({
    // Initial State
    resume: initialResume,
    past: [],
    future: [],
    isLoading: false,
    isSaving: false,
    hasUnsavedChanges: false,
    selectedSectionId: null,
    selectedItemId: null,

    // Helper to push to history
    pushToHistory: () => {
      const state = get();
      set((s) => {
        s.past.push(JSON.parse(JSON.stringify(state.resume)));
        s.future = [];
        if (s.past.length > 50) s.past.shift();
      });
    },

    // Set Resume
    setResume: (resume) =>
      set((state) => {
        state.resume = resume;
        state.hasUnsavedChanges = false;
        state.past = [];
        state.future = [];
      }),

    resetResume: () =>
      set((state) => {
        state.resume = {
          title: 'Untitled Resume',
          personalInfo: defaultPersonalInfo,
          sections: createDefaultSections(),
          theme: defaultTheme,
        };
        state.hasUnsavedChanges = false;
        state.past = [];
        state.future = [];
      }),

    updateTitle: (title) => {
      get().pushToHistory();
      set((state) => {
        state.resume.title = title;
        state.hasUnsavedChanges = true;
      });
    },

    undo: () => {
      const state = get();
      if (state.past.length === 0) return;
      
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);
      
      set((s) => {
        s.future.push(JSON.parse(JSON.stringify(s.resume)));
        s.resume = previous;
        s.past = newPast;
        s.hasUnsavedChanges = true;
      });
    },

    redo: () => {
      const state = get();
      if (state.future.length === 0) return;
      
      const next = state.future[state.future.length - 1];
      const newFuture = state.future.slice(0, state.future.length - 1);
      
      set((s) => {
        s.past.push(JSON.parse(JSON.stringify(s.resume)));
        s.resume = next;
        s.future = newFuture;
        s.hasUnsavedChanges = true;
      });
    },

    // Personal Info Actions
    updatePersonalInfo: (field, value) => {
      get().pushToHistory();
      set((state) => {
        if (field === 'contact') {
          state.resume.personalInfo.contact = value as PersonalInfo['contact'];
        } else {
          (state.resume.personalInfo as any)[field] = value;
        }
        state.hasUnsavedChanges = true;
      });
    },

    updateContactInfo: (field, value) => {
      get().pushToHistory();
      set((state) => {
        (state.resume.personalInfo.contact as any)[field] = value;
        state.hasUnsavedChanges = true;
      });
    },

    // Theme Actions
    updateTheme: (path, value) => {
      get().pushToHistory();
      set((state) => {
        const keys = path.split('.');
        let current: any = state.resume.theme;
        
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) current[keys[i]] = {};
          current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
        state.hasUnsavedChanges = true;
      });
    },

    updateThemeColors: (colors) => {
      get().pushToHistory();
      set((state) => {
        state.resume.theme.colors = { ...state.resume.theme.colors, ...colors };
        state.hasUnsavedChanges = true;
      });
    },

    setTheme: (theme) => {
      get().pushToHistory();
      set((state) => {
        state.resume.theme = theme;
        state.hasUnsavedChanges = true;
      });
    },

    // Section Actions
    addSection: (type) => {
      get().pushToHistory();
      set((state) => {
        const sectionTitles: Record<SectionType, string> = {
          experience: 'Work Experience',
          education: 'Education',
          skills: 'Skills',
          projects: 'Projects',
          certifications: 'Certifications',
          languages: 'Languages',
          interests: 'Interests',
          custom: 'Custom Section',
        };

        const newSection: ResumeSection = {
          id: generateId(),
          type,
          title: sectionTitles[type],
          isVisible: true,
          items: [],
        };

        state.resume.sections.push(newSection);
        state.hasUnsavedChanges = true;
      });
    },

    removeSection: (sectionId) => {
      get().pushToHistory();
      set((state) => {
        state.resume.sections = state.resume.sections.filter(
          (s) => s.id !== sectionId
        );
        state.hasUnsavedChanges = true;
      });
    },

    updateSection: (sectionId, field, value) => {
      get().pushToHistory();
      set((state) => {
        const section = state.resume.sections.find((s) => s.id === sectionId);
        if (section) {
          (section as any)[field] = value;
          state.hasUnsavedChanges = true;
        }
      });
    },

    reorderSections: (activeId, overId) => {
      get().pushToHistory();
      set((state) => {
        const sections = state.resume.sections;
        const activeIndex = sections.findIndex((s) => s.id === activeId);
        const overIndex = sections.findIndex((s) => s.id === overId);
        
        if (activeIndex !== -1 && overIndex !== -1) {
          const [removed] = sections.splice(activeIndex, 1);
          sections.splice(overIndex, 0, removed);
          state.hasUnsavedChanges = true;
        }
      });
    },

    // Item Actions
    addItem: (sectionId) => {
      get().pushToHistory();
      set((state) => {
        const section = state.resume.sections.find((s) => s.id === sectionId);
        if (section) {
          const newItem: ResumeItem = {
            id: generateId(),
            title: 'New Item',
            subtitle: 'Organization',
            date: new Date().toISOString().slice(0, 7),
            description: '',
            bullets: [],
          };
          section.items.push(newItem);
          state.hasUnsavedChanges = true;
        }
      });
    },

    removeItem: (sectionId, itemId) => {
      get().pushToHistory();
      set((state) => {
        const section = state.resume.sections.find((s) => s.id === sectionId);
        if (section) {
          section.items = section.items.filter((i) => i.id !== itemId);
          state.hasUnsavedChanges = true;
        }
      });
    },

    updateItem: (sectionId, itemId, field, value) => {
      get().pushToHistory();
      set((state) => {
        const section = state.resume.sections.find((s) => s.id === sectionId);
        if (section) {
          const item = section.items.find((i) => i.id === itemId);
          if (item) {
            (item as any)[field] = value;
            state.hasUnsavedChanges = true;
          }
        }
      });
    },

    toggleItemField: (sectionId, itemId, field) => {
      get().pushToHistory();
      set((state) => {
        const section = state.resume.sections.find((s) => s.id === sectionId);
        if (section) {
          const item = section.items.find((i) => i.id === itemId);
          if (item) {
            if (!item.fieldVisibility) item.fieldVisibility = {};
            const current = (item.fieldVisibility as any)[field];
            (item.fieldVisibility as any)[field] = current === false ? true : false;
            state.hasUnsavedChanges = true;
          }
        }
      });
    },

    updateBullet: (sectionId, itemId, bulletIndex, value) => {
      get().pushToHistory();
      set((state) => {
        const section = state.resume.sections.find((s) => s.id === sectionId);
        if (section) {
          const item = section.items.find((i) => i.id === itemId);
          if (item && item.bullets) {
            item.bullets[bulletIndex] = value;
            state.hasUnsavedChanges = true;
          }
        }
      });
    },

    updateTag: (sectionId, itemId, tagIndex, value) => {
      get().pushToHistory();
      set((state) => {
        const section = state.resume.sections.find((s) => s.id === sectionId);
        if (section) {
          const item = section.items.find((i) => i.id === itemId);
          if (item && item.tags) {
            item.tags[tagIndex] = value;
            state.hasUnsavedChanges = true;
          }
        }
      });
    },

    addBullet: (sectionId, itemId, bullet) => {
      get().pushToHistory();
      set((state) => {
        const section = state.resume.sections.find((s) => s.id === sectionId);
        if (section) {
          const item = section.items.find((i) => i.id === itemId);
          if (item) {
            item.bullets = [...(item.bullets || []), bullet];
            state.hasUnsavedChanges = true;
          }
        }
      });
    },

    removeBullet: (sectionId, itemId, bulletIndex) => {
      get().pushToHistory();
      set((state) => {
        const section = state.resume.sections.find((s) => s.id === sectionId);
        if (section) {
          const item = section.items.find((i) => i.id === itemId);
          if (item && item.bullets) {
            item.bullets.splice(bulletIndex, 1);
            state.hasUnsavedChanges = true;
          }
        }
      });
    },

    reorderItems: (sectionId, activeId, overId) => {
      get().pushToHistory();
      set((state) => {
        const section = state.resume.sections.find((s) => s.id === sectionId);
        if (section) {
          const items = section.items;
          const activeIndex = items.findIndex((i) => i.id === activeId);
          const overIndex = items.findIndex((i) => i.id === overId);
          
          if (activeIndex !== -1 && overIndex !== -1) {
            const [removed] = items.splice(activeIndex, 1);
            items.splice(overIndex, 0, removed);
            state.hasUnsavedChanges = true;
          }
        }
      });
    },

    // Selection Actions
    selectSection: (sectionId) =>
      set((state) => {
        state.selectedSectionId = sectionId;
      }),

    selectItem: (itemId) =>
      set((state) => {
        state.selectedItemId = itemId;
      }),

    // Save Actions
    setSaving: (isSaving) =>
      set((state) => {
        state.isSaving = isSaving;
      }),

    setUnsavedChanges: (hasChanges) =>
      set((state) => {
        state.hasUnsavedChanges = hasChanges;
      }),

    toggleDraft: (isDraft) => {
      get().pushToHistory();
      set((state) => {
        state.resume.is_draft = isDraft;
        state.hasUnsavedChanges = true;
      });
    },
  }))
);