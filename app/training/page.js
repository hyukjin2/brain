"use client";

import { useEffect, useState } from "react";
import PlotlyClient from "@/components/PlotlyClient";

const GROUP_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

export default function TrainingPage() {
  const [group, setGroup] = useState(1);
  const [series, setSeries] = useState([]);
  const [meta, setMeta] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setError(null);

    Promise.all([
      fetch(`/api/series?name=ELBO&group=${group}`).then((res) => res.json()),
      fetch(`/api/meta?group=${group}`).then((res) => res.json())
    ])
      .then(([seriesPayload, metaPayload]) => {
        if (!isMounted) return;
        if (seriesPayload.error) {
          setError(seriesPayload.error);
          return;
        }
        if (metaPayload.error) {
          setError(metaPayload.error);
          return;
        }
        setSeries(seriesPayload.values || []);
        setMeta(metaPayload);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message);
      });

    return () => {
      isMounted = false;
    };
  }, [group]);

  const badgeClass = meta.converged ? "badge success" : "badge warning";

  return (
    <div>
      <h1 className="page-title">Training 지표</h1>
      <div className="control-panel">
        <label>
          Group
          <select
            value={group}
            onChange={(event) => setGroup(Number(event.target.value))}
          >
            {GROUP_OPTIONS.map((option) => (
              <option key={option} value={option}>
                group{option}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && <p className="helper-text">오류: {error}</p>}
      {!error && (
        <>
          <div className="card-grid">
            <div className="card">
              <p className="helper-text">Subjects</p>
              <strong>{meta.n_subjects ?? "-"}</strong>
            </div>
            <div className="card">
              <p className="helper-text">Iter</p>
              <strong>{meta.iter ?? "-"}</strong>
            </div>
            <div className="card">
              <p className="helper-text">Converged</p>
              <span className={badgeClass}>
                {meta.converged ? "Yes" : "No"}
              </span>
            </div>
          </div>
          <div className="chart-card">
            <PlotlyClient
              data={[
                {
                  type: "scatter",
                  mode: "lines",
                  x: series.map((_, index) => index + 1),
                  y: series,
                  line: { color: "#1b4db1" }
                }
              ]}
              layout={{
                title: "ELBO",
                xaxis: { title: "Iteration" },
                yaxis: { title: "ELBO" },
                margin: { t: 40, l: 50, r: 20, b: 40 },
                height: 420
              }}
              config={{ displayModeBar: true, responsive: true }}
              style={{ width: "100%" }}
            />
          </div>
        </>
      )}
    </div>
  );
}
