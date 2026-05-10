import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-muted-foreground">Trang không tồn tại</p>
        <Button asChild className="mt-4">
          <Link href="/">Về trang chủ</Link>
        </Button>
      </div>
    </div>
  );
}
