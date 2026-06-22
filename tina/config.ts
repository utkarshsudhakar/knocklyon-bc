import { defineConfig } from "tinacms";
import * as siteJson from "../content/settings/site.json";

// Statically import all season files — safe for browser bundling.
// Add a new import here whenever a new season file is created.
const allSeasonFiles: Record<string, any> = {};
try { allSeasonFiles["2025-26"] = require("../content/seasons/2025-26.json"); } catch {}
try { allSeasonFiles["2026-27"] = require("../content/seasons/2026-27.json"); } catch {}

function currentSeasonTeamNames(): string[] {
  const season: string = (siteJson as any).current_season ?? "";
  const slug = season.replace("/", "-");
  return (allSeasonFiles[slug]?.teams ?? [])
    .map((t: any) => t.name)
    .filter(Boolean);
}

// Your hosting provider likely exposes this as an environment variable
const branch =
  process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.HEAD ||
  "main";

const COLLECTION_LABELS: Record<string, string> = {
  fixture:       "Match Fixtures",
  news:          "News",
  gallery_image: "Gallery",
  page:          "Pages",
  site_settings: "Site Settings",
};

function injectBackButton() {
  if (typeof window === "undefined") return;

  let lastHash = "";

  function render() {
    const hash = window.location.hash;
    if (hash === lastHash) return; // nothing changed — skip
    lastHash = hash;

    document.getElementById("kbc-admin-back")?.remove();

    // Only show when editing a specific document: #/collections/edit/{col}/{doc}
    const m = hash.match(/#\/collections\/edit\/([^/]+)\/.+/);
    if (!m) return;

    const col = m[1];
    const label = COLLECTION_LABELS[col] ?? col;

    const btn = document.createElement("a");
    btn.id = "kbc-admin-back";
    btn.href = `#/collections/${col}`;
    btn.textContent = `← Back to ${label}`;
    Object.assign(btn.style, {
      position:       "fixed",
      bottom:         "28px",
      left:           "50%",
      transform:      "translateX(-50%)",
      zIndex:         "99999",
      background:     "#1B5E35",
      color:          "#ffffff",
      padding:        "9px 22px",
      borderRadius:   "999px",
      fontSize:       "13px",
      fontWeight:     "600",
      textDecoration: "none",
      boxShadow:      "0 4px 18px rgba(0,0,0,0.28)",
      whiteSpace:     "nowrap",
    });
    document.body.appendChild(btn);
  }

  // Poll every 250ms — more reliable than hashchange in React Router SPAs
  // where pushState is used instead of real hash navigation events.
  setInterval(render, 250);
}

export default defineConfig({
  branch,
  cmsCallback: (_cms) => {
    injectBackButton();
  },

  // Get this from tina.io
  clientId: process.env.NEXT_PUBLIC_TINA_CLIENT_ID,
  // Get this from tina.io
  token: process.env.TINA_TOKEN,

  build: {
    outputFolder: "admin",
    publicFolder: "public",
  },
  // Uncomment to allow cross-origin requests from non-localhost origins
  // during local development (e.g. GitHub Codespaces, Gitpod, Docker).
  // Use 'private' to allow all private-network IPs (WSL2, Docker, etc.)
  // server: {
  //   allowedOrigins: ['https://your-codespace.github.dev'],
  // },
  media: {
    tina: {
      mediaRoot: "",
      publicFolder: "public",
    },
  },
  // See docs on content modeling for more info on how to setup new content models: https://tina.io/docs/r/content-modelling-collections/
  schema: {
    collections: [
      {
        name: "page",
        label: "Pages",
        path: "content/pages",
        format: "md",
        ui: {
          router: ({ document }) => {
            if (document._sys.filename === "home") return "/";
            return `/${document._sys.filename}`;
          },
        },
        fields: [
          {
            type: "string",
            name: "title",
            label: "Page title",
            isTitle: true,
            required: true,
          },
          {
            type: "image",
            name: "hero_image",
            label: "Hero image",
          },
          {
            type: "image",
            name: "second_image",
            label: "Second image (About page right column)",
          },
          {
            type: "rich-text",
            name: "second_body",
            label: "Second body text (About page lower-left)",
          },
          {
            type: "string",
            name: "hero_subtitle",
            label: "Hero subtitle",
          },
          {
            type: "rich-text",
            name: "body",
            label: "Page content",
            isBody: true,
          },
        ],
      },
      {
        name: "news",
        label: "News",
        path: "content/news",
        format: "md",
        ui: {
          router: ({ document }) => `/news/${document._sys.filename}`,
        },
        fields: [
          {
            type: "string",
            name: "title",
            label: "Headline",
            isTitle: true,
            required: true,
          },
          {
            type: "datetime",
            name: "date",
            label: "Date",
            required: true,
            ui: { dateFormat: "DD MMM YYYY" },
          },
          {
            type: "image",
            name: "cover_image",
            label: "Cover photo",
          },
          {
            type: "string",
            name: "excerpt",
            label: "Short summary (shown in news listing)",
            ui: { component: "textarea" },
          },
          {
            type: "rich-text",
            name: "body",
            label: "Article content",
            isBody: true,
          },
        ],
      },
      {
        name: "season",
        label: "Seasons",
        path: "content/seasons",
        format: "json",
        fields: [
          {
            type: "string",
            name: "name",
            label: "Season display name (e.g. 2026/27)",
            isTitle: true,
            required: true,
          },
          {
            type: "string",
            name: "folder",
            label: "Fixture folder (must match folder name in content/fixtures, e.g. 2026-27)",
            required: true,
          },
          {
            type: "boolean",
            name: "archived",
            label: "Archived (hides this season from the public website)",
          },
          {
            type: "object",
            name: "teams",
            label: "Teams this season",
            list: true,
            ui: {
              itemProps: (item) => ({ label: item?.name ?? "Team" }),
            },
            fields: [
              {
                type: "string",
                name: "name",
                label: "Team name (e.g. Men's 1)",
                required: true,
              },
              {
                type: "string",
                name: "league",
                label: "Division (e.g. Division 4)",
              },
              {
                type: "string",
                name: "table_link",
                label: "League table link (Tournament Software URL)",
              },
            ],
          },
        ],
      },
      {
        name: "fixture",
        label: "Match Fixtures",
        path: "content/fixtures",
        format: "json",
        ui: {
          // New fixtures land in the current-season subfolder automatically.
          // Admin can override the filename prefix (e.g. 2026-27/my-fixture).
          defaultItem: async () => {
            try {
              const res = await fetch("/api/current-season");
              const { season } = await res.json();
              // Convert "2026/27" → "2026-27" for use as folder name
              const folder = season ? season.replace("/", "-") : "";
              return folder ? { _relativePath: `${folder}/` } : {};
            } catch {
              return {};
            }
          },
        },
        fields: [
          {
            type: "datetime",
            name: "date",
            label: "Match date & time",
            required: true,
            ui: {
              dateFormat: "DD MMM YYYY",
              timeFormat: "HH:mm",
            },
          },
          {
            type: "string",
            name: "home_team",
            label: "Our team",
            required: true,
            options: currentSeasonTeamNames(),
          },
          {
            type: "string",
            name: "opponent",
            label: "Opponent team (e.g. PBC M2)",
            required: true,
            isTitle: true,
          },
          {
            type: "string",
            name: "venue",
            label: "Home or Away",
            options: ["Home", "Away"],
            required: true,
          },
          {
            type: "string",
            name: "location",
            label: "Location / Venue address",
          },
          {
            type: "string",
            name: "map_link",
            label: "Maps link (paste a Google Maps URL for the venue)",
          },
          {
            type: "string",
            name: "result",
            label: "Result (fill in after match, e.g. 5-3)",
          },
          {
            type: "rich-text",
            name: "notes",
            label: "Notes",
          },
        ],
      },
      {
        name: "gallery_image",
        label: "Gallery",
        path: "content/gallery",
        format: "json",
        fields: [
          {
            type: "image",
            name: "image",
            label: "Image",
            required: true,
          },
          {
            type: "string",
            name: "caption",
            label: "Caption (optional)",
          },
          {
            type: "number",
            name: "order",
            label: "Display order (lower = first)",
          },
        ],
      },
      {
        name: "site_settings",
        label: "Site Settings",
        path: "content/settings",
        format: "json",
        ui: {
          allowedActions: {
            create: false,
            delete: false,
          },
        },
        fields: [
          {
            type: "string",
            name: "club_name",
            label: "Club name",
            isTitle: true,
            required: true,
          },
          {
            type: "string",
            name: "current_season",
            label: "Current season (e.g. 2025/26) — fixtures page defaults to this",
          },
          {
            type: "string",
            name: "announcement",
            label: "Announcement banner (leave empty to hide)",
            ui: { component: "textarea" },
          },
          {
            type: "string",
            name: "announcement_link",
            label: "Announcement link (optional — makes the banner clickable)",
          },
          {
            type: "image",
            name: "logo",
            label: "Club logo (shown in header & footer)",
          },
          {
            type: "string",
            name: "tagline",
            label: "Tagline",
          },
          {
            type: "string",
            name: "club_email",
            label: "Club email",
          },
          {
            type: "string",
            name: "phone",
            label: "Phone",
          },
          {
            type: "string",
            name: "address",
            label: "Address",
            ui: { component: "textarea" },
          },
          {
            type: "string",
            name: "facebook_url",
            label: "Facebook URL",
          },
          {
            type: "string",
            name: "instagram_url",
            label: "Instagram URL",
          },
          {
            type: "object",
            name: "stats",
            label: "Home page stats (5+ Teams, 60+ Members etc.)",
            list: true,
            ui: {
              itemProps: (item) => ({ label: item?.label ?? "Stat" }),
            },
            fields: [
              {
                type: "string",
                name: "value",
                label: "Value (e.g. 5+, 60+, Dublin 16)",
                required: true,
              },
              {
                type: "string",
                name: "label",
                label: "Label (e.g. Teams, Members)",
                required: true,
              },
            ],
          },
        ],
      },
    ],
  },
});
