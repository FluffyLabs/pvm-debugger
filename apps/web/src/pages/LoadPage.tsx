import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@fluffylabs/shared-ui";
import {
  getExamplesManifest,
  loadExample,
  createProgramEnvelope,
  type ExampleEntry,
} from "@pvmdbg/content";
import { useOrchestrator } from "../hooks/useOrchestrator";

export function LoadPage() {
  const navigate = useNavigate();
  const { initialize, setEnvelope } = useOrchestrator();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const manifest = getExamplesManifest();

  // Only show bundled examples (those with a `file` field, not `url`)
  const bundledExamples: ExampleEntry[] = manifest.categories.flatMap((cat) =>
    cat.examples.filter((ex) => ex.file && !ex.url),
  );

  async function handleLoadExample(example: ExampleEntry) {
    setLoading(example.id);
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
      setLoading(null);
    }
  }

  return (
    <div data-testid="load-page" className="flex flex-col items-center p-8 h-full overflow-auto">
      <h1 className="text-lg font-semibold text-foreground mb-1">Load Program</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Select an example program to begin debugging.
      </p>

      {error && (
        <div className="text-sm text-red-500 mb-4" data-testid="load-error">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 justify-center max-w-3xl" data-testid="example-list">
        {bundledExamples.map((example) => (
          <Button
            key={example.id}
            variant="outline"
            size="sm"
            data-testid={`example-card-${example.id}`}
            disabled={loading !== null}
            onClick={() => handleLoadExample(example)}
            className="cursor-pointer"
          >
            {loading === example.id ? "Loading…" : example.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
