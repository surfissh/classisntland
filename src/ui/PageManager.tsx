import { useState } from 'react';
import useStore from '@/store/useStore';
import PagePreview from './PagePreview';

interface PageManagerProps {
  toolPosition: 'left' | 'center' | 'right';
}

const PageManager = ({ toolPosition }: PageManagerProps) => {
  const [showPreview, setShowPreview] = useState(false);
  const pages = useStore((s) => s.pages);
  const currentPageId = useStore((s) => s.currentPageId);
  const setCurrentPage = useStore((s) => s.setCurrentPage);
  const addPage = useStore((s) => s.addPage);
  const deletePage = useStore((s) => s.deletePage);

  const currentIndex = pages.findIndex((p) => p.id === currentPageId);
  const totalPages = pages.length;
  const pageLabel = `Page ${currentIndex + 1}/${totalPages}`;

  const goToPrev = () => {
    const newIndex = Math.max(0, currentIndex - 1);
    setCurrentPage(pages[newIndex].id);
  };

  const goToNext = () => {
    const newIndex = Math.min(totalPages - 1, currentIndex + 1);
    setCurrentPage(pages[newIndex].id);
  };

  const canDelete = totalPages > 1;

  const justifyClass =
    toolPosition === 'left'
      ? 'justify-start'
      : toolPosition === 'right'
        ? 'justify-end'
        : 'justify-center';

  return (
    <div className={`flex items-center gap-0.5 ${justifyClass}`}>
      <div className="flex items-center gap-0.5">
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          className="p-1.5 rounded-lg text-neutral-300 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
          title="Previous page"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <button
          onClick={() => setShowPreview(true)}
          className="px-2 py-1 rounded-lg text-xs text-neutral-300 hover:bg-neutral-700 transition-all active:scale-95 font-mono whitespace-nowrap"
          title="Show all pages"
        >
          {pageLabel}
        </button>

        <button
          onClick={goToNext}
          disabled={currentIndex === totalPages - 1}
          className="p-1.5 rounded-lg text-neutral-300 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
          title="Next page"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <button
        onClick={addPage}
        className="p-1.5 rounded-lg text-neutral-300 hover:bg-neutral-700 transition-all active:scale-95"
        title="Add page"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {canDelete && (
        <button
          onClick={() => deletePage(currentPageId)}
          className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-neutral-700 transition-all active:scale-95"
          title="Delete current page"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      )}

      {showPreview && <PagePreview onClose={() => setShowPreview(false)} />}
    </div>
  );
};

export default PageManager;
