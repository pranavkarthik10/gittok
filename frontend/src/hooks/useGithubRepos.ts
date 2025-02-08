import { useState, useCallback, useEffect, useRef } from 'react';
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

const PAGE_SIZE = 20;
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes cache
const SCROLL_THRESHOLD = 0.5; // Start loading when 50% through current content

// Cache structure definitions
interface RepoCache {
  timestamp: number;
  data: GithubRepo[];
}

interface DetailCache {
  [key: number]: {
    topics: string[];
    readme_html?: string;
    timestamp: number;
  };
}

export function useGithubRepos() {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  // Client-side caches
  const searchCache = useRef<Map<number, RepoCache>>(new Map());
  const detailsCache = useRef<DetailCache>({});

  const processAndCacheRepos = useCallback(async (newRepos: GithubRepo[]) => {
    const processedRepos = await Promise.all(
      newRepos.map(async (repo) => {
        const now = Date.now();
        const cached = detailsCache.current[repo.id];
        
        // Use cached details if they exist and are fresh
        if (cached && now - cached.timestamp < CACHE_TTL) {
          return { ...repo, ...cached };
        }

        try {
          const [readmeResponse, topicsResponse] = await Promise.all([
            octokit.rest.repos.getReadme({
              owner: repo.owner.login,
              repo: repo.name,
              headers: { accept: 'application/vnd.github.html' }
            }),
            octokit.rest.repos.getAllTopics({
              owner: repo.owner.login,
              repo: repo.name
            })
          ]);

          const processedReadme = processReadmeHtml(
            readmeResponse.data.toString(),
            repo.html_url
          );

          // Update details cache
          detailsCache.current[repo.id] = {
            topics: topicsResponse.data.names,
            readme_html: processedReadme,
            timestamp: Date.now()
          };

          return {
            ...repo,
            topics: topicsResponse.data.names,
            readme_html: processedReadme
          };
        } catch (error) {
          console.error(`Error fetching details for ${repo.full_name}:`, error);
          return {
            ...repo,
            topics: [],
            readme_html: undefined
          };
        }
      })
    );

    return processedRepos;
  }, []);

  const fetchRepos = useCallback(async () => {
    if (!hasMore || loading) return;

    try {
      setLoading(true);
      
      // Check search cache first
      const cachedSearch = searchCache.current.get(page);
      if (cachedSearch && Date.now() - cachedSearch.timestamp < CACHE_TTL) {
        setRepos(prev => deduplicatedMerge(prev, cachedSearch.data));
        return;
      }

      const response = await octokit.rest.search.repos({
        q: 'stars:>1000',
        sort: 'updated',
        per_page: PAGE_SIZE,
        page: page
      });

      if (response.data.items.length === 0) {
        setHasMore(false);
        return;
      }

      const processedRepos = await processAndCacheRepos(response.data.items as GithubRepo[]);
      
      // Update search cache
      searchCache.current.set(page, {
        timestamp: Date.now(),
        data: processedRepos
      });

      setRepos(prev => deduplicatedMerge(prev, processedRepos));
      setPage(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching repos:', error);
    } finally {
      setLoading(false);
    }
  }, [page, hasMore, loading, processAndCacheRepos]);

  // Scroll handler with debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const scrollContainer = document.querySelector('.h-screen.overflow-y-scroll');
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, clientHeight, scrollHeight } = scrollContainer;
      const scrolledTo = scrollTop + clientHeight;
      
const scrollPercentage = scrolledTo / scrollHeight;
      
      if (scrollPercentage > SCROLL_THRESHOLD) {
        if (!timeoutId) {
          timeoutId = setTimeout(() => {
            fetchRepos();
          }, 300);
        }
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
 
      scrollContainer.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [fetchRepos]);

  // Initial load
  useEffect(() => {
    const initialLoad = async () => {
      // Fetch first 3 pages in parallel
      const pages = [1, 2, 3];
      try {
        setLoading(true);
        const responses = await Promise.all(pages.map(async (pageNum) => {
          const response = await octokit.rest.search.repos({
            q: 'stars:>1000',
            sort: 'updated',
            per_page: PAGE_SIZE,
            page: pageNum
          });
          return response.data.items as GithubRepo[];
        }));
        
        const allRepos = await Promise.all(responses.map(processAndCacheRepos));
        setRepos(allRepos.flat());
        setPage(pages.length + 1);
      } catch (error) {
        console.error('Error in initial load:', error);
      } finally {
        setLoading(false);
      }
    };
    initialLoad();
  }, [fetchRepos]);

  return { repos, loading, hasMore };
}

// Helper function to merge and deduplicate repos
function deduplicatedMerge(existing: GithubRepo[], newRepos: GithubRepo[]) {
  const existingIds = new Set(existing.map(r => r.id));
  return [...existing, ...newRepos.filter(r => !existingIds.has(r.id))];
}

const processReadmeHtml = (html: string, repoUrl: string): string => {
  if (!html) return html;
  
  // Extract owner and repo name from the URL
  const [, owner, repoName] = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/) || [];
  if (!owner || !repoName) return html;

  // Replace relative image URLs with absolute URLs
  return html
    .replace(
      /src="(?!https?:\/\/)([^"]+)"/g,
      (match, relativeUrl) => 
        match.replace(relativeUrl, `https://raw.githubusercontent.com/${owner}/${repoName}/main/${relativeUrl}`)
    )
    .replace(
      /srcset="(?!https?:\/\/)([^"]+)"/g,
      (match, relativeUrl) => 
        match.replace(relativeUrl, `https://raw.githubusercontent.com/${owner}/${repoName}/main/${relativeUrl}`)
    );
};