import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-10">
      <Link to="/" className="mb-6 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Zap className="h-4.5 w-4.5" />
        </div>
        <span className="text-lg font-semibold">FunnelOS Affiliates</span>
      </Link>

      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>

      {footer ? <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div> : null}
    </div>
  );
}
