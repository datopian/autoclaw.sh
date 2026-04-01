import Head from "next/head";
import Link from "next/link";
import type { GetStaticPaths, GetStaticProps } from "next";
import { BlogPost, getPostBySlug, getPostSlugs } from "../../lib/blog";

type BlogPostPageProps = {
  post: BlogPost;
};

export default function BlogPostPage({ post }: BlogPostPageProps) {
  return (
    <>
      <Head>
        <title>{post.title} | OpenClaw Autopilot</title>
        <meta name="description" content={post.excerpt} />
      </Head>

      <main className="landingMain">
        <header className="topbar landingTopbar">
          <Link href="/" className="brand landingBrand">
            <span className="brandMark" />
            OpenClaw Autopilot
          </Link>
          <nav className="navLinks landingNavLinks">
            <Link href="/blog" className="landingNavLink">
              Blog
            </Link>
            <Link href="/pricing" className="landingNavLink">
              Pricing
            </Link>
            <Link href="/login" className="landingNavLink">
              Login
            </Link>
          </nav>
        </header>

        <article className="blogPost">
          <p className="blogMeta">
            {new Date(post.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {post.author ? ` · ${post.author}` : ""}
          </p>
          <h1 className="blogPostTitle">{post.title}</h1>
          <p className="blogExcerpt">{post.excerpt}</p>

          <div
            className="blogBody prose prose-zinc max-w-none prose-headings:font-semibold prose-a:text-red-700 prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />

          <div className="actions">
            <Link href="/blog" className="button ghostButton">
              Back to Blog
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getPostSlugs();
  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps<BlogPostPageProps> = async ({ params }) => {
  const slug = String(params?.slug ?? "");
  const post = getPostBySlug(slug);

  return {
    props: {
      post,
    },
  };
};
