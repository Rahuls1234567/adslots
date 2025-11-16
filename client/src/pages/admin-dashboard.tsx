import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
// Tabs removed; admin dashboard shows only User Management
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, UserPlus, Trash2 } from "lucide-react";
import type { User } from "@shared/schema";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    role: "client" as const,
    businessSchoolName: "",
    schoolAddress: "",
    gstNumber: "",
  });

  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // No additional dashboard stats; page shows only User Management

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      return await apiRequest("POST", "/api/admin/users", userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User Created",
        description: "New user has been created successfully.",
      });
      setCreateUserOpen(false);
      setNewUser({
        name: "",
        email: "",
        phone: "",
        role: "client",
        businessSchoolName: "",
        schoolAddress: "",
        gstNumber: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Toggle user active status
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number; isActive: boolean }) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Status Updated",
        description: "User status has been updated.",
      });
    },
  });

  // Update user role
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Role Updated",
        description: "User role has been updated.",
      });
    },
  });

  // Delete user
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest("DELETE", `/api/admin/users/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User Deleted",
        description: "User has been deleted successfully.",
      });
    },
  });

  const handleCreateUser = () => {
    createUserMutation.mutate(newUser);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-700";
      case "manager": return "bg-blue-100 text-blue-700";
      case "vp": return "bg-purple-100 text-purple-700";
      case "pv_sir": return "bg-orange-100 text-orange-700";
      case "accounts": return "bg-green-100 text-green-700";
      case "it": return "bg-cyan-100 text-cyan-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="w-8 h-8 text-red-600" />
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Complete control over the application</p>
        </div>
        <Dialog open={createUserOpen} onOpenChange={setCreateUserOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system with specific role and permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="+919876543210"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUser.role} onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="vp">VP</SelectItem>
                      <SelectItem value="pv_sir">PV Sir</SelectItem>
                      <SelectItem value="accounts">Accounts</SelectItem>
                      <SelectItem value="it">IT</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newUser.role === 'client' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="businessSchoolName">Business School Name</Label>
                    <Input
                      id="businessSchoolName"
                      value={newUser.businessSchoolName}
                      onChange={(e) => setNewUser({ ...newUser, businessSchoolName: e.target.value })}
                      placeholder="TIME Institute"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="schoolAddress">School Address</Label>
                    <Input
                      id="schoolAddress"
                      value={newUser.schoolAddress}
                      onChange={(e) => setNewUser({ ...newUser, schoolAddress: e.target.value })}
                      placeholder="Mumbai, India"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gstNumber">GST Number</Label>
                    <Input
                      id="gstNumber"
                      value={newUser.gstNumber}
                      onChange={(e) => setNewUser({ ...newUser, gstNumber: e.target.value })}
                      placeholder="27AABCT1234A1Z5"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateUserOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* User Management Only */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Manage user accounts, roles, and permissions</CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No users found</p>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center justify-between gap-4 pt-6">
                    <div className="flex-1">
                      <div className="flex itemscenter gap-3">
                        <div>
                          <h3 className="font-semibold">{user.name}</h3>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">{user.phone}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge className={getRoleBadgeColor(user.role)}>
                          {user.role.replace("_", " ").toUpperCase()}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {user.businessSchoolName}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`active-${user.id}`} className="text-xs">
                            {user.isActive ? "Active" : "Inactive"}
                          </Label>
                          <Switch
                            id={`active-${user.id}`}
                            checked={user.isActive}
                            onCheckedChange={(checked) =>
                              toggleUserStatusMutation.mutate({ userId: user.id, isActive: checked })
                            }
                          />
                        </div>

                        <Select
                          value={user.role}
                          onValueChange={(role) => updateUserRoleMutation.mutate({ userId: user.id, role })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="client">Client</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="vp">VP</SelectItem>
                            <SelectItem value="pv_sir">PV Sir</SelectItem>
                            <SelectItem value="accounts">Accounts</SelectItem>
                            <SelectItem value="it">IT</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${user.name}?`)) {
                              deleteUserMutation.mutate(user.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
