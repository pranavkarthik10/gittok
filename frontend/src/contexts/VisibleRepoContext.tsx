import { createContext, useContext, useState } from 'react';
import type { GithubRepo } from '../hooks/useGithubRepos';

interface VisibleRepoContextType {
  visibleRepo: GithubRepo | null;
  setVisibleRepo: (repo: GithubRepo | null) => void;
}

const VisibleRepoContext = createContext<VisibleRepoContextType | null>(null);

export function VisibleRepoProvider({ children }: { children: React.ReactNode }) {
  const [visibleRepo, setVisibleRepo] = useState<GithubRepo | null>(null);

  return (
    <VisibleRepoContext.Provider value={{ visibleRepo, setVisibleRepo }}>
      {children}
    </VisibleRepoContext.Provider>
  );
}

export function useVisibleRepo() {
  const context = useContext(VisibleRepoContext);
  if (!context) {
    throw new Error('useVisibleRepo must be used within a VisibleRepoProvider');
  }
  return context;
}