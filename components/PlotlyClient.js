"use client";

import Plot from "react-plotly.js";
import Plotly from "plotly.js-dist-min";

export default function PlotlyClient(props) {
  return <Plot {...props} Plotly={Plotly} />;
}
