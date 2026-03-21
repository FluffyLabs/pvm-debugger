import { useState } from "react";
import { Alert } from "@fluffylabs/shared-ui";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import {
  getExamplesManifest,
  loadExample,
  detectFormat,
  type RawPayload,
  type DetectedFormat,
  type ExampleEntry,
  type ExampleCategory,
} from "@pvmdbg/content";
import { FORMAT_LABELS, FORMAT_BADGE_INTENT } from "./format";

/** Categories that start expanded by default. */
const DEFAULT_EXPANDED = new Set(["generic", "assemblyscript", "traces"]);

/** CSS color variable for each badge intent. */
const BADGE_COLORS: Record<string, string> = {
  info: "var(--color-info)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  primary: "var(--color-brand-primary, var(--color-brand, #17AFA3))",
};

interface ExampleListProps {
  onAdvance: (rawPayload: RawPayload, detectedFormat: DetectedFormat, exampleEntry: ExampleEntry) => void;
}

export function ExampleList({ onAdvance }: ExampleListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const manifest = getExamplesManifest();

  // Build initial collapsed set: everything NOT in DEFAULT_EXPANDED
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    () => {
      const collapsed = new Set<string>();
      for (const cat of manifest.categories) {
        if (!DEFAULT_EXPANDED.has(cat.id)) {
          collapsed.add(cat.id);
        }
      }
      return collapsed;
    },
  );

  function toggleCategory(catId: string) {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  }

  async function handleSelect(example: ExampleEntry) {
    setLoadingId(example.id);
    setError(null);
    try {
      const fixturesBase = new URL("/fixtures/", window.location.origin).href;
      const rawPayload = await loadExample(example.id, fixturesBase);
      const detectedFormat = detectFormat(rawPayload.bytes);
      onAdvance(rawPayload, detectedFormat, example);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div data-testid="example-list" className="w-full max-w-3xl">
      <h2 className="text-sm font-medium text-foreground mb-3">Examples</h2>

      {error && (
        <Alert intent="destructive" className="mb-4" data-testid="example-error">
          <Alert.Title>Failed to load example</Alert.Title>
          <Alert.Text>{error}</Alert.Text>
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        {manifest.categories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            collapsed={collapsedCategories.has(category.id)}
            onToggle={() => toggleCategory(category.id)}
            loadingId={loadingId}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}

function CategorySection({
  category,
  collapsed,
  onToggle,
  loadingId,
  onSelect,
}: {
  category: ExampleCategory;
  collapsed: boolean;
  onToggle: () => void;
  loadingId: string | null;
  onSelect: (example: ExampleEntry) => void;
}) {
  return (
    <div data-testid={`example-category-${category.id}`}>
      <button
        onClick={onToggle}
        data-testid={`category-toggle-${category.id}`}
        className="flex items-center gap-1.5 w-full text-left text-sm font-medium text-foreground cursor-pointer hover:text-foreground/80 py-1"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0" />
        )}
        {category.name}
        <span className="text-xs text-muted-foreground font-normal ml-1">
          ({category.examples.length})
        </span>
      </button>

      {!collapsed && (
        <div
          className="grid gap-2 mt-1 ml-5"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))" }}
        >
          {category.examples.map((example) => (
            <ExampleCard
              key={example.id}
              example={example}
              loading={loadingId === example.id}
              disabled={loadingId !== null}
              onSelect={() => onSelect(example)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExampleCard({
  example,
  loading,
  disabled,
  onSelect,
}: {
  example: ExampleEntry;
  loading: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const formatLabel = FORMAT_LABELS[example.format] ?? example.format;
  const badgeIntent = FORMAT_BADGE_INTENT[example.format] ?? "info";
  const badgeColor = BADGE_COLORS[badgeIntent] ?? BADGE_COLORS.info;

  return (
    <button
      data-testid={`example-card-${example.id}`}
      disabled={disabled}
      onClick={onSelect}
      className="flex items-center justify-between gap-1.5 h-auto py-1 px-2 rounded border border-border/20 text-foreground cursor-pointer hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      style={{ fontSize: "0.75em" }}
    >
      <span className="flex items-center gap-1.5 min-w-0">
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin shrink-0" data-testid={`example-loading-${example.id}`} />
        ) : null}
        <span className="truncate">{example.name}</span>
      </span>
      <span
        data-testid={`example-format-${example.id}`}
        className="shrink-0 rounded px-1 py-0.5"
        style={{
          fontSize: "0.55rem",
          color: badgeColor,
          opacity: 0.7,
          border: `1px solid ${badgeColor}`,
        }}
      >
        {formatLabel}
      </span>
    </button>
  );
}
