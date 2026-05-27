import { useState } from 'react';
import useStore from '@/store/useStore';
import PagePreview from './PagePreview';

interface PageManagerProps {
  isVertical: boolean;
}

const PageManager = ({ isVertical }: PageManagerProps) => {
  const [showPreview, setShowPreview] = useState(false);
  const pages = useStore((s) => s.pages);
  const currentPageId = useStore((s) => s.currentPageId);
  const setCurrentPage = useStore((s) => s.setCurrentPage);
  const addPage = useStore((s) => s.addPage);
  const deletePage = useStore((s) => s.deletePage);

  const currentIndex = pages.findIndex((p) => p.id === currentPageId);
  const totalPages = pages.length;
  const pageLabel = `${currentIndex + 1}/${totalPages}`;
  const isLastPage = currentIndex === totalPages - 1;

  const goToPrev = () => {
    const newIndex = Math.max(0, currentIndex - 1);
    setCurrentPage(pages[newIndex].id);
  };

  const goToNext = () => {
    if (isLastPage) {
      addPage();
      return;
    }
    const newIndex = Math.min(totalPages - 1, currentIndex + 1);
    setCurrentPage(pages[newIndex].id);
  };

  return (
    <div className={`flex ${isVertical ? 'flex-col' : 'flex-row items-center'} gap-0.5`}>
      <button
        onClick={goToPrev}
        disabled={currentIndex === 0}
        className="p-1.5 flex justify-center rounded-lg text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
        title="Previous page"
      >
        {isVertical ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        )}
      </button>

      <button
        onClick={() => setShowPreview(true)}
        className="px-2 py-1 rounded-lg text-xs text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-all active:scale-95 font-mono whitespace-nowrap"
        title="Show all pages"
      >
        {pageLabel}
      </button>

      <button
        onClick={goToNext}
        className="p-1.5 flex justify-center rounded-lg text-gray-700 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-all active:scale-95"
        title={isLastPage ? 'Add page' : 'Next page'}
      >
        {isLastPage ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        ) : isVertical ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </button>

      {showPreview && <PagePreview onClose={() => setShowPreview(false)} />}
    </div>
  );
};

export default PageManager;
