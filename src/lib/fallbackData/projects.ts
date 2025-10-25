import { Project } from "@/lib/types";

export const FALLBACK_PROJECTS: Project[] = [
  {
    id: "project-1",
    title: "E-Commerce Platform",
    description: "A full-stack e-commerce platform built with React, Node.js, and MongoDB. Features include user authentication, product management, shopping cart, and payment integration.",
    studentName: "Sarah Johnson",
    studentImage: "/images/students/sarah-johnson.jpg",
    projectType: "portfolio",
    content: {
      portfolioUrl: "https://ecommerce-demo.example.com",
      portfolioDescription: "Live demo of the e-commerce platform with full functionality"
    },
    technologies: ["React", "Node.js", "MongoDB", "Stripe", "JWT"],
    category: "Web Development",
    isActive: true,
    isPublic: true,
    createdAt: "2024-03-15T10:00:00Z",
    updatedAt: "2024-05-14T10:00:00Z"
  },
  {
    id: "project-2",
    title: "React Native Mobile App",
    description: "A collaborative task management application with real-time updates, team collaboration features, and project tracking capabilities.",
    studentName: "Michael Chen",
    studentImage: "/images/students/michael-chen.jpg",
    projectType: "video",
    content: {
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      videoThumbnail: "/images/projects/task-management-thumb.jpg"
    },
    technologies: ["React Native", "Firebase", "Redux", "Socket.io"],
    category: "Mobile Development",
    isActive: true,
    isPublic: true,
    createdAt: "2024-02-20T10:00:00Z",
    updatedAt: "2024-05-14T10:00:00Z"
  },
  {
    id: "project-3",
    title: "Data Science Certificate",
    description: "Completed comprehensive data science course covering machine learning, statistical analysis, and data visualization techniques.",
    studentName: "Emily Rodriguez",
    studentImage: "/images/students/emily-rodriguez.jpg",
    projectType: "image",
    content: {
      imageUrl: "/images/certificates/data-science-cert.jpg",
      imageAlt: "Data Science Professional Certificate"
    },
    technologies: ["Python", "Pandas", "Scikit-learn", "Matplotlib", "Jupyter"],
    category: "Certification",
    isActive: true,
    isPublic: false, // Only visible to account owner
    createdAt: "2024-01-10T10:00:00Z",
    updatedAt: "2024-05-14T10:00:00Z"
  },
  {
    id: "project-4",
    title: "Web Development Journey",
    description: "A detailed reflection on my journey learning web development, including challenges faced, skills acquired, and future goals in the field.",
    studentName: "Alex Thompson",
    studentImage: "/images/students/alex-thompson.jpg",
    projectType: "text",
    content: {
      textContent: "My journey into web development began six months ago when I decided to change careers from marketing to technology. Starting with HTML and CSS, I quickly fell in love with the creative possibilities of building websites. The transition to JavaScript opened up a whole new world of interactivity, and learning React transformed how I think about building user interfaces. The most challenging part was understanding state management and component lifecycle, but with practice and persistence, I've built several projects that I'm proud of. My next goals include mastering Node.js for backend development and exploring cloud technologies. This journey has taught me that continuous learning is essential in tech, and I'm excited about the endless possibilities ahead."
    },
    technologies: ["HTML", "CSS", "JavaScript", "React", "Node.js"],
    category: "Reflection",
    isActive: true,
    isPublic: true,
    createdAt: "2024-04-05T10:00:00Z",
    updatedAt: "2024-05-14T10:00:00Z"
  },
  {
    id: "project-5",
    title: "AI Chatbot Portfolio",
    description: "An intelligent chatbot built with natural language processing capabilities, supporting multiple languages and integration with various messaging platforms.",
    studentName: "David Kim",
    studentImage: "/images/students/david-kim.jpg",
    projectType: "portfolio",
    content: {
      portfolioUrl: "https://ai-chatbot-demo.example.com",
      portfolioDescription: "Interactive demo showcasing the chatbot's capabilities with live chat interface"
    },
    technologies: ["Python", "TensorFlow", "OpenAI API", "FastAPI", "Docker"],
    category: "AI/ML",
    isActive: true,
    isPublic: true,
    createdAt: "2024-03-01T10:00:00Z",
    updatedAt: "2024-05-14T10:00:00Z"
  },
  {
    id: "project-6",
    title: "AWS Cloud Practitioner Certificate",
    description: "Earned AWS Cloud Practitioner certification demonstrating foundational knowledge of cloud computing and AWS services.",
    studentName: "Lisa Wang",
    studentImage: "/images/students/lisa-wang.jpg",
    projectType: "image",
    content: {
      imageUrl: "/images/certificates/aws-cert.jpg",
      imageAlt: "AWS Cloud Practitioner Certificate"
    },
    technologies: ["AWS", "Cloud Computing", "EC2", "S3", "Lambda"],
    category: "Certification",
    isActive: true,
    isPublic: false,
    createdAt: "2024-02-15T10:00:00Z",
    updatedAt: "2024-05-14T10:00:00Z"
  },
  {
    id: "project-7",
    title: "Mobile App Development Video",
    description: "A comprehensive walkthrough of building a cross-platform mobile application with Flutter, covering the entire development process from design to deployment.",
    studentName: "Maria Garcia",
    studentImage: "/images/students/maria-garcia.jpg",
    projectType: "video",
    content: {
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      videoThumbnail: "/images/projects/flutter-app-thumb.jpg"
    },
    technologies: ["Flutter", "Dart", "Firebase", "State Management", "API Integration"],
    category: "Mobile Development",
    isActive: true,
    isPublic: true,
    createdAt: "2024-01-25T10:00:00Z",
    updatedAt: "2024-05-14T10:00:00Z"
  },
  {
    id: "project-8",
    title: "Blockchain Learning Experience",
    description: "My experience learning blockchain development, including the challenges of understanding smart contracts and the excitement of building decentralized applications.",
    studentName: "James Wilson",
    studentImage: "/images/students/james-wilson.jpg",
    projectType: "text",
    content: {
      textContent: "Blockchain technology initially seemed intimidating with its complex cryptographic concepts and decentralized nature. However, starting with the basics of how blockchain works and gradually moving to smart contract development opened up a fascinating world of possibilities. The most rewarding part was deploying my first smart contract and seeing it interact with a web application. Understanding gas fees, transaction costs, and optimization techniques was challenging but essential. The community around blockchain development is incredibly supportive, and the rapid evolution of the technology keeps me constantly learning. I'm particularly excited about the potential for decentralized finance and how it could revolutionize traditional financial systems."
    },
    technologies: ["Solidity", "Web3.js", "React", "Ethereum", "IPFS"],
    category: "Reflection",
    isActive: true,
    isPublic: true,
    createdAt: "2024-03-20T10:00:00Z",
    updatedAt: "2024-05-14T10:00:00Z"
  }
];
