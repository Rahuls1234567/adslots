import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function LogsPage() {
  const { data, isLoading } = useQuery<any[]>({
    queryKey: ["/api/logs"],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Logs</h1>
        <p className="text-muted-foreground">Recent manager and system actions</p>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-muted-foreground">No logs yet.</p>
      ) : (
        <div className="space-y-3">
          {data.map((log) => (
            <Card key={log.id}>
              <CardHeader className="flex items-center justify-between flex-row">
                <div>
                  <CardTitle className="text-base">
                    {log.action.replace(/_/g, " ")}
                  </CardTitle>
                  <CardDescription>
                    {log.entityType} #{log.entityId}
                  </CardDescription>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{new Date(log.createdAt).toLocaleString()}</div>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Actor</div>
                    <div>{log.actorName || "—"} {log.actorRole ? `(${String(log.actorRole).replace(/_/g, " ")})` : ""}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Details</div>
                    <div className="break-words">{log.metadata ? log.metadata : "—"}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}


