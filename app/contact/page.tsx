import client from "@/tina/__generated__/client";
import ContactClient from "./contact-client";

export default async function ContactPage() {
  const [pageRes, settingsRes] = await Promise.all([
    client.queries.page({ relativePath: "contact.md" }),
    client.queries.site_settings({ relativePath: "site.json" }),
  ]);

  return (
    <ContactClient
      data={pageRes.data}
      query={pageRes.query}
      variables={pageRes.variables}
      settings={settingsRes.data.site_settings}
    />
  );
}
