// types/portfolio.ts
export interface PublicUser {
  _id: string;
  name: string;
  email: string;
  username: string;
  image?: string;
  role: string;
  profile?: {
    bio?: string;
    jobTitle?: string;
    company?: string;
    website?: string;
    location?: string;
    phone?: string;
  };
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
    instagram?: string;
    facebook?: string;
    website?: string;
    dribbble?: string;
  };
}

export interface Skill {
  name: string;
  level: number;
  category?: string;
  icon?: string;
}

export interface ProjectImage {
  url: string;
  alt: string;
}

export interface Project {
  _id?: string;
  title: string;
  description: string;
  technologies: string[];
  demoUrl?: string;
  githubUrl?: string;
  images: ProjectImage[];
  featured: boolean;
  startDate?: Date | string;
  endDate?: Date | string;
  status: 'completed' | 'in-progress' | 'planned';
}

export interface SocialLinks {
  github?: string;
  linkedin?: string;
  twitter?: string;
  youtube?: string;
  instagram?: string;
  facebook?: string;
  website?: string;
  dribbble?: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  location?: string;
}

export interface PortfolioSettings {
  theme: 'light' | 'dark' | 'blue' | 'green';
  layout: 'standard' | 'minimal' | 'creative';
}

export interface Portfolio {
  _id?: string;
  userId: string | PublicUser;
  title: string;
  description?: string;
  skills: Skill[];
  projects: Project[];
  socialLinks: SocialLinks;
  contactInfo: ContactInfo;
  isPublished: boolean;
  views: number;
  settings: PortfolioSettings;
  createdAt?: string;
  updatedAt?: string;
}

// النوع الخاص بالعرض العام
export interface PublicPortfolio extends Omit<Portfolio, 'userId'> {
  userId: PublicUser;
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioFormData extends Omit<Portfolio, '_id' | 'userId' | 'createdAt' | 'updatedAt'> {
  _id?: string;
  userId?: string; // Optional for forms
}

export interface PortfolioApiResponse {
  success: boolean;
  portfolio: PublicPortfolio;
  message?: string;
}

// أنواع للـ API responses
export interface PortfolioListResponse {
  success: boolean;
  portfolios: PublicPortfolio[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PortfolioCreateResponse {
  success: boolean;
  portfolio: PublicPortfolio;
  message: string;
}

export interface PortfolioUpdateResponse {
  success: boolean;
  portfolio: PublicPortfolio;
  message: string;
}

export interface PortfolioErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string>;
}

// أنواع للـ props
export interface PortfolioHeaderProps {
  portfolio: PublicPortfolio;
  themeStyles?: ThemeStyles;
}

export interface SkillsShowcaseProps {
  skills: Skill[];
  themeStyles?: ThemeStyles;
}

export interface ProjectsGalleryProps {
  projects: Project[];
  themeStyles?: ThemeStyles;
}

export interface ContactSectionProps {
  portfolio: PublicPortfolio;
  themeStyles?: ThemeStyles;
}

export interface PortfolioBuilderProps {
  portfolio: PortfolioFormData | null;
  onSave: (portfolioData: PortfolioFormData) => Promise<boolean>;
  saving: boolean;
}

export interface PortfolioBuilderUIProps {
  portfolio: PortfolioFormData | null;
  onSave: (portfolioData: PortfolioFormData) => Promise<boolean>;
  saving: boolean;
}

export interface BasicInfoSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

export interface SkillsSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

export interface ProjectsSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

export interface SocialLinksSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

export interface SettingsSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

export interface PreviewPanelProps {
  portfolio: PortfolioFormData;
}

// أنواع للـ forms
export interface BasicInfoForm {
  title: string;
  description: string;
  contactInfo: ContactInfo;
}

export interface SkillForm {
  name: string;
  level: number;
  category: string;
  icon: string;
}

export interface ProjectForm {
  title: string;
  description: string;
  technologies: string[];
  demoUrl: string;
  githubUrl: string;
  images: ProjectImage[];
  featured: boolean;
  startDate: string;
  endDate: string;
  status: 'completed' | 'in-progress' | 'planned';
}

// أنواع للـ state
export interface PortfolioBuilderState {
  portfolio: PortfolioFormData | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

export interface PublicPortfolioState {
  portfolio: PublicPortfolio | null;
  loading: boolean;
  error: string | null;
}

// أنواع للـ API parameters
export interface GetPortfolioParams {
  username: string;
}

export interface CreatePortfolioData {
  title: string;
  description?: string;
  skills?: Skill[];
  projects?: Project[];
  socialLinks?: SocialLinks;
  contactInfo?: ContactInfo;
  settings?: PortfolioSettings;
}

export interface UpdatePortfolioData extends Partial<CreatePortfolioData> {
  isPublished?: boolean;
}

// أنواع للـ filters
export interface PortfolioFilters {
  search?: string;
  status?: 'published' | 'draft';
  category?: string;
  page?: number;
  limit?: number;
}

// أنواع للـ navigation
export interface PortfolioSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// أنواع للـ social icons
export interface SocialPlatform {
  key: keyof SocialLinks;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  placeholder: string;
  color: string;
  description: string;
}

// أنواع للـ theme options
export interface ThemeOption {
  value: PortfolioSettings['theme'];
  label: string;
  description: string;
}

export interface LayoutOption {
  value: PortfolioSettings['layout'];
  label: string;
  description: string;
}

// أنواع للـ status
export interface ProjectStatus {
  value: Project['status'];
  label: string;
  color: string;
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// أنواع للـ Theme Styles
export interface ThemeStyles {
  container: string;
  header: string;
  card: string;
  background: {
    primary: string;
    secondary: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    white: string;
  };
  border: string;
  skillBar: string;
  skillFill: string;
}

// أنواع للـ Component Props العامة
export interface ThemeableComponentProps {
  themeStyles?: ThemeStyles;
}

// أنواع للـ Error Handling
export interface PortfolioValidationError {
  field: string;
  message: string;
}

export interface PortfolioValidationResult {
  isValid: boolean;
  errors: PortfolioValidationError[];
}

// أنواع للـ File Upload
export interface PortfolioFileUpload {
  file: File;
  type: 'image' | 'document';
  maxSize: number; // in bytes
  allowedFormats: string[];
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// أنواع للـ Analytics
export interface PortfolioAnalytics {
  views: number;
  uniqueVisitors: number;
  averageTime: number;
  popularSections: string[];
  referralSources: string[];
}

// أنواع للـ Sharing
export interface ShareOptions {
  title: string;
  text: string;
  url: string;
  platforms: ('twitter' | 'linkedin' | 'facebook' | 'whatsapp')[];
}

// أنواع للـ Export
export interface ExportOptions {
  format: 'pdf' | 'json' | 'html';
  includeImages: boolean;
  includeSocialLinks: boolean;
  theme: PortfolioSettings['theme'];
}