"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import useSWR from "swr"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Loader2, UserCheck, UserX, Crown } from "lucide-react"

const createUserSchema = z.object({
  username: z.string().min(3, "Tối thiểu 3 ký tự").max(50),
  password: z.string().min(6, "Tối thiểu 6 ký tự").max(128),
  is_admin: z.boolean().default(false),
})

type CreateUserForm = z.infer<typeof createUserSchema>

interface UserItem {
  id: number
  username: string
  is_active: boolean
  is_admin: boolean
  created_at: string
}

export default function UsersPage() {
  const { data: session } = useSession()
  const [showModal, setShowModal] = useState(false)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createUserSchema),
  })

  const { data: users, mutate } = useSWR<UserItem[]>(
    session?.accessToken ? ["/api/v1/admin/users", session.accessToken] : null,
    ([path, token]: [string, string]) => apiFetch(path, token),
    { revalidateOnFocus: false }
  )

  const onSubmit = async (data: CreateUserForm) => {
    setMessage("")
    setIsError(false)

    try {
      await apiFetch("/api/v1/admin/users", session!.accessToken, {
        method: "POST",
        body: JSON.stringify(data),
      })
      setMessage("Tạo user thành công")
      reset()
      setShowModal(false)
      mutate()
    } catch (err) {
      setIsError(true)
      setMessage(err instanceof Error ? err.message : "Tạo user thất bại")
    }
  }

  const toggleActive = async (user: UserItem) => {
    setTogglingId(user.id)
    try {
      await apiFetch(`/api/v1/admin/users/${user.id}`, session!.accessToken, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !user.is_active }),
      })
      mutate()
    } catch (err) {
      setIsError(true)
      setMessage(err instanceof Error ? err.message : "Cập nhật thất bại")
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Quản lý Users</h1>
          <p className="mt-1 text-muted-foreground">Tạo và quản lý tài khoản ngườii dùng</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4" />
          Tạo user
        </Button>
      </div>

      {message && (
        <div
          role="alert"
          className={`mb-4 rounded-md p-3 text-sm ${
            isError ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
          }`}
        >
          {message}
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">ID</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Username</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users?.map((user) => (
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
                    <Badge variant="secondary">User</Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  {user.is_active ? (
                    <Badge variant="success">
                      <UserCheck className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <UserX className="mr-1 h-3 w-3" />
                      Inactive
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString("vi-VN")}
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleActive(user)}
                    disabled={togglingId === user.id}
                  >
                    {togglingId === user.id
                      ? "Đang cập nhật..."
                      : user.is_active
                        ? "Deactivate"
                        : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!users?.length && (
          <div className="p-8 text-center text-muted-foreground">Chưa có user nào</div>
        )}
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-card-foreground">
              <Users className="h-5 w-5 text-primary" />
              Tạo user mới
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground">
                  Tên đăng nhập <span className="text-destructive">*</span>
                </label>
                <Input
                  {...register("username")}
                  type="text"
                  className="mt-1"
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-card-foreground">
                  Mật khẩu <span className="text-destructive">*</span>
                </label>
                <Input
                  {...register("password")}
                  type="password"
                  className="mt-1"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_admin"
                  {...register("is_admin")}
                  className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-ring"
                />
                <label htmlFor="is_admin" className="text-sm text-card-foreground">
                  Admin
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Tạo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
