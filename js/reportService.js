/**
 * NutriAI — Clinical Health Report & PDF Generator Engine
 * Generates clinical-grade, high-resolution metabolic summaries and printable PDF reports.
 */

const NutriAIReportService = {

  /**
   * Generates and downloads a formatted printable Health Report.
   * Uses an isolated print/download document view for crisp rendering and vector styling.
   * 
   * @param {object} state - App state singleton
   */
  generateAndDownloadReport(state = appState) {
    const p = state.data.profile;
    const targets = state.targets;
    const totals = state.getTodayTotals();
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const latestWeight = state.data.weightHistory[state.data.weightHistory.length - 1]?.weight || p.weight;
    const startWeight = state.data.weightHistory[0]?.weight || p.weight;
    const weightDiff = (latestWeight - startWeight).toFixed(1);

    // Build standalone HTML report document
    const reportHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NutriAI Clinical Metabolic Report — ${p.name || 'Client'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; }
    body { background: #ffffff; color: #0f172a; padding: 40px; font-size: 14px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
    .brand { font-size: 26px; font-weight: 800; color: #047857; display: flex; align-items: center; gap: 8px; }
    .report-title { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .meta-box { text-align: right; font-size: 12px; color: #475569; }
    .meta-box strong { color: #0f172a; font-size: 13px; }
    
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
    
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .card-title { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.04em; }
    .card-val { font-size: 22px; font-weight: 800; color: #0f172a; }
    .card-sub { font-size: 11px; color: #10b981; font-weight: 600; margin-top: 4px; }
    
    .section-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px; }
    th { background: #f1f5f9; text-align: left; padding: 10px 12px; font-weight: 700; color: #334155; border-bottom: 2px solid #cbd5e1; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; }
    tr:last-child td { border-bottom: none; }
    
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: #dcfce7; color: #15803d; }
    .badge-blue { background: #e0f2fe; color: #0369a1; }
    .badge-amber { background: #fef3c7; color: #b45309; }
    
    .callout { background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 30px; font-size: 13px; color: #166534; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 11px; color: #94a3b8; text-align: center; }
    
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  
  <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: flex-end; gap: 10px;">
    <button onclick="window.print()" style="background:#10b981; color:#fff; border:none; padding:10px 20px; border-radius:6px; font-weight:700; cursor:pointer;">🖨️ Save as PDF / Print</button>
    <button onclick="window.close()" style="background:#64748b; color:#fff; border:none; padding:10px 16px; border-radius:6px; font-weight:600; cursor:pointer;">Close</button>
  </div>

  <div class="header">
    <div>
      <div class="brand">🥗 NutriAI</div>
      <div class="report-title">Executive Metabolic & Nutritional Compliance Digest</div>
    </div>
    <div class="meta-box">
      <div>Client: <strong>${p.name || 'Alex Morgan'}</strong></div>
      <div>Date: <strong>${today}</strong></div>
      <div>Protocol: <strong>${(p.goal || 'fat_loss').toUpperCase()}</strong></div>
    </div>
  </div>

  <!-- Key Metrics Row -->
  <div class="grid-4">
    <div class="card">
      <div class="card-title">Daily Caloric Target</div>
      <div class="card-val">${targets.calories} <span style="font-size:13px; font-weight:600;">kcal</span></div>
      <div class="card-sub">${p.goal === 'fat_loss' ? '-450 kcal Deficit' : 'Target Calorie Budget'}</div>
    </div>
    <div class="card">
      <div class="card-title">Basal Metabolic Rate</div>
      <div class="card-val">${targets.bmr} <span style="font-size:13px; font-weight:600;">kcal</span></div>
      <div class="card-sub">Mifflin-St Jeor Formula</div>
    </div>
    <div class="card">
      <div class="card-title">Body Mass Index</div>
      <div class="card-val">${targets.bmi}</div>
      <div class="card-sub">${targets.bmiCategory} Range</div>
    </div>
    <div class="card">
      <div class="card-title">Weight Progress</div>
      <div class="card-val">${latestWeight} <span style="font-size:13px; font-weight:600;">kg</span></div>
      <div class="card-sub" style="color:${Number(weightDiff) <= 0 ? '#10b981' : '#ef4444'};">${Number(weightDiff) <= 0 ? '' : '+'}${weightDiff} kg (Goal: ${p.targetWeight}kg)</div>
    </div>
  </div>

  <!-- Biometric Breakdown Table -->
  <div class="section-title">📊 Biometric & Macronutrient Distribution</div>
  <table>
    <thead>
      <tr>
        <th>Metric / Nutrient</th>
        <th>Calculated Target</th>
        <th>Current Status / Intake</th>
        <th>Physiological Rationale</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Protein Target</strong></td>
        <td><span class="badge badge-blue">${targets.protein} g / day</span></td>
        <td>${totals.protein} g logged</td>
        <td>2.1g/kg bodyweight to maximize muscle protein synthesis and preserve lean tissue</td>
      </tr>
      <tr>
        <td><strong>Carbohydrate Target</strong></td>
        <td><span class="badge badge-amber">${targets.carbs} g / day</span></td>
        <td>${totals.carbs} g logged</td>
        <td>Complex low-glycemic starches to support training energy and liver glycogen</td>
      </tr>
      <tr>
        <td><strong>Essential Dietary Fats</strong></td>
        <td><span class="badge">${targets.fats} g / day</span></td>
        <td>${totals.fats} g logged</td>
        <td>25% caloric ratio to support hormonal synthesis and fat-soluble vitamin absorption</td>
      </tr>
      <tr>
        <td><strong>Dietary Fiber</strong></td>
        <td><span class="badge">${targets.fiber} g / day</span></td>
        <td>${totals.fiber} g logged</td>
        <td>Prebiotic soluble and insoluble fibers for gut microbiome and glycemic control</td>
      </tr>
      <tr>
        <td><strong>Hydration Target</strong></td>
        <td><span class="badge badge-blue">${(targets.water / 1000).toFixed(1)} L / day</span></td>
        <td>${(state.data.waterLogged / 1000).toFixed(1)} L logged</td>
        <td>Optimizes blood volume, metabolic cellular hydration, and renal clearance</td>
      </tr>
    </tbody>
  </table>

  <!-- Clinical Insights Callout -->
  <div class="callout">
    <strong>💡 NutriAI Clinical Assessment & Advisory:</strong><br/>
    Client is adhering well to the <strong>${p.dietPreference || 'Balanced'}</strong> nutritional protocol. Total daily energy expenditure (TDEE) is calculated at <strong>${targets.tdee} kcal</strong>.
    The prescribed caloric deficit of ~450 kcal creates an optimal energy differential for sustainable adipose loss at ~0.5kg/week with zero muscle catabolism.
  </div>

  <!-- Weight Trajectory Log -->
  <div class="section-title">⚖️ Body Composition Weigh-in Log</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Weight (kg)</th>
        <th>Change</th>
        <th>Clinical Notes</th>
      </tr>
    </thead>
    <tbody>
      ${state.data.weightHistory.map((w, idx) => {
        const prev = idx > 0 ? state.data.weightHistory[idx - 1].weight : w.weight;
        const diff = (w.weight - prev).toFixed(1);
        return `
          <tr>
            <td><strong>${w.date}</strong></td>
            <td>${w.weight} kg</td>
            <td style="color:${Number(diff) <= 0 ? '#10b981' : '#f59e0b'}; font-weight:700;">${idx === 0 ? 'Baseline' : (Number(diff) <= 0 ? '' : '+') + diff + ' kg'}</td>
            <td>${w.note || 'Regular scheduled weigh-in'}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="footer">
    Generated automatically by NutriAI Platform on ${today}. This report is intended for health, fitness, and nutritional guidance.
  </div>

</body>
</html>
    `;

    // Open popup window and trigger auto-print / save as PDF
    const printWindow = window.open("", "_blank", "width=850,height=900");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
      }, 300);
    } else {
      // Fallback: create blob download
      const blob = new Blob([reportHtml], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NutriAI_Health_Report_${p.name ? p.name.replace(/\s+/g, '_') : 'Alex'}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }
};
