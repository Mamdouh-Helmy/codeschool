import { getAllPosts, getPostBySlug } from "@/utils/markdown";
import markdownToHtml from "@/utils/markdownToHtml";
import { format } from "date-fns";
import Image from "next/image";

type Props = {
    params: { slug: string };
};

export async function generateMetadata({ params }: Props) {
    const posts = getAllPosts(["title", "date", "excerpt", "coverImage", "slug"]);
    const post = getPostBySlug(params.slug, [
        "title",
        "author",
        "content",
        "metadata",
    ]);

    const siteName = process.env.SITE_NAME || "Your Site Name";
    const authorName = process.env.AUTHOR_NAME || "Your Author Name";

    if (post) {
        const metadata = {
            title: `${post.title || "Single Post Page"} | ${siteName}`,
            author: authorName,
            robots: {
                index: true,
                follow: true,
                nocache: true,
                googleBot: {
                    index: true,
                    follow: false,
                    "max-video-preview": -1,
                    "max-image-preview": "large",
                    "max-snippet": -1,
                },
            },
        };

        return metadata;
    } else {
        return {
            title: "Not Found",
            description: "No blog article has been found",
            author: authorName,
            robots: {
                index: false,
                follow: false,
                nocache: false,
                googleBot: {
                    index: false,
                    follow: false,
                    "max-video-preview": -1,
                    "max-image-preview": "large",
                    "max-snippet": -1,
                },
            },
        };
    }
}

export default async function BlogHead({ params }: Props) {
    // ✅ جلب البيانات من API بدلاً من الملفات المحلية
    try {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || ""}/api/blog/${params.slug}`,
            { cache: "no-store" }
        );

        if (!res.ok) {
            throw new Error("Failed to fetch blog post");
        }

        const data = await res.json();
        
        if (!data.success) {
            throw new Error("Blog post not found");
        }

        const post = data.data;

        // ✅ معالجة صورة المؤلف
        const getAuthorImageSrc = () => {
            if (!post.author?.avatar) return "/images/default-avatar.jpg";
            
            if (post.author.avatar.startsWith("data:image")) {
                return post.author.avatar;
            }
            
            const fixedAvatarPath = post.author.avatar.startsWith("/")
                ? post.author.avatar
                : `/${post.author.avatar}`;
            
            return fixedAvatarPath;
        };

        // ✅ معالجة صورة المقال الرئيسية
        const getCoverImageSrc = () => {
            if (!post.image) return "/images/blog/blog_2.png";
            
            if (post.image.startsWith("data:image")) {
                return post.image;
            }
            
            const fixedImagePath = post.image.startsWith("/")
                ? post.image
                : `/${post.image}`;
            
            return fixedImagePath;
        };

        return (
            <>
                <section className="pt-44">
                    <div className="container mx-auto max-w-[1200px]">
                        <div className="grid md:grid-cols-12 grid-cols-1 items-center">
                            <div className="col-span-8">
                                <div className="flex flex-col sm:flex-row">
                                    <span className="text-base text-SlateBlueText pr-7 border-r border-solid border-white w-fit">
                                        {format(new Date(post.publishDate || post.createdAt), "dd MMM yyyy")}
                                    </span>
                                    <span className="text-base text-SlateBlueText sm:pl-7 pl-0 w-fit">13 Comments</span>
                                </div>
                                <h2 className="text-SlateBlueText pt-7 text-[40px] leading-[3.4rem] font-bold">
                                    {post.title}
                                </h2>
                            </div>
                            <div className="flex gap-6 col-span-4 pt-4 md:pt-0">
                                <div className="w-20 h-20 rounded-full overflow-hidden">
                                    <Image
                                        src={getAuthorImageSrc()}
                                        alt={post.author?.name || "Author"}
                                        width={80}
                                        height={80}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const target = e.currentTarget as HTMLImageElement;
                                            target.src = "/images/default-avatar.jpg";
                                        }}
                                    />
                                </div>
                                <div>
                                    <span className="text-[22px] leading-[2rem] text-SlateBlueText">
                                        {post.author?.name || "Unknown Author"}
                                    </span>
                                    <p className="text-xl text-SlateBlueText">
                                        {post.author?.role }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </>
        );
    } catch (error) {
        console.error("Error fetching blog post:", error);
        return (
            <section className="pt-44">
                <div className="container mx-auto max-w-[1200px]">
                    <div className="text-center">
                        <h2 className="text-SlateBlueText text-[40px] leading-[3.4rem] font-bold">
                            Blog Post Not Found
                        </h2>
                        <p className="text-SlateBlueText mt-4">The requested blog post could not be loaded.</p>
                    </div>
                </div>
            </section>
        );
    }
}