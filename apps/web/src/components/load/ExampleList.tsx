import { useState } from "react";
import { Button, Badge, Alert } from "@fluffylabs/shared-ui";
import { ChevronDown, ChevronRight, Loader2, Globe } from "lucide-react";
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

function isRemote(example: ExampleEntry): boolean {
  return !!example.url && !example.file;
}

interface ExampleListProps {
  onAdvance: (rawPayload: RawPayload, detectedFormat: DetectedFormat, exampleEntry: ExampleEntry) => void;
}

export function ExampleList({ onAdvance }: ExampleListProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(
    new Set(),
  );

  const manifest = getExamplesManifest();

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
        <div className="flex flex-wrap gap-2 mt-1 ml-5">
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
  const remote = isRemote(example);
  const formatLabel = FORMAT_LABELS[example.format] ?? example.format;
  const badgeIntent = FORMAT_BADGE_INTENT[example.format] ?? "info";

  return (
    <Button
      variant="secondary"
      size="sm"
      data-testid={`example-card-${example.id}`}
      disabled={disabled}
      onClick={onSelect}
      className="cursor-pointer gap-1.5 h-auto py-1 px-2"
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" data-testid={`example-loading-${example.id}`} />
      ) : null}
      <span>{example.name}</span>
      <Badge
        intent={badgeIntent}
        variant="outline"
        size="small"
        data-testid={`example-format-${example.id}`}
      >
        {formatLabel}
      </Badge>
      {remote && (
        <span
          className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"
          data-testid={`example-remote-${example.id}`}
        >
          <Globe className="w-3 h-3" />
          Remote
        </span>
      )}
    </Button>
  );
}
