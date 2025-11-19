import { Metadata } from 'next';
import { PostContent } from '@/components/Blog/PostContent';
import { getApiUrl } from '@/utils/urlUtils';

// تعريف الأنواع الصحيح
type BlogPageProps = {
  params: Promise<{ slug: string }>;
};

async function getPost(slug: string) {
  const apiUrl = getApiUrl(`/api/blog/${slug}`);
  const res = await fetch(apiUrl, { cache: 'no-store' });

  if (!res.ok) return null;

  const data = await res.json();
  return data.data;
}

export async function generateMetadata(props: BlogPageProps): Promise<Metadata> {
  // استخراج params باستخدام await
  const params = await props.params;
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
      images: [{ url: imageUrl, width: 1200, height: 630, alt: post.title }],
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

export default async function BlogPostPage(props: BlogPageProps) {
  // استخراج params باستخدام await
  const params = await props.params;
  return <PostContent slug={params.slug} />;
}