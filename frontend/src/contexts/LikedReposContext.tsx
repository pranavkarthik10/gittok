import { createContext, useContext, useState, useEffect } from 'react';
import type { GithubRepo } from '../hooks/useGithubRepos';

interface LikedReposContextType {
  likedRepos: GithubRepo[];
  toggleLike: (repo: GithubRepo) => void;
}

const LikedReposContext = createContext<LikedReposContextType>({
  likedRepos: [],
  toggleLike: () => {},
});

export const useLikedRepos = () => useContext(LikedReposContext);

export function LikedReposProvider({ children }: { children: React.ReactNode }) {
  const [likedRepos, setLikedRepos] = useState<GithubRepo[]>(() => {
    const saved = localStorage.getItem('likedRepos');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('likedRepos', JSON.stringify(likedRepos));
  }, [likedRepos]);

  const toggleLike = (repo: GithubRepo) => {
    setLikedRepos((prev) => {
      const exists = prev.some((r) => r.id === repo.id);
      if (exists) {
        return prev.filter((r) => r.id !== repo.id);
      }
      return [...prev, repo];
    });
  };

  return (
    <LikedReposContext.Provider value={{ likedRepos, toggleLike }}>
      {children}
    </LikedReposContext.Provider>
  );
}