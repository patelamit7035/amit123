import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CopyButtonProps {
  value: string;
  label?: string;
  size?: "sm" | "default" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
}

/** Clipboard copy with a graceful fallback for browsers without the API. */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* falls through to the textarea fallback */
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({ value, label = "Copy", size = "sm", variant = "outline", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      onClick={async () => {
        const ok = await copyText(value);
        setCopied(ok);
        toast[ok ? "success" : "error"](ok ? "Copied to clipboard" : "Could not copy - select and copy manually");
      }}
    >
      {copied ? <Check className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
      {size === "icon" ? null : copied ? "Copied" : label}
    </Button>
  );
}
