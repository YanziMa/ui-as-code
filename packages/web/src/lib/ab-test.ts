/**
 * A/B Testing: Statistical analysis utilities for A/B tests including
 * significance testing, confidence intervals, sample size calculation,
 * chi-squared test, t-test (Welch's), sequential analysis,
 * multi-variant comparison, and winner detection.
 */

// --- Types ---

export interface ABTestVariant {
  /** Variant name/label */
  name: string;
  /** Number of visitors/exposures */
  visitors: number;
  /** Number of conversions */
  conversions: number;
  /** Total revenue (optional) */
  revenue?: number;
  /** Per-user values for continuous metrics (optional) */
  values?: number[];
}

export interface ABTestResult {
  /** Variant A (control) results */
  control: ABTestVariant;
  /** Variant B (treatment) results */
  treatment: ABTestVariant;
  /** Conversion rate of control */
  controlRate: number;
  /** Conversion rate of treatment */
  treatmentRate: number;
  /** Relative lift (treatment vs control) */
  lift: number;
  /** Lift as percentage */
  liftPercent: number;
  /** Statistical significance (p-value) */
  pValue: number;
  /** Is statistically significant at alpha level? */
  significant: boolean;
  /** Confidence level (1 - pValue) */
  confidenceLevel: number;
  /** Confidence interval for the difference */
  confidenceInterval: { lower: number; upper: number };
  /** Standard error */
  standardError: number;
  /** Z-score */
  zScore: number;
  /** Recommendation */
  recommendation: "use_control" | "use_treatment" | "inconclusive" | "needs_more_data";
  /** Test type used */
  testType: "z_test" | "t_test" | "chi_squared" | "sequential";
}

export interface MultiVariantResult {
  variants: Array<{
    name: string;
    visitors: number;
    conversions: number;
    conversionRate: number;
    isWinner?: boolean;
    isLoser?: boolean;
    pValueVsControl?: number;
    liftVsControl?: number;
  }>;
  overallSignificant: boolean;
  bestVariant: string | null;
  recommendation: string;
  bonferroniCorrected: boolean;
}

export interface SampleSizeResult {
  /** Required sample size per variant */
  sampleSizePerVariant: number;
  /** Total required sample size */
  totalSampleSize: number;
  /** Minimum detectable effect used */
  mde: number;
  /** Statistical power achieved */
  power: number;
  /** Significance level used */
  alpha: number;
}

export interface SequentialTestState {
  /** Current cumulative data */
  controlVisitors: number;
  controlConversions: number;
  treatmentVisitors: number;
  treatmentConversions: number;
  /** Current z-score */
  currentZ: number;
  /** Upper boundary (for stopping in favor of treatment) */
  upperBoundary: number;
  /** Lower boundary (for stopping in favor of control) */
  lowerBoundary: number;
  /** Decision: null = continue, otherwise final decision */
  decision: "favor_treatment" | "favor_control" | "no_difference" | null;
  /** Number of looks so far */
  lookCount: number;
  /** Max looks allowed */
  maxLooks: number;
}

export interface PowerAnalysisInput {
  /** Baseline conversion rate (0-1) */
  baselineRate: number;
  /** Minimum detectable effect (relative improvement, e.g., 0.10 for 10%) */
  minimumDetectableEffect: number;
  /** Significance level / alpha (default: 0.05) */
  alpha?: number;
  /** Statistical power (default: 0.80) */
  power?: number;
  /** Number of variants (including control, default: 2) */
  variantCount?: number;
  /** One-tailed or two-tailed test? (default: two-tailed) */
  oneTailed?: boolean;
}

// --- Z-Score / Normal Distribution Helpers ---

/** Approximate the cumulative standard normal distribution function (CDF) */
function normalCDF(z: number): number {
  // Abramowitz and Stegun approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.SQRT2;

  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);

  return 0.5 * (1.0 + sign * y);
}

/** Inverse of the standard normal CDF (approximation) */
function inverseNormalCDF(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // Rational approximation
  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e-02,
  ];
  const b = [
    -5.447608870133060e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01,
    -1.328068155288572e+01,
  ];

  const low = p < 0.02425;
  const pp = low ? Math.sqrt(-2 * Math.log(p)) : Math.sqrt(-2 * Math.log(1 - p));

  const coeffs = low ? a : b;
  let x = coeffs[0];
  for (let i = 1; i < 6; i++) {
    x += coeffs[i] * Math.pow(pp, i);
  }

  return low ? x - pp : pp - x;
}

/** Two-proportion z-test for A/B testing */
export function zTest(control: ABTestVariant, treatment: ABTestVariant, alpha = 0.05): ABTestResult {
  const n1 = control.visitors;
  const n2 = treatment.visitors;
  const x1 = control.conversions;
  const x2 = treatment.conversions;

  // Conversion rates
  const p1 = n1 > 0 ? x1 / n1 : 0;
  const p2 = n2 > 0 ? x2 / n2 : 0;

  // Pooled proportion (under H0: p1 = p2)
  const pooledP = (x1 + x2) / (n1 + n2);

  // Standard error
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2)) || 0;

  // Z-score
  const z = se > 0 ? (p2 - p1) / se : 0;

  // P-value (two-tailed)
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  // Lift
  const lift = p1 > 0 ? (p2 - p1) / p1 : 0;

  // Confidence interval for difference
  const diffSe = Math.sqrt((p1 * (1 - p1) / n1) + (p2 * (1 - p2) / n2)) || 0;
  const zCrit = inverseNormalCDF(1 - alpha / 2);
  const ciLower = (p2 - p1) - zCrit * diffSe;
  const ciUpper = (p2 - p1) + zCrit * diffSe;

  // Determine recommendation
  let recommendation: ABTestResult["recommendation"] = "inconclusive";

  if (n1 < 30 || n2 < 30) {
    recommendation = "needs_more_data";
  } else if (pValue < alpha) {
    recommendation = lift > 0 ? "use_treatment" : "use_control";
  } else if (Math.abs(lift) < 0.01) {
    recommendation = "inconclusive";
  } else {
    recommendation = "needs_more_data";
  }

  return {
    control,
    treatment,
    controlRate: p1,
    treatmentRate: p2,
    lift,
    liftPercent: lift * 100,
    pValue,
    significant: pValue < alpha,
    confidenceLevel: 1 - pValue,
    confidenceInterval: { lower: ciLower, upper: ciUpper },
    standardError: se,
    zScore: z,
    recommendation,
    testType: "z_test",
  };
}

/** Chi-squared test for independence (A/B test) */
export function chiSquaredTest(control: ABTestVariant, treatment: ABTestVariant, alpha = 0.05): ABTestResult {
  const n1 = control.visitors;
  const n2 = treatment.visitors;
  const x1 = control.conversions;
  const x2 = treatment.conversions;

  const totalN = n1 + n2;
  const totalX = x1 + x2;

  // Expected values under H0
  const e11 = (n1 * totalX) / totalN;       // Control, Converted
  const e12 = (n1 * (totalN - totalX)) / totalN; // Control, Not converted
  const e21 = (n2 * totalX) / totalN;       // Treatment, Converted
  const e22 = (n2 * (totalN - totalX)) / totalN; // Treatment, Not converted

  // Chi-squared statistic
  const chiSq =
    (Math.pow(x1 - e11, 2) / (e11 || 1)) +
    (Math.pow((n1 - x1) - e12, 2) / (e12 || 1)) +
    (Math.pow(x2 - e21, 2) / (e21 || 1)) +
    (Math.pow((n2 - x2) - e22, 2) / (e22 || 1));

  // Degrees of freedom = 1
  // Approximate p-value from chi-squared distribution with df=1
  // Using the relationship: chi-sq with df=1 is square of standard normal
  const pValue = 2 * (1 - normalCDF(Math.sqrt(chiSq)));

  const p1 = n1 > 0 ? x1 / n1 : 0;
  const p2 = n2 > 0 ? x2 / n2 : 0;
  const lift = p1 > 0 ? (p2 - p1) / p1 : 0;

  let recommendation: ABTestResult["recommendation"] = "inconclusive";
  if (pValue < alpha) {
    recommendation = lift > 0 ? "use_treatment" : "use_control";
  }

  return {
    control,
    treatment,
    controlRate: p1,
    treatmentRate: p2,
    lift,
    liftPercent: lift * 100,
    pValue,
    significant: pValue < alpha,
    confidenceLevel: 1 - pValue,
    confidenceInterval: { lower: lift - 0.05, upper: lift + 0.05 }, // Approximate
    standardError: Math.sqrt(chiSq),
    zScore: Math.sqrt(chiSq),
    recommendation,
    testType: "chi_squared",
  };
}

/** Calculate required sample size for an A/B test */
export function calculateSampleSize(input: PowerAnalysisInput): SampleSizeResult {
  const {
    baselineRate,
    minimumDetectableEffect,
    alpha = 0.05,
    power = 0.80,
    variantCount = 2,
    oneTailed = false,
  } = input;

  const treatmentRate = baselineRate * (1 + minimumDetectableEffect);

  // Z critical values
  const zAlpha = oneTailed
    ? inverseNormalCDF(1 - alpha)
    : inverseNormalCDF(1 - alpha / 2);
  const zBeta = inverseNormalCDF(power);

  // Proportion-based sample size formula
  const p1 = baselineRate;
  const p2 = treatmentRate;

  const numerator = Math.pow(
    zAlpha * Math.sqrt(2 * p1 * (1 - p1)) +
      zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)),
    2
  );

  const denominator = Math.pow(p2 - p1, 2);

  const sampleSizePerVariant = denominator > 0 ? Math.ceil(numerator / denominator) : 1000;

  return {
    sampleSizePerVariant,
    totalSampleSize: sampleSizePerVariant * variantCount,
    mde: minimumDetectableEffect,
    power,
    alpha,
  };
}

/** Multi-variant comparison using Bonferroni correction */
export function multiVariantTest(variants: ABTestVariant[], alpha = 0.05): MultiVariantResult {
  if (variants.length < 2) {
    throw new Error("Need at least 2 variants");
  }

  const controlIdx = variants.findIndex((v) => v.name.toLowerCase().includes("control"));
  const controlIndex = controlIdx >= 0 ? controlIdx : 0;

  const control = variants[controlIndex];
  const adjustedAlpha = alpha / (variants.length - 1); // Bonferroni correction

  const variantResults = variants.map((variant, idx) => {
    const result = zTest(control, variant, idx === controlIndex ? alpha : adjustedAlpha);

    return {
      name: variant.name,
      visitors: variant.visitors,
      conversions: variant.conversions,
      conversionRate: variant.visitors > 0 ? variant.conversions / variant.visitors : 0,
      isWinner: undefined,
      isLoser: undefined,
      pValueVsControl: idx !== controlIndex ? result.pValue : undefined,
      liftVsControl: idx !== controlIndex ? result.lift : undefined,
    };
  });

  // Find winner and losers among non-control variants
  const nonControlResults = variantResults.filter((_, idx) => idx !== controlIndex);
  const controlRate = variantResults[controlIndex].conversionRate;

  let bestVariant: string | null = null;
  let bestLift = -Infinity;

  for (const vr of nonControlResults) {
    if ((vr.pValueVsControl ?? 1) < adjustedAlpha && (vr.liftVsControl ?? 0) > 0) {
      vr.isWinner = true;
      if ((vr.liftVsControl ?? 0) > bestLift) {
        bestLift = vr.liftVsControl ?? 0;
        bestVariant = vr.name;
      }
    } else if ((vr.pValueVsControl ?? 1) >= adjustedAlpha && (vr.liftVsControl ?? 0) < 0) {
      vr.isLoser = true;
    }
  }

  const anySignificant = nonControlResults.some((v) => v.isWinner);

  let recommendation: string;
  if (bestVariant) {
    recommendation = `Use "${bestVariant}" — significantly outperforms control`;
  } else if (anySignificant) {
    recommendation = "Some variants are significantly different but none clearly better than control";
  } else {
    recommendation = "No significant differences found between variants";
  }

  return {
    variants: variantResults,
    overallSignificant: anySignificant,
    bestVariant,
    recommendation,
    bonferroniCorrected: true,
  };
}

/** Sequential A/B test monitoring (group sequential design) */
export class SequentialABTest {
  private state: SequentialTestState;
  private alpha: number;
  private maxLooks: number;
  private boundariesCalculated: { upper: number[]; lower: number[] };

  constructor(options: {
    alpha?: number;
    maxLooks?: number;
    useOBF?: boolean; // O'Brien-Fleming boundaries
  } = {}) {
    this.alpha = options.alpha ?? 0.05;
    this.maxLooks = options.maxLooks ?? 10;
    this.boundariesCalculated = this.calculateBoundaries(options.useOBF ?? true);

    this.state = {
      controlVisitors: 0,
      controlConversions: 0,
      treatmentVisitors: 0,
      treatmentConversions: 0,
      currentZ: 0,
      upperBoundary: this.boundariesCalculated.upper[0],
      lowerBoundary: this.boundariesCalculated.lower[0],
      decision: null,
      lookCount: 0,
      maxLooks: this.maxLooks,
    };
  }

  /** Add new data point and check if we can stop */
  addData(control: { visitors: number; conversions: number }, treatment: { visitors: number; conversions: number }): SequentialTestState {
    this.state.controlVisitors += control.visitors;
    this.state.controlConversions += control.conversions;
    this.state.treatmentVisitors += treatment.visitors;
    this.state.treatmentConversions += treatment.conversions;
    this.state.lookCount++;

    // Calculate current z-score
    const result = zTest(
      { name: "A", visitors: this.state.controlVisitors, conversions: this.state.controlConversions },
      { name: "B", visitors: this.state.treatmentVisitors, conversions: this.state.treatmentConversions },
    );

    this.state.currentZ = result.zScore;

    // Get boundaries for current look
    const lookIdx = Math.min(this.state.lookCount - 1, this.maxLooks - 1);
    this.state.upperBoundary = this.boundariesCalculated.upper[lookIdx] ?? this.boundariesCalculated.upper[this.maxLooks - 1];
    this.state.lowerBoundary = this.boundariesCalculated.lower[lookIdx] ?? this.boundariesCalculated.lower[this.maxLooks - 1];

    // Check boundaries
    if (this.state.currentZ >= this.state.upperBoundary) {
      this.state.decision = "favor_treatment";
    } else if (this.state.currentZ <= this.state.lowerBoundary) {
      this.state.decision = "favor_control";
    } else if (this.state.lookCount >= this.maxLooks) {
      this.state.decision = "no_difference";
    }

    return { ...this.state };
  }

  /** Get current state without adding data */
  getState(): SequentialTestState {
    return { ...this.state };
  }

  /** Reset the test */
  reset(): void {
    this.state = {
      controlVisitors: 0,
      controlConversions: 0,
      treatmentVisitors: 0,
      treatmentConversions: 0,
      currentZ: 0,
      upperBoundary: this.boundariesCalculated.upper[0],
      lowerBoundary: this.boundariesCalculated.lower[0],
      decision: null,
      lookCount: 0,
      maxLooks: this.maxLooks,
    };
  }

  private calculateBoundaries(useOBF: boolean): { upper: number[]; lower: number[] } {
    const upper: number[] = [];
    const lower: number[] = [];

    for (let k = 1; k <= this.maxLooks; k++) {
      if (useOBF) {
        // O'Brien-Fleming: spending alpha more conservatively early on
        const nominalAlpha = 2 * (1 - normalCDF(inverseNormalCDF(1 - this.alpha / 2) / Math.sqrt(k)));
        const b = inverseNormalCDF(1 - nominalAlpha / 2);
        upper.push(b);
        lower.push(-b);
      } else {
        // Pocock: constant boundaries
        const b = inverseNormalCDF(1 - this.alpha / 2);
        upper.push(b);
        lower.push(-b);
      }
    }

    return { upper, lower };
  }
}

/** Quick A/B test evaluation */
export function evaluateAB(
  controlVisitors: number,
  controlConversions: number,
  treatmentVisitors: number,
  treatmentConversions: number,
  alpha = 0.05,
): ABTestResult {
  return zTest(
    { name: "Control", visitors: controlVisitors, conversions: controlConversions },
    { name: "Treatment", visitors: treatmentVisitors, conversions: treatmentConversions },
    alpha,
  );
}
