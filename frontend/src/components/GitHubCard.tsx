import { Heart, Share2, ExternalLink } from 'lucide-react';
import { useLikedRepos } from '../contexts/LikedReposContext';
import type { GithubRepo } from '../hooks/useGithubRepos';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

interface GitHubCardProps {
  repo: GithubRepo;
}

export function GitHubCard({ repo }: GitHubCardProps) {
  const { likedRepos, toggleLike } = useLikedRepos();
  const isLiked = likedRepos.some((r) => r.id === repo.id);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: repo.name,
          text: repo.description,
          url: repo.html_url,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(repo.html_url);
    }
  };

  return (
    <div className="h-screen w-full snap-start relative bg-gray-900 flex items-center justify-center">
      <div className="w-full max-w-2xl h-[80vh] bg-gray-800 rounded-lg p-6 overflow-y-auto relative">
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
          <div className="prose prose-invert max-w-none mb-4">
            <ReactMarkdown rehypePlugins={[rehypeRaw]}>
              {repo.readme_html}
            </ReactMarkdown>
          </div>
        )}

        <div className="fixed right-4 bottom-20 flex flex-col gap-4">
          <button
            onClick={() => toggleLike(repo)}
            className="p-3 bg-gray-800/80 rounded-full hover:bg-gray-700/80 transition-colors"
          >
            <Heart
              className={`w-6 h-6 ${
                isLiked ? 'fill-red-500 text-red-500' : 'text-white'
              }`}
            />
          </button>
          <button
            onClick={handleShare}
            className="p-3 bg-gray-800/80 rounded-full hover:bg-gray-700/80 transition-colors"
          >
            <Share2 className="w-6 h-6" />
          </button>
          <a
            href={repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-gray-800/80 rounded-full hover:bg-gray-700/80 transition-colors"
          >
            <ExternalLink className="w-6 h-6" />
          </a>
        </div>
      </div>
    </div>
  );
}