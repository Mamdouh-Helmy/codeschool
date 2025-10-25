// Course types
export interface Course {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  instructor: string;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  tags: string[];
  isActive: boolean;
  enrollmentCount: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
}

// Event types
export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  type: 'workshop' | 'seminar' | 'conference' | 'meetup';
  price: number;
  maxAttendees: number;
  currentAttendees: number;
  image: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Testimonial types
export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  image: string;
  courseId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}


// Project types
export interface Project {
  id: string;
  title: string;
  description: string;
  studentName: string;
  studentImage: string;
  projectType: 'video' | 'image' | 'text' | 'portfolio';
  content: {
    // For video projects
    videoUrl?: string;
    videoThumbnail?: string;
    // For image projects (certificates, etc.)
    imageUrl?: string;
    imageAlt?: string;
    // For text projects
    textContent?: string;
    // For portfolio projects
    portfolioUrl?: string;
    portfolioDescription?: string;
  };
  technologies: string[];
  category: string;
  isActive: boolean;
  isPublic: boolean; // For download button visibility
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSubmission {
  title: string;
  description: string;
  studentName: string;
  studentImage: string;
  projectType: 'video' | 'image' | 'text' | 'portfolio';
  content: {
    videoUrl?: string;
    videoThumbnail?: string;
    imageUrl?: string;
    imageAlt?: string;
    textContent?: string;
    portfolioUrl?: string;
    portfolioDescription?: string;
  };
  technologies: string[];
  category: string;
  isPublic: boolean;
}

// FAQ types
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Contact form types
export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'read' | 'replied' | 'closed';
  createdAt: string;
  updatedAt: string;
}

// Newsletter subscription types
export interface NewsletterSubscription {
  id: string;
  email: string;
  isActive: boolean;
  subscribedAt: string;
  unsubscribedAt?: string;
}

// Webinar types
export interface Webinar {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: string;
  instructor: string;
  instructorImage: string;
  crmRegistrationUrl: string;
  isActive: boolean;
  maxAttendees: number;
  currentAttendees: number;
  image: string;
  tags: string[];
  // New optional fields for enhanced functionality
  registrationStart?: string; // ISO datetime when registration opens
  registrationEnd?: string;   // ISO datetime when registration closes
  speakers?: { name: string; imageUrl: string }[]; // multi-speaker support
  createdAt: string;
  updatedAt: string;
}

export interface ActiveWebinar {
  id: string;
  title: string;
  date: string;
  time: string;
  crmRegistrationUrl: string;
  instructor: string;
  instructorImage: string;
  maxAttendees: number;
  currentAttendees: number;
}

// Pricing and Subscription types
export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: 'monthly' | 'quarterly' | 'yearly';
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  maxStudents?: number;
  language: 'arabic' | 'english';
  type: 'group' | 'private';
  discount?: number;
  originalPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'pending' | 'active' | 'cancelled' | 'expired';
  startDate: string;
  endDate: string;
  paymentMethod: 'invoice' | 'card' | 'bank_transfer';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  invoiceNumber?: string;
  totalAmount: number;
  currency: string;
  studentCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionRequest {
  planId: string;
  studentCount: number;
  paymentMethod: 'invoice' | 'card' | 'bank_transfer';
  notes?: string;
  contactInfo: {
    name: string;
    email: string;
    phone: string;
    company?: string;
  };
}

// User and Role types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'admin' | 'marketing' | 'instructor' | 'student';

export interface UserRolePermission {
  role: UserRole;
  permissions: {
    blogs: {
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
    };
    projects: {
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
    };
    pricing: {
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
    };
    users: {
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
    };
  };
}

// Blog types
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string;
  image: string;
  imageAlt?: string;
  publishDate: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  tags: string[];
  category: string;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  viewCount: number;
  readTime: number; // in minutes
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostSubmission {
  title: string;
  body: string;
  image: string;
  imageAlt?: string;
  tags: string[];
  category: string;
  status: 'draft' | 'published';
  featured: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

export interface BlogFilters {
  category?: string;
  tags?: string[];
  author?: string;
  status?: 'draft' | 'published' | 'archived';
  featured?: boolean;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  source: 'database' | 'fallback';
  timestamp: string;
  success: boolean;
  message?: string;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  source: 'database' | 'fallback';
  timestamp: string;
}
