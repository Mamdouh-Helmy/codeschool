// app/marketing/blogs/page.tsx
"use client";
import React from "react";
import BlogsAdmin from "../../../components/Admin/BlogsAdmin";

export default function MarketingBlogsPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-darkmode pt-24">
            <div className="container mx-auto px-4 py-10">
                <BlogsAdmin />
            </div>
        </div>
    );
}