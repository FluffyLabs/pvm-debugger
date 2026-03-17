import { ExampleList } from "../components/load/ExampleList";

export function LoadPage() {
  return (
    <div data-testid="load-page" className="flex flex-col items-center p-8 h-full overflow-auto">
      <h1 className="text-lg font-semibold text-foreground mb-1">Load Program</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Select an example program to begin debugging.
      </p>
      <ExampleList />
    </div>
  );
}
