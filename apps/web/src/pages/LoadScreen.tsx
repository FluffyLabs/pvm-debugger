import { Header, Content } from "@fluffylabs/shared-ui";

export function LoadScreen() {
  return (
    <div className="flex flex-col min-h-screen" data-testid="load-screen">
      <Header toolNameSrc="" ghRepoName="pvm-debugger" />
      <Content>
        <div className="flex items-center justify-center h-full p-8">
          <h1 className="text-lg text-muted-foreground">
            PVM Debugger — Load a program to begin
          </h1>
        </div>
      </Content>
    </div>
  );
}
