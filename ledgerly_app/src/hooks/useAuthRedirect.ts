import { useEffect } from "react";
import { useRouter } from "next/router";

export const useAuthRedirect = () => {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.replace("/login"); // redirect to login
    }
  }, [router]);
};
