import { BytesBlobEditor } from "./BytesBlobEditor";

interface AuthorizerInfoEditorProps {
  value: Uint8Array;
  onChange: (value: Uint8Array) => void;
}

/**
 * Authorizer config blob editor (arbitrary-length blob).
 */
export function AuthorizerInfoEditor({
  value,
  onChange,
}: AuthorizerInfoEditorProps) {
  return (
    <div
      data-testid="authorizer-info-editor"
      className="flex flex-col gap-1 text-xs"
    >
      <span className="text-muted-foreground">
        Authorizer config blob ({value.length} bytes)
      </span>
      <BytesBlobEditor value={value} onChange={onChange} />
    </div>
  );
}
