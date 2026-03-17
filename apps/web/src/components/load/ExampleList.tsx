import { useState } from "react";
import { useNavigate } from "react-router";
import { Button, Badge, Alert } from "@fluffylabs/shared-ui";
import { ChevronDown, ChevronRight, Loader2, Globe } from "lucide-react";
import {
  getExamplesManifest,
  loadExample,
  createProgramEnvelope,
  type ExampleEntry,
  type ExampleCategory,
} from "@pvmdbg/content";
import { useOrchestrator } from "../../hooks/useOrchestrator";

const FORMAT_LABELS: Record<string, string> = {
  generic_pvm: "Generic",
  jam_spi: "JAM SPI",
  jam_spi_with_metadata: "JAM SPI",
  json_test_vector: "JSON",
  trace_file: "Trace",
};

const FORMAT_BADGE_INTENT: Record<string, "info" | "success" | "warning" | "primary"> = {
  generic_pvm: "info",
  jam_spi: "success",
  jam_spi_with_metadata: "success",
  json_test_vector: "warning",
  trace_file: "primary",
};

function isRemote(example: ExampleEntry): boolean {
  return !!example.url && !example.file;
}

export function ExampleList() {
  const navigate = useNavigate();
  const { initialize, setEnvelope } = useOrchestrator();
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
      const envelope = createProgramEnvelope(rawPayload);
      const orch = initialize(["typeberry"]);
      await orch.loadProgram(envelope);
      setEnvelope(envelope);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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
      variant="outline"
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
