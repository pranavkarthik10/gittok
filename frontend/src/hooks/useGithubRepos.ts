import { useState, useCallback } from 'react';
import { Octokit } from 'octokit';

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

const octokit = new Octokit();

export function useGithubRepos() {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRepos = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get repos with more than 1000 stars, sorted randomly
      const response = await octokit.rest.search.repos({
        q: 'stars:>1000 language:en',
        sort: 'stars',
        per_page: 5,
        page: Math.floor(Math.random() * 10) + 1
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
              readme_html: readmeResponse.data.toString()
            };
          } catch (error) {
            // If we can't get the readme or topics, return the repo without them
            console.error(`Error fetching details for ${repo.full_name}:`, error);
            return {
              ...repo,
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

  return { repos, loading, fetchRepos };
}