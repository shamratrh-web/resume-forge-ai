// ============================================
// RESUME FORGE - TYPE DEFINITIONS
// ============================================

export type SectionType = 
  | 'experience' 
  | 'education' 
  | 'skills' 
  | 'projects' 
  | 'certifications'
  | 'languages'
  | 'interests'
  | 'custom';

export type DateFormat = 'MMM YYYY' | 'MM/YYYY' | 'YYYY' | 'MONTH YYYY';
export type PageSize = 'A4' | 'Letter';
export type PhotoShape = 'circle' | 'square' | 'rounded';
export type LayoutType = 'single' | 'double';

export interface Margins {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export interface PhotoStyle {
  shape: PhotoShape;
  size: string;
  borderWidth: string;
  borderColor: string;
  borderRadius: string;
  grayscale: boolean;
  visible: boolean;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  location?: string;
}

export interface PersonalInfo {
  name: string;
  title?: string;
  avatar?: string;
  summary?: string;
  contact: ContactInfo;
}

export interface ResumeItem {
  id: string;
  title?: string;
  subtitle?: string;
  organization?: string;
  location?: string;
  date?: string;
  dateEnd?: string;
  current?: boolean;
  description?: string; // HTML content
  bullets?: string[];
  tags?: string[];
  url?: string;
  fieldVisibility?: {
    title?: boolean;
    subtitle?: boolean;
    date?: boolean;
    location?: boolean;
    description?: boolean;
  };
}

export interface ResumeSection {
  id: string;
  type: SectionType;
  title: string;
  items: ResumeItem[];
  isVisible: boolean;
  isCollapsed?: boolean;
}

export interface FontSizes {
  base: string;
  header: string;
  subHeader: string;
  small: string;
}

export interface Spacing {
  section: string;
  item: string;
  margins: Margins; // Replaced simple margin string
  padding: string;
}

export interface Colors {
  primary: string;
  text: string;
  background: string;
  muted: string;
  border: string;
}

export interface Layout {
  columns: LayoutType;
  leftColWidth: string;
  headerAlign: 'left' | 'center' | 'right';
  pageSize: PageSize;
}

export interface ThemeConfig {
  fontFamily: string;
  fontSizes: FontSizes;
  spacing: Spacing;
  colors: Colors;
  layout: Layout;
  photo: PhotoStyle;
}

export interface ResumeData {
  id?: string;
  title?: string;
  is_draft?: boolean;
  personalInfo: PersonalInfo;
  sections: ResumeSection[];
  theme: ThemeConfig;
}

export interface ResumeDB {
  id: string;
  user_id: string;
  title: string;
  is_draft: boolean;
  content: ResumeContentDB;
  theme_config: ThemeConfig;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResumeContentDB {
  personalInfo: PersonalInfo;
  sections: ResumeSection[];
}

// Utility types for Zustand
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type WithoutChild<T> = Omit<T, 'children'>;

// DND Types
export interface DragItem {
  id: string;
  type: 'section' | 'item';
  sectionId?: string;
}

export type DroppableId = string | null;
