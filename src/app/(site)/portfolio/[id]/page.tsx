import PublicPortfolio from '@/components/Portfolio/PublicPortfolio';
import { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/portfolio/${id}`, {
      next: { revalidate: 3600 }
    });

    if (res.ok) {
      const data = await res.json();
      const portfolio = data.portfolio;

      if (portfolio) {
        return {
          title: `${portfolio.title} - Portfolio | Codeschool`,
          description: portfolio.description || `Check out ${portfolio.userId?.name || 'User'}'s portfolio`,
          openGraph: {
            title: portfolio.title,
            description: portfolio.description,
            images: portfolio.userId?.image ? [portfolio.userId.image] : [],
          },
        };
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error);
  }

  return {
    title: `Portfolio | Codeschool`,
    description: "Professional portfolio showcase",
  };
}

export default async function PortfolioPage({ params }: PageProps) {
  const { id } = await params;
  return <PublicPortfolio id={id} />;
}