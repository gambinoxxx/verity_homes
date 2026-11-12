import { getLatestPosts } from "@/lib/db/queries/posts";
import { PostsSection } from "../post-cards";

/** "Insights for buyers & investors": the 3 newest published posts (1 big + 2 small). */
export async function LatestPosts() {
  const posts = await getLatestPosts(3);
  return (
    <PostsSection
      posts={posts}
      id="blog"
      pill="Articles & insights"
      title="Insights for buyers & investors"
      layout="featured"
    />
  );
}
