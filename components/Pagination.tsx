import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalCount: number;
  limit: number;
}

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  hasNextPage,
  hasPreviousPage,
  totalCount,
  limit,
}: PaginationProps) => {
  const startItem = (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, totalCount);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show pages with ellipsis
      if (currentPage <= 3) {
        // Show first 4 pages + ellipsis + last page
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        if (totalPages > 5) {
          pages.push("...");
        }
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Show first page + ellipsis + last 4 pages
        pages.push(1);
        if (totalPages > 5) {
          pages.push("...");
        }
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show first page + ellipsis + current-1, current, current+1 + ellipsis + last page
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
      <div className="text-sm tabular-nums text-gray-500">
        Showing <span className="font-medium text-gray-900">{startItem}</span>{" "}
        to <span className="font-medium text-gray-900">{endItem}</span> of{" "}
        <span className="font-medium text-gray-900">{totalCount}</span> results
      </div>

      <div className="flex items-center gap-1">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
          className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-gray-600 transition-all duration-200 ease-out hover:bg-surface-muted hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => {
            if (page === "...") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 py-2 text-sm text-gray-400"
                >
                  ...
                </span>
              );
            }

            const pageNumber = page as number;
            const isCurrentPage = pageNumber === currentPage;

            return (
              <button
                key={pageNumber}
                onClick={() => onPageChange(pageNumber)}
                className={`min-w-[2.5rem] rounded-full px-3 py-2 text-sm font-medium tabular-nums transition-all duration-200 ease-out active:scale-[0.98] ${
                  isCurrentPage
                    ? "bg-secondary text-primary-950 shadow-soft"
                    : "text-gray-600 hover:bg-surface-muted hover:text-gray-900"
                }`}
              >
                {pageNumber}
              </button>
            );
          })}
        </div>

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-gray-600 transition-all duration-200 ease-out hover:bg-surface-muted hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
