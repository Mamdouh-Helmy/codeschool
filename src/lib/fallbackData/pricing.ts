import { PricingPlan } from "@/lib/types";

export const FALLBACK_PRICING_PLANS: PricingPlan[] = [
  {
    id: "arabic-group",
    name: "Arabic (Group)",
    description: "Perfect for schools and organizations looking to teach Arabic programming to multiple students in a collaborative environment.",
    price: 299,
    currency: "USD",
    billingPeriod: "monthly",
    features: [
      "Up to 20 students per group",
      "Arabic language instruction",
      "Group project collaboration",
      "Progress tracking dashboard",
      "Certified Arabic instructors",
      "24/7 technical support",
      "Access to Arabic learning materials",
      "Monthly progress reports",
      "Group chat and forums",
      "Certificate of completion"
    ],
    isPopular: false,
    isActive: true,
    maxStudents: 20,
    language: "arabic",
    type: "group",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-05-14T10:00:00Z"
  },
  {
    id: "english-private",
    name: "English (Private)",
    description: "One-on-one English programming instruction tailored to individual learning needs and pace.",
    price: 499,
    currency: "USD",
    billingPeriod: "monthly",
    features: [
      "1-on-1 personalized instruction",
      "English language instruction",
      "Customized curriculum",
      "Flexible scheduling",
      "Dedicated mentor",
      "Priority support",
      "Personal project portfolio",
      "Career guidance",
      "Resume building assistance",
      "Job placement support",
      "Advanced coding challenges",
      "Industry mentorship"
    ],
    isPopular: true,
    isActive: true,
    maxStudents: 1,
    language: "english",
    type: "private",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-05-14T10:00:00Z"
  },
  {
    id: "arabic-private",
    name: "Arabic (Private)",
    description: "Personalized Arabic programming education with individual attention and custom learning path.",
    price: 399,
    currency: "USD",
    billingPeriod: "monthly",
    features: [
      "1-on-1 Arabic instruction",
      "Personalized learning plan",
      "Flexible Arabic curriculum",
      "Individual project guidance",
      "Dedicated Arabic mentor",
      "Cultural context integration",
      "Arabic technical terminology",
      "Personal portfolio development",
      "Career counseling in Arabic",
      "Local job market insights",
      "Advanced Arabic programming",
      "Industry connections"
    ],
    isPopular: false,
    isActive: true,
    maxStudents: 1,
    language: "arabic",
    type: "private",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-05-14T10:00:00Z"
  }
];

export const FALLBACK_SUBSCRIPTIONS = [
  {
    id: "sub-1",
    userId: "user-1",
    planId: "english-private",
    status: "active" as const,
    startDate: "2024-04-01T00:00:00Z",
    endDate: "2024-05-01T00:00:00Z",
    paymentMethod: "invoice" as const,
    paymentStatus: "paid" as const,
    invoiceNumber: "INV-2024-001",
    totalAmount: 499,
    currency: "USD",
    studentCount: 1,
    notes: "Monthly subscription renewal",
    createdAt: "2024-03-15T10:00:00Z",
    updatedAt: "2024-04-01T00:00:00Z"
  },
  {
    id: "sub-2",
    userId: "user-2",
    planId: "arabic-group",
    status: "active" as const,
    startDate: "2024-03-01T00:00:00Z",
    endDate: "2024-04-01T00:00:00Z",
    paymentMethod: "bank_transfer" as const,
    paymentStatus: "paid" as const,
    invoiceNumber: "INV-2024-002",
    totalAmount: 299,
    currency: "USD",
    studentCount: 15,
    notes: "School group subscription",
    createdAt: "2024-02-20T10:00:00Z",
    updatedAt: "2024-03-01T00:00:00Z"
  }
];

