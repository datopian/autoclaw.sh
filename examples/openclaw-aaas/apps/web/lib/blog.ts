import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export type BlogPostMeta = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  author?: string;
};

export type BlogPost = BlogPostMeta & {
  content: string;
  html: string;
};

function ensureBlogDir() {
  if (!fs.existsSync(BLOG_DIR)) {
    return [];
  }
  return fs
    .readdirSync(BLOG_DIR)
    .filter((filename) => filename.endsWith(".md"));
}

function mapMeta(slug: string, data: Record<string, unknown>): BlogPostMeta {
  const title = typeof data.title === "string" ? data.title : slug;
  const date = typeof data.date === "string" ? data.date : "1970-01-01";
  const excerpt = typeof data.excerpt === "string" ? data.excerpt : "";
  const author = typeof data.author === "string" ? data.author : undefined;

  return { slug, title, date, excerpt, author };
}

export function getAllPosts(): BlogPostMeta[] {
  const files = ensureBlogDir();
  const posts = files.map((filename) => {
    const slug = filename.replace(/\.md$/, "");
    const fullPath = path.join(BLOG_DIR, filename);
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data } = matter(fileContents);
    return mapMeta(slug, data as Record<string, unknown>);
  });

  return posts.sort((a, b) => (a.date > b.date ? -1 : 1));
}

export function getPostSlugs(): string[] {
  return ensureBlogDir().map((filename) => filename.replace(/\.md$/, ""));
}

export function getPostBySlug(slug: string): BlogPost {
  const fullPath = path.join(BLOG_DIR, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  const meta = mapMeta(slug, data as Record<string, unknown>);
  const html = marked.parse(content, { async: false }) as string;

  return {
    ...meta,
    content,
    html,
  };
}
