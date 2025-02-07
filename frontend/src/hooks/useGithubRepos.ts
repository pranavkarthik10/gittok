import { useState, useCallback, useEffect } from 'react';
import { Octokit } from 'octokit';

// Get environment variable type definition
declare global {
  interface ImportMetaEnv {
    readonly VITE_GITHUB_TOKEN: string;
  }
}

export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  language: string;
  owner: {
    avatar_url: string;
    login: string;
  };
  topics: string[];
  created_at: string;
  updated_at: string;
  readme_html?: string;
}

const octokit = new Octokit({
  auth: import.meta.env.VITE_GITHUB_TOKEN
});

const MAX_PAGE = 20; // Increased page range due to higher rate limit

const processReadmeHtml = (html: string, repoUrl: string): string => {
  if (!html) return html;
  
  // Extract owner and repo name from the URL
  const [, owner, repoName] = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/) || [];
  if (!owner || !repoName) return html;

  // Replace relative image URLs with absolute URLs
  return html.replace(
    /src="(?!https?:\/\/)([^"]+)"/g,
    (match, relativeUrl) => 
      match.replace(relativeUrl, `https://raw.githubusercontent.com/${owner}/${repoName}/main/${relativeUrl}`)
  );
};

export function useGithubRepos() {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRepos = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get repos with more than 1000 stars, sorted randomly
      const response = await octokit.rest.search.repos({
        q: 'stars:>1000',
        sort: 'updated',
        per_page: 5,
        page: Math.floor(Math.random() * MAX_PAGE) + 1
      });

      const newRepos = response.data.items as GithubRepo[];
      
      // Fetch readme and topics for each repo
      const reposWithDetails = await Promise.all(
        newRepos.map(async (repo) => {
          try {
            const [readmeResponse, topicsResponse] = await Promise.all([
              octokit.rest.repos.getReadme({
                owner: repo.owner.login,
                repo: repo.name,
                headers: {
                  accept: 'application/vnd.github.html'
                }
              }),
              octokit.rest.repos.getAllTopics({
                owner: repo.owner.login,
                repo: repo.name
              })
            ]);

            return {
              ...repo,
              topics: topicsResponse.data.names,
              readme_html: processReadmeHtml(readmeResponse.data.toString()
, repo.html_url)
            };
          } catch (error) {
            // If we can't get the readme or topics, return the repo without them
            console.error(`Error fetching details for ${repo.full_name}:`, error);
            return {
              ...repo,
              description: repo.description,
              topics: [],
              readme_html: undefined
            };
          }
        })
      );

      setRepos((prevRepos) => [...prevRepos, ...reposWithDetails]);
    } catch (error) {
      console.error('Error fetching repos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  return { repos, loading, fetchRepos };
}