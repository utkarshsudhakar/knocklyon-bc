const API = "https://api.github.com";

export function isGithubPublishConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN);
}

function repoConfig() {
  return {
    repo: process.env.GITHUB_REPO ?? "utkarshsudhakar/knocklyon-bc",
    branch: process.env.GITHUB_PUBLISH_BRANCH ?? "main",
  };
}

async function gh<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw Object.assign(new Error(`GitHub ${res.status}: ${body}`), {
      status: res.status,
    });
  }
  return (await res.json()) as T;
}

export type PublishFile = { path: string; content: string };

// Commits all files in a single commit so the site rebuilds once. Returns
// null when the files already match what is on the branch.
export async function commitFiles(
  files: PublishFile[],
  message: string
): Promise<{ sha: string; url: string } | null> {
  const { repo, branch } = repoConfig();

  for (let attempt = 0; attempt < 3; attempt++) {
    const ref = await gh<{ object: { sha: string } }>(
      `/repos/${repo}/git/ref/heads/${branch}`
    );
    const parent = await gh<{ tree: { sha: string } }>(
      `/repos/${repo}/git/commits/${ref.object.sha}`
    );
    const tree = await gh<{ sha: string }>(`/repos/${repo}/git/trees`, {
      method: "POST",
      body: JSON.stringify({
        base_tree: parent.tree.sha,
        tree: files.map((f) => ({
          path: f.path,
          mode: "100644",
          type: "blob",
          content: f.content,
        })),
      }),
    });
    if (tree.sha === parent.tree.sha) return null;

    const commit = await gh<{ sha: string; html_url: string }>(
      `/repos/${repo}/git/commits`,
      {
        method: "POST",
        body: JSON.stringify({
          message,
          tree: tree.sha,
          parents: [ref.object.sha],
        }),
      }
    );

    try {
      await gh(`/repos/${repo}/git/refs/heads/${branch}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.sha, force: false }),
      });
      return { sha: commit.sha, url: commit.html_url };
    } catch (e) {
      // Someone else pushed in between (e.g. a TinaCMS edit): start again
      // from the new head.
      if ((e as { status?: number }).status === 422 && attempt < 2) continue;
      throw e;
    }
  }
  throw new Error("Could not publish after several attempts. Try again.");
}
