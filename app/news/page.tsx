import client from "@/tina/__generated__/client";
import NewsClient from "./news-client";

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const res = await client.queries.newsConnection({ sort: "date" });
  return (
    <NewsClient
      data={res.data}
      query={res.query}
      variables={res.variables}
    />
  );
}
