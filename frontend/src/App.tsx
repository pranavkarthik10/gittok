import { useEffect, useRef, useCallback, useState } from 'react'
import { GitHubCard } from './components/GitHubCard'
import { Loader2, Search, X, Download, Heart, Share2, ExternalLink } from 'lucide-react'
import { Analytics } from "@vercel/analytics/react"
import { useLikedRepos } from './contexts/LikedReposContext'
import { useGithubRepos } from './hooks/useGithubRepos'
import type { GithubRepo } from './hooks/useGithubRepos'
import { VisibleRepoProvider, useVisibleRepo } from './contexts/VisibleRepoContext'

function App() {
  const [showAbout, setShowAbout] = useState(false)
  const [showLikes, setShowLikes] = useState(false)
  const { repos, loading, fetchRepos } = useGithubRepos()
  const { likedRepos, toggleLike } = useLikedRepos()
  const observerTarget = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries
      if (target.isIntersecting && !loading) {
        fetchRepos()
      }
    },
    [loading, fetchRepos]
  )

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.5,
      rootMargin: '1000px',
    })

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [handleObserver])

  useEffect(() => {
    fetchRepos()
  }, [])

  const filteredLikedRepos = likedRepos.filter(repo =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleExport = () => {
    const dataStr = JSON.stringify(likedRepos, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportFileDefaultName = `gittok-favorites-${new Date().toISOString().split('T')[0]}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

 
  return (
    <VisibleRepoProvider>
      <AppContent
        showAbout={showAbout}
        setShowAbout={setShowAbout}
        showLikes={showLikes}
        setShowLikes={setShowLikes}
        repos={repos}
        loading={loading}
        handleObserver={handleObserver}
        observerTarget={observerTarget}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredLikedRepos={filteredLikedRepos}
        handleExport={handleExport}
      />
    </VisibleRepoProvider>
  )
}

function AppContent({
  showAbout,
  setShowAbout,
  showLikes,
  setShowLikes,
  repos,
  loading,
  handleObserver,
  observerTarget,
  searchQuery,
  setSearchQuery,
  filteredLikedRepos,
  handleExport
}: {
  showAbout: boolean
  setShowAbout: (show: boolean) => void
  showLikes: boolean
  setShowLikes: (show: boolean) => void
  repos: GithubRepo[]
  loading: boolean
  handleObserver: (entries: IntersectionObserverEntry[]) => void
  observerTarget: React.RefObject<HTMLDivElement>
  searchQuery: string
  setSearchQuery: (query: string) => void
  filteredLikedRepos: GithubRepo[]
  handleExport: () => void
}) {
  const { visibleRepo } = useVisibleRepo();
  const { likedRepos, toggleLike } = useLikedRepos();
  const isLiked = visibleRepo ? likedRepos.some((r) => r.id === visibleRepo.id) : false;

  const handleShare = async () => {
    if (!visibleRepo) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: visibleRepo.name,
          text: visibleRepo.description,
          url: visibleRepo.html_url,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(visibleRepo.html_url);
    }
  };
 
  return (
    <div className="h-screen w-full bg-black text-white overflow-y-scroll snap-y snap-mandatory">
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => window.location.reload()}
          className="text-2xl font-bold text-white drop-shadow-lg hover:opacity-80 transition-opacity"
        >
          GitTok
        </button>
      </div>
 
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
        <button
          onClick={() => setShowAbout(!showAbout)}
          className="text-sm text-white/70 hover:text-white transition-colors"
        >
          About
        </button>
        <button
          onClick={() => setShowLikes(!showLikes)}
          className="text-sm text-white/70 hover:text-white transition-colors"
        >
          Likes
        </button>
      </div>
 
      <div className="fixed right-4 bottom-20 z-50 flex flex-col gap-4">
        <button
          onClick={() => visibleRepo && toggleLike(visibleRepo)}
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
        {visibleRepo && (
          <a
            href={visibleRepo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 bg-gray-800/80 rounded-full hover:bg-gray-700/80 transition-colors"
          >
            <ExternalLink className="w-6 h-6" />
          </a>
        )}
      </div>

      {showAbout && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 p-6 rounded-lg max-w-md relative">
            <button
              onClick={() => setShowAbout(false)}
              className="absolute top-2 right-2 text-white/70 hover:text-white"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4">About GitTok</h2>
            <p className="mb-4">
              A TikTok-style interface for exploring random GitHub repositories.
            </p>
            <p className="text-white/70">
              Check out the code on{' '}
              <a
                href="https://github.com/pranavkarthik10/gittok"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:underline"
              >
                GitHub
              </a>
            </p>
          </div>
        </div>
      )}

      {showLikes && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 p-6 rounded-lg w-full max-w-2xl h-[80vh] flex flex-col relative">
            <button
              onClick={() => setShowLikes(false)}
              className="absolute top-2 right-2 text-white/70 hover:text-white"
            >
              ✕
            </button>

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Liked Repositories</h2>
              {likedRepos.length > 0 && (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Export liked repositories"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              )}
            </div>

            <div className="relative mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search liked repositories..."
                className="w-full bg-gray-800 text-white px-4 py-2 pl-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-5 h-5 text-white/50 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>

            <div className="flex-1 overflow-y-auto min-h-0">
              {filteredLikedRepos.length === 0 ? (
                <p className="text-white/70">
                  {searchQuery ? "No matches found." : "No liked repositories yet."}
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredLikedRepos.map((repo) => (
                    <div key={repo.id} className="flex gap-4 items-start group">
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <a
                            href={repo.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold hover:text-gray-200"
                          >
                            {repo.name}
                          </a>
                          <button
                            onClick={() => toggleLike(repo)}
                            className="text-white/50 hover:text-white/90 p-1 rounded-full md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                            aria-label="Remove from likes"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-white/70 line-clamp-2">
                          {repo.description}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-sm text-white/50">
                          <span>★ {repo.stargazers_count.toLocaleString()}</span>
                          {repo.language && <span>{repo.language}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {repos.map((repo) => (
        <GitHubCard key={repo.id} repo={repo} />
      ))}
      <div ref={observerTarget} className="h-10 -mt-1" />
      {loading && (
        <div className="h-screen w-full flex items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      )}
      <Analytics />
    </div>
  )
}

export default App
