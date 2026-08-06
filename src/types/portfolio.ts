// types/portfolio.ts

// ==================== الأنواع الأساسية ====================

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

// ==================== العناصر الفرعية ====================

export interface SkillItem {
  id?: string;
  name: string;
  level: number;
  category?: string;
  icon?: string;
}

export interface ProjectItem {
  id?: string;
  title: string;
  description: string;
  technologies: string[];
  demoUrl?: string;
  githubUrl?: string;
  images?: { url: string; alt: string }[];
  imageUrl?: string;
  featured: boolean;
  startDate?: Date | string;
  endDate?: Date | string;
  status: "completed" | "in-progress" | "planned";
}

export interface CertificateItem {
  id?: string;
  title: string;
  description: string;
  issuer: string;
  issueDate: string | Date | null;
  credentialUrl: string;
  imageUrl?: string;
  image?: {
    url: string;
    alt: string;
  };
}

export interface ExperienceItem {
  id?: string;
  company: string;
  position: string;
  duration?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  description?: string;
}

export interface EducationItem {
  id?: string;
  institution: string;
  degree: string;
  duration?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  description?: string;
}

export interface ServiceItem {
  id?: string;
  num?: string;
  title: string;
  description: string;
  href?: string;
  icon?: string;
}

export interface SocialLink {
  id?: string;
  platform: string;
  url: string;
}

export interface ContactInfo {
  id?: string;
  email: string;
  phone: string;
  location: string;
}

export interface StatItem {
  id: string;
  num: number;
  text: string;
}

// ==================== Portfolio الرئيسي ====================

export interface Portfolio {
  _id?: string;
  userId: string | PublicUser;
  title: string;
  description?: string;
  ownerRole?: string;
  ownerImage?: string;
  cvUrl?: string;
  stats?: {
    yearsOfExperience: number;
    codeCommits: number;
  };
  skills: SkillItem[];
  projects: ProjectItem[];
  certificates: CertificateItem[];
  experience: ExperienceItem[];
  education: EducationItem[];
  services: ServiceItem[];
  socialLinks: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
    instagram?: string;
    facebook?: string;
    website?: string;
    dribbble?: string;
  };
  contactInfo: ContactInfo;
  isPublished: boolean;
  views: number;
  settings: {
    theme: "light" | "dark" | "blue" | "green";
    layout: "standard" | "minimal" | "creative";
  };
  createdAt?: string;
  updatedAt?: string;
}

// ==================== PortfolioFormData (مستخدم في الـ Builder) ====================

export interface PortfolioFormData {
  title: string;
  description: string;
  ownerRole: string;
  ownerImage: string;
  cvUrl: string;
  stats: {
    yearsOfExperience: number;
    codeCommits: number;
  };
  skills: SkillItem[];
  projects: ProjectItem[];
  certificates: CertificateItem[];
  experience: ExperienceItem[];
  education: EducationItem[];
  services: ServiceItem[];
  socialLinks: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
    instagram?: string;
    facebook?: string;
    website?: string;
    dribbble?: string;
  };
  contactInfo: ContactInfo;
  isPublished: boolean;
  views: number;
  settings: {
    theme: string;
    layout: string;
  };
  userId: string;
}

// ==================== PublicPortfolio (للعرض العام) ====================

export interface PublicPortfolio extends Omit<Portfolio, "userId"> {
  userId: PublicUser;
  _id: string;
  createdAt: string;
  updatedAt: string;
}

// ==================== API Responses ====================

export interface PortfolioApiResponse {
  success: boolean;
  portfolio: PublicPortfolio;
  message?: string;
}

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

// ==================== Contact (للرسائل) ====================

export interface ContactFormData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  message: string;
}

export interface ContactMessage {
  _id?: string;
  portfolioId: string;
  senderInfo: ContactFormData;
  read: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ContactResponse {
  success: boolean;
  message: string;
  data?: ContactMessage;
}

export interface SendMessageData {
  portfolioId: string;
  senderInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  message: string;
}

// ==================== Props للـ Components ====================

export interface PortfolioHeaderProps {
  portfolio: PublicPortfolio;
  themeStyles?: ThemeStyles;
}

export interface SkillsShowcaseProps {
  skills: SkillItem[];
  themeStyles?: ThemeStyles;
}

export interface ProjectsGalleryProps {
  projects: ProjectItem[];
  themeStyles?: ThemeStyles;
}

export interface ContactSectionProps {
  portfolio: PublicPortfolio;
  themeStyles?: ThemeStyles;
  onMessageSent?: () => void;
}

export interface PortfolioBuilderProps {
  portfolio: PortfolioFormData | null;
  onSave: (portfolioData: PortfolioFormData) => Promise<boolean>;
  saving: boolean;
}

export interface PortfolioBuilderUIProps {
  portfolio: Portfolio | null;  // ✅ استخدم الـ Portfolio الكامل
  onSave: (portfolioData: PortfolioFormData) => Promise<boolean>;
  saving: boolean;
}

// ==================== Section Props ====================

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

export interface CertificatesSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

export interface ExperienceSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

export interface EducationSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

export interface ServicesSectionProps {
  data: PortfolioFormData;
  onChange: (updates: Partial<PortfolioFormData>) => void;
}

export interface PreviewPanelProps {
  portfolio: PortfolioFormData;
}

// ==================== Theme Styles ====================

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

export interface ThemeableComponentProps {
  themeStyles?: ThemeStyles;
}

// ==================== State ====================

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

export interface ContactFormState {
  submitting: boolean;
  success: boolean;
  error: string | null;
}

// ==================== API Parameters ====================

export interface GetPortfolioParams {
  username: string;
}

export interface CreatePortfolioData {
  title: string;
  description?: string;
  skills?: SkillItem[];
  projects?: ProjectItem[];
  certificates?: CertificateItem[];
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
  contactInfo?: ContactInfo;
  settings?: {
    theme: "light" | "dark" | "blue" | "green";
    layout: "standard" | "minimal" | "creative";
  };
}

export interface UpdatePortfolioData extends Partial<CreatePortfolioData> {
  isPublished?: boolean;
}

// ==================== Filters & Options ====================

export interface PortfolioFilters {
  search?: string;
  status?: "published" | "draft";
  category?: string;
  page?: number;
  limit?: number;
}

export interface ThemeOption {
  value: "light" | "dark" | "blue" | "green";
  label: string;
  description: string;
}

export interface LayoutOption {
  value: "standard" | "minimal" | "creative";
  label: string;
  description: string;
}

export interface ProjectStatus {
  value: "completed" | "in-progress" | "planned";
  label: string;
  color: string;
}

// ==================== Utility ====================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// ==================== Validation ====================

export interface PortfolioValidationError {
  field: string;
  message: string;
}

export interface PortfolioValidationResult {
  isValid: boolean;
  errors: PortfolioValidationError[];
}

// ==================== File Upload ====================

export interface PortfolioFileUpload {
  file: File;
  type: "image" | "document";
  maxSize: number;
  allowedFormats: string[];
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// ==================== Analytics ====================

export interface PortfolioAnalytics {
  views: number;
  uniqueVisitors: number;
  averageTime: number;
  popularSections: string[];
  referralSources: string[];
}

// ==================== Sharing ====================

export interface ShareOptions {
  title: string;
  text: string;
  url: string;
  platforms: ("twitter" | "linkedin" | "facebook" | "whatsapp")[];
}

// ==================== Export ====================

export interface ExportOptions {
  format: "pdf" | "json" | "html";
  includeImages: boolean;
  includeSocialLinks: boolean;
  theme: "light" | "dark" | "blue" | "green";
}

// ==================== Portfolio Data (للـ API) ====================

export interface PortfolioData {
  id: string;
  title: string;
  description: string;
  ownerName: string;
  ownerRole: string;
  ownerImage: string;
  cvUrl: string;
  stats: StatItem[];
  isPublished: boolean;
  views: number;
  settings: {
    theme: string;
    layout: string;
  };
  skills: SkillItem[];
  projects: ProjectItem[];
  certificates: CertificateItem[];
  socialLinks: SocialLink[];
  contactInfo: ContactInfo | null;
  experience: ExperienceItem[];
  education: EducationItem[];
  services: ServiceItem[];
}