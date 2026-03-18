import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import * as fs from "fs";
import * as path from "path";

type AttemptRecord = {
  status: TestResult["status"];
  duration: number;
  retry: number;
  errorMessages: string[];
};

type TestRecord = {
  id: string;
  title: string;
  suiteName: string;
  file: string;
  line: number;
  projectName: string;
  tags: string[];
  attempts: AttemptRecord[];
};

type FileSummary = {
  file: string;
  total: number;
  passed: number;
  failed: number;
  flaky: number;
  skipped: number;
  duration: number;
};

class ManagerDashboardReporter implements Reporter {
  private readonly outputDir = path.resolve(process.cwd(), "manager-report");
  private readonly reportPath = path.resolve(this.outputDir, "index.html");
  private readonly results = new Map<string, TestRecord>();
  private runStartTime = "";

  onBegin(_config: FullConfig, _suite: Suite): void {
    this.runStartTime = new Date().toISOString();
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const testId = this.getTestId(test);
    const existing = this.results.get(testId);

    if (!existing) {
      this.results.set(testId, {
        id: testId,
        title: test.title,
        suiteName: this.getSuiteName(test),
        file: this.normalizeFilePath(test.location.file),
        line: test.location.line,
        projectName: test.parent.project()?.name ?? "default",
        tags: [...test.tags],
        attempts: [this.toAttemptRecord(result)],
      });
      return;
    }

    existing.attempts.push(this.toAttemptRecord(result));
  }

  onEnd(result: FullResult): void {
    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.writeFileSync(
      this.reportPath,
      this.buildHtml(result),
      "utf8"
    );
    console.log(
      `[Manager Report] Custom dashboard generated at ${this.reportPath}`
    );
  }

  private toAttemptRecord(result: TestResult): AttemptRecord {
    return {
      status: result.status,
      duration: result.duration,
      retry: result.retry,
      errorMessages: result.errors
        .map((error) => error.message || error.value || "")
        .filter(Boolean),
    };
  }

  private buildHtml(result: FullResult): string {
    const records = [...this.results.values()];
    const summary = this.getSummary(records);
    const fileSummaries = this.getFileSummaries(records);
    const slowestTests = [...records]
      .sort((left, right) => this.getTotalDuration(right) - this.getTotalDuration(left))
      .slice(0, 8);
    const problematicTests = records.filter((record) => {
      const finalStatus = this.getFinalStatus(record);
      return finalStatus === "failed" || finalStatus === "flaky";
    });
    const generatedAt = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const passRate = summary.total === 0 ? 0 : (summary.passed / summary.total) * 100;
    const totalDurationSeconds = (summary.totalDuration / 1000).toFixed(1);
    const healthScore = Math.max(
      0,
      Math.round(
        passRate - summary.failed * 4 - summary.flaky * 2 - summary.skipped * 0.5
      )
    );
    const fileBars = this.renderFileBars(fileSummaries);
    const slowBars = this.renderSlowBars(slowestTests);
    const issueRows = this.renderIssueRows(problematicTests);
    const pieStyle = this.getPieStyle(summary);
    const attentionCount = summary.failed + summary.flaky;
    const executiveHeading =
      attentionCount > 0
        ? `${summary.passed}/${summary.total} tests passed, ${attentionCount} need attention`
        : `${summary.passed}/${summary.total} tests passed`;
    const outcomeLabel =
      summary.failed === 0
        ? "Stable run"
        : summary.flaky > 0
          ? "Needs follow-up"
          : "Action required";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Loopin Automation Manager Dashboard</title>
  <style>
    :root {
      --bg: #f3efe8;
      --panel: rgba(255, 255, 255, 0.82);
      --panel-strong: rgba(255, 255, 255, 0.96);
      --ink: #172033;
      --muted: #556074;
      --border: rgba(29, 36, 51, 0.09);
      --accent: #0f766e;
      --accent-soft: #d5f4ec;
      --pass: #10b981;
      --pass-dark: #047857;
      --fail: #ef4444;
      --fail-dark: #b91c1c;
      --flaky: #f59e0b;
      --flaky-dark: #b45309;
      --skip: #64748b;
      --skip-dark: #475569;
      --chart-blue: #2563eb;
      --chart-cyan: #06b6d4;
      --shadow: 0 22px 50px rgba(47, 58, 85, 0.12);
      --radius: 22px;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: "Segoe UI", "Trebuchet MS", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(15, 118, 110, 0.16), transparent 32%),
        radial-gradient(circle at top right, rgba(245, 158, 11, 0.12), transparent 26%),
        linear-gradient(180deg, #faf5ef 0%, #efe6d8 100%);
    }

    .shell {
      max-width: 1440px;
      margin: 0 auto;
      padding: 40px 24px 56px;
    }

    .hero {
      padding: 34px;
      border-radius: 28px;
      background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(247,250,249,0.9));
      box-shadow: var(--shadow);
      border: 1px solid rgba(255,255,255,0.6);
      position: relative;
      overflow: hidden;
    }

    .hero::after {
      content: "";
      position: absolute;
      inset: auto -60px -80px auto;
      width: 280px;
      height: 280px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(15, 118, 110, 0.18), transparent 68%);
    }

    .eyebrow {
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 12px;
      color: var(--accent);
      font-weight: 700;
      margin-bottom: 10px;
    }

    h1 {
      margin: 0;
      font-size: clamp(30px, 4vw, 52px);
      line-height: 1.02;
      max-width: 12ch;
    }

    .hero-grid {
      margin-top: 24px;
      display: grid;
      grid-template-columns: 1.45fr 1fr;
      gap: 20px;
      align-items: stretch;
    }

    .hero-card, .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      backdrop-filter: blur(12px);
    }

    .hero-card {
      padding: 22px 24px;
    }

    .hero-copy {
      color: var(--muted);
      font-size: 16px;
      line-height: 1.65;
      max-width: 58ch;
    }

    .hero-metrics {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin-top: 18px;
    }

    .metric {
      padding: 16px;
      border-radius: 18px;
      background: rgba(255,255,255,0.7);
      border: 1px solid rgba(29, 36, 51, 0.07);
    }

    .metric-label {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }

    .metric-value {
      font-size: 30px;
      font-weight: 700;
      line-height: 1;
    }

    .metric-sub {
      margin-top: 8px;
      color: var(--muted);
      font-size: 13px;
    }

    .snapshot {
      padding: 24px;
      display: grid;
      gap: 18px;
      align-content: center;
    }

    .snapshot-badge {
      display: inline-flex;
      width: fit-content;
      padding: 8px 12px;
      border-radius: 999px;
      background: var(--accent-soft);
      color: var(--accent);
      font-weight: 700;
      font-size: 13px;
    }

    .status-grid {
      margin-top: 24px;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 16px;
    }

    .panel {
      padding: 24px;
      box-shadow: 0 16px 34px rgba(47, 58, 85, 0.08);
    }

    .panel-title {
      font-size: 20px;
      margin: 0 0 6px;
    }

    .panel-subtitle {
      color: var(--muted);
      margin: 0 0 20px;
      font-size: 14px;
    }

    .status-card .metric-value {
      font-size: 36px;
    }

    .status-card.pass { border-top: 4px solid var(--pass); }
    .status-card.fail { border-top: 4px solid var(--fail); }
    .status-card.flaky { border-top: 4px solid var(--flaky); }
    .status-card.skip { border-top: 4px solid var(--skip); }

    .main-grid {
      margin-top: 24px;
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 20px;
    }

    .chart-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 20px;
    }

    .pie-wrap {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 20px;
      align-items: center;
    }

    .pie-chart {
      width: 190px;
      aspect-ratio: 1;
      border-radius: 50%;
      background: ${pieStyle};
      position: relative;
      box-shadow: inset 0 0 0 1px rgba(29, 36, 51, 0.08);
    }

    .pie-chart::after {
      content: "${Math.round(passRate)}%";
      position: absolute;
      inset: 23%;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background: var(--panel-strong);
      font-size: 28px;
      font-weight: 700;
      color: var(--ink);
      box-shadow: inset 0 0 0 1px rgba(29, 36, 51, 0.06);
    }

    .legend {
      display: grid;
      gap: 12px;
    }

    .legend-item {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      color: var(--muted);
      font-size: 14px;
    }

    .legend-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--ink);
      font-weight: 600;
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      display: inline-block;
    }

    .legend-metric {
      text-align: right;
    }

    .legend-metric strong {
      display: block;
      color: var(--ink);
      font-size: 15px;
    }

    .legend-metric span {
      font-size: 12px;
      color: var(--muted);
    }

    .bars {
      display: grid;
      gap: 14px;
    }

    .bar-row {
      display: grid;
      gap: 6px;
    }

    .bar-meta {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 13px;
      color: var(--muted);
    }

    .bar-track {
      width: 100%;
      height: 14px;
      background: rgba(148, 163, 184, 0.18);
      border-radius: 999px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--chart-blue) 0%, var(--chart-cyan) 100%);
    }

    .bar-fill.fail {
      background: linear-gradient(90deg, var(--fail-dark) 0%, var(--fail) 100%);
    }

    .stacked-track {
      width: 100%;
      height: 18px;
      display: flex;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(148, 163, 184, 0.18);
      box-shadow: inset 0 0 0 1px rgba(23, 32, 51, 0.06);
    }

    .stacked-segment {
      height: 100%;
    }

    .stacked-segment.pass {
      background: linear-gradient(90deg, var(--pass-dark) 0%, var(--pass) 100%);
    }

    .stacked-segment.fail {
      background: linear-gradient(90deg, var(--fail-dark) 0%, var(--fail) 100%);
    }

    .stacked-segment.flaky {
      background: linear-gradient(90deg, var(--flaky-dark) 0%, var(--flaky) 100%);
    }

    .stacked-segment.skip {
      background: linear-gradient(90deg, var(--skip-dark) 0%, var(--skip) 100%);
    }

    .stat-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 6px;
    }

    .stat-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.76);
      border: 1px solid rgba(23, 32, 51, 0.08);
      font-size: 12px;
      color: var(--muted);
    }

    .stat-chip b {
      color: var(--ink);
      font-size: 13px;
    }

    .dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      display: inline-block;
    }

    .table-wrap {
      overflow: auto;
      margin-top: 22px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 820px;
    }

    th, td {
      padding: 14px 12px;
      text-align: left;
      border-bottom: 1px solid rgba(29, 36, 51, 0.08);
      vertical-align: top;
      font-size: 14px;
    }

    th {
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 12px;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border-radius: 999px;
      padding: 7px 12px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .pill.pass { background: rgba(21, 128, 61, 0.12); color: var(--pass); }
    .pill.fail { background: rgba(185, 28, 28, 0.12); color: var(--fail); }
    .pill.flaky { background: rgba(180, 83, 9, 0.12); color: var(--flaky); }
    .pill.skip { background: rgba(71, 85, 105, 0.12); color: var(--skip); }

    .muted {
      color: var(--muted);
    }

    .footer {
      margin-top: 18px;
      color: var(--muted);
      font-size: 13px;
    }

    .link {
      color: var(--accent);
      text-decoration: none;
      font-weight: 600;
    }

    @media (max-width: 1080px) {
      .hero-grid, .main-grid, .chart-grid, .status-grid {
        grid-template-columns: 1fr;
      }

      .pie-wrap {
        grid-template-columns: 1fr;
        justify-items: center;
      }
    }
  </style>
</head>
<body>
  <div class="shell">
    <section class="hero">
      <div class="eyebrow">Loopin Automation Quality Dashboard</div>
      <h1>${this.escapeHtml(executiveHeading)}</h1>
      <div class="hero-grid">
        <div class="hero-card">
          <div class="hero-copy">
            This dashboard summarizes the latest Playwright execution in a more executive-friendly format. It highlights delivery health, visual pass/fail distribution, slower areas, and the cases that need follow-up before sign-off.
          </div>
          <div class="hero-metrics">
            <div class="metric">
              <div class="metric-label">Overall outcome</div>
              <div class="metric-value">${this.escapeHtml(outcomeLabel)}</div>
              <div class="metric-sub">${summary.total} tests analyzed</div>
            </div>
            <div class="metric">
              <div class="metric-label">Execution time</div>
              <div class="metric-value">${totalDurationSeconds}s</div>
              <div class="metric-sub">Across all attempts and retries</div>
            </div>
            <div class="metric">
              <div class="metric-label">Health score</div>
              <div class="metric-value">${healthScore}</div>
              <div class="metric-sub">Derived from pass rate, failures, and flaky tests</div>
            </div>
          </div>
        </div>
        <div class="hero-card snapshot">
          <span class="snapshot-badge">Generated ${this.escapeHtml(generatedAt)}</span>
          <div class="metric-label">Run completion status</div>
          <div class="metric-value">${this.escapeHtml(result.status)}</div>
          <div class="metric-sub">Started ${this.escapeHtml(this.runStartTime || generatedAt)}</div>
          <div class="metric-sub">Default Playwright report remains available in <a class="link" href="../playwright-report/index.html">playwright-report</a>.</div>
        </div>
      </div>
    </section>

    <section class="status-grid">
      <div class="panel status-card pass">
        <h2 class="panel-title">Passed</h2>
        <p class="panel-subtitle">Fully successful final outcomes</p>
        <div class="metric-value">${summary.passed}</div>
      </div>
      <div class="panel status-card fail">
        <h2 class="panel-title">Failed</h2>
        <p class="panel-subtitle">Tests that still failed after retries</p>
        <div class="metric-value">${summary.failed}</div>
      </div>
      <div class="panel status-card flaky">
        <h2 class="panel-title">Flaky</h2>
        <p class="panel-subtitle">Recovered on retry, but unstable</p>
        <div class="metric-value">${summary.flaky}</div>
      </div>
      <div class="panel status-card skip">
        <h2 class="panel-title">Skipped</h2>
        <p class="panel-subtitle">Not executed in the final run</p>
        <div class="metric-value">${summary.skipped}</div>
      </div>
    </section>

    <section class="main-grid">
      <div class="panel">
        <h2 class="panel-title">Result Distribution</h2>
        <p class="panel-subtitle">Pie-chart style summary of the latest execution outcomes</p>
        <div class="pie-wrap">
          <div class="pie-chart"></div>
          <div class="legend">
            ${this.renderLegendItem("Passed", summary.passed, summary.total, "var(--pass)")}
            ${this.renderLegendItem("Failed", summary.failed, summary.total, "var(--fail)")}
            ${this.renderLegendItem("Flaky", summary.flaky, summary.total, "var(--flaky)")}
            ${this.renderLegendItem("Skipped", summary.skipped, summary.total, "var(--skip)")}
          </div>
        </div>
      </div>

      <div class="panel">
        <h2 class="panel-title">Business Snapshot</h2>
        <p class="panel-subtitle">Fast takeaways for a leadership or demo update</p>
        <div class="bars">
          <div class="bar-row">
            <div class="bar-meta"><span>Pass rate</span><strong>${passRate.toFixed(1)}%</strong></div>
            <div class="bar-track"><div class="bar-fill" style="width: ${passRate.toFixed(1)}%"></div></div>
          </div>
          <div class="bar-row">
            <div class="bar-meta"><span>Failure rate</span><strong>${summary.total === 0 ? "0.0" : ((summary.failed / summary.total) * 100).toFixed(1)}%</strong></div>
            <div class="bar-track"><div class="bar-fill fail" style="width: ${summary.total === 0 ? "0" : ((summary.failed / summary.total) * 100).toFixed(1)}%"></div></div>
          </div>
          <div class="bar-row">
            <div class="bar-meta"><span>Retry pressure</span><strong>${summary.totalRetries}</strong></div>
            <div class="muted">Total extra attempts triggered beyond the first execution.</div>
          </div>
          <div class="bar-row">
            <div class="bar-meta"><span>Coverage by file</span><strong>${fileSummaries.length} files</strong></div>
            <div class="muted">Shows where the run spent most effort and where issues concentrate.</div>
          </div>
        </div>
      </div>
    </section>

    <section class="chart-grid">
      <div class="panel">
        <h2 class="panel-title">File-wise Quality Breakdown</h2>
        <p class="panel-subtitle">Stacked quality bars showing pass, fail, flaky, and skipped mix for each spec file</p>
        <div class="bars">${fileBars}</div>
      </div>
      <div class="panel">
        <h2 class="panel-title">Top 8 Slowest Tests</h2>
        <p class="panel-subtitle">Highest-duration test cases including retry time, with clearer labels for presentation</p>
        <div class="bars">${slowBars}</div>
      </div>
    </section>

    <section class="panel" style="margin-top: 20px;">
      <h2 class="panel-title">Attention Items</h2>
      <p class="panel-subtitle">Failures and flaky cases that deserve immediate review</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Test Case</th>
              <th>Spec File</th>
              <th>Attempts</th>
              <th>Duration</th>
              <th>Issue Snapshot</th>
            </tr>
          </thead>
          <tbody>
            ${issueRows}
          </tbody>
        </table>
      </div>
      <div class="footer">
        Custom manager report: <a class="link" href="./index.html">manager-report/index.html</a>
      </div>
    </section>
  </div>
</body>
</html>`;
  }

  private getSummary(records: TestRecord[]) {
    const summary = {
      total: records.length,
      passed: 0,
      failed: 0,
      flaky: 0,
      skipped: 0,
      totalDuration: 0,
      totalRetries: 0,
    };

    for (const record of records) {
      const finalStatus = this.getFinalStatus(record);
      summary.totalDuration += this.getTotalDuration(record);
      summary.totalRetries += Math.max(0, record.attempts.length - 1);

      if (finalStatus === "passed") {
        summary.passed += 1;
      } else if (finalStatus === "failed") {
        summary.failed += 1;
      } else if (finalStatus === "flaky") {
        summary.flaky += 1;
      } else {
        summary.skipped += 1;
      }
    }

    return summary;
  }

  private getFileSummaries(records: TestRecord[]): FileSummary[] {
    const map = new Map<string, FileSummary>();

    for (const record of records) {
      const finalStatus = this.getFinalStatus(record);
      const summary =
        map.get(record.file) ??
        {
          file: record.file,
          total: 0,
          passed: 0,
          failed: 0,
          flaky: 0,
          skipped: 0,
          duration: 0,
        };

      summary.total += 1;
      summary.duration += this.getTotalDuration(record);

      if (finalStatus === "passed") {
        summary.passed += 1;
      } else if (finalStatus === "failed") {
        summary.failed += 1;
      } else if (finalStatus === "flaky") {
        summary.flaky += 1;
      } else {
        summary.skipped += 1;
      }

      map.set(record.file, summary);
    }

    return [...map.values()].sort((left, right) => right.total - left.total);
  }

  private renderFileBars(fileSummaries: FileSummary[]): string {
    if (fileSummaries.length === 0) {
      return `<div class="muted">No file-level data was captured for this run.</div>`;
    }

    return fileSummaries
      .map((summary) => {
        const passedWidth = this.toPercent(summary.passed, summary.total);
        const failedWidth = this.toPercent(summary.failed, summary.total);
        const flakyWidth = this.toPercent(summary.flaky, summary.total);
        const skippedWidth = this.toPercent(summary.skipped, summary.total);
        const healthyPercent = this.toPercent(summary.passed + summary.flaky, summary.total);

        return `<div class="bar-row">
          <div class="bar-meta">
            <span>${this.escapeHtml(summary.file)}</span>
            <strong>${healthyPercent.toFixed(1)}% healthy outcome</strong>
          </div>
          <div class="stacked-track">
            ${this.renderStackedSegment("pass", passedWidth)}
            ${this.renderStackedSegment("fail", failedWidth)}
            ${this.renderStackedSegment("flaky", flakyWidth)}
            ${this.renderStackedSegment("skip", skippedWidth)}
          </div>
          <div class="stat-chips">
            ${this.renderStatChip("Passed", summary.passed, "var(--pass)")}
            ${this.renderStatChip("Failed", summary.failed, "var(--fail)")}
            ${this.renderStatChip("Flaky", summary.flaky, "var(--flaky)")}
            ${this.renderStatChip("Skipped", summary.skipped, "var(--skip)")}
          </div>
          <div class="muted">${summary.total} tests, ${(summary.duration / 1000).toFixed(1)}s total</div>
        </div>`;
      })
      .join("");
  }

  private renderSlowBars(records: TestRecord[]): string {
    if (records.length === 0) {
      return `<div class="muted">No timing data available for this run.</div>`;
    }

    const slowestDuration = Math.max(...records.map((record) => this.getTotalDuration(record)));

    return records
      .map((record) => {
        const duration = this.getTotalDuration(record);
        const width = slowestDuration === 0 ? 0 : (duration / slowestDuration) * 100;
        const finalStatus = this.getFinalStatus(record);
        return `<div class="bar-row">
          <div class="bar-meta">
            <span>${this.escapeHtml(record.title)}</span>
            <strong>${(duration / 1000).toFixed(1)}s</strong>
          </div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${width.toFixed(1)}%"></div>
          </div>
          <div class="stat-chips">
            <span class="stat-chip"><span class="dot" style="background: var(--chart-blue)"></span><b>${record.attempts.length}</b> attempt(s)</span>
            <span class="stat-chip"><span class="dot" style="background: ${this.getStatusColor(finalStatus)}"></span><b>${this.escapeHtml(finalStatus)}</b> final status</span>
          </div>
          <div class="muted">${this.escapeHtml(record.file)}</div>
        </div>`;
      })
      .join("");
  }

  private renderIssueRows(records: TestRecord[]): string {
    if (records.length === 0) {
      return `<tr><td colspan="6" class="muted">No failures or flaky tests in this run.</td></tr>`;
    }

    return records
      .sort((left, right) => this.getSeverity(right) - this.getSeverity(left))
      .map((record) => {
        const finalStatus = this.getFinalStatus(record);
        const issueSummary = this.getIssueSummary(record);

        return `<tr>
          <td><span class="pill ${this.getPillClass(finalStatus)}">${this.escapeHtml(finalStatus)}</span></td>
          <td>${this.escapeHtml(record.title)}<div class="muted">${this.escapeHtml(record.suiteName)}</div></td>
          <td>${this.escapeHtml(record.file)}:${record.line}</td>
          <td>${record.attempts.length}</td>
          <td>${(this.getTotalDuration(record) / 1000).toFixed(1)}s</td>
          <td>${this.escapeHtml(issueSummary)}</td>
        </tr>`;
      })
      .join("");
  }

  private getIssueSummary(record: TestRecord): string {
    const finalStatus = this.getFinalStatus(record);
    if (finalStatus === "flaky") {
      return `Recovered after ${record.attempts.length - 1} retry attempt(s). Review stability before sharing as final sign-off.`;
    }

    const errors = record.attempts.flatMap((attempt) => attempt.errorMessages).filter(Boolean);
    if (errors.length > 0) {
      return this.condenseError(errors[0]);
    }

    return "Execution failed without a captured error message. Review trace or Playwright HTML report for detail.";
  }

  private condenseError(message: string): string {
    return message.replace(/\s+/g, " ").trim().slice(0, 220);
  }

  private getFinalStatus(record: TestRecord): "passed" | "failed" | "flaky" | "skipped" {
    const lastAttempt = record.attempts[record.attempts.length - 1];
    const hadPriorFailure = record.attempts
      .slice(0, -1)
      .some((attempt) => attempt.status !== "passed" && attempt.status !== "skipped");

    if (lastAttempt?.status === "passed") {
      return hadPriorFailure ? "flaky" : "passed";
    }

    if (lastAttempt?.status === "skipped") {
      return "skipped";
    }

    return "failed";
  }

  private getPieStyle(summary: {
    total: number;
    passed: number;
    failed: number;
    flaky: number;
    skipped: number;
  }): string {
    if (summary.total === 0) {
      return "conic-gradient(#cbd5e1 0 100%)";
    }

    const passedAngle = (summary.passed / summary.total) * 360;
    const failedAngle = (summary.failed / summary.total) * 360;
    const flakyAngle = (summary.flaky / summary.total) * 360;
    const skippedAngle = 360 - passedAngle - failedAngle - flakyAngle;

    const passedEnd = passedAngle;
    const failedEnd = passedEnd + failedAngle;
    const flakyEnd = failedEnd + flakyAngle;
    const skippedEnd = flakyEnd + skippedAngle;

    return `conic-gradient(
      var(--pass) 0deg ${passedEnd.toFixed(2)}deg,
      var(--fail) ${passedEnd.toFixed(2)}deg ${failedEnd.toFixed(2)}deg,
      var(--flaky) ${failedEnd.toFixed(2)}deg ${flakyEnd.toFixed(2)}deg,
      var(--skip) ${flakyEnd.toFixed(2)}deg ${skippedEnd.toFixed(2)}deg
    )`;
  }

  private renderLegendItem(
    label: string,
    value: number,
    total: number,
    color: string
  ): string {
    const percentage = total === 0 ? 0 : (value / total) * 100;
    return `<div class="legend-item">
      <span class="legend-chip"><span class="legend-dot" style="background:${color}"></span>${this.escapeHtml(label)}</span>
      <span class="legend-metric"><strong>${value}</strong><span>${percentage.toFixed(1)}%</span></span>
    </div>`;
  }

  private renderStackedSegment(
    statusClass: "pass" | "fail" | "flaky" | "skip",
    width: number
  ): string {
    if (width <= 0) {
      return "";
    }

    return `<div class="stacked-segment ${statusClass}" style="width: ${width.toFixed(1)}%"></div>`;
  }

  private renderStatChip(label: string, value: number, color: string): string {
    return `<span class="stat-chip"><span class="dot" style="background: ${color}"></span>${this.escapeHtml(label)} <b>${value}</b></span>`;
  }

  private getSeverity(record: TestRecord): number {
    const finalStatus = this.getFinalStatus(record);
    return finalStatus === "failed" ? 2 : finalStatus === "flaky" ? 1 : 0;
  }

  private getTotalDuration(record: TestRecord): number {
    return record.attempts.reduce((sum, attempt) => sum + attempt.duration, 0);
  }

  private getSuiteName(test: TestCase): string {
    const titlePath = test.titlePath().filter(Boolean);
    return titlePath.length > 1 ? titlePath.slice(1, -1).join(" > ") : "General";
  }

  private getTestId(test: TestCase): string {
    return `${test.location.file}:${test.location.line}:${test.title}`;
  }

  private normalizeFilePath(filePath: string): string {
    return path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  }

  private getPillClass(status: string): string {
    if (status === "passed") {
      return "pass";
    }
    if (status === "flaky") {
      return "flaky";
    }
    if (status === "skipped") {
      return "skip";
    }
    return "fail";
  }

  private getStatusColor(status: "passed" | "failed" | "flaky" | "skipped"): string {
    if (status === "passed") {
      return "var(--pass)";
    }
    if (status === "flaky") {
      return "var(--flaky)";
    }
    if (status === "skipped") {
      return "var(--skip)";
    }
    return "var(--fail)";
  }

  private toPercent(value: number, total: number): number {
    if (total === 0) {
      return 0;
    }

    return (value / total) * 100;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}

export default ManagerDashboardReporter;
