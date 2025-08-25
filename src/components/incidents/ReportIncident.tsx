import { useMemo } from "react";
import { useItiacStore } from "@/store/useItiacStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const ReportIncident = () => {
  const components = useItiacStore((s) => s.components);

  const offline = useMemo(() =>
    components.filter(c => c.status === 'offline'),
  [components]);

  const criticalityColors = {
    low: "success",
    medium: "warning",
    high: "high",
    critical: "critical",
  } as const;

  const buildMailto = (name: string, criticality: string, helpdeskEmail?: string) => {
    const to = helpdeskEmail || "";
    const subject = `[Incident] ${name} is OFFLINE (Criticality: ${criticality})`;
    const body = [
      `Hello Helpdesk,`,
      ``,
      `The following IT Asset is currently OFFLINE:`,
      `- Asset: ${name}`,
      `- Criticality: ${criticality}`,
      `- Time: ${new Date().toLocaleString()}`,
      ``,
      `Please investigate and resolve.`,
      ``,
      `Sent from IT Impact Navigator`
    ].join("%0D%0A"); // CRLF
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">Report Incident</h1>
          <p className="page-subtitle">List of offline IT assets with quick email to helpdesk</p>
        </div>
      </div>

      <Card className="bg-card border-border shadow-depth flex-1 min-h-0 flex flex-col">
        <CardHeader>
          <CardTitle className="section-title">Offline Assets ({offline.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <Table className="enhanced-table w-full text-sm">
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/75 border-b border-border">
              <TableRow>
                <TableHead>IT Asset</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Helpdesk</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offline.map((c) => {
                const helpdesk = (c as any).helpdeskEmail || c.metadata?.helpdeskEmail || "";
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{c.name}</div>
                      {c.location && (
                        <div className="text-xs text-muted-foreground">{c.location}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={criticalityColors[c.criticality]} className="capitalize text-xs px-2 py-0.5">
                        {c.criticality}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{c.owner || "—"}</TableCell>
                    <TableCell className="text-sm">{c.vendor || "—"}</TableCell>
                    <TableCell className="text-sm">{helpdesk || <span className="text-muted-foreground">not set</span>}</TableCell>
                    <TableCell>
                      {helpdesk ? (
                        <a href={buildMailto(c.name, c.criticality, helpdesk)}>
                          <Button size="sm">Email Helpdesk</Button>
                        </a>
                      ) : (
                        <Button size="sm" variant="secondary" disabled title="Set helpdesk email on the asset to enable email">
                          Email Helpdesk
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {offline.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <div className="text-sm text-muted-foreground p-4">No offline assets detected.</div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
