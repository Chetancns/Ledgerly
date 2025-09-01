import Layout from "../components/Layout";
import Chart from "../components/Chart";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";

export default function Dashboard() {
    useAuthRedirect();
  const data = [
    { date: "2023-08-01", amount: 200 },
    { date: "2023-08-02", amount: 150 },
  ];
  return (
    <Layout>
      <h1 className="text-2xl mb-4">Dashboard</h1>
      <Chart data={data} />
    </Layout>
  );
}
