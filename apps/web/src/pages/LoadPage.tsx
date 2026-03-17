import { ExampleList } from "../components/load/ExampleList";
import { SourceStep } from "../components/load/SourceStep";

export function LoadPage() {
  return (
    <div data-testid="load-page" className="flex flex-col items-center p-8 h-full overflow-auto">
      <h1 className="text-lg font-semibold text-foreground mb-1">Load Program</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Upload a file or select an example to begin debugging.
      </p>
      <div
        data-testid="load-page-columns"
        className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8"
      >
        <div data-testid="load-page-left">
          <SourceStep />
        </div>
        <div data-testid="load-page-right">
          <ExampleList />
        </div>
      </div>
    </div>
  );
}
