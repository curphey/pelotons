/**
 * Template Gallery Component
 *
 * Modal for browsing and selecting screen templates.
 * Displays templates organized by category with search and preview.
 */

import { useState, useMemo } from 'react';
import {
  SCREEN_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type ScreenTemplate,
  type TemplateCategory,
  countFittingWidgets,
} from '@peloton/shared';

interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: ScreenTemplate) => void;
  targetGrid: { columns: number; rows: number };
}

export function TemplateGallery({
  isOpen,
  onClose,
  onSelectTemplate,
  targetGrid,
}: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<ScreenTemplate | null>(null);

  // Filter templates by category and search
  const filteredTemplates = useMemo(() => {
    return SCREEN_TEMPLATES.filter(template => {
      const matchesCategory =
        selectedCategory === 'all' || template.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const handleSelectTemplate = (template: ScreenTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Screen Templates</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Choose a template to get started quickly
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-6 py-3 border-b border-gray-100">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Category Sidebar */}
            <div className="w-48 flex-shrink-0 border-r border-gray-100 p-4 overflow-y-auto">
              <nav className="space-y-1">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All Templates
                  <span className="ml-2 text-xs text-gray-400">
                    {SCREEN_TEMPLATES.length}
                  </span>
                </button>
                {TEMPLATE_CATEGORIES.map(category => {
                  const count = SCREEN_TEMPLATES.filter(t => t.category === category.id).length;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.label}
                      <span className="ml-2 text-xs text-gray-400">{count}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Template Grid */}
            <div className="flex-1 p-4 overflow-y-auto">
              {filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>No templates found</p>
                  <p className="text-sm">Try a different search or category</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      targetGrid={targetGrid}
                      onSelect={() => handleSelectTemplate(template)}
                      onPreview={() => setPreviewTemplate(template)}
                      isPreviewActive={previewTemplate?.id === template.id}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Preview Panel */}
            {previewTemplate && (
              <div className="w-72 flex-shrink-0 border-l border-gray-100 p-4 overflow-y-auto bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900">Preview</h3>
                  <button
                    onClick={() => setPreviewTemplate(null)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Mini Grid Preview */}
                <MiniGridPreview template={previewTemplate} className="mb-4" />

                <h4 className="font-medium text-gray-900 mb-1">{previewTemplate.name}</h4>
                <p className="text-sm text-gray-500 mb-3">{previewTemplate.description}</p>

                {/* Widget count for target grid */}
                <WidgetFitInfo template={previewTemplate} targetGrid={targetGrid} />

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {previewTemplate.tags.slice(0, 5).map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => handleSelectTemplate(previewTemplate)}
                  className="w-full mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Use This Template
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Template Card Component
// =============================================================================

interface TemplateCardProps {
  template: ScreenTemplate;
  targetGrid: { columns: number; rows: number };
  onSelect: () => void;
  onPreview: () => void;
  isPreviewActive: boolean;
}

function TemplateCard({
  template,
  targetGrid,
  onSelect,
  onPreview,
  isPreviewActive,
}: TemplateCardProps) {
  const { removed } = countFittingWidgets(
    template,
    targetGrid.columns,
    targetGrid.rows
  );
  const hasWarnings = removed > 0;
  const category = TEMPLATE_CATEGORIES.find(c => c.id === template.category);

  return (
    <div
      className={`group relative bg-white rounded-lg border-2 transition-all cursor-pointer ${
        isPreviewActive
          ? 'border-blue-500 shadow-md'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
      onClick={onPreview}
    >
      {/* Category indicator */}
      <div
        className="absolute top-2 right-2 w-2 h-2 rounded-full"
        style={{ backgroundColor: category?.color || '#6b7280' }}
        title={category?.label}
      />

      {/* Mini preview grid */}
      <div className="p-3">
        <MiniGridPreview template={template} size="small" />
      </div>

      {/* Info */}
      <div className="px-3 pb-3 border-t border-gray-100 pt-2">
        <h3 className="font-medium text-gray-900 text-sm truncate">{template.name}</h3>
        <p className="text-xs text-gray-500 truncate mt-0.5">{template.description}</p>

        {hasWarnings && (
          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {removed} widget{removed > 1 ? 's' : ''} won't fit
          </p>
        )}
      </div>

      {/* Hover actions */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
        <button
          onClick={e => {
            e.stopPropagation();
            onPreview();
          }}
          className="px-3 py-1.5 text-sm bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Preview
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            onSelect();
          }}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Use
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Mini Grid Preview Component
// =============================================================================

interface MiniGridPreviewProps {
  template: ScreenTemplate;
  size?: 'small' | 'medium';
  className?: string;
}

function MiniGridPreview({ template, size = 'medium', className = '' }: MiniGridPreviewProps) {
  const { columns, rows } = template.referenceGrid;
  const cellSize = size === 'small' ? 16 : 24;
  const gap = 2;
  const width = columns * cellSize + (columns - 1) * gap;
  const height = rows * cellSize + (rows - 1) * gap;

  return (
    <div
      className={`relative bg-gray-100 rounded ${className}`}
      style={{ width, height, margin: '0 auto' }}
    >
      {/* Grid cells */}
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: columns }).map((_, col) => (
          <div
            key={`${row}-${col}`}
            className="absolute bg-gray-200 rounded-sm"
            style={{
              left: col * (cellSize + gap),
              top: row * (cellSize + gap),
              width: cellSize,
              height: cellSize,
            }}
          />
        ))
      )}

      {/* Widgets */}
      {template.widgets.map((widget, i) => (
        <div
          key={i}
          className="absolute bg-blue-500 rounded-sm"
          style={{
            left: widget.x * (cellSize + gap),
            top: widget.y * (cellSize + gap),
            width: widget.width * cellSize + (widget.width - 1) * gap,
            height: widget.height * cellSize + (widget.height - 1) * gap,
          }}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Widget Fit Info Component
// =============================================================================

interface WidgetFitInfoProps {
  template: ScreenTemplate;
  targetGrid: { columns: number; rows: number };
}

function WidgetFitInfo({ template, targetGrid }: WidgetFitInfoProps) {
  const { fitting, total, removed } = countFittingWidgets(
    template,
    targetGrid.columns,
    targetGrid.rows
  );

  if (removed === 0) {
    return (
      <div className="text-sm text-green-600 flex items-center gap-1.5">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        All {total} widgets will fit
      </div>
    );
  }

  return (
    <div className="text-sm text-amber-600 flex items-center gap-1.5">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      {fitting} of {total} widgets will fit ({targetGrid.columns}x{targetGrid.rows} grid)
    </div>
  );
}

export default TemplateGallery;
