import { ActiveWebinar, Webinar } from "@/lib/types";

export const FALLBACK_ACTIVE_WEBINAR: ActiveWebinar | null = {
  id: "webinar-1",
  title: "Complete Web Development Bootcamp",
  date: "2024-06-15",
  time: "10:00 AM - 4:00 PM",
  crmRegistrationUrl: "https://crm.codeschool.com/webinar/register/webinar-1",
  instructor: "Sarah Johnson",
  instructorImage: "/images/instructors/sarah-johnson.jpg",
  maxAttendees: 100,
  currentAttendees: 67
};

export const FALLBACK_WEBINARS: Webinar[] = [
  {
    id: "webinar-1",
    title: "Complete Web Development Bootcamp",
    description: "Master modern web development with HTML, CSS, JavaScript, React, Node.js, and MongoDB. Build real-world projects and get job-ready skills.",
    date: "2024-06-15",
    time: "10:00 AM - 4:00 PM",
    duration: "6 hours",
    instructor: "Sarah Johnson",
    instructorImage: "/images/instructors/sarah-johnson.jpg",
    crmRegistrationUrl: "https://crm.codeschool.com/webinar/register/webinar-1",
    isActive: true,
    maxAttendees: 100,
    currentAttendees: 67,
    image: "/images/webinars/web-dev-bootcamp.jpg",
    tags: ["Web Development", "React", "JavaScript", "Bootcamp"],
    createdAt: "2024-05-01T10:00:00Z",
    updatedAt: "2024-05-14T10:00:00Z"
  },
  {
    id: "webinar-2",
    title: "Data Science with Python Workshop",
    description: "Learn data analysis, machine learning, and visualization using Python, Pandas, NumPy, and Scikit-learn.",
    date: "2024-07-20",
    time: "2:00 PM - 6:00 PM",
    duration: "4 hours",
    instructor: "Dr. Emily Rodriguez",
    instructorImage: "/images/instructors/emily-rodriguez.jpg",
    crmRegistrationUrl: "https://crm.codeschool.com/webinar/register/webinar-2",
    isActive: true,
    maxAttendees: 50,
    currentAttendees: 23,
    image: "/images/webinars/data-science-workshop.jpg",
    tags: ["Data Science", "Python", "Machine Learning", "Analytics"],
    createdAt: "2024-05-05T10:00:00Z",
    updatedAt: "2024-05-14T10:00:00Z"
  },
  {
    id: "webinar-3",
    title: "UI/UX Design Fundamentals",
    description: "Master the principles of user interface and user experience design. Learn Figma, prototyping, and design thinking.",
    date: "2024-08-10",
    time: "11:00 AM - 3:00 PM",
    duration: "4 hours",
    instructor: "Alex Thompson",
    instructorImage: "/images/instructors/alex-thompson.jpg",
    crmRegistrationUrl: "https://crm.codeschool.com/webinar/register/webinar-3",
    isActive: true,
    maxAttendees: 75,
    currentAttendees: 45,
    image: "/images/webinars/ui-ux-workshop.jpg",
    tags: ["UI Design", "UX Design", "Figma", "Prototyping"],
    createdAt: "2024-05-10T10:00:00Z",
    updatedAt: "2024-05-14T10:00:00Z"
  }
];
