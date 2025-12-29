import { useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import TagManager from "../components/TagManager";
import { useAuth } from "../hooks/useAuth";

export default function TagsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <TagManager />
      </div>
    </Layout>
  );
}
