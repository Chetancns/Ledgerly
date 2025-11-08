// src/hooks/useAuthRedirect.ts
import { useEffect } from "react";
import { useRouter } from "next/router";

export const useAuthRedirect = (user: any, loading: boolean) => {
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);
};
