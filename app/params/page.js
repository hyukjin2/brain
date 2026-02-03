"use client";

import { useEffect, useMemo, useState } from "react";
import Plotly from "plotly.js-dist-min";
import PlotlyClient from "@/components/PlotlyClient";
import { NETWORK_LABELS, buildJLabels } from "@/lib/networks";

const GROUP_OPTIONS = [1, 2, 3, 4, 5, 6, 7];

function buildCsv(values) {
  const header = "subject,value";
  const rows = values.map((value, index) => `${index + 1},${value}`);
  return [header, ...rows].join("\n");
}

export default function ParamsPage() {
  const [group, setGroup] = useState(1);
  const [source, setSource] = useState("mu");
  const [paramType, setParamType] = useState("h");
  const [paramIndex, setParamIndex] = useState(1);
  const [subjects, setSubjects] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [plotNode, setPlotNode] = useState(null);

  const jLabels = useMemo(() => buildJLabels(), []);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch(`/api/subjects?name=${source}&group=${group}`)
      .then((res) => res.json())
      .then((payload) => {
        if (!isMounted) return;
        if (payload.error) {
          setError(payload.error);
          setSubjects([]);
          return;
        }
        setSubjects(payload.values || []);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [source, group]);

  const columnIndex = paramType === "h" ? paramIndex - 1 : 7 + (paramIndex - 1);
  const values = subjects
    .map((row) => row?.[columnIndex])
    .filter((value) => typeof value === "number");

  const jitterX = values.map((_, index) => {
    const seed = (index + 1) * 9301 + 49297;
    const normalized = ((seed % 233280) / 233280) - 0.5;
    return 1 + normalized * 0.15;
  });

  const label =
    paramType === "h"
      ? `${paramIndex} (${NETWORK_LABELS[paramIndex - 1]})`
      : `${paramIndex} (${jLabels[paramIndex - 1]})`;

  const handleCsvDownload = () => {
    const csv = buildCsv(values);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `group${group}_${source}_${paramType}${paramIndex}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePngDownload = () => {
    if (!plotNode) return;
    Plotly.downloadImage(plotNode, {
      format: "png",
      filename: `group${group}_${source}_${paramType}${paramIndex}`
    });
  };

  return (
    <div>
      <h1 className="page-title">Subject 파라미터 분포</h1>
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
        <label>
          데이터 소스
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="mu">mu</option>
            <option value="beta">beta</option>
          </select>
        </label>
        <label>
          파라미터 타입
          <select
            value={paramType}
            onChange={(event) => {
              const next = event.target.value;
              setParamType(next);
              setParamIndex(1);
            }}
          >
            <option value="h">h</option>
            <option value="j">j</option>
          </select>
        </label>
        <label>
          인덱스
          <select
            value={paramIndex}
            onChange={(event) => setParamIndex(Number(event.target.value))}
          >
            {(paramType === "h" ? NETWORK_LABELS : jLabels).map(
              (text, index) => (
                <option key={text} value={index + 1}>
                  {index + 1} - {text}
                </option>
              )
            )}
          </select>
        </label>
        <div className="button-group">
          <button onClick={handleCsvDownload} disabled={!values.length}>
            CSV 다운로드
          </button>
          <button
            className="secondary"
            onClick={handlePngDownload}
            disabled={!values.length}
          >
            PNG 저장
          </button>
        </div>
      </div>
      <div className="chart-card">
        <p className="helper-text">
          선택: group{group} / {source} / {paramType}
          {paramIndex} {label}
        </p>
        {error && <p className="helper-text">오류: {error}</p>}
        {isLoading && <p className="helper-text">데이터 로딩 중...</p>}
        {!isLoading && !error && !values.length && (
          <p className="helper-text">표시할 데이터가 없습니다.</p>
        )}
        {!isLoading && !error && values.length > 0 && (
          <PlotlyClient
            data={[
              {
                type: "box",
                y: values,
                name: "분포",
                boxpoints: false,
                marker: { color: "#1b4db1" }
              },
              {
                type: "scatter",
                mode: "markers",
                x: jitterX,
                y: values,
                marker: { color: "rgba(27, 77, 177, 0.4)", size: 6 },
                name: "Subjects"
              }
            ]}
            layout={{
              title: `Parameter ${paramType}${paramIndex}`,
              xaxis: { visible: false },
              yaxis: { title: "Value" },
              margin: { t: 40, l: 50, r: 20, b: 40 },
              height: 420
            }}
            onInitialized={(_, graphDiv) => setPlotNode(graphDiv)}
            config={{ displayModeBar: true, responsive: true }}
            style={{ width: "100%" }}
          />
        )}
      </div>
    </div>
  );
}
