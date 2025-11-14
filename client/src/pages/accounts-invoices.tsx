import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useLocation, Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Eye, Search, Filter, CheckCircle, Clock, XCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Invoice {
  id: number;
  bookingId: number | null;
  workOrderId: number | null;
  amount: string;
  status: string;
  fileUrl: string | null;
  invoiceType: string;
  dueDate: string | null;
  generatedAt: string;
  generatedById: number;
}

const formatCurrency = (value: number | string | null | undefined) => {
  const num = Number(value ?? 0);
  return `₹${num.toLocaleString()}`;
};

export default function AccountsInvoicesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  if (!user || (user.role !== "accounts" && user.role !== "admin")) {
    return <Redirect to="/" />;
  }

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: workOrders = [] } = useQuery<Array<{ workOrder: any; items: any[] }>>({
    queryKey: ["/api/work-orders"],
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "completed" | "failed" | "partial">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "proforma" | "tax_invoice">("all");

  // Get client names for invoices
  const invoicesWithDetails = useMemo(() => {
    return invoices.map((invoice) => {
      const workOrder = workOrders.find((wo) => wo.workOrder.id === invoice.workOrderId)?.workOrder;
      return {
        ...invoice,
        workOrder,
        clientName: workOrder?.businessSchoolName || `Client #${workOrder?.clientId}` || "Unknown",
        clientId: workOrder?.clientId || null,
      };
    });
  }, [invoices, workOrders]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoicesWithDetails.filter((invoice) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          invoice.id.toString().includes(search) ||
          invoice.clientName.toLowerCase().includes(search) ||
          (invoice.workOrderId && invoice.workOrderId.toString().includes(search)) ||
          invoice.amount.includes(search);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "all" && invoice.status !== statusFilter) return false;

      // Type filter
      if (typeFilter !== "all" && invoice.invoiceType !== typeFilter) return false;

      return true;
    });
  }, [invoicesWithDetails, searchTerm, statusFilter, typeFilter]);

  // Separate by status
  const pendingInvoices = filteredInvoices.filter((inv) => inv.status === "pending");
  const completedInvoices = filteredInvoices.filter((inv) => inv.status === "completed");
  const failedInvoices = filteredInvoices.filter((inv) => inv.status === "failed");
  const partialInvoices = filteredInvoices.filter((inv) => inv.status === "partial");

  // Calculate totals
  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const completedAmount = completedInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

  const handleViewInvoice = (invoiceId: number) => {
    window.open(`/api/invoices/${invoiceId}/pdf`, "_blank", "noopener");
  };

  const handleDownloadInvoice = (invoiceId: number) => {
    const link = document.createElement("a");
    link.href = `/api/invoices/${invoiceId}/pdf`;
    link.download = `invoice-${invoiceId}.pdf`;
    link.click();
  };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="text-muted-foreground">Manage and track all invoices</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredInvoices.length}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingInvoices.length}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(pendingAmount)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedInvoices.length}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(completedAmount)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedInvoices.length}</div>
            <p className="text-xs text-muted-foreground">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice ID, client name, work order ID, amount..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="proforma">Proforma</SelectItem>
            <SelectItem value="tax_invoice">Tax Invoice</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices List */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            All ({filteredInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pendingInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="failed">
            Failed ({failedInvoices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No invoices found</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => (
                <Card key={invoice.id} className="hover:shadow-md transition">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Invoice #{invoice.id}</CardTitle>
                      <CardDescription>
                        {invoice.clientName} • WO #{invoice.workOrderId || "N/A"}
                        {invoice.dueDate && ` • Due: ${new Date(invoice.dueDate).toLocaleDateString()}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={invoice.status === "completed" ? "default" : invoice.status === "pending" ? "secondary" : "destructive"}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {invoice.invoiceType === "proforma" ? "Proforma" : "Tax Invoice"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-muted-foreground">Amount:</span>{" "}
                            <span className="font-semibold">{formatCurrency(invoice.amount)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Generated:</span>{" "}
                            <span>{new Date(invoice.generatedAt).toLocaleString()}</span>
                          </div>
                          {invoice.dueDate && (
                            <div>
                              <span className="text-muted-foreground">Due Date:</span>{" "}
                              <span className={new Date(invoice.dueDate) < new Date() && invoice.status !== "completed" ? "text-red-600 font-medium" : ""}>
                                {new Date(invoice.dueDate).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                        {invoice.fileUrl && (
                          <div className="text-xs text-muted-foreground">
                            File: {invoice.fileUrl}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewInvoice(invoice.id)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice.id)}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                        {invoice.workOrderId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/work-orders/${invoice.workOrderId}`)}
                          >
                            View WO
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingInvoices.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending invoices</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingInvoices.map((invoice) => (
                <Card key={invoice.id} className="hover:shadow-md transition">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Invoice #{invoice.id}</CardTitle>
                      <CardDescription>
                        {invoice.clientName} • WO #{invoice.workOrderId || "N/A"}
                        {invoice.dueDate && ` • Due: ${new Date(invoice.dueDate).toLocaleDateString()}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Pending</Badge>
                      <Badge variant="outline" className="capitalize">
                        {invoice.invoiceType === "proforma" ? "Proforma" : "Tax Invoice"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-muted-foreground">Amount:</span>{" "}
                            <span className="font-semibold">{formatCurrency(invoice.amount)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Generated:</span>{" "}
                            <span>{new Date(invoice.generatedAt).toLocaleString()}</span>
                          </div>
                          {invoice.dueDate && (
                            <div>
                              <span className="text-muted-foreground">Due Date:</span>{" "}
                              <span className={new Date(invoice.dueDate) < new Date() ? "text-red-600 font-medium" : ""}>
                                {new Date(invoice.dueDate).toLocaleDateString()}
                                {new Date(invoice.dueDate) < new Date() && " (Overdue)"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewInvoice(invoice.id)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice.id)}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                        {invoice.workOrderId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/work-orders/${invoice.workOrderId}`)}
                          >
                            View WO
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedInvoices.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No completed invoices</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {completedInvoices.map((invoice) => (
                <Card key={invoice.id} className="hover:shadow-md transition">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Invoice #{invoice.id}</CardTitle>
                      <CardDescription>
                        {invoice.clientName} • WO #{invoice.workOrderId || "N/A"}
                        {invoice.dueDate && ` • Due: ${new Date(invoice.dueDate).toLocaleDateString()}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Completed</Badge>
                      <Badge variant="outline" className="capitalize">
                        {invoice.invoiceType === "proforma" ? "Proforma" : "Tax Invoice"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-muted-foreground">Amount:</span>{" "}
                            <span className="font-semibold">{formatCurrency(invoice.amount)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Generated:</span>{" "}
                            <span>{new Date(invoice.generatedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewInvoice(invoice.id)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice.id)}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                        {invoice.workOrderId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/work-orders/${invoice.workOrderId}`)}
                          >
                            View WO
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          {failedInvoices.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No failed invoices</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {failedInvoices.map((invoice) => (
                <Card key={invoice.id} className="hover:shadow-md transition border-red-200">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Invoice #{invoice.id}</CardTitle>
                      <CardDescription>
                        {invoice.clientName} • WO #{invoice.workOrderId || "N/A"}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Failed</Badge>
                      <Badge variant="outline" className="capitalize">
                        {invoice.invoiceType === "proforma" ? "Proforma" : "Tax Invoice"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-muted-foreground">Amount:</span>{" "}
                            <span className="font-semibold">{formatCurrency(invoice.amount)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Generated:</span>{" "}
                            <span>{new Date(invoice.generatedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewInvoice(invoice.id)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice.id)}
                          className="gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                        {invoice.workOrderId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/work-orders/${invoice.workOrderId}`)}
                          >
                            View WO
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

