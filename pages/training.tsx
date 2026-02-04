import { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import Layout from "../components/Layout";

type MetaResponse = { n_subjects: number; iter: number; converged: number };

type SeriesResponse = { name: string; values: number[] };

export default function TrainingPage() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [series, setSeries] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch("/api/meta"), fetch("/api/series?name=ELBO")])
      .then(async ([metaRes, seriesRes]) => {
        const metaData = (await metaRes.json()) as MetaResponse;
        const seriesData = (await seriesRes.json()) as SeriesResponse;
        setMeta(metaData);
        setSeries(seriesData.values || []);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <h1>Training Status</h1>
      <p className="helper">Monitor ELBO convergence alongside training metadata.</p>

      <div className="grid two">
        <div className="card">
          <h3>Iterations</h3>
          <p style={{ fontSize: "28px", margin: "12px 0" }}>
            {meta ? meta.iter : "-"}
          </p>
          <p className="helper">Total iterations in the optimization run.</p>
        </div>
        <div className="card">
          <h3>Converged</h3>
          <p className={meta?.converged ? "badge success" : "badge"}>
            {meta?.converged ? "Yes" : "No"}
          </p>
          <p className="helper">
            {meta?.converged ? "Model converged." : "Model has not converged."}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginTop: "20px" }}>
        {loading ? (
          <p>Loading ELBO series...</p>
        ) : (
          <Plot
            data={[
              {
                x: series.map((_, idx) => idx + 1),
                y: series,
                type: "scatter",
                mode: "lines+markers",
                marker: { color: "#3b82f6" },
                line: { color: "#2563eb" },
                name: "ELBO"
              }
            ]}
            layout={{
              title: "ELBO over iterations",
              paper_bgcolor: "#ffffff",
              plot_bgcolor: "#ffffff",
              margin: { l: 50, r: 30, t: 60, b: 40 },
              xaxis: { title: "Iteration" },
              yaxis: { title: "ELBO" }
            }}
            style={{ width: "100%", height: "420px" }}
            config={{ displayModeBar: false }}
          />
        )}
      </div>
    </Layout>
  );
}
