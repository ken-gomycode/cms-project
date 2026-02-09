import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useContents } from '@/api/hooks/useContent';
import { useCategories } from '@/api/hooks/useCategories';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { formatRelative } from '@/lib/dateUtils';
import { ContentStatus, ContentWithRelations } from '@/types';

/**
 * Home page - Public-facing landing page
 * Features hero section, featured articles grid, category filter, and pagination
 */
export const Home = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const pageSize = 9;

  // Fetch published content
  const {
    data: contentData,
    isLoading: isLoadingContent,
    error: contentError,
  } = useContents({
    status: ContentStatus.PUBLISHED,
    limit: pageSize,
    page: currentPage,
    sortBy: 'publishedAt',
    sortOrder: 'desc',
    categoryId: selectedCategory,
  });

  // Fetch categories for filter
  const { data: categoriesData, isLoading: isLoadingCategories } = useCategories({
    limit: 100,
  });

  const articles = contentData?.data || [];
  const totalPages = contentData?.meta.totalPages || 1;
  const categories = categoriesData?.data || [];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryFilter = (categoryId?: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);
  };

  // Helper to get author full name
  const getAuthorName = (author?: { firstName: string; lastName: string }) => {
    if (!author) return 'Unknown Author';
    return `${author.firstName} ${author.lastName}`;
  };

  // Helper to extract categories from nested structure
  const getArticleCategories = (article: ContentWithRelations) => {
    if (!article.categories || article.categories.length === 0) return [];
    return article.categories.map((c) => c.category);
  };

  // Helper to extract tags from nested structure
  const getArticleTags = (article: ContentWithRelations) => {
    if (!article.tags || article.tags.length === 0) return [];
    return article.tags.map((t) => t.tag);
  };

  // Helper to truncate excerpt
  const truncateExcerpt = (text: string | null, maxLength = 150) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Welcome to Our Content Hub</h1>
            <p className="text-xl text-primary-100 mb-8">
              Discover insights, stories, and knowledge from our community of authors. Stay informed
              with the latest articles and updates.
            </p>
            <div className="flex justify-center gap-4">
              <Link to="/content">
                <Button variant="secondary" size="lg">
                  Explore Articles
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Categories Filter */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-20">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Categories</h2>

              {isLoadingCategories ? (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" />
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => handleCategoryFilter(undefined)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      !selectedCategory
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    All Articles
                    {!selectedCategory && contentData && (
                      <span className="ml-2 text-xs text-primary-600">
                        ({contentData.meta.total})
                      </span>
                    )}
                  </button>

                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryFilter(category.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {category.name}
                      {category._count && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({category._count.contents})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Articles Grid */}
          <main className="flex-1">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedCategory
                  ? `Articles in ${categories.find((c) => c.id === selectedCategory)?.name || 'Category'}`
                  : 'Latest Articles'}
              </h2>
              {contentData && (
                <p className="text-sm text-gray-600 mt-1">
                  Showing {articles.length} of {contentData.meta.total} articles
                </p>
              )}
            </div>

            {/* Loading State */}
            {isLoadingContent && (
              <div className="flex justify-center py-20">
                <Spinner size="lg" />
              </div>
            )}

            {/* Error State */}
            {contentError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-800 font-medium">Failed to load articles</p>
                <p className="text-red-600 text-sm mt-1">Please try again later.</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoadingContent && !contentError && articles.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                <p className="text-gray-600 text-lg font-medium">No articles found</p>
                <p className="text-gray-500 text-sm mt-2">
                  {selectedCategory
                    ? 'Try selecting a different category.'
                    : 'Check back later for new content.'}
                </p>
              </div>
            )}

            {/* Articles Grid */}
            {!isLoadingContent && !contentError && articles.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {articles.map((article) => {
                    const articleCategories = getArticleCategories(article);
                    const articleTags = getArticleTags(article);

                    return (
                      <Link
                        key={article.id}
                        to={`/content/${article.slug}`}
                        className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {/* Featured Image */}
                        <div className="aspect-video bg-gray-100 overflow-hidden">
                          {article.featuredImage ? (
                            <img
                              src={
                                typeof article.featuredImage === 'string'
                                  ? article.featuredImage
                                  : (article.featuredImage as any)?.url || ''
                              }
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                              <span className="text-gray-400 text-4xl font-bold">
                                {article.title.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-5">
                          {/* Category Badge */}
                          {articleCategories.length > 0 && (
                            <div className="mb-3">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
                                {articleCategories[0].name}
                              </span>
                            </div>
                          )}

                          {/* Title */}
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                            {article.title}
                          </h3>

                          {/* Excerpt */}
                          {article.excerpt && (
                            <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                              {truncateExcerpt(article.excerpt)}
                            </p>
                          )}

                          {/* Tags */}
                          {articleTags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {articleTags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag.id}
                                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                                >
                                  {tag.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Meta Info */}
                          <div className="flex items-center gap-4 text-xs text-gray-500 pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-1.5">
                              <User size={14} />
                              <span>{getAuthorName(article.author)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock size={14} />
                              <span>
                                {formatRelative(article.publishedAt || article.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and pages around current
                        const showPage =
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1);

                        if (!showPage) {
                          // Show ellipsis
                          if (page === currentPage - 2 || page === currentPage + 2) {
                            return (
                              <span key={page} className="px-2 text-gray-400">
                                ...
                              </span>
                            );
                          }
                          return null;
                        }

                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </section>
    </div>
  );
};
