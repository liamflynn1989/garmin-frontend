import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import moment from "moment-timezone";
const API_URL = process.env.NEXT_PUBLIC_API_URL!;

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
  body_battery: number | null;
};

const CACHE_KEY = "bodyBatteryCache";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export default function Home() {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const processData = (json: any) => {
    const userKeys = Object.keys(json);
    if (userKeys.length === 0) throw new Error("No user data received");

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

    return { labels, datasets };
  };

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      const age = Date.now() - new Date(parsed.updated).getTime();
      if (age < CACHE_TTL_MS) {
        setChartData(processData(parsed.data));
        setLastUpdated(parsed.updated);
        setLoading(false);
        return;
      }
    }

    fetch(`${API_URL}/api/body-battery`)
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((json) => {
        localStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ data: json.data, updated: json.updated })
        );
        setChartData(processData(json.data));
        setLastUpdated(json.updated);
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
      <h1 className="text-2xl font-bold mb-2 text-center">
        Body Battery Bonanza
      </h1>
      {lastUpdated && (
        <p className="text-center text-sm text-gray-600 mb-6">
          Last updated at {moment(lastUpdated).tz("Australia/Sydney").format("hh:mm A")}
        </p>
      )}
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