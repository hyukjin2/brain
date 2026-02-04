import { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";
import Plotly from "plotly.js-dist-min";
import Layout from "../components/Layout";
import { getHLabel, getJLabel } from "../lib/labels";

type SubjectsResponse = { name: string; values: number[][] };

type Option = { value: number; label: string };

type DataSource = "mu" | "beta";

type ParamType = "h" | "j";

export default function ParamsPage() {
  const [dataSource, setDataSource] = useState<DataSource>("mu");
  const [paramType, setParamType] = useState<ParamType>("h");
  const [index, setIndex] = useState(1);
  const [subjects, setSubjects] = useState<number[][]>([]);
  const [plotNode, setPlotNode] = useState<Plotly.PlotlyHTMLElement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/subjects?name=${dataSource}`)
      .then((res) => res.json())
      .then((data: SubjectsResponse) => {
        setSubjects(data.values || []);
      })
      .finally(() => setLoading(false));
  }, [dataSource]);

  useEffect(() => {
    const maxIndex = paramType === "h" ? 7 : 21;
    if (index > maxIndex) setIndex(1);
  }, [paramType, index]);

  const options: Option[] = useMemo(() => {
    const total = paramType === "h" ? 7 : 21;
    return Array.from({ length: total }, (_, idx) => {
      const value = idx + 1;
      const label = paramType === "h" ? getHLabel(value) : getJLabel(value);
      return { value, label };
    });
  }, [paramType]);

  const values = useMemo(() => {
    if (!subjects.length) return [] as number[];
    const columnIndex = paramType === "h" ? index - 1 : 7 + (index - 1);
    return subjects.map((row) => row[columnIndex]);
  }, [subjects, paramType, index]);

  const chartTitle = paramType === "h" ? getHLabel(index) : getJLabel(index);

  const handleExportCsv = () => {
    const rows = ["subject,value"].concat(
      values.map((value, idx) => `${idx + 1},${value}`)
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${dataSource}_${paramType}${index}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPng = async () => {
    if (!plotNode) return;
    const dataUrl = await Plotly.toImage(plotNode, {
      format: "png",
      width: 900,
      height: 500
    });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${dataSource}_${paramType}${index}.png`;
    link.click();
  };

  return (
    <Layout>
      <h1>Parameter Dashboard</h1>
      <p className="helper">
        Choose a parameter type and index to explore the subject distribution. The chart
        combines a boxplot with jittered scatter points.
      </p>

      <div className="controls">
        <div>
          <label htmlFor="data-source">Data Source</label>
          <select
            id="data-source"
            value={dataSource}
            onChange={(event) => setDataSource(event.target.value as DataSource)}
          >
            <option value="mu">mu</option>
            <option value="beta">beta</option>
          </select>
        </div>
        <div>
          <label htmlFor="param-type">Parameter Type</label>
          <select
            id="param-type"
            value={paramType}
            onChange={(event) => setParamType(event.target.value as ParamType)}
          >
            <option value="h">h (network)</option>
            <option value="j">j (pair)</option>
          </select>
        </div>
        <div>
          <label htmlFor="param-index">Index</label>
          <select
            id="param-index"
            value={index}
            onChange={(event) => setIndex(Number(event.target.value))}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>&nbsp;</label>
          <button onClick={handleExportCsv} disabled={!values.length}>
            Export CSV
          </button>
        </div>
        <div>
          <label>&nbsp;</label>
          <button onClick={handleExportPng} className="secondary" disabled={!values.length}>
            Download PNG
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading data...</p>
        ) : (
          <Plot
            data={[
              {
                y: values,
                type: "box",
                name: chartTitle,
                boxpoints: "all",
                jitter: 0.4,
                pointpos: 0,
                marker: { color: "rgba(59, 130, 246, 0.6)" },
                line: { color: "rgba(37, 99, 235, 0.8)" }
              }
            ]}
            layout={{
              title: `${dataSource.toUpperCase()} • ${chartTitle}`,
              paper_bgcolor: "#ffffff",
              plot_bgcolor: "#ffffff",
              margin: { l: 40, r: 30, t: 60, b: 40 },
              yaxis: { title: "Parameter value" }
            }}
            onInitialized={(_, graphDiv) => setPlotNode(graphDiv)}
            onUpdate={(_, graphDiv) => setPlotNode(graphDiv)}
            style={{ width: "100%", height: "420px" }}
            config={{ displayModeBar: false }}
          />
        )}
      </div>
    </Layout>
  );
}
