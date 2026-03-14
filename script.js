const spreadSelect = document.getElementById("spreadSelect");
const rangeSelect = document.getElementById("rangeSelect");

const currentSpreadEl = document.getElementById("currentSpread");
const curveStatusEl = document.getElementById("curveStatus");
const daysInvertedEl = document.getElementById("daysInverted");
const latestDateEl = document.getElementById("latestDate");
const chartTitleEl = document.getElementById("chartTitle");
const chartSubtitleEl = document.getElementById("chartSubtitle");
const signalExplanationEl = document.getElementById("signalExplanation");
const signalInterpretationEl = document.getElementById("signalInterpretation");

let chartInstance = null;
let rawData = null;

async function loadData() {
  const response = await fetch("./data/us-yield-curve.json");
  if (!response.ok) {
    throw new Error("Failed to load yield curve data.");
  }
  rawData = await response.json();
  updateView();
}

function formatSpread(value) {
  return `${value.toFixed(2)} pp`;
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function getSpreadSeries(type) {
  if (type === "10y2y") return rawData.spreads_10y_2y;
  if (type === "10y3m") return rawData.spreads_10y_3m;
  return [];
}

function filterByRange(data, range) {
  if (range === "max") return data;

  const now = new Date(data[data.length - 1].date);
  const start = new Date(now);

  if (range === "1y") start.setFullYear(start.getFullYear() - 1);
  if (range === "3y") start.setFullYear(start.getFullYear() - 3);
  if (range === "5y") start.setFullYear(start.getFullYear() - 5);
  if (range === "10y") start.setFullYear(start.getFullYear() - 10);

  return data.filter(item => new Date(item.date) >= start);
}

function getStatus(value) {
  if (value < 0) return "Inverted";
  if (value <= 0.25) return "Flat";
  return "Normal";
}

function getStatusClass(status) {
  if (status === "Inverted") return "status-inverted";
  if (status === "Flat") return "status-flat";
  return "status-normal";
}

function calculateDaysInverted(series) {
  let count = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].value < 0) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function updateTextContent(spreadType, latestPoint, fullSeries) {
  const status = getStatus(latestPoint.value);
  const daysInverted = calculateDaysInverted(fullSeries);

  currentSpreadEl.textContent = formatSpread(latestPoint.value);
  curveStatusEl.textContent = status;
  curveStatusEl.className = `stat-value ${getStatusClass(status)}`;
  daysInvertedEl.textContent = status === "Inverted" ? `${daysInverted}` : "0";
  latestDateEl.textContent = formatDate(latestPoint.date);

  if (spreadType === "10y2y") {
    chartTitleEl.textContent = "US 10Y - 2Y Spread";
    chartSubtitleEl.textContent = "10-year Treasury yield minus 2-year Treasury yield";
    signalExplanationEl.textContent =
      "This spread compares long-term Treasury yields with shorter-dated 2-year yields. It is one of the most widely followed yield curve indicators.";
  } else {
    chartTitleEl.textContent = "US 10Y - 3M Spread";
    chartSubtitleEl.textContent = "10-year Treasury yield minus 3-month Treasury bill yield";
    signalExplanationEl.textContent =
      "This spread compares 10-year Treasury yields with 3-month rates. It is often watched as a recession-related yield curve signal.";
  }

  if (status === "Inverted") {
    signalInterpretationEl.textContent =
      "The spread is currently below zero, meaning the yield curve is inverted. Yield curve inversions have historically been tracked as potential recession warning signals.";
  } else if (status === "Flat") {
    signalInterpretationEl.textContent =
      "The spread is close to zero, suggesting a relatively flat curve. A flattening yield curve may indicate slowing growth expectations or restrictive policy conditions.";
  } else {
    signalInterpretationEl.textContent =
      "The spread is positive, which means the yield curve is upward sloping. This is generally considered a more normal curve structure.";
  }
}

function buildChart(series) {
  const ctx = document.getElementById("spreadChart").getContext("2d");

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: series.map(item => item.date),
      datasets: [
        {
          label: "Spread",
          data: series.map(item => item.value),
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.15
        },
        {
          label: "Zero Line",
          data: series.map(() => 0),
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [6, 6]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} pp`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 8
          },
          grid: {
            display: false
          }
        },
        y: {
          ticks: {
            callback: function(value) {
              return `${value.toFixed(1)} pp`;
            }
          }
        }
      }
    }
  });
}

function updateView() {
  const spreadType = spreadSelect.value;
  const range = rangeSelect.value;

  const fullSeries = getSpreadSeries(spreadType);
  const filteredSeries = filterByRange(fullSeries, range);
  const latestPoint = fullSeries[fullSeries.length - 1];

  updateTextContent(spreadType, latestPoint, fullSeries);
  buildChart(filteredSeries);
}

spreadSelect.addEventListener("change", updateView);
rangeSelect.addEventListener("change", updateView);

loadData().catch(error => {
  console.error(error);
  document.querySelector(".tool-shell").innerHTML = `
    <div style="padding:24px;background:#fff;border:1px solid #dbe3ee;border-radius:16px;">
      <h2 style="margin-top:0;">Unable to load data</h2>
      <p style="margin-bottom:0;color:#5f6f85;">Please check the JSON data source for the Recession Signal Monitor.</p>
    </div>
  `;
});
