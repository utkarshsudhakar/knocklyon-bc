import client from "@/tina/__generated__/client";
import ArticleClient from "./article-client";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const res = await client.queries.news({ relativePath: `${slug}.md` });
    return (
      <ArticleClient
        data={res.data}
        query={res.query}
        variables={res.variables}
      />
    );
  } catch {
    notFound();
  }
}
