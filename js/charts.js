/**
 * NutriAI — Lightweight Native Canvas Chart Engine v2.0
 * Razor-sharp HiDPI rendering for weekly calorie bars, macro donuts, and weight progress curves.
 * 
 * v2.0 Fixes:
 * - setupCanvas guards against hidden elements (0x0 bounding box)
 * - renderWeightProgress handles single-point history (no division by zero)
 * - renderWeeklyCalories uses dynamic data from passed-in array instead of hardcoded values
 */

const NutriAICharts = {
  // Helper for HiDPI sharpness
  // Guard: returns null if canvas is not visible (prevents 0x0 dimension bug)
  setupCanvas(canvas) {
    if (!canvas) return null;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // If canvas is hidden / not yet rendered, dimensions will be 0
    if (rect.width === 0 || rect.height === 0) return null;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, width: rect.width, height: rect.height };
  },

  /**
   * Weekly Calorie Intake Bar Chart
   * @param {string} canvasId
   * @param {number} targetCalories - user's daily calorie target
   * @param {Array} weekData - optional array of { day, cals } to render; uses demo data if omitted
   */
  renderWeeklyCalories(canvasId, targetCalories = 2150, weekData = null) {
    const canvas = document.getElementById(canvasId);
    const setup = this.setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;

    // Build real week data based on actual tracking
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const todayCode = (typeof appState !== "undefined" && appState.data) 
      ? (appState.data.activeDay || (appState._getTodayDayCode ? appState._getTodayDayCode() : "Mon")) 
      : "Mon";
    const totals = (typeof appState !== "undefined") ? appState.getTodayTotals() : { calories: 0 };

    const data = weekData || days.map(d => {
      if (d === todayCode) {
        return { day: d, cals: totals.calories, isToday: true };
      }
      const hist = (typeof appState !== "undefined" && appState.data.weekCalorieHistory) 
        ? (appState.data.weekCalorieHistory[d] || 0) : 0;
      return { day: d, cals: hist, isToday: false };
    });

    const padding = { top: 30, right: 20, bottom: 35, left: 48 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const maxVal = Math.max(2000, targetCalories * 1.25, ...data.map(d => d.cals));

    ctx.clearRect(0, 0, width, height);

    // 1. Grid Lines
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const yVal = (maxVal / 4) * i;
      const yPos = padding.top + chartHeight - (yVal / maxVal) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, yPos);
      ctx.lineTo(width - padding.right, yPos);
      ctx.stroke();

      // Label
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(Math.round(yVal), padding.left - 8, yPos + 4);
    }

    // 2. Target Calorie Dashed Line
    const targetY = padding.top + chartHeight - (targetCalories / maxVal) * chartHeight;
    ctx.save();
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, targetY);
    ctx.lineTo(width - padding.right, targetY);
    ctx.stroke();

    // Target label badge
    ctx.fillStyle = "#047857";
    ctx.font = "bold 10px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`Target ${targetCalories} kcal`, width - padding.right, targetY - 6);
    ctx.restore();

    // 3. Bars
    const barWidth = Math.min(36, (chartWidth / data.length) * 0.55);
    const step = chartWidth / data.length;

    data.forEach((item, i) => {
      const x = padding.left + i * step + (step - barWidth) / 2;
      const barH = (item.cals / maxVal) * chartHeight;
      const y = padding.top + chartHeight - barH;

      // Bar gradient (amber if over target, green if under)
      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      if (item.cals > targetCalories + 100) {
        grad.addColorStop(0, "#f59e0b");
        grad.addColorStop(1, "#fbbf24");
      } else {
        grad.addColorStop(0, "#10b981");
        grad.addColorStop(1, "#34d399");
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      // Rounded top bar
      const radius = 5;
      ctx.moveTo(x, y + barH);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, y + barH);
      ctx.closePath();
      ctx.fill();

      // Day label
      ctx.fillStyle = "#64748b";
      ctx.font = "600 12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(item.day, x + barWidth / 2, height - 12);
    });
  },

  /**
   * Macronutrient Donut Chart
   */
  renderMacroDonut(canvasId, proteinG = 150, carbsG = 200, fatsG = 60) {
    const canvas = document.getElementById(canvasId);
    const setup = this.setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;

    ctx.clearRect(0, 0, width, height);

    const proteinCals = proteinG * 4;
    const carbsCals = carbsG * 4;
    const fatsCals = fatsG * 9;
    const totalCals = proteinCals + carbsCals + fatsCals;

    const centerX = width / 2;
    const centerY = height / 2;
    const outerRadius = Math.min(centerX, centerY) - 14;
    const innerRadius = outerRadius * 0.68;

    if (totalCals === 0) {
      // Empty state: draw grey ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, innerRadius, Math.PI * 2, 0, true);
      ctx.closePath();
      ctx.fillStyle = "#f1f5f9";
      ctx.fill();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "500 12px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No food logged", centerX, centerY);
      return;
    }

    const segments = [
      { name: "Protein", val: proteinCals, color: "#0284c7" },
      { name: "Carbs", val: carbsCals, color: "#f59e0b" },
      { name: "Fats", val: fatsCals, color: "#f43f5e" }
    ];

    let startAngle = -Math.PI / 2;
    segments.forEach(seg => {
      if (seg.val <= 0) return;
      const sliceAngle = (seg.val / totalCals) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();

      startAngle = endAngle;
    });

    // Center text
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 20px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`${totalCals}`, centerX, centerY - 6);

    ctx.fillStyle = "#64748b";
    ctx.font = "500 11px Inter, sans-serif";
    ctx.fillText("kcal logged", centerX, centerY + 14);
  },

  /**
   * Weight Progress Curve Chart
   * Fixed: handles single-point history (no division by zero on length-1)
   */
  renderWeightProgress(canvasId, weightHistory, targetWeight = 71.0) {
    const canvas = document.getElementById(canvasId);
    const setup = this.setupCanvas(canvas);
    if (!setup) return;
    const { ctx, width, height } = setup;

    ctx.clearRect(0, 0, width, height);

    if (!weightHistory || weightHistory.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "14px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No weight data yet. Log your first entry!", width / 2, height / 2);
      return;
    }

    const padding = { top: 25, right: 30, bottom: 35, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const weights = weightHistory.map(w => w.weight);
    const minW = Math.floor(Math.min(...weights, targetWeight) - 1);
    const maxW = Math.ceil(Math.max(...weights) + 1);
    const range = maxW - minW || 1; // Avoid division by zero if all weights equal

    // 1. Grid
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const val = minW + (range / steps) * i;
      const y = padding.top + chartHeight - ((val - minW) / range) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${val.toFixed(1)}`, padding.left - 6, y + 4);
    }

    // 2. Target Goal Line
    const targetY = padding.top + chartHeight - ((targetWeight - minW) / range) * chartHeight;
    ctx.save();
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, targetY);
    ctx.lineTo(width - padding.right, targetY);
    ctx.stroke();
    ctx.fillStyle = "#047857";
    ctx.font = "600 10px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`Goal: ${targetWeight} kg`, width - padding.right, targetY - 6);
    ctx.restore();

    // 3. Points & Curve
    // FIXED: if only 1 point, place it in center to avoid x = Infinity
    const getX = (i) => {
      if (weightHistory.length === 1) return padding.left + chartWidth / 2;
      return padding.left + (chartWidth / (weightHistory.length - 1)) * i;
    };

    const points = weightHistory.map((item, i) => ({
      x: getX(i),
      y: padding.top + chartHeight - ((item.weight - minW) / range) * chartHeight,
      ...item
    }));

    // Gradient fill beneath curve
    const areaGrad = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    areaGrad.addColorStop(0, "rgba(16, 185, 129, 0.25)");
    areaGrad.addColorStop(1, "rgba(16, 185, 129, 0.0)");

    if (points.length === 1) {
      // Single point: just draw a dot
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#10b981";
      ctx.fill();
    } else {
      // Area fill
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cx = (prev.x + curr.x) / 2;
        ctx.bezierCurveTo(cx, prev.y, cx, curr.y, curr.x, curr.y);
      }
      ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
      ctx.lineTo(points[0].x, height - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = areaGrad;
      ctx.fill();

      // Stroke line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const cx = (prev.x + curr.x) / 2;
        ctx.bezierCurveTo(cx, prev.y, cx, curr.y, curr.x, curr.y);
      }
      ctx.strokeStyle = "#059669";
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.stroke();
    }

    // Draw point dots & dates (only show every Nth label if too many points)
    const showEvery = Math.ceil(points.length / 6);
    points.forEach((pt, i) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#059669";
      ctx.stroke();

      // Date label (skip to avoid crowding)
      if (i % showEvery === 0 || i === points.length - 1) {
        ctx.fillStyle = "#64748b";
        ctx.font = "600 10px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(pt.date, pt.x, height - 12);
      }
    });
  }
};
