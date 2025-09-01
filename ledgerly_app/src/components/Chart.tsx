import { LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
type ChartDataPoint = {
  date: string;   // or Date if you transform before passing to Recharts
  amount: number;
};

export default function Chart({ data }: { data: ChartDataPoint[] }) {
  return (
    <LineChart width={400} height={250} data={data}>
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="amount" stroke="#8884d8" />
    </LineChart>
  );
}