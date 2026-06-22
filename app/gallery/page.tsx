import client from "@/tina/__generated__/client";
import GalleryClient from "./gallery-client";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const res = await client.queries.gallery_imageConnection({ first: 200 });

  return (
    <GalleryClient
      data={res.data}
      query={res.query}
      variables={res.variables}
    />
  );
}
