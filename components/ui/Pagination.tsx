'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, pages, total, itemLabel, onPageChange }: PaginationProps) {
  if (pages <= 1) return total > 0 ? (
    <div style={{ padding: '13px 16px', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12 }}>
      {total} {itemLabel}
    </div>
  ) : null;

  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const end = Math.min(pages, start + 4);
  const visiblePages = Array.from({ length: end - start + 1 }, (_, index) => start + index);

  return (
    <nav
      aria-label={`${itemLabel} pagination`}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 16px', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}
    >
      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
        {total} {itemLabel} | Page {page} of {pages}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <button
          type="button"
          className="btn btn-outline btn-sm"
          aria-label="Previous page"
          title="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          style={{ width: 34, padding: 0 }}
        >
          <ChevronLeft size={16} />
        </button>
        {visiblePages.map(pageNumber => (
          <button
            type="button"
            key={pageNumber}
            className={`btn btn-sm ${pageNumber === page ? 'btn-primary' : 'btn-outline'}`}
            aria-label={`Page ${pageNumber}`}
            aria-current={pageNumber === page ? 'page' : undefined}
            onClick={() => onPageChange(pageNumber)}
            style={{ width: 34, padding: 0 }}
          >
            {pageNumber}
          </button>
        ))}
        <button
          type="button"
          className="btn btn-outline btn-sm"
          aria-label="Next page"
          title="Next page"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          style={{ width: 34, padding: 0 }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </nav>
  );
}
