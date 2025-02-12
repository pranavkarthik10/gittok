import { useEffect, useRef } from 'react';
import type { GithubRepo } from '../hooks/useGithubRepos';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { useVisibleRepo } from '../contexts/VisibleRepoContext';

interface GitHubCardProps {
  repo: GithubRepo;
}

export function GitHubCard({ repo }: GitHubCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { setVisibleRepo } = useVisibleRepo();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleRepo(repo);
          }
        });
      },
      { threshold: 0.6 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [repo, setVisibleRepo]);

  return (
    <div className="h-screen w-screen snap-start bg-gray-900 flex items-center justify-center">
      <div ref={cardRef} className="w-screen max-w-2xl h-[80vh] bg-gray-800 rounded-lg p-6 relative">
        <div className="h-full overflow-y-auto hide-scrollbar">
        <div className="flex items-center gap-4 mb-4">
          <img
            src={repo.owner.avatar_url}
            alt={repo.owner.login}
            className="w-12 h-12 rounded-full"
          />
          <div>
            <h2 className="text-xl font-bold">{repo.name}</h2>
            <a
              href={`https://github.com/${repo.owner.login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              @{repo.owner.login}
            </a>
          </div>
        </div>

        <p className="text-lg mb-4">{repo.description}</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {repo.topics.map((topic) => (
            <span
              key={topic}
              className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm"
            >
              {topic}
            </span>
          ))}
        </div>

        <div className="stats flex gap-6 mb-6 text-gray-400">
          <div className="flex items-center gap-1">
            <span className="text-yellow-400">★</span>
            {repo.stargazers_count.toLocaleString()}
          </div>
          {repo.language && (
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              {repo.language}
            </div>
          )}
        </div>

        {repo.readme_html && (
          <div className="prose prose-invert max-w-none mb-4 max-h-[50vh] overflow-y-auto hide-scrollbar relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-20 after:bg-gradient-to-t after:from-gray-800 after:to-transparent">
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>
              {repo.readme_html}
            </ReactMarkdown>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}