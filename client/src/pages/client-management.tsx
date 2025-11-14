import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Textarea } from "@/components/ui/textarea";

type Client = {
  id: number;
  name: string;
  email: string;
  phone: string;
  businessSchoolName?: string | null;
  schoolAddress?: string | null;
  gstNumber?: string | null;
};

export default function ClientManagementPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: "",
    email: "",
    phone: "",
    businessSchoolName: "",
    schoolAddress: "",
    gstNumber: "",
  });
  const { data, refetch } = useQuery<Client[]>({
    queryKey: ["/api/clients", q],
    queryFn: async () => {
      const url = q ? `/api/clients?q=${encodeURIComponent(q)}` : "/api/clients";
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const save = async () => {
    if (!editing) return;
    try {
      const res = await fetch(`/api/clients/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editing.name,
          email: editing.email,
          phone: editing.phone,
          businessSchoolName: editing.businessSchoolName,
          schoolAddress: editing.schoolAddress,
          gstNumber: editing.gstNumber,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await refetch();
      setEditing(null);
      toast({ title: "Saved", description: "Client updated successfully." });
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message || "Could not save client", variant: "destructive" });
    }
  };

  const create = async () => {
    try {
      const res = await fetch(`/api/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newClient.name,
          email: newClient.email,
          phone: newClient.phone,
          businessSchoolName: newClient.businessSchoolName,
          schoolAddress: newClient.schoolAddress,
          gstNumber: newClient.gstNumber,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await refetch();
      setCreateOpen(false);
      setNewClient({
        name: "",
        email: "",
        phone: "",
        businessSchoolName: "",
        schoolAddress: "",
        gstNumber: "",
      });
      toast({ title: "Client created", description: "The new client has been added." });
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message || "Could not create client", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground">Manage client details and start new campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search name, email, phone, GST..." value={q} onChange={(e) => setQ(e.target.value)} className="w-72" />
          <Button onClick={() => setCreateOpen(true)}>Add Client</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(data || []).map((c) => (
          <Card key={c.id}>
            <CardHeader className="flex items-center justify-between flex-row">
              <div>
                <CardTitle>{c.businessSchoolName || c.name}</CardTitle>
                <CardDescription>{c.name} • {c.phone} • {c.email}</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">GST</div>
                <div className="text-sm">{c.gstNumber || "—"}</div>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground truncate pr-4">
                {c.schoolAddress || "No address"}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="secondary" onClick={() => setEditing(c)}>Edit</Button>
                <Button size="sm" onClick={() => navigate(`/manager/work-orders/new?clientId=${c.id}`)}>Add Work Order</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground mb-1">Client Name (B-School)</div>
                <Input value={editing.businessSchoolName || ""} onChange={(e) => setEditing({ ...editing, businessSchoolName: e.target.value })} />
              </div>
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground mb-1">Primary Contact Person</div>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Email</div>
                <Input value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Phone</div>
                <Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">GST Number</div>
                <Input value={editing.gstNumber || ""} onChange={(e) => setEditing({ ...editing, gstNumber: e.target.value })} />
              </div>
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground mb-1">Registered Address</div>
                <Input value={editing.schoolAddress || ""} onChange={(e) => setEditing({ ...editing, schoolAddress: e.target.value })} />
              </div>
              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={save}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Client Name (B-School)</div>
              <Input value={newClient.businessSchoolName || ""} onChange={(e) => setNewClient({ ...newClient, businessSchoolName: e.target.value })} />
            </div>
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Primary Contact Person</div>
              <Input value={newClient.name || ""} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Email</div>
              <Input value={newClient.email || ""} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Phone</div>
              <Input value={newClient.phone || ""} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">GST Number</div>
              <Input value={newClient.gstNumber || ""} onChange={(e) => setNewClient({ ...newClient, gstNumber: e.target.value })} />
            </div>
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Registered Address</div>
              <Input value={newClient.schoolAddress || ""} onChange={(e) => setNewClient({ ...newClient, schoolAddress: e.target.value })} />
            </div>
            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={create}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


