import { format } from "date-fns";
import TicketSection from "@/components/Home/TicketSection";
import { getApiUrl } from "@/utils/urlUtils";
import ImageWithFallback from "@/components/UI/ImageWithFallback";
import BlogImageWithFallback from "@/components/UI/BlogImageWithFallback";

// ✅ توليد الميتاداتا
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const apiUrl = getApiUrl(`/api/blog/${slug}`);

    if (!apiUrl) {
      console.warn("⚠️ generateMetadata: API URL is not configured");
      return {
        title: "Post Not Found | CodeSchool",
        description: "Blog article",
      };
    }

    const res = await fetch(apiUrl, {
      next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const text = await res.text();
    const postData = text ? JSON.parse(text) : {};
    const post = postData.data;

    return {
      title: post ? `${post.title} | CodeSchool` : "Post Not Found",
      description: post?.excerpt || "Blog article",
      openGraph: {
        title: post?.title || "Post Not Found",
        description: post?.excerpt || "Blog article",
        type: "article",
        publishedTime: post?.publishDate,
        authors: post?.author?.name ? [post.author.name] : [],
      },
    };
  } catch (error) {
    console.error("Metadata fetch error:", error);
    return {
      title: "Error Loading Post",
      description: "Unable to fetch post metadata",
    };
  }
}

// ✅ دالة مساعدة لمعالجة الصور
const getImageSrc = (image: string | undefined, fallback: string) => {
  if (!image) return fallback;
  
  // إذا كانت الصورة base64
  if (image.startsWith("data:image")) {
    return image;
  }
  
  // إذا كانت URL كاملة
  if (image.startsWith("http")) {
    return image;
  }
  
  // إذا كانت مسار محلي
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  const cleanPath = image.startsWith("/") ? image : `/${image}`;
  
  return `${baseUrl}${cleanPath}`;
};

// ✅ الصفحة الرئيسية
export default async function Post({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const apiUrl = getApiUrl(`/api/blog/${slug}`);
    if (!apiUrl) throw new Error("API URL is not configured");

    const res = await fetch(apiUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    const post = data?.data;

    if (!post) {
      return (
        <div className="pt-44 text-center">
          <h2 className="text-2xl font-bold">Post Not Found</h2>
          <p className="text-gray-500 mt-2">
            The blog article you're looking for doesn't exist or has been
            removed.
          </p>
        </div>
      );
    }

    const formattedDate = post.publishDate
      ? format(new Date(post.publishDate), "dd MMM yyyy")
      : "N/A";

    // ✅ معالجة الصور
    const authorAvatar = getImageSrc(
      post.author?.avatar, 
      "/images/default-avatar.jpg"
    );

    const mainImage = getImageSrc(
      post.image,
      "/images/blog/blog_1.png"
    );

    return (
      <>
        {/* ===== Header Section ===== */}
        <section className="relative pt-44">
          <div className="container mx-auto">
            <div className="grid md:grid-cols-12 grid-cols-1 items-center">
              <div className="col-span-8">
                <div className="flex flex-col sm:flex-row">
                  <span className="text-base text-midnight_text font-medium dark:text-white pr-7 border-r border-solid border-gray dark:border-white w-fit">
                    {formattedDate}
                  </span>
                  <span className="text-base text-midnight_text font-medium dark:text-white sm:pl-7 pl-0 w-fit">
                    {post.viewCount || 0} Views
                  </span>
                </div>
                <h2 className="text-midnight_text dark:text-white pt-7 text-2xl font-bold">
                  {post.title || "Untitled Post"}
                </h2>
              </div>

              <div className="flex items-center md:justify-center justify-start gap-6 col-span-4 pt-4 md:pt-0">
                <ImageWithFallback
                  src={authorAvatar}
                  alt={post.author?.name || "Author"}
                  width={50}
                  height={50}
                  className="rounded-full object-cover"
                  fallbackSrc="/images/default-avatar.jpg"
                />
                <div>
                  <span className="text-[18px] leading-[1.2] font-bold text-midnight_text dark:text-white">
                    {post.author?.name || "Unknown Author"}
                  </span>
                  <p className="text-md text-gray dark:text-white">
                    {post.author?.role || "Author"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== Body Section ===== */}
        <section className="dark:bg-darkmode py-0">
          <div className="container mx-auto">
            <div className="flex flex-wrap justify-center">
              <div className="w-full px-4">
                <div className="z-20 mb-16 overflow-hidden rounded">
                  <BlogImageWithFallback
                    src={mainImage}
                    alt={post.imageAlt || post.title || "Blog image"}
                    width={1170}
                    height={366}
                    className="h-full w-full object-cover rounded-3xl"
                    fallbackSrc="/images/blog/blog_1.png"
                  />
                </div>

                <div className="w-full lg:w-8/12 mx-auto">
                  {post.body ? (
                    <div
                      className="prose dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: post.body,
                      }}
                    ></div>
                  ) : (
                    <p className="text-center text-gray-500">
                      No content available for this post.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <TicketSection />
      </>
    );
  } catch (error) {
    console.error("Error rendering post page:", error);

    let errorMessage = "Something went wrong while fetching the post.";
    if (error instanceof Error) {
      if (error.message.includes("API URL is not configured")) {
        errorMessage = "Server configuration error. Please contact support.";
      } else if (error.message.includes("HTTP error")) {
        errorMessage = "Unable to load the post. Please try again later.";
      }
    }

    return (
      <div className="pt-44 text-center">
        <h2 className="text-2xl font-bold text-red-500">Error Loading Post</h2>
        <p className="text-gray-500 mt-2">{errorMessage}</p>
      </div>
    );
  }
}