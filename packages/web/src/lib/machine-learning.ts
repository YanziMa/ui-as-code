/**
 * Machine Learning utilities for browser environments: linear algebra,
 * neural network (forward pass), common algorithms (k-means, k-NN, PCA),
 * regression, classification, clustering, feature engineering, metrics.
 */

// --- Linear Algebra ---

export class Matrix {
  data: number[][];
  rows: number;
  cols: number;

  constructor(data?: number[][] | number[]) {
    if (!data) { this.data = [[]]; this.rows = 0; this.cols = 0; return; }
    if (Array.isArray(data[0])) {
      this.data = data as number[][];
      this.rows = data.length;
      this.cols = (data[0] as number[]).length;
    } else {
      const arr = data as number[];
      this.rows = arr.length;
      this.cols = 1;
      this.data = arr.map((v) => [v]);
    }
  }

  static zeros(rows: number, cols: number): Matrix {
    return new Matrix(Array.from({ length: rows }, () => Array(cols).fill(0)));
  }

  static ones(rows: number, cols: number): Matrix {
    return new Matrix(Array.from({ length: rows }, () => Array(cols).fill(1)));
  }

  static identity(n: number): Matrix {
    const m = Matrix.zeros(n, n);
    for (let i = 0; i < n; i++) m.data[i][i] = 1;
    return m;
  }

  static random(rows: number, cols: number, scale = 1): Matrix {
    return new Matrix(Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => (Math.random() * 2 - 1) * scale),
    ));
  }

  get(r: number, c: number): number { return this.data[r][c]; }
  set(r: number, c: number, v: number): void { this.data[r][c] = v; }

  clone(): Matrix { return new Matrix(this.data.map((r) => [...r])); }

  transpose(): Matrix {
    const result = Matrix.zeros(this.cols, this.rows);
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) result.data[c][r] = this.data[r][c];
    return result;
  }

  add(other: Matrix | number): Matrix {
    if (typeof other === "number") {
      return new Matrix(this.data.map((r) => r.map((v) => v + other)));
    }
    return new Matrix(this.data.map((r, ri) => r.map((v, ci) => v + other.data[ri][ci])));
  }

  sub(other: Matrix | number): Matrix {
    if (typeof other === "number") return this.add(-other);
    return new Matrix(this.data.map((r, ri) => r.map((v, ci) => v - other.data[ri][ci])));
  }

  mul(other: Matrix | number): Matrix {
    if (typeof other === "number") {
      return new Matrix(this.data.map((r) => r.map((v) => v * other)));
    }
    // Matrix multiplication
    if (this.cols !== other.rows) throw new Error(`Dimension mismatch: ${this.cols} != ${other.rows}`);
    const result = Matrix.zeros(this.rows, other.cols);
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < other.cols; c++)
        for (let k = 0; k < this.cols; k++)
          result.data[r][c] += this.data[r][k] * other.data[k][c];
    return result;
  }

  hadamard(other: Matrix): Matrix {
    return new Matrix(this.data.map((r, ri) => r.map((v, ci) => v * other.data[ri][ci])));
  }

  sum(axis?: "row" | "col"): Matrix | number {
    if (!axis) return this.data.flat().reduce((a, b) => a + b, 0);
    if (axis === "row") return new Matrix(this.data.map((r) => [r.reduce((a, b) => a + b, 0)]));
    const result = Array(this.cols).fill(0);
    for (const r of this.data) for (let c = 0; c < this.cols; c++) result[c] += r[c];
    return new Matrix([result]);
  }

  mean(): number { return (this.sum() as number) / (this.rows * this.cols); }

  max(): number { return Math.max(...this.data.flat()); }
  min(): number { return Math.min(...this.data.flat()); }

  apply(fn: (v: number) => number): Matrix {
    return new Matrix(this.data.map((r) => r.map(fn)));
  }

  mapRows(fn: (row: number[], idx: number) => number[]): Matrix {
    return new Matrix(this.data.map(fn));
  }

  toString(): string { return `Matrix(${this.rows}x${this.cols})`; }

  toArray(): number[][] { return this.data; }
  toFlatArray(): number[] { return this.data.flat(); }
}

// Vector operations
export function dot(a: number[], b: number[]): number {
  return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
}

export function norm(v: number[]): number {
  return Math.sqrt(dot(v, v));
}

export function normalize(v: number[]): number[] {
  const n = norm(v);
  return n === 0 ? [...v] : v.map((x) => x / n);
}

export function euclideanDist(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

export function manhattanDist(a: number[], b: number[]): number {
  return a.reduce((sum, ai, i) => sum + Math.abs(ai - b[i]), 0);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  return dot(a, b) / (norm(a) * norm(b) + 1e-10);
}

// --- Activation Functions ---

export interface ActivationFn {
  fn: (x: number) => number;
  derivative: (x: number) => number;
}

export const activations: Record<string, ActivationFn> = {
  sigmoid: { fn: (x) => 1 / (1 + Math.exp(-x)), derivative: (x) => { const s = 1 / (1 + Math.exp(-x)); return s * (1 - s); } },
  tanh: { fn: Math.tanh, derivative: (x) => 1 - Math.tanh(x) ** 2 },
  relu: { fn: (x) => Math.max(0, x), derivative: (x) => x > 0 ? 1 : 0 },
  leakyRelu: { fn: (x) => x > 0 ? x : 0.01 * x, derivative: (x) => x > 0 ? 1 : 0.01 },
  elu: { fn: (x) => x > 0 ? x : Math.exp(x) - 1, derivative: (x) => x > 0 ? 1 : Math.exp(x) },
  swish: { fn: (x) => x / (1 + Math.exp(-x)), derivative: (x) => { const s = 1 / (1 + Math.exp(-x)); return s + x * s * (1 - s); } },
  gelu: { fn: (x) => x * 0.5 * (1 + erf(x / Math.SQRT2)), derivative: (x) => { const p = pdfNormal(x); return 0.5 * (1 + erf(x / Math.SQRT2)) + x * p; } },
  softmax: { fn: (x) => { throw new Error("Use softmax() function"); }, derivative: (_x) => 0 },
  linear: { fn: (x) => x, derivative: () => 1 },
};

function erf(x: number): number {
  // Approximation of error function
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function pdfNormal(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

/** Softmax over an array */
export function softmax(arr: number[]): number[] {
  const max = Math.max(...arr);
  const exps = arr.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/** Log-softmax (numerically stable) */
export function logSoftmax(arr: number[]): number[] {
  const max = Math.max(...arr);
  const logSumExp = Math.log(arr.reduce((s, v) => s + Math.exp(v - max), 0)) + max;
  return arr.map((v) => v - logSumExp);
}

// --- Loss Functions ---

export interface LossFn {
  fn(predicted: number[], actual: number[]): number;
  derivative(predicted: number, actual: number): number;
}

export const losses: Record<string, LossFn> = {
  mse: {
    fn: (p, a) => p.reduce((s, pi, i) => s + (pi - a[i]) ** 2, 0) / p.length,
    derivative: (p, a) => 2 * (p - a) / p.length,
  },
  mae: {
    fn: (p, a) => p.reduce((s, pi, i) => s + Math.abs(pi - a[i]), 0) / p.length,
    derivative: (p, a) => p > a ? 1 : -1,
  },
  crossEntropy: {
    fn: (p, a) => -a.reduce((s, ai, i) => s + ai * Math.log(p[i] + 1e-15), 0),
    derivative: (p, a) => -a / (p + 1e-15),
  },
  hinge: {
    fn: (p, a) => p.reduce((s, pi, i) => s + Math.max(0, 1 - ai * pi), 0),
    derivative: (p, a) => a * p < 1 ? -a : 0,
  },
};

// --- Neural Network (Simple Feedforward) ---

export interface LayerConfig {
  inputSize: number;
  outputSize: number;
  activation?: string;
  useBias?: boolean;
  weights?: Matrix;
  bias?: Matrix;
}

export interface TrainingConfig {
  learningRate: number;
  epochs: number;
  batchSize?: number;
  loss?: string;
  optimizer?: "sgd" | "momentum" | "adam";
  momentum?: number;
  beta1?: number;
  beta2?: number;
  epsilon?: number;
  verbose?: boolean;
  onEpoch?: (epoch: number, loss: number) => void;
}

export class NeuralNetwork {
  layers: LayerConfig[];
  private weights: Matrix[];
  private biases: Matrix[];

  constructor(layerSizes: number[], activation = "relu", outputActivation = "softmax") {
    this.layers = [];
    this.weights = [];
    this.biases = [];

    for (let i = 0; i < layerSizes.length - 1; i++) {
      const act = i === layerSizes.length - 2 ? outputActivation : activation;
      const config: LayerConfig = {
        inputSize: layerSizes[i],
        outputSize: layerSizes[i + 1],
        activation: act,
        useBias: true,
      };
      // Xavier initialization
      const scale = Math.sqrt(2 / config.inputSize);
      config.weights = Matrix.random(config.outputSize, config.inputSize, scale);
      config.bias = Matrix.zeros(config.outputSize, 1);
      this.layers.push(config);
      this.weights.push(config.weights!);
      this.biases.push(config.bias!);
    }
  }

  /** Forward pass: returns output and all intermediate values (for backprop) */
  forward(input: number[]): { output: number[]; cache: Array<{ z: number[]; a: number[] }> } {
    let current = input;
    const cache: Array<{ z: number[]; a: number[] }> = [];

    for (let l = 0; l < this.layers.length; l++) {
      const layer = this.layers[l];
      const w = this.weights[l];
      const b = this.biases[l];
      // z = W * a + b
      const zArr: number[] = [];
      for (let j = 0; j < layer!.outputSize; j++) {
        let sum = b.get(j, 0);
        for (let i = 0; i < layer!.inputSize; i++) sum += current[i] * w.get(j, i);
        zArr[j] = sum;
      }
      // Apply activation
      const act = activations[layer!.activation ?? "relu"];
      const activated = zArr.map((z) => act.fn(z));
      cache.push({ z: zArr, a: current });
      current = activated;
    }

    return { output: current, cache };
  }

  /** Predict (forward only) */
  predict(input: number[]): number[] {
    return this.forward(input).output;
  }

  /** Predict class index (argmax) */
  predictClass(input: number[]): number {
    const out = this.predict(input);
    return out.indexOf(Math.max(...out));
  }

  /** Train with backpropagation */
  train(X: number[][], y: number[][], config: TrainingConfig): { losses: number[]; accuracies: number[] } {
    const { learningRate, epochs, loss = "mse", optimizer = "sgd", momentum = 0.9, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8, verbose = false, onEpoch } = config;
    const lossFn = losses[loss];
    const batchSize = config.batchSize ?? X.length;
    const losses: number[] = [];
    const accuracies: number[] = [];

    // Adam optimizer state
    const mw = this.weights.map(() => this.weights[0].clone());
    const mb = this.biases.map(() => this.biases[0].clone());
    const vw = this.weights.map(() => this.weights[0].clone());
    const vb = this.biases.map(() => this.biases[0].clone());
    let velocityW = optimizer === "momentum" ? this.weights.map(() => this.weights[0].clone()) : [];
    let velocityB = optimizer === "momentum" ? this.biases.map(() => this.biases[0].clone()) : [];

    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalLoss = 0;
      let correct = 0;

      // Shuffle
      const indices = Array.from({ length: X.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      for (let batchStart = 0; batchStart < X.length; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, X.length);
        const gradWeights = this.weights.map(() => Matrix.zeros(this.weights[0].rows, this.weights[0].cols));
        const gradBiases = this.biases.map(() => Matrix.zeros(this.biases[0].rows, this.biases[0].cols));

        for (let i = batchStart; i < batchEnd; i++) {
          const idx = indices[i];
          const { output, cache } = this.forward(X[idx]);
          totalLoss += lossFn.fn(output, y[idx]);
          if (output.indexOf(Math.max(...output)) === y[idx].indexOf(Math.max(...y[idx]))) correct++;

          // Backpropagation
          let delta: number[] = output.map((oj, j) => lossFn.derivative(oj, y[idx][j]));
          // Output layer activation derivative
          const outAct = activations[this.layers[this.layers.length - 1]?.activation ?? "linear"];
          if (outAct.derivative !== undefined && this.layers[this.layers.length - 1]?.activation !== "softmax") {
            delta = delta.map((d, j) => d * outAct.derivative(cache[cache.length - 1]?.z[j] ?? 0));
          } else if (this.layers[this.layers.length - 1]?.activation === "softmax") {
            // Softmax + cross-entropy gradient simplifies to (output - target)
            delta = output.map((oj, j) => oj - y[idx][j]);
          }

          for (let l = this.layers.length - 1; l >= 0; l--) {
            const c = cache[l];
            // Gradients for weights and bias
            for (let j = 0; j < this.layers[l].outputSize; j++) {
              for (let k = 0; k < this.layers[l].inputSize; k++) {
                gradWeights[l].set(j, k, gradWeights[l].get(j, k) + delta[j] * c.a[k]);
              }
              gradBiases[l].set(j, 0, gradBiases[l].get(j, 0) + delta[j]);
            }
            // Propagate delta to previous layer
            if (l > 0) {
              const newDelta = new Array(this.layers[l - 1].outputSize).fill(0);
              const prevAct = activations[this.layers[l - 1]?.activation ?? "relu"];
              for (let k = 0; k < this.layers[l - 1].outputSize; k++) {
                let sum = 0;
                for (let j = 0; j < this.layers[l].outputSize; j++) {
                  sum += delta[j] * this.weights[l].get(j, k);
                }
                newDelta[k] = sum * prevAct.derivative(c.z[k]);
              }
              delta = newDelta;
            }
          }
        }

        // Normalize gradients by batch size
        const bs = batchEnd - batchStart;
        for (let l = 0; l < this.layers.length; l++) {
          gradWeights[l] = gradWeights[l].mul(1 / bs);
          gradBiases[l] = gradBiases[l].mul(1 / bs);

          // Update weights
          if (optimizer === "adam") {
            mw[l] = mw[l].mul(beta1).add(gradWeights[l].mul(1 - beta1));
            mb[l] = mb[l].mul(beta1).add(gradBiases[l].mul(1 - beta1));
            vw[l] = vw[l].mul(beta2).add(gradWeights[l].hadamard(gradWeights[l]).mul(1 - beta2));
            vb[l] = vb[l].mul(beta2).add(gradBiases[l].hadamard(gradBiases[l]).mul(1 - beta2));
            const mwHat = mw[l].mul(1 / (1 - beta1 ** (epoch + 1)));
            const mbHat = mb[l].mul(1 / (1 - beta1 ** (epoch + 1)));
            const vwHat = vw[l].mul(1 / (1 - beta2 ** (epoch + 1)));
            const vbHat = vb[l].mul(1 / (1 - beta2 ** (epoch + 1)));
            this.weights[l] = this.weights[l].sub(mwHat.mul(vwHat.apply((v) => Math.sqrt(v) + epsilon)).mul(learningRate));
            this.biases[l] = this.biases[l].sub(mbHat.mul(vbHat.apply((v) => Math.sqrt(v) + epsilon)).mul(learningRate));
          } else if (optimizer === "momentum") {
            velocityW[l] = velocityW[l].mul(momentum).sub(gradWeights[l].mul(learningRate));
            velocityB[l] = velocityB[l].mul(momentum).sub(gradBiases[l].mul(learningRate));
            this.weights[l] = this.weights[l].add(velocityW[l]);
            this.biases[l] = this.biases[l].add(velocityB[l]);
          } else {
            this.weights[l] = this.weights[l].sub(gradWeights[l].mul(learningRate));
            this.biases[l] = this.biases[l].sub(gradBiases[l].mul(learningRate));
          }
        }
      }

      const avgLoss = totalLoss / X.length;
      const accuracy = correct / X.length;
      losses.push(avgLoss);
      accuracies.push(accuracy);
      if (verbose || epoch % 10 === 0 || epoch === epochs - 1) {
        onEpoch?.(epoch, avgLoss);
      }
    }

    return { losses, accuracies };
  }

  /** Serialize model to JSON */
  serialize(): string {
    return JSON.stringify({
      layers: this.layers.map((l) => ({
        inputSize: l.inputSize, outputSize: l.outputSize, activation: l.activation,
      })),
      weights: this.weights.map((w) => w.toArray()),
      biases: this.biases.map((b) => b.toArray()),
    });
  }

  /** Deserialize from JSON */
  static deserialize(json: string): NeuralNetwork {
    const data = JSON.parse(json);
    const nn = new NeuralNetwork([]);
    nn.layers = data.layers;
    nn.weights = data.weights.map((w: number[][]) => new Matrix(w));
    nn.biases = data.biases.map((b: number[][]) => new Matrix(b));
    return nn;
  }
}

// --- K-Means Clustering ---

export interface ClusterResult {
  centroids: number[][];
  labels: number[];
  iterations: number;
  converged: boolean;
  inertia: number; // Sum of squared distances to nearest centroid
}

export function kMeans(data: number[][], k: number, maxIter = 100, seed?: number): ClusterResult {
  const rng = seed !== undefined ? seededRandom(seed) : Math.random;
  const n = data.length;
  const dim = data[0].length;

  // Initialize centroids using k-means++ for better convergence
  const centroids: number[][] = [];
  const firstIdx = Math.floor(rng() * n);
  centroids.push([...data[firstIdx]]);

  for (let c = 1; c < k; c++) {
    const distances = data.map((point) => {
      let minDist = Infinity;
      for (const cent of centroids) {
        const d = euclideanDist(point, cent);
        if (d < minDist) minDist = d;
      }
      return minDist * minDist; // Square for probability weighting
    });
    const total = distances.reduce((a, b) => a + b, 0);
    let rand = rng() * total;
    for (let i = 0; i < n; i++) {
      rand -= distances[i];
      if (rand <= 0) { centroids.push([...data[i]]); break; }
    }
    if (centroids.length <= c) centroids.push([...data[Math.floor(rng() * n)]]);
  }

  const labels = new Array(n).fill(0);
  let converged = false;

  for (let iter = 0; iter < maxIter; iter++) {
    // Assignment step
    let changed = false;
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < k; c++) {
        const d = euclideanDist(data[i], centroids[c]);
        if (d < minDist) { minDist = d; bestCluster = c; }
      }
      if (labels[i] !== bestCluster) { labels[i] = bestCluster; changed = true; }
    }
    if (!changed && iter > 0) { converged = true; break; }

    // Update step
    for (let c = 0; c < k; c++) {
      const members = data.filter((_, i) => labels[i] === c);
      if (members.length > 0) {
        for (let d = 0; d < dim; d++) {
          centroids[c][d] = members.reduce((s, pt) => s + pt[d], 0) / members.length;
        }
      }
    }
  }

  // Compute inertia
  let inertia = 0;
  for (let i = 0; i < n; i++) inertia += euclideanDist(data[i], centroids[labels[i]]) ** 2;

  return { centroids, labels, iterations: converged ? -1 : maxIter, converged, inertia };
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

// --- K-Nearest Neighbors ---

export class KNNClassifier {
  private data: number[][] = [];
  private labels: (string | number)[] = [];
  private k: number;
  private distanceMetric: "euclidean" | "manhattan" | "cosine";

  constructor(k = 3, metric: "euclidean" | "manhattan" | "cosine" = "euclidean") {
    this.k = k;
    this.distanceMetric = metric;
  }

  fit(X: number[][], y: (string | number)[]): this {
    this.data = X;
    this.labels = y;
    return this;
  }

  predict(point: number[]): string | number {
    const distances = this.data.map((d, i) => ({
      dist: this.distance(d, point),
      label: this.labels[i],
    }));
    distances.sort((a, b) => a.dist - b.dist);
    const neighbors = distances.slice(0, this.k);
    // Majority vote
    const votes: Record<string | number, number> = {};
    for (const n of neighbors) votes[n.label] = (votes[n.label] ?? 0) + 1;
    return Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
  }

  predictKNN(point: number[]): Array<{ label: string | number; dist: number }> {
    const distances = this.data.map((d, i) => ({
      dist: this.distance(d, point),
      label: this.labels[i],
    }));
    distances.sort((a, b) => a.dist - b.dist);
    return distances.slice(0, this.k);
  }

  private distance(a: number[], b: number[]): number {
    switch (this.distanceMetric) {
      case "euclidean": return euclideanDist(a, b);
      case "manhattan": return manhattanDist(a, b);
      case "cosine": return 1 - cosineSimilarity(a, b);
    }
  }
}

// --- Principal Component Analysis (PCA) ---

export interface PCAResult {
  components: Matrix;       // Principal component vectors (columns)
  explainedVariance: number[];
  cumulativeVariance: number[];
  mean: number[];
  projected: number[][];   // Data projected onto principal components
  nComponents: number;
}

export function pca(data: number[][], nComponents?: number): PCAResult {
  const n = data.length;
  const dim = data[0].length;
  const nc = nComponents ?? dim;

  // Center the data
  const mean = new Array(dim).fill(0);
  for (const row of data) for (let d = 0; d < dim; d++) mean[d] += row[d];
  for (let d = 0; d < dim; d++) mean[d] /= n;

  const centered = data.map((row) => row.map((v, d) => v - mean[d]));

  // Compute covariance matrix
  const cov = Matrix.zeros(dim, dim);
  for (const row of centered) {
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        cov.set(i, j, cov.get(i, j) + row[i] * row[j]);
      }
    }
  }
  // Divide by n-1 for sample covariance
  for (let i = 0; i < dim; i++)
    for (let j = 0; j < dim; j++)
      cov.set(i, j, cov.get(i, j) / (n - 1));

  // Eigen decomposition via power iteration (simplified)
  const eigenResult = powerIterationEigen(cov, nc);

  // Project data onto principal components
  const projected = centered.map((row) => {
    return eigenResult.vectors.map((vec) => dot(row, vec));
  });

  // Explained variance
  const totalVar = eigenResult.values.reduce((a, b) => a + b, 0);
  const explainedVariance = eigenResult.values.map((v) => v / totalVar);
  const cumVariance: number[] = [];
  let cum = 0;
  for (const ev of explainedVariance) { cum += ev; cumVariance.push(cum); }

  return {
    components: new Matrix(eigenResult.vectors),
    explainedVariance,
    cumulativeVariance: cumVariance,
    mean,
    projected,
    nComponents: nc,
  };
}

interface EigenResult { values: number[]; vectors: number[][]; }

function powerIterationEigen(matrix: Matrix, count: number): EigenResult {
  const dim = matrix.rows;
  const values: number[] = [];
  const vectors: number[][] = [];
  let remaining = matrix.clone();

  for (let c = 0; c < Math.min(count, dim); c++) {
    // Power iteration
    let vec = Array(dim).fill(0).map(() => Math.random() - 0.5);
    vec = normalize(vec);
    for (let iter = 0; iter < 100; iter++) {
      const newVec: number[] = [];
      for (let i = 0; i < dim; i++) {
        let sum = 0;
        for (let j = 0; j < dim; j++) sum += remaining.get(i, j) * vec[j];
        newVec[i] = sum;
      }
      vec = normalize(newVec);
    }
    // Eigenvalue = Rayleigh quotient
    let eigenvalue = 0;
    for (let i = 0; i < dim; i++) {
      let sum = 0;
      for (let j = 0; j < dim; j++) sum += remaining.get(i, j) * vec[j];
      eigenvalue += vec[i] * sum;
    }
    values.push(eigenvalue);
    vectors.push([...vec]);

    // Deflate: remove this eigenvector's contribution
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        remaining.set(i, j, remaining.get(i, j) - eigenvalue * vec[i] * vec[j]);
      }
    }
  }

  return { values, vectors };
}

// --- Linear Regression ---

export interface RegressionResult {
  coefficients: number[];
  intercept: number;
  predictions: number[];
  rSquared: number;
  rmse: number;
  residuals: number[];
}

export function linearRegression(X: number[][], y: number[]): RegressionResult {
  const n = X.length;
  const features = X[0].length;

  // Add intercept column
  const Xb = X.map((row) => [1, ...row]);

  // Normal equation: (X'X)^(-1)X'y
  const Xt = new Matrix(Xb).transpose();
  const XtX = Xt.mul(new Matrix(Xb));
  const Xty = Xt.mul(new Matrix(y));

  try {
    const XtXInv = matrixInverse(XtX);
    const beta = XtXInv.mul(Xty);
    const coeffs = beta.toFlatArray();

    const predictions = Xb.map((row) => dot(row, coeffs));
    const ssRes = y.reduce((s, yi, i) => s + (yi - predictions[i]) ** 2, 0);
    const ssTot = y.reduce((s, yi) => s + (yi - y.reduce((a, b) => a + b, 0) / n) ** 2, 0);

    return {
      coefficients: coeffs.slice(1),
      intercept: coeffs[0],
      predictions,
      rSquared: 1 - ssRes / ssTot,
      rmse: Math.sqrt(ssRes / n),
      residuals: y.map((yi, i) => yi - predictions[i]),
    };
  } catch {
    // Fallback: simple gradient descent
    return gdLinearRegression(X, y);
  }
}

function gdLinearRegression(X: number[][], y: number[]): RegressionResult {
  const n = X.length;
  const f = X[0].length;
  let weights = Array(f).fill(0).map(() => Math.random() * 0.01);
  let bias = 0;
  const lr = 0.001;

  for (let epoch = 0; epoch < 500; epoch++) {
    const preds = X.map((row) => dot(row, weights) + bias);
    const errors = preds.map((p, i) => p - y[i]);
    for (let j = 0; j < f; j++) {
      const grad = errors.reduce((s, e, i) => s + e * X[i][j], 0) / n;
      weights[j] -= lr * grad;
    }
    bias -= lr * errors.reduce((s, e) => s + e, 0) / n;
  }

  const predictions = X.map((row) => dot(row, weights) + bias);
  const ssRes = y.reduce((s, yi, i) => s + (yi - predictions[i]) ** 2, 0);
  return { coefficients: weights, intercept: bias, predictions, rSquared: 0, rmse: Math.sqrt(ssRes / n), residuals: y.map((yi, i) => yi - predictions[i]) };
}

function matrixInverse(m: Matrix): Matrix {
  const n = m.rows;
  const aug = m.toArray().map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => (i === j ? 1 : 0))]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-10) throw new Error("Singular matrix");
    const pivot = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }

  return new Matrix(aug.map((row) => row.slice(n)));
}

// --- Metrics ---

export function accuracy(yTrue: (number | string)[], yPred: (number | string)[]): number {
  return yTrue.filter((yt, i) => yt === yPred[i]).length / yTrue.length;
}

export function precisionScore(yTrue: (number | string)[], yPred: (number | string)[], positiveClass?: number | string): number {
  const pc = positiveClass ?? yTrue[0];
  let tp = 0, fp = 0;
  for (let i = 0; i < yTrue.length; i++) {
    if (yPred[i] === pc) { if (yTrue[i] === pc) tp++; else fp++; }
  }
  return tp + fp === 0 ? 0 : tp / (tp + fp);
}

export function recallScore(yTrue: (number | string)[], yPred: (number | string)[], positiveClass?: number | string): number {
  const pc = positiveClass ?? yTrue[0];
  let tp = 0, fn = 0;
  for (let i = 0; i < yTrue.length; i++) {
    if (yTrue[i] === pc) { if (yPred[i] === pc) tp++; else fn++; }
  }
  return tp + fn === 0 ? 0 : tp / (tp + fn);
}

export function f1Score(yTrue: (number | string)[], yPred: (number | string)[], posClass?: number | string): number {
  const p = precisionScore(yTrue, yPred, posClass);
  const r = recallScore(yTrue, yPred, posClass);
  return p + r === 0 ? 0 : 2 * p * r / (p + r);
}

export function confusionMatrix(yTrue: (number | string)[], yPred: (number | string)[]): Map<string, Map<string, number>> {
  const classes = [...new Set([...yTrue, ...yPred])];
  const matrix = new Map<string, Map<string, number>>();
  for (const c of classes) matrix.set(c, new Map(classes.map((cc) => [cc, 0])));
  for (let i = 0; i < yTrue.length; i++) {
    matrix.get(yTrue[i])?.set(yPred[i], (matrix.get(yTrue[i])?.get(yPred[i]) ?? 0) + 1);
  }
  return matrix;
}

// --- Feature Engineering ---

export function standardize(data: number[][]): { transformed: number[][]; mean: number[]; std: number[] } {
  const dim = data[0].length;
  const mean = new Array(dim).fill(0);
  const std = new Array(dim).fill(0);

  for (const row of data) for (let d = 0; d < dim; d++) mean[d] += row[d];
  for (let d = 0; d < dim; d++) mean[d] /= data.length;

  for (const row of data) for (let d = 0; d < dim; d++) std[d] += (row[d] - mean[d]) ** 2;
  for (let d = 0; d < dim; d++) std[d] = Math.sqrt(std[d] / data.length) || 1;

  return { transformed: data.map((row) => row.map((v, d) => (v - mean[d]) / std[d])), mean, std };
}

export function normalizeData(data: number[][]): { transformed: number[][]; min: number[]; max: number[] } {
  const dim = data[0].length;
  const mins = new Array(dim).fill(Infinity);
  const maxs = new Array(dim).fill(-Infinity);

  for (const row of data) for (let d = 0; d < dim; d++) {
    if (row[d] < mins[d]) mins[d] = row[d];
    if (row[d] > maxs[d]) maxs[d] = row[d];
  }

  return {
    transformed: data.map((row) => row.map((v, d) => {
      const range = maxs[d] - mins[d];
      return range === 0 ? 0 : (v - mins[d]) / range;
    })),
    min: mins,
    max: maxs,
  };
}

export function oneHotEncode(values: (string | number)[]): number[][] {
  const unique = [...new Set(values)];
  const map = new Map(unique.map((v, i) => [v, i]));
  return values.map((v) => {
    const arr = new Array(unique.length).fill(0);
    arr[map.get(v)!] = 1;
    return arr;
  });
}

export function binarize(values: number[], threshold = 0.5): number[] {
  return values.map((v) => v >= threshold ? 1 : 0);
}

export function polynomialFeatures(degree: number): (features: number[]) => number[] {
  return (features: number[]) => {
    const result = [1]; // Bias term
    for (let d = 1; d <= degree; d++) {
      generateCombinations(features, d, 0, [], (combo) => {
        result.push(combo.reduce((a, b) => a * b, 1));
      });
    }
    return result;
  };
}

function generateCombinations(arr: number[], r: number, start: number, current: number[], callback: (combo: number[]) => void): void {
  if (current.length === r) { callback(current); return; }
  for (let i = start; i < arr.length; i++) {
    generateCombinations(arr, r, i, [...current, arr[i]], callback);
  }
}
