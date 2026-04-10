/**
 * 3D Graphics Engine: WebGL rendering, math primitives (Vec3/Mat4/Quaternion),
 * geometry generators, scene graph, camera, lighting, materials, textures,
 * shaders, picking/raycasting, animation, asset loading, post-processing.
 */

// --- Math Primitives ---

export class Vec3 {
  constructor(public x = 0, public y = 0, public z = 0) {}

  static zero() { return new Vec3(0, 0, 0); }
  static one() { return new Vec3(1, 1, 1); }
  static up() { return new Vec3(0, 1, 0); }
  static forward() { return new Vec3(0, 0, -1); }
  static right() { return new Vec3(1, 0, 0); }
  static fromArray(a: number[]) { return new Vec3(a[0] ?? 0, a[1] ?? 0, a[2] ?? 0); }

  clone(): Vec3 { return new Vec3(this.x, this.y, this.z); }

  add(v: Vec3): Vec3 { return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z); }
  sub(v: Vec3): Vec3 { return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z); }
  scale(s: number): Vec3 { return new Vec3(this.x * s, this.y * s, this.z * s); }
  mul(v: Vec3): Vec3 { return new Vec3(this.x * v.x, this.y * v.y, this.z * v.z); }
  div(v: Vec3): Vec3 { return new Vec3(this.x / v.x, this.y / v.y, this.z / v.z); }

  dot(v: Vec3): number { return this.x * v.x + this.y * v.y + this.z * v.z; }
  cross(v: Vec3): Vec3 {
    return new Vec3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  length(): number { return Math.sqrt(this.dot(this)); }
  lengthSq(): number { return this.dot(this); }

  normalize(): Vec3 {
    const len = this.length();
    return len > 0 ? this.scale(1 / len) : Vec3.zero();
  }

  negate(): Vec3 { return this.scale(-1); }

  lerp(v: Vec3, t: number): Vec3 {
    return new Vec3(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t,
      this.z + (v.z - this.z) * t
    );
  }

  reflect(normal: Vec3): Vec3 {
    const d = 2 * this.dot(normal);
    return this.sub(normal.scale(d));
  }

  distanceTo(v: Vec3): number { return this.sub(v).length(); }

  rotateX(angle: number): Vec3 {
    const c = Math.cos(angle), s = Math.sin(angle);
    return new Vec3(this.x, this.y * c - this.z * s, this.y * s + this.z * c);
  }
  rotateY(angle: number): Vec3 {
    const c = Math.cos(angle), s = Math.sin(angle);
    return new Vec3(this.x * c + this.z * s, this.y, -this.x * s + this.z * c);
  }
  rotateZ(angle: number): Vec3 {
    const c = Math.cos(angle), s = Math.sin(angle);
    return new Vec3(this.x * c - this.y * s, this.x * s + this.y * c, this.z);
  }

  toArray(): [number, number, number] { return [this.x, this.y, this.z]; }
  toFloat32(): Float32Array { return new Float32Array([this.x, this.y, this.z]); }

  eq(v: Vec3, eps = 1e-6): boolean {
    return Math.abs(this.x - v.x) < eps && Math.abs(this.y - v.y) < eps && Math.abs(this.z - v.z) < eps;
  }

  toString(): string { return `Vec3(${this.x.toFixed(3)}, ${this.y.toFixed(3)}, ${this.z.toFixed(3)})`; }
}

export class Mat4 {
  private data: Float32Array;

  constructor(data?: Float32Array | number[]) {
    this.data = new Float32Array(data ?? [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ]);
  }

  get m(): Float32Array { return this.data; }
  get(i: number): number { return this.data[i]!; }
  set(i: number, v: number): void { this.data[i] = v; }

  static identity(): Mat4 { return new Mat4(); }

  static multiply(a: Mat4, b: Mat4): Mat4 {
    const out = new Mat4();
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) sum += a.m[row + k * 4]! * b.m[k + col * 4]!;
        out.data[row + col * 4] = sum;
      }
    }
    return out;
  }

  multiply(other: Mat4): Mat4 { return Mat4.multiply(this, other); }

  static perspective(fovY: number, aspect: number, near: number, far: number): Mat4 {
    const f = 1 / Math.tan(fovY / 2);
    const nf = 1 / (near - far);
    return new Mat4([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0,
    ]);
  }

  static ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
    const lr = 1 / (left - right), bt = 1 / (bottom - top), nf = 1 / (near - far);
    return new Mat4([
      -2 * lr, 0, 0, 0,
      0, -2 * bt, 0, 0,
      0, 0, 2 * nf, 0,
      (left + right) * lr, (top + bottom) * bt, (far + near) * nf, 1,
    ]);
  }

  static lookAt(eye: Vec3, center: Vec3, up: Vec3): Mat4 {
    const z = eye.sub(center).normalize();
    const x = up.cross(z).normalize();
    const y = z.cross(x);

    return new Mat4([
      x.x, y.x, z.x, 0,
      x.y, y.y, z.y, 0,
      x.z, y.z, z.z, 0,
      -x.dot(eye), -y.dot(eye), -z.dot(eye), 1,
    ]);
  }

  translate(v: Vec3): Mat4 {
    const t = Mat4.identity();
    t.data[12] = v.x; t.data[13] = v.y; t.data[14] = v.z;
    return Mat4.multiply(this, t);
  }

  scale(v: Vec3): Mat4 {
    const s = Mat4.identity();
    s.data[0] = v.x; s.data[5] = v.y; s.data[10] = v.z;
    return Mat4.multiply(this, s);
  }

  rotateX(a: number): Mat4 {
    const c = Math.cos(a), s = Math.sin(a);
    const r = new Mat4([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]);
    return Mat4.multiply(this, r);
  }

  rotateY(a: number): Mat4 {
    const c = Math.cos(a), s = Math.sin(a);
    const r = new Mat4([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
    return Mat4.multiply(this, r);
  }

  rotateZ(a: number): Mat4 {
    const c = Math.cos(a), s = Math.sin(a);
    const r = new Mat4([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    return Mat4.multiply(this, r);
  }

  transpose(): Mat4 {
    const t = new Mat4();
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++)
        t.data[i * 4 + j] = this.data[j * 4 + i]!;
    return t;
  }

  invert(): Mat4 | null {
    const m = this.data;
    const inv = new Float32Array(16);

    inv[0] = m[5]*m[10]*m[15] - m[5]*m[11]*m[14] - m[9]*m[6]*m[15] + m[9]*m[7]*m[14] + m[13]*m[6]*m[11] - m[13]*m[7]*m[10];
    inv[4] = -m[4]*m[10]*m[15] + m[4]*m[11]*m[14] + m[8]*m[6]*m[15] - m[8]*m[7]*m[14] - m[12]*m[6]*m[11] + m[12]*m[7]*m[10];
    inv[8] = m[4]*m[9]*m[15] - m[4]*m[11]*m[13] - m[8]*m[5]*m[15] + m[8]*m[7]*m[13] + m[12]*m[5]*m[11] - m[12]*m[7]*m[9];
    inv[12] = -m[4]*m[9]*m[14] + m[4]*m[10]*m[13] + m[8]*m[5]*m[14] - m[8]*m[6]*m[13] - m[12]*m[5]*m[10] + m[12]*m[6]*m[9];

    inv[1] = -m[1]*m[10]*m[15] + m[1]*m[11]*m[14] + m[9]*m[2]*m[15] - m[9]*m[3]*m[14] - m[13]*m[2]*m[11] + m[13]*m[3]*m[10];
    inv[5] = m[0]*m[10]*m[15] - m[0]*m[11]*m[14] - m[8]*m[2]*m[15] + m[8]*m[3]*m[14] + m[12]*m[2]*m[11] - m[12]*m[3]*m[10];
    inv[9] = -m[0]*m[9]*m[15] + m[0]*m[11]*m[13] + m[8]*m[1]*m[15] - m[8]*m[3]*m[13] - m[12]*m[1]*m[11] + m[12]*m[3]*m[9];
    inv[13] = m[0]*m[9]*m[14] - m[0]*m[10]*m[13] - m[8]*m[1]*m[14] + m[8]*m[2]*m[13] + m[12]*m[1]*m[10] - m[12]*m[2]*m[9];

    inv[2] = m[1]*m[6]*m[15] - m[1]*m[7]*m[14] - m[5]*m[2]*m[15] + m[5]*m[3]*m[14] + m[13]*m[2]*m[7] - m[13]*m[3]*m[6];
    inv[6] = -m[0]*m[6]*m[15] + m[0]*m[7]*m[14] + m[4]*m[2]*m[15] - m[4]*m[3]*m[14] - m[12]*m[2]*m[7] + m[12]*m[3]*m[6];
    inv[10] = m[0]*m[5]*m[15] - m[0]*m[7]*m[13] - m[4]*m[1]*m[15] + m[4]*m[3]*m[13] + m[12]*m[1]*m[7] - m[12]*m[3]*m[5];
    inv[14] = -m[0]*m[5]*m[14] + m[0]*m[6]*m[13] + m[4]*m[1]*m[14] - m[4]*m[2]*m[13] - m[12]*m[1]*m[6] + m[12]*m[2]*m[5];

    inv[3] = -m[1]*m[6]*m[11] + m[1]*m[7]*m[10] + m[5]*m[2]*m[11] - m[5]*m[3]*m[10] - m[9]*m[2]*m[7] + m[9]*m[3]*m[6];
    inv[7] = m[0]*m[6]*m[11] - m[0]*m[7]*m[10] - m[4]*m[2]*m[11] + m[4]*m[3]*m[10] + m[8]*m[2]*m[7] - m[8]*m[3]*m[6];
    inv[11] = -m[0]*m[5]*m[11] + m[0]*m[7]*m[9] + m[4]*m[1]*m[11] - m[4]*m[3]*m[9] - m[8]*m[1]*m[7] + m[8]*m[3]*m[5];
    inv[15] = m[0]*m[5]*m[10] - m[0]*m[6]*m[9] - m[4]*m[1]*m[10] + m[4]*m[2]*m[9] + m[8]*m[1]*m[6] - m[8]*m[2]*m[5];

    let det = m[0]! * inv[0]! + m[1]! * inv[4]! + m[2]! * inv[8]! + m[3]! * inv[12]!;
    if (Math.abs(det) < 1e-10) return null;

    det = 1 / det;
    for (let i = 0; i < 16; i++) inv[i] *= det;

    return new Mat4(inv);
  }

  transformPoint(v: Vec3): Vec3 {
    const d = this.data;
    const w = d[3]! * v.x + d[7]! * v.y + d[11]! * v.z + d[15]!;
    if (Math.abs(w) < 1e-10) w = 1e-10;
    return new Vec3(
      (d[0]! * v.x + d[4]! * v.y + d[8]! * v.z + d[12]!) / w,
      (d[1]! * v.x + d[5]! * v.y + d[9]! * v.z + d[13]!) / w,
      (d[2]! * v.x + d[6]! * v.y + d[10]! * v.z + d[14]!) / w
    );
  }

  transformDirection(v: Vec3): Vec3 {
    const d = this.data;
    return new Vec3(
      d[0]! * v.x + d[4]! * v.y + d[8]! * v.z,
      d[1]! * v.x + d[5]! * v.y + d[9]! * v.z,
      d[2]! * v.x + d[6]! * v.y + d[10]! * v.z
    );
  }

  toArray(): Float32Array { return this.data.slice(); }
}

export class Quaternion {
  constructor(public x = 0, public y = 0, public z = 0, public w = 1) {}

  static identity() { return new Quaternion(0, 0, 0, 1); }
  static fromAxisAngle(axis: Vec3, angle: number): Quaternion {
    const halfAngle = angle / 2;
    const s = Math.sin(halfAngle);
    return new Quaternion(axis.x * s, axis.y * s, axis.z * s, Math.cos(halfAngle));
  }
  static fromEuler(x: number, y: number, z: number): Quaternion {
    const cx = Math.cos(x/2), sx = Math.sin(x/2);
    const cy = Math.cos(y/2), sy = Math.sin(y/2);
    const cz = Math.cos(z/2), sz = Math.sin(z/2);
    return new Quaternion(
      sx*cy*cz - cx*sy*sz,
      cx*sy*cz + sx*cy*sz,
      cx*cy*sz - sx*sy*cz,
      cx*cy*cz + sx*sy*sz
    );
  }

  length(): number { return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w); }
  normalize(): Quaternion {
    const len = this.length();
    return len > 0 ? new Quaternion(this.x/len, this.y/len, this.z/len, this.w/len) : Quaternion.identity();
  }

  conjugate(): Quaternion { return new Quaternion(-this.x, -this.y, -this.z, this.w); }

  multiply(q: Quaternion): Quaternion {
    return new Quaternion(
      this.w*q.x + this.x*q.w + this.y*q.z - this.z*q.y,
      this.w*q.y - this.x*q.z + this.y*q.w + this.z*q.x,
      this.w*q.z + this.x*q.y - this.y*q.x + this.z*q.w,
      this.w*q.w - this.x*q.x - this.y*q.y - this.z*q.z
    );
  }

  slerp(q: Quaternion, t: number): Quaternion {
    let dot = this.x*q.x + this.y*q.y + this.z*q.z + this.w*q.w;
    if (dot < 0) { q = new Quaternion(-q.x, -q.y, -q.z, -q.w); dot = -dot; }
    if (dot > 0.9995) {
      const result = new Quaternion(
        this.x + t*(q.x - this.x),
        this.y + t*(q.y - this.y),
        this.z + t*(q.z - this.z),
        this.w + t*(q.w - this.w)
      ).normalize();
      return result;
    }
    const theta = Math.acos(dot);
    const sinTheta = Math.sin(theta);
    const wa = Math.sin((1-t)*theta)/sinTheta;
    const wb = Math.sin(t*theta)/sinTheta;
    return new Quaternion(wa*this.x + wb*q.x, wa*this.y + wb*q.y, wa*this.z + wb*q.z, wa*this.w + wb*q.w);
  }

  toMat4(): Mat4 {
    const {x, y, z, w} = this.normalize();
    const xx=x*x, yy=y*y, zz=z*z, xy=x*y, xz=x*z, yz=y*z, wx=w*x, wy=w*y, wz=w*z;
    return new Mat4([
      1-2*(yy+zz), 2*(xy-wz),   2*(xz+wy),   0,
      2*(xy+wz),   1-2*(xx+zz), 2*(yz-wx),   0,
      2*(xz-wy),   2*(yz+wx),   1-2*(xx+yy), 0,
      0,           0,            0,           1,
    ]);
  }

  toAxisAngle(): { axis: Vec3; angle: number } {
    const q = this.w > 1 ? this.normalize() : this;
    const angle = 2 * Math.acos(Math.max(-1, Math.min(1, q.w)));
    const s = Math.sqrt(1 - q.w*q.w);
    if (s < 0.001) return { axis: Vec3.forward(), angle };
    return { axis: new Vec3(q.x/s, q.y/s, q.z/s), angle };
  }

  toArray(): [number, number, number, number] { return [this.x, this.y, this.z, this.w]; }
}

// --- Geometry Generators ---

interface MeshData {
  vertices: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
  vertexCount: number;
  indexCount: number;
}

export function createCube(size = 1): MeshData {
  const s = size / 2;
  const vertices = new Float32Array([
    // Front
    -s,-s,s, s,-s,s, s,s,s, -s,s,s,
    // Back
    s,-s,-s, -s,-s,-s, -s,s,-s, s,s,-s,
    // Top
    -s,s,s, s,s,s, s,s,-s, -s,s,-s,
    // Bottom
    -s,-s,-s, s,-s,-s, s,-s,s, -s,-s,s,
    // Right
    s,-s,s, s,-s,-s, s,s,-s, s,s,s,
    // Left
    -s,-s,-s, -s,-s,s, -s,s,s, -s,s,-s,
  ]);
  const normals = new Float32Array([
    0,0,1, 0,0,1, 0,0,1, 0,0,1,
    0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
    0,1,0, 0,1,0, 0,1,0, 0,1,0,
    0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
    1,0,0, 1,0,0, 1,0,0, 1,0,0,
    -1,0,0, -1,0,0, -1,0,0, -1,0,0,
  ]);
  const uvs = new Float32Array([
    0,0, 1,0, 1,1, 0,1,
    0,0, 1,0, 1,1, 0,1,
    0,0, 1,0, 1,1, 0,1,
    0,0, 1,0, 1,1, 0,1,
    0,0, 1,0, 1,1, 0,1,
    0,0, 1,0, 1,1, 0,1,
  ]);
  const indices = new Uint16Array([
    0,1,2, 0,2,3, 4,5,6, 4,6,7,
    8,9,10, 8,10,11, 12,13,14, 12,14,15,
    16,17,18, 16,18,19, 20,21,22, 20,22,23,
  ]);
  return { vertices, normals, uvs, indices, vertexCount: 24, indexCount: 36 };
}

export function createSphere(radius = 1, widthSegments = 32, heightSegments = 24): MeshData {
  const verts: number[] = [], norms: number[] = [], texCoords: number[] = [], inds: number[] = [];

  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments;
    const phi = v * Math.PI;
    for (let x = 0; x <= widthSegments; x++) {
      const u = x / widthSegments;
      const theta = u * Math.PI * 2;
      const px = -radius * Math.cos(theta) * Math.sin(phi);
      const py = radius * Math.cos(phi);
      const pz = radius * Math.sin(theta) * Math.sin(phi);
      verts.push(px, py, pz);
      norms.push(px/radius, py/radius, pz/radius);
      texCoords.push(u, 1-v);
    }
  }

  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < widthSegments; x++) {
      const a = y * (widthSegments + 1) + x;
      const b = a + widthSegments + 1;
      inds.push(a, b, a+1, b, b+1, a+1);
    }
  }

  return {
    vertices: new Float32Array(verts),
    normals: new Float32Array(norms),
    uvs: new Float32Array(texCoords),
    indices: new Uint16Array(inds),
    vertexCount: verts.length / 3,
    indexCount: inds.length,
  };
}

export function createCylinder(radiusTop = 1, radiusBottom = 1, height = 1, radialSegments = 32, heightSegments = 1): MeshData {
  const verts: number[] = [], norms: number[] = [], texCoords: number[] = [], inds: number[] = [];
  const halfHeight = height / 2;

  for (let y = 0; y <= heightSegments; y++) {
    const v = y / heightSegments;
    const radius = radiusTop + (radiusBottom - radiusTop) * v;
    for (let x = 0; x <= radialSegments; x++) {
      const u = x / radialSegments;
      const theta = u * Math.PI * 2;
      const sinT = Math.sin(theta), cosT = Math.cos(theta);
      verts.push(radius * cosT, v * height - halfHeight, radius * sinT);
      const slope = (radiusBottom - radiusTop) / height;
      const ny = slope / Math.sqrt(slope*slope + 1);
      const nxz = 1 / Math.sqrt(slope*slope + 1);
      norms.push(cosT * nxz, ny, sinT * nxz);
      texCoords.push(u, v);
    }
  }

  for (let y = 0; y < heightSegments; y++) {
    for (let x = 0; x < radialSegments; x++) {
      const a = y * (radialSegments + 1) + x;
      const b = a + radialSegments + 1;
      inds.push(a, b, a+1, b, b+1, a+1);
    }
  }

  return {
    vertices: new Float32Array(verts), normals: new Float32Array(norms),
    uvs: new Float32Array(texCoords), indices: new Uint16Array(inds),
    vertexCount: verts.length / 3, indexCount: inds.length,
  };
}

export function createPlane(width = 1, height = 1, segW = 1, segH = 1): MeshData {
  const hw = width / 2, hh = height / 2;
  const verts: number[] = [], norms: number[] = [], texCoords: number[] = [], inds: number[] = [];

  for (let y = 0; y <= segH; y++) {
    for (let x = 0; x <= segW; x++) {
      const u = x / segW, v = y / segH;
      verts.push(u * width - hw, 0, v * height - hh);
      norms.push(0, 1, 0);
      texCoords.push(u, v);
    }
  }

  for (let y = 0; y < segH; y++) {
    for (let x = 0; x < segW; x++) {
      const a = y * (segW + 1) + x;
      const b = a + segW + 1;
      inds.push(a, b, a+1, b, b+1, a+1);
    }
  }

  return {
    vertices: new Float32Array(verts), normals: new Float32Array(norms),
    uvs: new Float32Array(texCoords), indices: new Uint16Array(inds),
    vertexCount: verts.length / 3, indexCount: inds.length,
  };
}

export function createTorus(radius = 1, tube = 0.4, radialSegments = 16, tubularSegments = 48): MeshData {
  const verts: number[] = [], norms: number[] = [], texCoords: number[] = [], inds: number[] = [];

  for (let j = 0; j <= radialSegments; j++) {
    for (let i = 0; i <= tubularSegments; i++) {
      const u = i / tubularSegments * Math.PI * 2;
      const v = j / radialSegments * Math.PI * 2;
      const px = (radius + tube * Math.cos(v)) * Math.cos(u);
      const py = tube * Math.sin(v);
      const pz = (radius + tube * Math.cos(v)) * Math.sin(u);
      verts.push(px, py, pz);
      const nx = Math.cos(v) * Math.cos(u), ny = Math.sin(v), nz = Math.cos(v) * Math.sin(u);
      norms.push(nx, ny, nz);
      texCoords.push(i/tubularSegments, j/radialSegments);
    }
  }

  for (let j = 1; j <= radialSegments; j++) {
    for (let i = 1; i <= tubularSegments; i++) {
      const a = (tubularSegments + 1) * j + i - 1;
      const b = (tubularSegments + 1) * (j - 1) + i - 1;
      const c = (tubularSegments + 1) * (j - 1) + i;
      const d = (tubularSegments + 1) * j + i;
      inds.push(a, b, d, b, c, d);
    }
  }

  return {
    vertices: new Float32Array(verts), normals: new Float32Array(norms),
    uvs: new Float32Array(texCoords), indices: new Uint16Array(inds),
    vertexCount: verts.length / 3, indexCount: inds.length,
  };
}

// --- Scene Graph ---

export interface Transform {
  position: Vec3;
  rotation: Quaternion;
  scale: Vec3;
  worldMatrix: Mat4;
  dirty: boolean;
}

export class SceneNode {
  id: string;
  name: string;
  transform: Transform;
  children: SceneNode[];
  parent: SceneNode | null = null;
  mesh?: MeshData;
  material?: Material;
  visible = true;
  userData: Record<string, unknown> = {};

  constructor(name = "Node", id?: string) {
    this.name = name;
    this.id = id ?? `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.transform = {
      position: Vec3.zero(),
      rotation: Quaternion.identity(),
      scale: Vec3.one(),
      worldMatrix: Mat4.identity(),
      dirty: true,
    };
    this.children = [];
  }

  addChild(child: SceneNode): SceneNode {
    child.parent = this;
    this.children.push(child);
    child.markDirty();
    return child;
  }

  removeChild(child: SceneNode): boolean {
    const idx = this.children.indexOf(child);
    if (idx >= 0) { this.children.splice(idx, 1); child.parent = null; return true; }
    return false;
  }

  findByName(name: string): SceneNode | undefined {
    if (this.name === name) return this;
    for (const child of this.children) {
      const found = child.findByName(name);
      if (found) return found;
    }
    return undefined;
  }

  findById(id: string): SceneNode | undefined {
    if (this.id === id) return this;
    for (const child of this.children) {
      const found = child.findById(id);
      if (found) return found;
    }
    return undefined;
  }

  markDirty(): void { this.transform.dirty = true; }

  updateWorldMatrix(parentWorld = Mat4.identity()): void {
    if (!this.transform.dirty && this.children.every((c) => !c.transform.dirty)) return;

    const localMat = Mat4.identity()
      .translate(this.transform.position)
      .multiply(this.transform.rotation.toMat4())
      .scale(this.transform.scale);

    this.transform.worldMatrix = parentWorld.multiply(localMat);
    this.transform.dirty = false;

    for (const child of this.children) {
      child.updateWorldMatrix(this.transform.worldMatrix);
    }
  }

  traverse(callback: (node: SceneNode) => void): void {
    callback(this);
    for (const child of this.children) child.traverse(callback);
  }

  flatten(): SceneNode[] {
    const result: SceneNode[] = [];
    this.traverse((n) => result.push(n));
    return result;
  }

  getWorldPosition(): Vec3 {
    return this.transform.worldMatrix.transformPoint(Vec3.zero());
  }

  getDepth(): number {
    let depth = 0;
    let p = this.parent;
    while (p) { depth++; p = p.parent; }
    return depth;
  }
}

export class Scene {
  root: SceneNode;
  private nodes = new Map<string, SceneNode>();
  private cameras = new Map<string, Camera>();
  private lights: Light[] = [];

  constructor() { this.root = new SceneNode("Root"); }

  addNode(node: SceneNode, parent?: SceneNode): SceneNode {
    (parent ?? this.root).addChild(node);
    this.nodes.set(node.id, node);
    return node;
  }

  removeNode(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;
    node.parent?.removeChild(node);
    this.nodes.delete(id);
    return true;
  }

  getNode(id: string): SceneNode | undefined { return this.nodes.get(id); }

  getAllNodes(): SceneNode[] { return Array.from(this.nodes.values()); }

  addCamera(camera: Camera): Camera {
    this.cameras.set(camera.id, camera);
    return camera;
  }

  getCamera(id?: string): Camera | undefined {
    if (id) return this.cameras.get(id);
    return this.cameras.values().next().value;
  }

  addLight(light: Light): void { this.lights.push(light); }
  getLights(): Light[] { return [...this.lights]; }

  update(): void { this.root.updateWorldMatrix(); }

  find(predicate: (node: SceneNode) => boolean): SceneNode | undefined {
    let result: SceneNode | undefined;
    this.root.traverse((n) => { if (!result && predicate(n)) result = n; });
    return result;
  }
}

// --- Camera ---

export class Camera {
  id: string;
  name: string;
  node: SceneNode;
  fov = Math.PI / 4;
  near = 0.1;
  far = 1000;
  aspect = 16 / 9;
  projectionType: "perspective" | "orthographic" = "perspective";
  orthoSize = 10;
  backgroundColor = "#1a1a2e";

  constructor(name = "Camera", id?: string) {
    this.name = name;
    this.id = id ?? `cam-${Date.now()}`;
    this.node = new SceneNode(name);
  }

  getProjectionMatrix(): Mat4 {
    if (this.projectionType === "perspective") {
      return Mat4.perspective(this.fov, this.aspect, this.near, this.far);
    }
    const h = this.orthoSize, w = h * this.aspect;
    return Mat4.ortho(-w/2, w/2, -h/2, h/2, this.near, this.far);
  }

  getViewMatrix(): Mat4 {
    const pos = this.node.getWorldPosition();
    const fwd = this.node.transform.worldMatrix.transformDirection(Vec3.forward());
    const up = this.node.transform.worldMatrix.transformDirection(Vec3.up());
    return Mat4.lookAt(pos, pos.add(fwd), up);
  }

  lookAt(target: Vec3): void {
    const pos = this.node.getWorldPosition();
    const view = target.sub(pos).normalize();
    const right = Vec3.up().cross(view).normalize();
    const up = view.cross(right).normalize();

    const mat = new Mat4([
      right.x, right.y, right.z, 0,
      up.x, up.y, up.z, 0,
      -view.x, -view.y, -view.z, 0,
      0, 0, 0, 1,
    ]);

    // Extract quaternion from rotation matrix
    const trace = mat.get(0)! + mat.get(5)! + mat.get(10)!;
    let qw: number, qx: number, qy: number, qz: number;
    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1);
      qw = 0.25 / s; qx = (mat.get(9)! - mat.get(6)!) * s; qy = (mat.get(2)! - mat.get(8)!) * s; qz = (mat.get(4)! - mat.get(1)!) * s;
    } else if (mat.get(0)! > mat.get(5)! && mat.get(0)! > mat.get(10)!) {
      const s = 2 * Math.sqrt(1 + mat.get(0)! - mat.get(5)! - mat.get(10)!);
      qw = (mat.get(9)! - mat.get(6)!) / s; qx = 0.25 * s; qy = (mat.get(1)! + mat.get(4)!) / s; qz = (mat.get(2)! + mat.get(8)!) / s;
    } else if (mat.get(5)! > mat.get(10)!) {
      const s = 2 * Math.sqrt(1 + mat.get(5)! - mat.get(0)! - mat.get(10)!);
      qw = (mat.get(2)! - mat.get(8)!) / s; qx = (mat.get(1)! + mat.get(4)!) / s; qy = 0.25 * s; qz = (mat.get(6)! + mat.get(9)!) / s;
    } else {
      const s = 2 * Math.sqrt(1 + mat.get(10)! - mat.get(0)! - mat.get(5)!);
      qw = (mat.get(4)! - mat.get(1)!) / s; qx = (mat.get(2)! + mat.get(8)!) / s; qy = (mat.get(6)! + mat.get(9)!) / s; qz = 0.25 * s;
    }
    this.node.transform.rotation = new Quaternion(qx, qy, qz, qw).normalize();
  }

  orbit(target: Vec3, yaw: number, pitch: number, distance: number): void {
    this.node.transform.position = new Vec3(
      target.x + distance * Math.cos(pitch) * Math.sin(yaw),
      target.y + distance * Math.sin(pitch),
      target.z + distance * Math.cos(pitch) * Math.cos(yaw)
    );
    this.lookAt(target);
  }

  setAspect(aspect: number): void { this.aspect = aspect; }

  screenToWorld(ndcX: number, ndcY: number, ndcZ = 0.5): Vec3 {
    const projInv = this.getProjectionMatrix().invert();
    const viewInv = this.getViewMatrix().invert();
    if (!projInv || !viewInv) return Vec3.zero();
    const clip = new Vec3(ndcX, ndcY, ndcZ);
    const eye = projInv.transformPoint(clip);
    return viewInv.transformPoint(eye);
  }

  worldToScreen(worldPos: Vec3): { x: number; y: number; visible: boolean } {
    const view = this.getViewMatrix();
    const proj = this.getProjectionMatrix();
    const clip = proj.transformPoint(view.transformPoint(worldPos));
    return {
      x: (clip.x + 1) * 0.5,
      y: (1 - clip.y) * 0.5,
      visible: clip.z >= -1 && clip.z <= 1,
    };
  }

  raycast(screenX: number, screenY: number): Ray3D {
    const ndcX = screenX * 2 - 1;
    const ndcY = 1 - screenY * 2;
    const near = this.screenToWorld(ndcX, ndcY, -1);
    const far = this.screenToWorld(ndcX, ndcY, 1);
    return new Ray3D(near, far.sub(near).normalize());
  }
}

// --- Lights ---

export type LightType = "directional" | "point" | "spot" | "ambient" | "hemisphere";

export interface Light {
  type: LightType;
  color: Vec3;
  intensity: number;
  enabled: boolean;
  node?: SceneNode;
  range?: number;
  innerConeAngle?: number;
  outerConeAngle?: number;
  skyColor?: Vec3;
  groundColor?: Vec3;
}

export function createDirectionalLight(color = "#ffffff", intensity = 1, direction = new Vec3(-1, -1, -1)): Light {
  const node = new SceneNode("DirectionalLight");
  node.transform.position = direction.negate().scale(100);
  return { type: "directional", color: parseColor(color), intensity, enabled: true, node };
}

export function createPointLight(color = "#ffffff", intensity = 1, position = Vec3.zero(), range = 20): Light {
  const node = new SceneNode("PointLight");
  node.transform.position = position;
  return { type: "point", color: parseColor(color), intensity, enabled: true, node, range };
}

export function createSpotLight(color = "#ffffff", intensity = 1, position = Vec3.zero(), direction = new Vec3(0, -1, 0), innerAngle = Math.PI/6, outerAngle = Math.PI/4, range = 30): Light {
  const node = new SceneNode("SpotLight");
  node.transform.position = position;
  return { type: "spot", color: parseColor(color), intensity, enabled: true, node, range, innerConeAngle: innerAngle, outerConeAngle: outerAngle };
}

export function createAmbientLight(color = "#404060", intensity = 0.3): Light {
  return { type: "ambient", color: parseColor(color), intensity, enabled: true };
}

export function createHemisphereLight(skyColor = "#87ceeb", groundColor = "#362e2b", intensity = 0.6): Light {
  return { type: "hemisphere", color: parseColor(skyColor), intensity, enabled: true, skyColor: parseColor(skyColor), groundColor: parseColor(groundColor) };
}

function parseColor(hex: string): Vec3 {
  const h = hex.replace("#", "");
  return new Vec3(
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  );
}

// --- Materials ---

export interface Material {
  name?: string;
  diffuse?: string;        // Hex color or texture URL
  specular?: string;
  emissive?: string;
  shininess?: number;
  opacity?: number;
  metalness?: number;
  roughness?: number;
  normalMap?: string;
  aoMap?: string;
  emissiveMap?: string;
  wireframe?: boolean;
  doubleSided?: boolean;
  transparent?: boolean;
  alphaTest?: number;
  uniforms?: Record<string, unknown>;
}

export function createMaterial(options: Partial<Material> = {}): Material {
  return {
    name: options.name ?? "Material",
    diffuse: options.diffuse ?? "#cccccc",
    specular: options.specular ?? "#111111",
    shininess: options.shininess ?? 30,
    opacity: options.opacity ?? 1,
    metalness: options.metalness ?? 0,
    roughness: options.roughness ?? 0.5,
    wireframe: options.wireframe ?? false,
    doubleSided: options.doubleSided ?? false,
    transparent: options.transparent ?? false,
    ...options,
  };
}

// --- Raycasting ---

export class Ray3D {
  origin: Vec3;
  direction: Vec3;

  constructor(origin: Vec3, direction: Vec3) {
    this.origin = origin;
    this.direction = direction.normalize();
  }

  at(t: number): Vec3 { return this.origin.add(this.direction.scale(t)); }

  intersectSphere(center: Vec3, radius: number): { point: Vec3; normal: Vec3; t: number } | null {
    const oc = this.origin.sub(center);
    const a = this.direction.dot(this.direction);
    const b = 2 * oc.dot(this.direction);
    const c = oc.dot(oc) - radius * radius;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (t < 0) return null;
    const point = this.at(t);
    return { point, normal: point.sub(center).normalize(), t };
  }

  intersectPlane(point: Vec3, normal: Vec3): { point: Vec3; t: number } | null {
    const denom = normal.dot(this.direction);
    if (Math.abs(denom) < 1e-6) return null;
    const t = point.sub(this.origin).dot(normal) / denom;
    if (t < 0) return null;
    return { point: this.at(t), t };
  }

  intersectTriangle(a: Vec3, b: Vec3, c: Vec3): { point: Vec3; normal: Vec3; t: number; uv: { u: number; v: number } } | null {
    const edge1 = b.sub(a);
    const edge2 = c.sub(a);
    const h = this.direction.cross(edge2);
    const det = edge1.dot(h);
    if (det > -1e-6 && det < 1e-6) return null;
    const f = 1 / det;
    const s = this.origin.sub(a);
    const u = f * s.dot(h);
    if (u < 0 || u > 1) return null;
    const q = s.cross(edge1);
    const v = f * this.direction.dot(q);
    if (v < 0 || u + v > 1) return null;
    const t = f * edge2.dot(q);
    if (t < 0) return null;
    return { point: this.at(t), normal: edge1.cross(edge2).normalize(), t, uv: { u, v } };
  }

  intersectAABB(min: Vec3, max: Vec3): { tMin: number; tMax: number } | null {
    let tMin = -Infinity, tMax = Infinity;
    const dir = this.direction;
    const origin = this.origin;

    for (let i = 0; i < 3; i++) {
      const o = [origin.x, origin.y, origin.z][i]!;
      const d = [dir.x, dir.y, dir.z][i]!;
      const minV = [min.x, min.y, min.z][i]!;
      const maxV = [max.x, max.y, max.z][i]!;

      if (Math.abs(d) < 1e-8) {
        if (o < minV || o > maxV) return null;
      } else {
        const t1 = (minV - o) / d;
        const t2 = (maxV - o) / d;
        const tNear = Math.min(t1, t2);
        const tFar = Math.max(t1, t2);
        tMin = Math.max(tMin, tNear);
        tMax = Math.min(tMax, tFar);
        if (tMin > tMax || tMax < 0) return null;
      }
    }
    return { tMin, tMax };
  }

  distanceToPoint(point: Vec3): number {
    const toPoint = point.sub(this.origin);
    const projection = toPoint.dot(this.direction);
    const closest = this.origin.add(this.direction.scale(projection));
    return point.distanceTo(closest);
  }
}

// Add cross product to Vec3 (used in ray-triangle intersection)
declare module "./3d-graphics" {
  interface Vec3 {
    cross(v: Vec3): Vec3;
  }
}
Vec3.prototype.cross = function(this: Vec3, v: Vec3): Vec3 {
  return new Vec3(
    this.y * v.z - this.z * v.y,
    this.z * v.x - this.x * v.z,
    this.x * v.y - this.y * v.x
  );
};

// --- Bounding Volumes ---

export class AABB3D {
  min: Vec3;
  max: Vec3;

  constructor(min = Vec3.zero(), max = Vec3.zero()) {
    this.min = min.clone();
    this.max = max.clone();
  }

  static fromPoints(points: Vec3[]): AABB3D {
    if (points.length === 0) return new AABB3D();
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
      if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
    }
    return new AABB3D(new Vec3(minX, minY, minZ), new Vec3(maxX, maxY, maxZ));
  }

  contains(point: Vec3): boolean {
    return point.x >= this.min.x && point.x <= this.max.x &&
           point.y >= this.min.y && point.y <= this.max.y &&
           point.z >= this.min.z && point.z <= this.max.z;
  }

  intersects(other: AABB3D): boolean {
    return this.min.x <= other.max.x && this.max.x >= other.min.x &&
           this.min.y <= other.max.y && this.max.y >= other.min.y &&
           this.min.z <= other.max.z && this.max.z >= other.min.z;
  }

  merge(other: AABB3D): AABB3D {
    return new AABB3D(
      new Vec3(Math.min(this.min.x, other.min.x), Math.min(this.min.y, other.min.y), Math.min(this.min.z, other.min.z)),
      new Vec3(Math.max(this.max.x, other.max.x), Math.max(this.max.y, other.max.y), Math.max(this.max.z, other.max.z))
    );
  }

  expand(delta: number): AABB3D {
    const d = new Vec3(delta, delta, delta);
    return new AABB3D(this.min.sub(d), this.max.add(d));
  }

  getCenter(): Vec3 {
    return this.min.add(this.max.sub(this.min).scale(0.5));
  }

  getSize(): Vec3 { return this.max.sub(this.min); }
  getVolume(): number { const s = this.getSize(); return s.x * s.y * s.z; }

  transformBy(mat: Mat4): AABB3D {
    const corners = [
      new Vec3(this.min.x, this.min.y, this.min.z),
      new Vec3(this.max.x, this.min.y, this.min.z),
      new Vec3(this.min.x, this.max.y, this.min.z),
      new Vec3(this.max.x, this.max.y, this.min.z),
      new Vec3(this.min.x, this.min.y, this.max.z),
      new Vec3(this.max.x, this.min.y, this.max.z),
      new Vec3(this.min.x, this.max.y, this.max.z),
      new Vec3(this.max.x, this.max.y, this.max.z),
    ];
    const transformed = corners.map((c) => mat.transformPoint(c));
    return AABB3D.fromPoints(transformed);
  }
}

export class SphereBounds {
  center: Vec3;
  radius: number;

  constructor(center = Vec3.zero(), radius = 0) {
    this.center = center.clone();
    this.radius = radius;
  }

  contains(point: Vec3): boolean { return this.center.distanceTo(point) <= this.radius; }
  intersects(other: SphereBounds): boolean { return this.center.distanceTo(other.center) <= this.radius + other.radius; }

  static fromAABB(aabb: AABB3D): SphereBounds {
    const center = aabb.getCenter();
    const radius = aabb.getSize().length() / 2;
    return new SphereBounds(center, radius);
  }

  merge(other: SphereBounds): SphereBounds {
    const dist = this.center.distanceTo(other.center);
    const newRadius = (dist + this.radius + other.radius) / 2;
    const newCenter = this.center.lerp(other.center, (newRadius - this.radius) / (dist || 1));
    return new SphereBounds(newCenter, newRadius);
  }
}

// --- Frustum ---

export class Frustum {
  planes: Array<{ normal: Vec3; d: number }> = [];

  constructor(projView: Mat4) {
    const m = projView.m;
    // Left: col3 + col0
    this.planes.push({ normal: new Vec3(m[3]+m[0], m[7]+m[4], m[11]+m[8]), d: m[15]+m[12] });
    // Right: col3 - col0
    this.planes.push({ normal: new Vec3(m[3]-m[0], m[7]-m[4], m[11]-m[8]), d: m[15]-m[12] });
    // Bottom: col3 + col1
    this.planes.push({ normal: new Vec3(m[3]+m[1], m[7]+m[5], m[11]+m[9]), d: m[15]+m[13] });
    // Top: col3 - col1
    this.planes.push({ normal: new Vec3(m[3]-m[1], m[7]-m[5], m[11]-m[9]), d: m[15]-m[13] });
    // Near: col3 + col2
    this.planes.push({ normal: new Vec3(m[3]+m[2], m[7]+m[6], m[11]+m[10]), d: m[15]+m[14] });
    // Far: col3 - col2
    this.planes.push({ normal: new Vec3(m[3]-m[2], m[7]-m[6], m[11]-m[10]), d: m[15]-m[14] });

    // Normalize planes
    for (const plane of this.planes) {
      const len = plane.normal.length();
      plane.normal = plane.normal.scale(1 / len);
      plane.d /= len;
    }
  }

  containsAABB(aabb: AABB3D): boolean {
    for (const plane of this.planes) {
      const positive = new Vec3(
        plane.normal.x > 0 ? aabb.max.x : aabb.min.x,
        plane.normal.y > 0 ? aabb.max.y : aabb.min.y,
        plane.normal.z > 0 ? aabb.max.z : aabb.min.z
      );
      if (plane.normal.dot(positive) + plane.d < 0) return false;
    }
    return true;
  }

  containsSphere(sphere: SphereBounds): boolean {
    for (const plane of this.planes) {
      if (plane.normal.dot(sphere.center) + plane.d < -sphere.radius) return false;
    }
    return true;
  }

  containsPoint(point: Vec3): boolean {
    for (const plane of this.planes) {
      if (plane.normal.dot(point) + plane.d < 0) return false;
    }
    return true;
  }
}

// --- Animation ---

export interface Keyframe<T> {
  time: number;
  value: T;
  easing?: (t: number) => number;
}

export class KeyframeAnimation3D {
  tracks: Map<string, Keyframe<Vec3 | Quaternion | number>[]> = new Map();
  duration = 0;
  loop = false;
  playing = false;
  currentTime = 0;
  speed = 1;
  private listeners = new Set<(time: number) => void>();

  addTrack(property: string, keyframes: Keyframe<Vec3 | Quaternion | number>[]): void {
    this.tracks.set(property, keyframes);
    this.duration = Math.max(this.duration, ...keyframes.map((k) => k.time));
  }

  removeTrack(property: string): void { this.tracks.delete(property); }

  evaluate(time: number): Record<string, Vec3 | Quaternion | number> {
    const t = ((time % this.duration) + this.duration) % this.duration;
    const result: Record<string, Vec3 | Quaternion | number> = {};

    for (const [property, keyframes] of this.tracks) {
      if (keyframes.length === 0) continue;
      if (keyframes.length === 1) { result[property] = keyframes[0]!.value; continue; }

      // Find surrounding keyframes
      let prev = keyframes[0]!, next = keyframes[keyframes.length - 1]!;
      for (let i = 0; i < keyframes.length - 1; i++) {
        if (keyframes[i]!.time <= t && keyframes[i + 1]!.time >= t) {
          prev = keyframes[i]!;
          next = keyframes[i + 1]!;
          break;
        }
      }

      const range = next.time - prev.time || 1;
      let alpha = (t - prev.time) / range;
      const easing = next.easing ?? ((x: number) => x);
      alpha = easing(alpha);

      // Interpolate based on value type
      const pv = prev.value, nv = next.value;
      if (pv instanceof Vec3 && nv instanceof Vec3) {
        result[property] = pv.lerp(nv, alpha);
      } else if (pv instanceof Quaternion && nv instanceof Quaternion) {
        result[property] = pv.slerp(nv, alpha);
      } else if (typeof pv === "number" && typeof nv === "number") {
        result[property] = pv + (nv - pv) * alpha;
      }
    }

    return result;
  }

  play(): void { this.playing = true; }
  pause(): void { this.playing = false; }
  stop(): void { this.playing = false; this.currentTime = 0; }
  reset(): void { this.currentTime = 0; }

  update(dt: number): void {
    if (!this.playing) return;
    this.currentTime += dt * this.speed;
    if (this.currentTime >= this.duration) {
      if (this.loop) this.currentTime %= this.duration;
      else { this.currentTime = this.duration; this.pause(); }
    }
    for (const l of this.listeners) l(this.currentTime);
  }

  onFrame(listener: (time: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getCurrentState(): Record<string, Vec3 | Quaternion | number> {
    return this.evaluate(this.currentTime);
  }
}

// --- Utility Functions ---

/** Check if WebGL is supported */
export function isWebGLSupported(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch { return false; }
}

/** Check if WebGL2 is supported */
export function isWebGL2Supported(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch { return false; }
}

/** Get WebGL info */
export function getWebGLInfo(): { renderer: string; vendor: string; version: string; maxTextureSize: number; maxVertexAttribs: number } {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
    if (!gl) throw new Error("No WebGL");
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "unknown",
      vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "unknown",
      version: gl.getParameter(gl.VERSION),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
    };
  } catch { return { renderer: "none", vendor: "none", version: "none", maxTextureSize: 0, maxVertexAttribs: 0 }; }
}

/** Create a simple colored material with shader defaults */
export function createDefaultShaderSource(type: "basic" | "phong" | "normal" | "wireframe" = "basic"): { vs: string; fs: string } {
  switch (type) {
    case "basic":
      return {
        vs: `attribute vec3 aPosition;uniform mat4 uProjView;uniform mat4 uModel;void main(){gl_Position=uProjView*uModel*vec4(aPosition,1.);}`,
        fs: `precision mediump float;uniform vec3 uColor;void main(){gl_FragColor=vec4(uColor,1.);}`,
      };
    case "phong":
      return {
        vs: `attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uProjView,uModel,uNormalMat;varying vec3 vNormal,vFragPos;void main(){vec4 wp=uModel*vec4(aPosition,1.);vFragPos=wp.xyz;vNormal=(uNormalMat*vec4(aNormal,0.)).xyz;gl_Position=uProjView*wp;}`,
        fs: `precision mediump float;struct Light{vec3 color;float intensity;vec3 position;int type;};uniform Light uLights[4];uniform int uLightCount;uniform vec3 uColor,uCameraPos;uniform float uShininess;varying vec3 vNormal,vFragPos;void main(){vec3 norm=normalize(vNormal);vec3 viewDir=normalize(uCameraPos-vFragPos);vec3 total=vec3(.04,.04,.06);for(int i=0;i<uLightCount;i++){Light l=uLights[i];vec3 lightDir=l.type==0?-l.position:l.position-vFragPos;lightDir=normalize(lightDir);float diff=max(dot(norm,lightDir),0.);vec3 halfDir=normalize(lightDir+viewDir);float spec=pow(max(dot(norm,halfDir),0.),uShininess);total+=l.color*l.intensity*(diff*.7+spec*.3);}gl_FragColor=vec4(total*uColor,1.);}`,
      };
    case "normal":
      return {
        vs: `attribute vec3 aPosition;attribute vec3 aNormal;uniform mat4 uProjView,uModel,uNormalMat;varying vec3 vNormal;void main(){vNormal=(uNormalMat*vec4(aNormal,0.)).xyz;gl_Position=uProjView*uModel*vec4(aPosition,1.);}`,
        fs: `precision mediump float;varying vec3 vNormal;void main(){vec3 n=normalize(vNormal)*.5+.5;gl_FragColor=vec4(n,1.);}`,
      };
    case "wireframe":
      return {
        vs: `attribute vec3 aPosition;uniform mat4 uProjView,uModel;void main(){gl_Position=uProjView*uModel*vec4(aPosition,1.);}`,
        fs: `precision mediump float;uniform vec3 uColor;void main(){gl_FragColor=vec4(uColor,1.);}`,
      };
  }
}
