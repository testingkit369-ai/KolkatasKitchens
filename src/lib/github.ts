import { Octokit } from "octokit";

export function getOctokit(token: string) {
  return new Octokit({ auth: token });
}

export async function fetchUserRepos(token: string) {
  const octokit = getOctokit(token);
  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: 100,
  });
  return data;
}

export async function fetchRepoContents(token: string, owner: string, repo: string, path: string = "") {
  const octokit = getOctokit(token);
  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
  });
  return data;
}

export async function fetchFileContent(token: string, owner: string, repo: string, path: string) {
  const octokit = getOctokit(token);
  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
  });
  
  if (Array.isArray(data)) {
    throw new Error("Path is a directory, not a file.");
  }
  
  if ("content" in data && typeof data.content === 'string') {
    // GitHub base64 often contains newlines, remove them before decoding
    const base64 = data.content.replace(/\s/g, '');
    try {
      // Use decodeURIComponent(escape(atob(b64))) for UTF-8 support
      return decodeURIComponent(escape(atob(base64)));
    } catch (e) {
      // Fallback to simple atob if UTF-8 decode fails
      return atob(base64);
    }
  }
  
  throw new Error("Could not fetch file content.");
}

export async function fetchRepoTree(token: string, owner: string, repo: string, branch: string = "main") {
  const octokit = getOctokit(token);
  const { data } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: "true",
  });
  return data.tree;
}
