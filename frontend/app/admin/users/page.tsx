"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import useSWR from "swr";
import { apiFetch } from "@/lib/api";
import { createUserSchema, type CreateUserForm, type UserItem } from "@/lib/schemas";
import { useFormMessage } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Plus, Loader2, UserCheck, UserX, Crown } from "lucide-react";

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const { message, isError, setSuccess, setError, clear } = useFormMessage();
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createUserSchema),
  });

  const accessToken = session?.accessToken;

  const { data: users, mutate } = useSWR<UserItem[]>(
    accessToken ? ["/api/v1/admin/users", accessToken] : null,
    ([path, token]: [string, string]) => apiFetch(path, token),
    { revalidateOnFocus: false },
  );

  if (status === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  if (!accessToken) {
    return null;
  }

  const onSubmit = async (data: CreateUserForm) => {
    clear();

    try {
      await apiFetch("/api/v1/admin/users", accessToken, {
        method: "POST",
        body: JSON.stringify(data),
      });
      setSuccess("Tạo user thành công");
      reset();
      setShowModal(false);
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tạo user thất bại");
    }
  };

  const toggleActive = async (user: UserItem) => {
    setTogglingIds((prev) => new Set(prev).add(user.id));
    try {
      await apiFetch(`/api/v1/admin/users/${user.id}`, accessToken, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật thất bại");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Quản lý người dùng" description="Tạo và quản lý tài khoản người dùng">
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          Tạo user
        </Button>
      </PageHeader>

      {message && (
        <Alert variant={isError ? "destructive" : "success"} className="mb-4">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Users Table */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Tên đăng nhập
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vai trò</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Trạng thái</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ngày tạo</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users === undefined
              ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-8" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-5 w-16" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-5 w-16" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-4 py-3">
                      <Skeleton className="h-8 w-20" />
                    </td>
                  </tr>
                ))
              : users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-muted-foreground">{user.id}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{user.username}</td>
                    <td className="px-4 py-3">
                      {user.is_admin ? (
                        <Badge variant="default">
                          <Crown className="mr-1 h-3 w-3" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Người dùng</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.is_active ? (
                        <Badge variant="success">
                          <UserCheck className="mr-1 h-3 w-3" />
                          Hoạt động
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <UserX className="mr-1 h-3 w-3" />
                          Không hoạt động
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3">
                      {user.is_admin ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActive(user)}
                          disabled={togglingIds.has(user.id)}
                        >
                          {togglingIds.has(user.id)
                            ? "Đang cập nhật..."
                            : user.is_active
                              ? "Vô hiệu hóa"
                              : "Kích hoạt"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>

        {users !== undefined && users.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">Chưa có user nào</div>
        )}
      </div>

      {/* Create User Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Tạo user mới
            </DialogTitle>
            <DialogDescription>Nhập thông tin để tạo tài khoản mới</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label
                htmlFor="create-username"
                className="block text-sm font-medium text-card-foreground"
              >
                Tên đăng nhập <span className="text-destructive">*</span>
              </label>
              <Input
                id="create-username"
                {...register("username")}
                type="text"
                autoComplete="off"
                spellCheck={false}
                className="mt-1"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="create-password"
                className="block text-sm font-medium text-card-foreground"
              >
                Mật khẩu <span className="text-destructive">*</span>
              </label>
              <Input
                id="create-password"
                {...register("password")}
                type="password"
                autoComplete="new-password"
                className="mt-1"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Controller
                name="is_admin"
                control={control}
                render={({ field }) => (
                  <Checkbox id="is_admin" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <label htmlFor="is_admin" className="text-sm text-card-foreground">
                Admin
              </label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Tạo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
