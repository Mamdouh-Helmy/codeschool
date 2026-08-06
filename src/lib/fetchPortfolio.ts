// lib/fetchPortfolio.ts
import type {
  PortfolioData,
  SkillItem,
  ProjectItem,
  CertificateItem,
  SocialLink,
  ContactInfo,
  ExperienceItem,
  EducationItem,
  ServiceItem,
  StatItem,
} from "@/types/portfolio";

function getBaseUrl() {
  // client-side: fetch نسبي يشتغل عادي
  if (typeof window !== "undefined") return "";
  // server-side: لازم absolute URL
  return process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function fetchPortfolio(
  id: string,
): Promise<PortfolioData | null> {
  try {
    const baseUrl = getBaseUrl();
    const res = await fetch(`${baseUrl}/api/portfolio/${id}`, {
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.success || !data.portfolio) return null;

    const p = data.portfolio;
    const owner = p.userId && typeof p.userId === "object" ? p.userId : null;

    const skills: SkillItem[] = (p.skills || []).map((s: any, i: number) => ({
      id: s._id?.toString() || String(i),
      name: s.name,
      level: s.level,
      category: s.category || "",
      icon: s.icon || "",
    }));

    const projects: ProjectItem[] = (p.projects || []).map(
      (pr: any, i: number) => ({
        id: pr._id?.toString() || String(i),
        title: pr.title,
        description: pr.description,
        category: pr.technologies?.[0] || "",
        technologies: pr.technologies || [],
        demoUrl: pr.demoUrl || "",
        githubUrl: pr.githubUrl || "",
        imageUrl: pr.images?.[0]?.url || "",
        featured: !!pr.featured,
        status: pr.status || "completed",
      }),
    );

    const certificates: CertificateItem[] = (p.certificates || []).map(
      (c: any, i: number) => ({
        id: c._id?.toString() || String(i),
        title: c.title,
        description: c.description || "",
        issuer: c.issuer || "",
        issueDate: c.issueDate || null,
        credentialUrl: c.credentialUrl || "",
        imageUrl: c.image?.url || "",
      }),
    );

    // ✅ السوشيال: بنعرض بس اللينكات اللي فعلاً ليها قيمة (مش فاضية)
    const socialLinks: SocialLink[] = Object.entries(p.socialLinks || {})
      .filter(([, url]) => typeof url === "string" && url.trim().length > 0)
      .map(([platform, url], i) => ({
        id: String(i),
        platform,
        url: url as string,
      }));

    const contactInfo: ContactInfo | null = p.contactInfo
      ? {
          id: "contact",
          email: p.contactInfo.email || "",
          phone: p.contactInfo.phone || "",
          location: p.contactInfo.location || "",
        }
      : null;

    const experience: ExperienceItem[] = (p.experience || []).map(
      (e: any, i: number) => ({
        id: e._id?.toString() || String(i),
        company: e.company,
        position: e.position,
        duration: e.duration || "",
      }),
    );

    const education: EducationItem[] = (p.education || []).map(
      (e: any, i: number) => ({
        id: e._id?.toString() || String(i),
        institution: e.institution,
        degree: e.degree,
        duration: e.duration || "",
      }),
    );

    const services: ServiceItem[] = (p.services || []).map(
      (s: any, i: number) => ({
        id: s._id?.toString() || String(i),
        num: s.num || String(i + 1).padStart(2, "0"),
        title: s.title,
        description: s.description || "",
        href: s.href || "/contact",
      }),
    );

    // ✅ p.stats بترجع دلوقتي زي ما هي مخزنة في الداتابيز: { yearsOfExperience, codeCommits }
    // - عدد المشاريع المكتملة بيتحسب بفلترة status === "completed"
    // - عدد المهارات = طول array الـ skills
    const completedProjectsCount = (p.projects || []).filter(
      (pr: any) => pr.status === "completed",
    ).length;

    const stats: StatItem[] = [
      {
        id: "years",
        num: p.stats?.yearsOfExperience ?? 0,
        text: "Years of experience",
      },
      {
        id: "projects",
        num: completedProjectsCount,
        text: "Projects completed",
      },
      {
        id: "skills",
        num: skills.length,
        text: "Technologies mastered",
      },
      {
        id: "commits",
        num: p.stats?.codeCommits ?? 0,
        text: "Code commits",
      },
    ];

    return {
      id: p._id,
      title: p.title,
      description: p.description || "",
      ownerName: owner?.name || "Portfolio",
      ownerRole: p.ownerRole || "",
      ownerImage: p.ownerImage || owner?.image || "",
      cvUrl: p.cvUrl || "",
      isPublished: p.isPublished,
      views: p.views,
      settings: p.settings,
      skills,
      projects,
      certificates,
      socialLinks,
      contactInfo,
      experience,
      education,
      services,
      stats,
    };
  } catch (error) {
    console.error("fetchPortfolio error:", error);
    return null;
  }
}