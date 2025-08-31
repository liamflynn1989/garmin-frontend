import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import moment from "moment-timezone";

// Chart.js registration
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend, Filler);

type BatteryPoint = {
  timestamp_ms: number;
  body_battery: number;
};

export default function Home() {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/api/body-battery")
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((json) => {
        const userKeys = Object.keys(json);
        if (userKeys.length === 0) throw new Error("No user data received");

        // Use timestamps from the first user as the x-axis labels
        const labels = json[userKeys[0]].map((pt: BatteryPoint) =>
          moment.tz(pt.timestamp_ms, "Australia/Sydney").format("HH:mm")
        );

        const colorPalette = [
          "rgba(255, 99, 132, 0.6)",
          "rgba(54, 162, 235, 0.6)",
          "rgba(255, 206, 86, 0.6)",
          "rgba(75, 192, 192, 0.6)",
          "rgba(153, 102, 255, 0.6)",
          "rgba(255, 159, 64, 0.6)",
        ];

        const datasets = userKeys.map((user, idx) => ({
          label: user.toUpperCase(),
          data: json[user].map((pt: BatteryPoint) => pt.body_battery),
          borderColor: colorPalette[idx % colorPalette.length],
          backgroundColor: colorPalette[idx % colorPalette.length],
          fill: true,
          tension: 0.4,
        }));

        setChartData({ labels, datasets });
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="text-xl">Loading chart...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Garmin Body Battery — Today (Sydney Time)
      </h1>
      <Line
        data={chartData}
        options={{
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              title: { display: true, text: "Body Battery (0–100)" },
              grid: { color: "#ddd" },
            },
            x: {
              title: { display: true, text: "Time (HH:MM)" },
              ticks: { maxTicksLimit: 10 },
              grid: { display: false },
            },
          },
          plugins: {
            legend: { position: "top" as const },
            title: { display: false },
          },
        }}
      />
    </div>
  );
}