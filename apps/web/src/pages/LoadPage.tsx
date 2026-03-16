export function LoadPage() {
  return (
    <div data-testid="load-page" className="flex flex-col items-center justify-center h-full p-8">
      <h1 className="text-lg font-semibold text-foreground">Load Program</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Select an example program, upload a file, or paste hex to begin debugging.
      </p>
    </div>
  );
}
