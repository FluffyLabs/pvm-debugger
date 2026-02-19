import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { Separator } from "../ui/separator";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  setHostCallsTrace,
  setAutoContinueOnHostCalls,
  selectHostCallsTrace,
  selectAutoContinueOnHostCalls,
} from "@/store/debugger/debuggerSlice";
import { validateTraceContent, getTraceSummary, parseTrace } from "@/lib/host-call-trace";
import CodeMirror from "@uiw/react-codemirror";
import { useIsDarkMode } from "@/packages/ui-kit/DarkMode/utils";
import classNames from "classnames";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";
import { useDropzone } from "react-dropzone";

type TraceConfigDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const EXAMPLE_TRACE = `# Example Ecalli Trace
# (program line is hidden - loaded separately)

ecalli=10 pc=0 gas=10000 r01=0x1 r03=0x1000
memread 0x00001000 len=4 -> 0x01020304
setreg r00 <- 0x100
setgas <- 9950

HALT pc=42 gas=9920 r00=0x100
`;

function stripProgramLine(content: string): { stripped: string; programLine: string | null } {
  const lines = content.split("\n");
  let programLine: string | null = null;

  const filtered = lines.filter((line) => {
    if (line.trim().startsWith("program ")) {
      programLine = line;
      return false;
    }
    return true;
  });

  return { stripped: filtered.join("\n"), programLine };
}

function restoreProgramLine(content: string, programLine: string | null): string {
  if (!programLine) return content;
  const lines = content.split("\n");
  const hasContent = lines.some((l) => l.trim() && !l.trim().startsWith("#"));
  if (hasContent) {
    return programLine + "\n" + content;
  }
  return content;
}

export const TraceConfigDialog = ({ open, onOpenChange }: TraceConfigDialogProps) => {
  const dispatch = useAppDispatch();
  const isDark = useIsDarkMode();
  const existingTrace = useAppSelector(selectHostCallsTrace);
  const autoContinue = useAppSelector(selectAutoContinueOnHostCalls);

  const [traceContent, setTraceContent] = useState<string>("");
  const [programLine, setProgramLine] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [summary, setSummary] = useState<ReturnType<typeof getTraceSummary> | null>(null);

  const validateCurrentContent = useCallback((content: string) => {
    if (!content.trim()) {
      setValidationErrors([]);
      setSummary(null);
      return;
    }

    const validation = validateTraceContent(content);
    setValidationErrors(validation.errors.map((e) => `Line ${e.lineNumber}: ${e.message}`));

    if (validation.errors.length === 0) {
      const fullParsed = parseTrace(content);
      setSummary(getTraceSummary(fullParsed));
    } else {
      setSummary(null);
    }
  }, []);

  useEffect(() => {
    if (open) {
      const raw = existingTrace?.rawContent ?? "";
      const { stripped, programLine: pl } = stripProgramLine(raw);
      setTraceContent(stripped);
      setProgramLine(pl);
      validateCurrentContent(raw);
    }
  }, [open, existingTrace, validateCurrentContent]);

  const handleContentChange = useCallback(
    (value: string) => {
      setTraceContent(value);
      const fullContent = restoreProgramLine(value, programLine);
      validateCurrentContent(fullContent);
    },
    [validateCurrentContent, programLine],
  );

  const handleApply = () => {
    const fullContent = restoreProgramLine(traceContent.trim(), programLine);
    dispatch(setHostCallsTrace(fullContent || null));
    onOpenChange(false);
  };

  const handleClear = () => {
    setTraceContent("");
    setProgramLine(null);
    setValidationErrors([]);
    setSummary(null);
  };

  const handleFileDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const { stripped, programLine: pl } = stripProgramLine(content);
          setTraceContent(stripped);
          setProgramLine(pl);
          validateCurrentContent(content);
        };
        reader.readAsText(file);
      }
    },
    [validateCurrentContent],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileDrop,
    accept: { "text/plain": [".txt", ".trace", ".log"] },
    noClick: true,
    multiple: false,
  });

  const hasContent = traceContent.trim().length > 0;
  const hasErrors = validationErrors.length > 0;
  const isValid = hasContent && !hasErrors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 pb-4 flex flex-col md:min-w-[800px] max-h-[90vh]">
        <DialogHeader className="py-3 px-6 bg-title text-title-foreground rounded-t-lg border-b">
          <DialogTitle className="text-base">Configure Ecalli Trace</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col px-4 pt-4 h-full overflow-hidden" {...getRootProps()}>
          <input {...getInputProps()} />

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="auto-continue"
                  variant={!autoContinue ? "secondary" : undefined}
                  checked={autoContinue}
                  onCheckedChange={(checked: boolean) => dispatch(setAutoContinueOnHostCalls(checked))}
                />
                <Label htmlFor="auto-continue" className="text-sm cursor-pointer">
                  Break only on trace mismatch
                </Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".txt,.trace,.log";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleFileDrop([file]);
                  };
                  input.click();
                }}
              >
                <Upload className="w-4 h-4 mr-1" />
                Upload
              </Button>
              <Button variant="outline" size="sm" onClick={handleClear} disabled={!hasContent}>
                Clear
              </Button>
            </div>
          </div>

          <div
            className={classNames(
              "flex-1 min-h-[300px] max-h-[400px] border rounded-md overflow-auto",
              isDragActive && "ring-2 ring-primary",
              hasErrors && "border-red-500",
              isValid && "border-green-500",
            )}
          >
            <CodeMirror
              theme={isDark ? "dark" : "light"}
              className="h-full"
              height="100%"
              placeholder={EXAMPLE_TRACE}
              value={traceContent}
              onChange={handleContentChange}
            />
          </div>

          <div className="mt-3 min-h-[60px]">
            {hasErrors ? (
              <div className="flex items-start gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-400">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Validation errors:</p>
                  <ul className="list-disc list-inside">
                    {validationErrors.slice(0, 3).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {validationErrors.length > 3 && <li>...and {validationErrors.length - 3} more</li>}
                  </ul>
                </div>
              </div>
            ) : summary ? (
              <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Valid trace</p>
                  <p>
                    {summary.hostCallCount} host call{summary.hostCallCount !== 1 ? "s" : ""}
                    {programLine && " • program line preserved (hidden)"}
                    {summary.hasTermination && " • has termination"}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-2">
                Paste or upload an Ecalli trace file. The trace will be used to auto-fill host call responses during
                execution.
              </p>
            )}
          </div>
        </div>

        <div className="px-5 mt-2">
          <Separator />
        </div>

        <div className="flex justify-end gap-3 px-5 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply}>{hasContent ? "Apply" : "Clear Trace"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
