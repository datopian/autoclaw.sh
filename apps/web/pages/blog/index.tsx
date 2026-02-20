import Head from "next/head";
import Link from "next/link";
import type { GetStaticProps } from "next";
import { BlogPostMeta, getAllPosts } from "../../lib/blog";

type BlogIndexProps = {
  posts: BlogPostMeta[];
};

export default function BlogIndexPage({ posts }: BlogIndexProps) {
  return (
    <>
      <Head>
        <title>Blog | OpenClaw AaaS</title>
        <meta
          name="description"
          content="OpenClaw product updates, release notes, and guides for running your own AI agent."
        />
      </Head>

      <main className="landingMain">
        <header className="topbar landingTopbar">
          <Link href="/" className="brand landingBrand">
            <span className="brandMark" />
            OpenClaw AaaS
          </Link>
          <nav className="navLinks landingNavLinks">
            <Link href="/" className="landingNavLink">
              Home
            </Link>
            <Link href="/pricing" className="landingNavLink">
              Pricing
            </Link>
            <Link href="/login" className="landingNavLink">
              Login
            </Link>
          </nav>
        </header>

        <section className="heroPanel">
          <span className="pill">Blog</span>
          <h1 className="heroTitle">News, Guides, and Product Updates</h1>
          <p className="heroSub">Publish markdown posts and keep users informed as you ship.</p>
        </section>

        <section className="blogList">
          {posts.map((post) => (
            <article className="blogCard" key={post.slug}>
              <p className="blogMeta">
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                {post.author ? ` · ${post.author}` : ""}
              </p>
              <h2 className="blogTitle">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="blogExcerpt">{post.excerpt}</p>
              <Link href={`/blog/${post.slug}`} className="blogReadMore">
                Read post
              </Link>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps<BlogIndexProps> = async () => {
  const posts = getAllPosts();
  return {
    props: {
      posts,
    },
  };
};
