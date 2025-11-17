// app/blog/[slug]/page.tsx
import { Metadata } from 'next';
import { PostContent } from '@/components/Blog/PostContent';
import { getApiUrl } from '@/utils/urlUtils';

// دالة لجلب بيانات المقالة لـ Meta Tags
async function getPost(slug: string) {
  try {
    const apiUrl = getApiUrl(`/api/blog/${slug}`);
    const res = await fetch(apiUrl, { cache: 'no-store' });

    if (!res.ok) return null;

    const data = await res.json();
    return data.data;
  } catch (error) {
    return null;
  }
}

// إنشاء Dynamic Metadata
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);

  if (!post) {
    return {
      title: 'Blog Post - CodeSchool',
      description: 'Read this amazing blog post on CodeSchool',
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const postUrl = `${baseUrl}/blog/${params.slug}`;
  const imageUrl = post.image
    ? (post.image.startsWith('http') ? post.image : `${baseUrl}${post.image}`)
    : `${baseUrl}/images/blog/blog_1.png`;

  return {
    title: post.title,
    description: post.body?.substring(0, 160) || 'Read this amazing blog post on CodeSchool',
    openGraph: {
      title: post.title,
      description: post.body?.substring(0, 160) || 'Read this amazing blog post on CodeSchool',
      url: postUrl,
      siteName: 'CodeSchool',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      type: 'article',
      publishedTime: post.publishDate,
      authors: [post.author?.name || 'CodeSchool'],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.body?.substring(0, 160) || 'Read this amazing blog post on CodeSchool',
      images: [imageUrl],
    },
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  return <PostContent slug={params.slug} />;
}