/**
 * 3D Math Utilities: Vector2/3/4, Matrix3x3/4x4, Quaternion, Euler angles,
 * ray casting, AABB/OBB bounding boxes, frustum culling, projection matrices,
 * transformations, interpolation, and common geometric operations.
 */

// --- Vector2 ---

export class Vec2 {
  constructor(public x = 0, public y = 0) {}

  static fromAngle(angle: number, length = 1): Vec2 {
    return new Vec2(Math.cos(angle) * length, Math.sin(angle) * length);
  }

  clone(): Vec2 { return new Vec2(this.x, this.y); }
  set(x: number, y: number): this { this.x = x; this.y = y; return this; }

  add(v: Vec2): Vec2 { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v: Vec2): Vec2 { return new Vec2(this.x - v.x, this.y - v.y); }
  mul(s: number): Vec2 { return new Vec2(this.x * s, this.y * s); }
  div(s: number): Vec2 { return new Vec2(this.x / s, this.y / s); }

  dot(v: Vec2): number { return this.x * v.x + this.y * v.y; }
  cross(v: Vec2): number { return this.x * v.y - this.y * v.x; }

  length(): number { return Math.sqrt(this.x * this.x + this.y * this.y); }
  lengthSq(): number { return this.x * this.x + this.y * this.y; }

  normalize(): Vec2 { const l = this.length(); return l > 0 ? this.div(l) : new Vec2(); }
  distanceTo(v: Vec2): number { return this.sub(v).length(); }

  angleTo(v: Vec2): number { return Math.ac2(this.dot(v), this.length() * v.length()); }

  lerp(v: Vec2, t: number): Vec2 {
    return new Vec2(this.x + (v.x - this.x) * t, this.y + (v.y - this.y) * t);
  }

  rotate(angle: number): Vec2 {
    const c = Math.cos(angle), s = Math.sin(angle);
    return new Vec2(this.x * c - this.y * s, this.x * s + this.y * c);
  }

  perpendicular(): Vec2 { return new Vec2(-this.y, this.x); }
  negate(): Vec2 { return new Vec2(-this.x, -this.y); }

  toArray(): [number, number] { return [this.x, this.y]; }
  toString(): string { return `Vec2(${this.x.toFixed(3)}, ${this.y.toFixed(3)})`; }
}

// --- Vector3 ---

export class Vec3 {
  constructor(public x = 0, public y = 0, public z = 0) {}

  static get ZERO(): Vec3 { return new Vec3(0, 0, 0); }
  static get ONE(): Vec3 { return new Vec3(1, 1, 1); }
  static get UP(): Vec3 { return new Vec3(0, 1, 0); }
  static get FORWARD(): Vec3 { return new Vec3(0, 0, -1); }
  static get RIGHT(): Vec3 { return new Vec3(1, 0, 0); }

  clone(): Vec3 { return new Vec3(this.x, this.y, this.z); }
  set(x: number, y: number, z: number): this { this.x = x; this.y = y; this.z = z; return this; }

  add(v: Vec3): Vec3 { return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z); }
  sub(v: Vec3): Vec3 { return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z); }
  mul(s: number): Vec3 { return new Vec3(this.x * s, this.y * s, this.z * s); }
  div(s: number): Vec3 { return new Vec3(this.x / s, this.y / s, this.z / s); }

  mulVec(v: Vec3): Vec3 { return new Vec3(this.x * v.x, this.y * v.y, this.z * v.z); }

  dot(v: Vec3): number { return this.x * v.x + this.y * v.y + this.z * v.z; }
  cross(v: Vec3): Vec3 {
    return new Vec3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x,
    );
  }

  length(): number { return Math.sqrt(this.dot(this)); }
  lengthSq(): number { return this.dot(this); }

  normalize(): Vec3 { const l = this.length(); return l > 0 ? this.div(l) : Vec3.ZERO; }
  distanceTo(v: Vec3): number { return this.sub(v).length(); }

  lerp(v: Vec3, t: number): Vec3 {
    return new Vec3(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t,
      this.z + (v.z - this.z) * t,
    );
  }

  negate(): Vec3 { return new Vec3(-this.x, -this.y, -this.z); }

  reflect(normal: Vec3): Vec3 {
    const d = 2 * this.dot(normal);
    return this.sub(normal.mul(d));
  }

  toArray(): [number, number, number] { return [this.x, this.y, this.z]; }
  toVec4(w = 1): Vec4 { return new Vec4(this.x, this.y, this.z, w); }
  toString(): string { return `Vec3(${this.x.toFixed(3)}, ${this.y.toFixed(3)}, ${this.z.toFixed(3)})`; }
}

// --- Vector4 ---

export class Vec4 {
  constructor(public x = 0, public y = 0, public z = 0, public w = 1) {}

  clone(): Vec4 { return new Vec4(this.x, this.y, this.z, this.w); }

  add(v: Vec4): Vec4 { return new Vec4(this.x + v.x, this.y + v.y, this.z + v.z, this.w + v.w); }
  sub(v: Vec4): Vec4 { return new Vec4(this.x - v.x, this.y - v.y, this.z - v.z, this.w - v.w); }
  mul(s: number): Vec4 { return new Vec4(this.x * s, this.y * s, this.z * s, this.w * s); }

  dot(v: Vec4): number { return this.x * v.x + this.y * v.y + this.z * v.z + this.w * v.w; }

  /** Perspective divide: convert from clip space to NDC */
  perspectiveDivide(): Vec3 {
    if (Math.abs(this.w) < 1e-10) return new Vec3(this.x, this.y, this.z);
    return new Vec3(this.x / this.w, this.y / this.w, this.z / this.w);
  }

  toVec3(): Vec3 { return new Vec3(this.x, this.y, this.z); }
}

// --- Matrix 3x3 ---

export class Mat3 {
  constructor(public m: number[] = [1,0,0, 0,1,0, 0,0,1]) {}

  static identity(): Mat3 { return new Mat3([1,0,0, 0,1,0, 0,0,1]); }
  static zero(): Mat3 { return new Mat3([0,0,0, 0,0,0, 0,0,0]); }

  static fromRows(r0: Vec3, r1: Vec3, r2: Vec3): Mat3 {
    return new Mat3([r0.x,r0.y,r0.z, r1.x,r1.y,r1.z, r2.x,r2.y,r2.z]);
  }

  at(row: number, col: number): number { return this.m[row * 3 + col]!; }

  multiply(b: Mat3): Mat3 {
    const result = new Mat3();
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        result.m[r * 3 + c] =
          this.at(r, 0) * b.at(0, c) +
          this.at(r, 1) * b.at(1, c) +
          this.at(r, 2) * b.at(2, c);
      }
    }
    return result;
  }

  transformVec(v: Vec3): Vec3 {
    return new Vec3(
      this.at(0,0)*v.x + this.at(0,1)*v.y + this.at(0,2)*v.z,
      this.at(1,0)*v.x + this.at(1,1)*v.y + this.at(1,2)*v.z,
      this.at(2,0)*v.x + this.at(2,1)*v.y + this.at(2,2)*v.z,
    );
  }

  determinant(): number {
    const [a,b,c,d,e,f,g,h,i] = this.m;
    return a*(e*i-f*h) - b*(d*i-f*g) + c*(d*h-e*g);
  }

  transpose(): Mat3 {
    return new Mat3([
      this.m[0], this.m[3], this.m[6],
      this.m[1], this.m[4], this.m[7],
      this.m[2], this.m[5], this.m[8],
    ]);
  }

  invert(): Mat3 | null {
    const det = this.determinant();
    if (Math.abs(det) < 1e-10) return null;
    const invDet = 1 / det;
    const [a,b,c,d,e,f,g,h,i] = this.m;
    return new Mat3([
      (e*i-f*h)*invDet, (c*h-b*i)*invDet, (b*f-c*e)*invDet,
      (f*g-d*i)*invDet, (a*i-c*g)*invDet, (c*d-a*f)*invDet,
      (d*h-e*g)*invDet, (g*b-a*h)*invDet, (a*e-b*d)*invDet,
    ]);
  }

  /** Create rotation matrix around X axis */
  static rotateX(rad: number): Mat3 {
    const c = Math.cos(rad), s = Math.sin(rad);
    return new Mat3([1,0,0, 0,c,-s, 0,s,c]);
  }

  /** Create rotation matrix around Y axis */
  static rotateY(rad: number): Mat3 {
    const c = Math.cos(rad), s = Math.sin(rad);
    return new Mat3([c,0,s, 0,1,0, -s,0,c]);
  }

  /** Create rotation matrix around Z axis */
  static rotateZ(rad: number): Mat3 {
    const c = Math.cos(rad), s = Math.sin(rad);
    return new Mat3([c,-s,0, s,c,0, 0,0,1]);
  }

  /** Create scale matrix */
  static scale(s: Vec3 | number): Mat3 {
    if (typeof s === "number") s = new Vec3(s, s, s);
    return new Mat3([s.x,0,0, 0,s.y,0, 0,0,s.z]);
  }
}

// --- Matrix 4x4 ---

export class Mat4 {
  constructor(public m: number[] = [
    1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1
  ]) {}

  static identity(): Mat4 { return new Mat4(); }
  static zero(): Mat4 { return new Mat4(new Array(16).fill(0)); }

  at(row: number, col: number): number { return this.m[row * 4 + col]!; }

  multiply(b: Mat4): Mat4 {
    const result = Mat4.zero();
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        for (let k = 0; k < 4; k++)
          result.m[r*4+c] += this.at(r,k) * b.at(k,c);
    return result;
  }

  transformVec4(v: Vec4): Vec4 {
    return new Vec4(
      this.at(0,0)*v.x+this.at(0,1)*v.y+this.at(0,2)*v.z+this.at(0,3)*v.w,
      this.at(1,0)*v.x+this.at(1,1)*v.y+this.at(1,2)*v.z+this.at(1,3)*v.w,
      this.at(2,0)*v.x+this.at(2,1)*v.y+this.at(2,2)*v.z+this.at(2,3)*v.w,
      this.at(3,0)*v.x+this.at(3,1)*v.y+this.at(3,2)*v.z+this.at(3,3)*v.w,
    );
  }

  transformPoint(v: Vec3): Vec3 {
    const r = this.transformVec4(v.toVec4());
    return r.perspectiveDivide();
  }

  transformDir(v: Vec3): Vec3 {
    // Direction vectors have w=0 (no translation)
    return new Vec3(
      this.at(0,0)*v.x + this.at(0,1)*v.y + this.at(0,2)*v.z,
      this.at(1,0)*v.x + this.at(1,1)*v.y + this.at(1,2)*v.z,
      this.at(2,0)*v.x + this.at(2,1)*v.y + this.at(2,2)*v.z,
    );
  }

  transpose(): Mat4 {
    const o = Mat4.zero();
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        o.m[r*4+c] = this.at(c,r);
    return o;
  }

  // --- Static Factory Methods ---

  static translation(x: number, y: number, z: number): Mat4 {
    const m = Mat4.identity(); m.m[12]=x; m.m[13]=y; m.m[14]=z; return m;
  }

  static translate(v: Vec3): Mat4 { return Mat4.translation(v.x, v.y, v.z); }

  static scale(x: number, y: number, z: number): Mat4 {
    const m = Mat4.identity(); m.m[0]=x; m.m[5]=y; m.m[10]=z; return m;
  }

  static scaleVec(v: Vec3 | number): Mat4 {
    if (typeof v === "number") return Mat4.scale(v,v,v);
    return Mat4.scale(v.x, v.y, v.z);
  }

  static rotateX(rad: number): Mat4 {
    const c=Math.cos(rad), s=Math.sin(rad);
    const m=Mat4.identity(); m.m[5]=c; m.m[6]=-s; m.m[9]=s; m.m[10]=c; return m;
  }

  static rotateY(rad: number): Mat4 {
    const c=Math.cos(rad), s=Math.sin(rad);
    const m=Mat4.identity(); m.m[0]=c; m.m[2]=s; m.m[8]=-s; m.m[10]=c; return m;
  }

  static rotateZ(rad: number): Mat4 {
    const c=Math.cos(rad), s=Math.sin(rad);
    const m=Mat4.identity(); m.m[0]=c; m.m[1]=-s; m.m[4]=s; m.m[5]=c; return m;
  }

  static rotateAxis(axis: Vec3, angle: number): Mat4 {
    const n = axis.normalize();
    const c = Math.cos(angle), s = Math.sin(angle), t = 1 - c;
    const [x,y,z] = [n.x,n.y,n.z];
    return new Mat4([
      t*x*x+c,   t*x*y-s*z, t*x*z+s*y, 0,
      t*x*y+s*z, t*y*y+c,   t*y*z-s*x, 0,
      t*x*z-s*y, t*y*z+s*x, t*z*z+c,   0,
      0,          0,          0,          1,
    ]);
  }

  /** Look-at matrix: eye looks at target with up vector */
  static lookAt(eye: Vec3, target: Vec3, up?: Vec3): Mat4 {
    const u = up ?? Vec3.UP;
    const zAxis = eye.sub(target).normalize(); // Forward
    const xAxis = u.cross(zAxis).normalize();   // Right
    const yAxis = zAxis.cross(xAxis);           // True up

    return new Mat4([
      xAxis.x, xAxis.y, xAxis.z, -xAxis.dot(eye),
      yAxis.x, yAxis.y, yAxis.z, -yAxis.dot(eye),
      zAxis.x, zAxis.y, zAxis.z, -zAxis.dot(eye),
      0,       0,       0,       1,
    ]);
  }

  /** Perspective projection matrix */
  static perspective(fovY: number, aspect: number, near: number, far: number): Mat4 {
    const f = 1 / Math.tan(fovY / 2);
    const nf = 1 / (near - far);
    return new Mat4([
      f/aspect, 0, 0,              0,
      0,        f, 0,              0,
      0,        0, (far+near)*nf, -1,
      0,        0, 2*far*near*nf,  0,
    ]);
  }

  /** Orthographic projection matrix */
  static ortho(left: number, right: number, bottom: number, top: number, near: number, far: number): Mat4 {
    const w = 1/(right-left), h = 1/(top-bottom), d = 1/(far-near);
    return new Mat4([
      2*w, 0,   0,               -(right+left)*w,
      0,   2*h, 0,               -(top+bottom)*h,
      0,   0,  -2*d,            -(far+near)*d,
      0,   0,   0,               1,
    ]);
  }
}

// --- Quaternion ---

export class Quat {
  constructor(public x = 0, public y = 0, public z = 0, public w = 1) {}

  static identity(): Quat { return new Quat(0, 0, 0, 1); }
  static fromAxisAngle(axis: Vec3, angle: number): Quat {
    const half = angle / 2;
    const s = Math.sin(half);
    const n = axis.normalize();
    return new Quat(n.x * s, n.y * s, n.z * s, Math.cos(half));
  }

  static fromEuler(x: number, y: number, z: number): Quat {
    const cx = Math.cos(x/2), sx = Math.sin(x/2);
    const cy = Math.cos(y/2), sy = Math.sin(y/2);
    const cz = Math.cos(z/2), sz = Math.sin(z/2);
    return new Quat(
      sx*cy*cz + cx*sy*sz,
      cx*sy*cz - sx*cy*sz,
      cx*cy*sz + sx*sy*cz,
      cx*cy*cz - sx*sy*sz,
    );
  }

  static fromMatrix(m: Mat3): Quat {
    const tr = m.at(0,0)+m.at(1,1)+m.at(2,2);
    if (tr > 0) {
      const s = 0.5 / Math.sqrt(tr + 1);
      return new Quat((m.at(2,1)-m.at(1,2))*s, (m.at(0,2)-m.at(2,0))*s, (m.at(1,0)-m.at(0,1))*s, 0.25/s);
    } else if (m.at(0,0) > m.at(1,1) && m.at(0,0) > m.at(2,2)) {
      const s = 2*Math.sqrt(1+m.at(0,0)-m.at(1,1)-m.at(2,2));
      return new Quat(0.25*s, (m.at(0,1)+m.at(1,0))/s, (m.at(0,2)+m.at(2,0))/s, (m.at(2,1)-m.at(1,2))/s);
    } else if (m.at(1,1) > m.at(2,2)) {
      const s = 2*Math.sqrt(1+m.at(1,1)-m.at(0,0)-m.at(2,2));
      return new Quat((m.at(0,1)+m.at(1,0))/s, 0.25*s, (m.at(1,2)+m.at(2,1))/s, (m.at(0,2)-m.at(2,0))/s);
    } else {
      const s = 2*Math.sqrt(1+m.at(2,2)-m.at(0,0)-m.at(1,1));
      return new Quat((m.at(0,2)+m.at(2,0))/s, (m.at(1,2)+m.at(2,1))/s, 0.25*s, (m.at(1,0)-m.at(0,1))/s);
    }
  }

  clone(): Quat { return new Quat(this.x, this.y, this.z, this.w); }

  length(): number { return Math.sqrt(this.x**2+this.y**2+this.z**2+this.w**2); }
  normalize(): Quat { const l=this.length(); return l>0?new Quat(this.x/l,this.y/l,this.z/l,this.w/l):Quat.identity(); }

  conjugate(): Quat { return new Quat(-this.x, -this.y, -this.z, this.w); }

  multiply(q: Quat): Quat {
    return new Quat(
      this.w*q.x+this.x*q.w+this.y*q.z-this.z*q.y,
      this.w*q.y-this.x*q.z+this.y*q.w+this.z*q.x,
      this.w*q.z+this.x*q.y-this.y*q.x+this.z*q.w,
      this.w*q.w-this.x*q.x-this.y*q.y-this.z*q.z,
    );
  }

  /** Rotate a vector by this quaternion */
  rotateVec(v: Vec3): Vec3 {
    const qv = new Quat(v.x, v.y, v.z, 0);
    const result = this.multiply(qv).multiply(this.conjugate());
    return new Vec3(result.x, result.y, result.z);
  }

  toMat3(): Mat3 {
    const {x,y,z,w} = this.normalize();
    const xx=x*x, yy=y*y, zz=z*z, xy=x*y, xz=x*z, yz=y*z, wx=w*x, wy=w*y, wz=w*z;
    return new Mat3([
      1-2*(yy+zz), 2*(xy-wz),   2*(xz+wy),
      2*(xy+wz),   1-2*(xx+zz), 2*(yz-wx),
      2*(xz-wy),   2*(yz+wx),   1-2*(xx+yy),
    ]);
  }

  toEuler(): { x: number; y: number; z: number } {
    const sinRCosP = 2*(this.w*this.x+this.y*this.z);
    const cosRCosP = 1-2*(this.x*this.x+this.y*this.y);
    const sinR = 2*(this.w*this.y-this.z*this.x);
    let pitch = Math.asin(Math.max(-1, Math.min(1, sinRCosP)));
    let yaw = 0, roll = 0;
    if (Math.abs(cosRCosP) > 1e-6) {
      yaw = Math.atan2(sinR, cosRCosP);
      roll = Math.atan2(2*(this.w*this.z+this.x*this.y), 1-2*(this.y*this.y+this.z*this.z));
    } else {
      yaw = Math.atan2(2*(this.w*this.y-this.z*this.x), 1-2*(this.x*this.x+this.z*this.z));
      roll = 0;
    }
    return { x: pitch, y: yaw, z: roll };
  }

  slerp(q: Quat, t: number): Quat {
    let dot = this.x*q.x+this.y*q.y+this.z*q.z+this.w*q.w;
    if (dot < 0) { q = new Quat(-q.x, -q.y, -q.z, -q.w); dot = -dot; }
    if (dot > 0.9995) {
      return new Quat(
        this.x+(q.x-this.x)*t, this.y+(q.y-this.y)*t,
        this.z+(q.z-this.z)*t, this.w+(q.w-this.w)*t,
      ).normalize();
    }
    const theta = Math.ac2(dot);
    const sinTheta = Math.sqrt(1-dot*dot);
    const s1 = Math.sin((1-t)*theta)/sinTheta, s2 = Math.sin(t*theta)/sinTheta;
    return new Quat(
      this.x*s1+q.x*s2, this.y*s1+q.y*s2,
      this.z*s1+q.z*s2, this.w*s1+q.w*s2,
    ).normalize();
  }
}

// --- Ray ---

export class Ray {
  constructor(public origin: Vec3, public direction: Vec3) {}

  at(t: number): Vec3 {
    return this.origin.add(this.direction.mul(t));
  }

  /** Intersect with plane defined by normal and point */
  intersectPlane(planeNormal: Vec3, planePoint: Vec3): number | null {
    const denom = planeNormal.dot(this.direction);
    if (Math.abs(denom) < 1e-6) return null; // Parallel
    const t = planePoint.sub(this.origin).dot(planeNormal) / denom;
    return t >= 0 ? t : null;
  }

  /** Intersect with AABB bounding box */
  intersectAABB(min: Vec3, max: Vec3): number | null {
    let tmin = -Infinity, tmax = Infinity;
    for (const axis of ["x","y","z"] as const[]) {
      if (Math.abs(this.direction[axis as keyof Vec3] as number) < 1e-8) {
        if ((this.origin[axis as keyof Vec3] as number) < (min[axis as keyof Vec3] as number) ||
            (this.origin[axis as keyof Vec3] as number) > (max[axis as keyof Vec3] as number)) return null;
      } else {
        const invD = 1 / (this.direction[axis as keyof Vec3] as number);
        let t1 = ((min[axis as keyof Vec3] as number) - (this.origin[axis as keyof Vec3] as number)) * invD;
        let t2 = ((max[axis as keyof Vec3] as number) - (this.origin[axis as keyof Vec3] as number)) * invD;
        if (t1 > t2) [t1, t2] = [t2, t1];
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return null;
      }
    }
    return tmin >= 0 ? tmin : null;
  }
}

// --- Bounding Box (AABB) ---

export class AABB {
  constructor(public min: Vec3, public max: Vec3) {}

  static fromPoints(points: Vec3[]): AABB {
    let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
    for (const p of points) {
      minX=Math.min(minX,p.x); minY=Math.min(minY,p.y); minZ=Math.min(minZ,p.z);
      maxX=Math.max(maxX,p.x); maxY=Math.max(maxY,p.y); maxZ=Math.max(maxZ,p.z);
    }
    return new AABB(new Vec3(minX,minY,minZ), new Vec3(maxX,maxY,maxZ));
  }

  center(): Vec3 { return this.min.add(this.max).mul(0.5); }
  size(): Vec3 { return this.max.sub(this.min); }

  contains(point: Vec3): boolean {
    return point.x>=this.min.x && point.x<=this.max.x &&
           point.y>=this.min.y && point.y<=this.max.y &&
           point.z>=this.min.z && point.z<=this.max.z;
  }

  intersects(other: AABB): boolean {
    return this.min.x<=other.max.x && this.max.x>=other.min.x &&
           this.min.y<=other.max.y && this.max.y>=other.min.y &&
           this.min.z<=other.max.z && this.max.z>=other.min.z;
  }

  expand(by: number): AABB {
    const v = new Vec3(by, by, by);
    return new AABB(this.min.sub(v), this.max.add(v));
  }

  transform(mat: Mat4): AABB {
    const corners = [
      mat.transformPoint(this.min),
      mat.transformPoint(new Vec3(this.max.x, this.min.y, this.min.z)),
      mat.transformPoint(new Vec3(this.min.x, this.max.y, this.min.z)),
      mat.transformPoint(new Vec3(this.min.x, this.min.y, this.max.z)),
      mat.transformPoint(new Vec3(this.max.x, this.max.y, this.min.z)),
      mat.transformPoint(new Vec3(this.max.x, this.min.y, this.max.z)),
      mat.transformPoint(new Vec3(this.min.x, this.max.y, this.max.z)),
      mat.transformPoint(this.max),
    ];
    return AABB.fromPoints(corners);
  }
}

// --- Frustum (for culling) ---

export class Frustum {
  private planes: Array<{ normal: Vec3; distance: number }> = [];

  static fromVP(fov: number, aspect: number, near: number, far: number): Frustum {
    const f = new Frustum();
    const tanHalfFov = Math.tan(fov / 2);

    // Calculate the 6 planes of the view frustum
    const nh = near * tanHalfFov, nw = nh * aspect;
    const fh = far * tanHalfFov, fw = fh * aspect;

    // Near, Far, Left, Right, Top, Bottom planes (simplified)
    f.planes = [
      { normal: new Vec3(0, 0, 1), distance: -near },
      { normal: new Vec3(0, 0, -1), distance: far },
      { normal: new Vec3(1, 0, 0), distance: nw },   // Left
      { normal: new Vec3(-1, 0, 0), distance: fw },  // Right
      { normal: new Vec3(0, 1, 0), distance: nh },   // Bottom
      { normal: new Vec3(0, -1, 0), distance: fh },  // Top
    ];
    return f;
  }

  containsPoint(p: Vec3): boolean {
    for (const plane of this.planes) {
      if (plane.normal.dot(p) + plane.distance < 0) return false;
    }
    return true;
  }

  containsAABB(aabb: AABB): boolean {
    // Test all 8 corners against all planes
    const corners = [
      new Vec3(aabb.min.x, aabb.min.y, aabb.min.z),
      new Vec3(aabb.max.x, aabb.min.y, aabb.min.z),
      new Vec3(aabb.min.x, aabb.max.y, aabb.min.z),
      new Vec3(aabb.max.x, aabb.max.y, aabb.min.z),
      new Vec3(aabb.min.x, aabb.min.y, aabb.max.z),
      new Vec3(aabb.max.x, aabb.min.y, aabb.max.z),
      new Vec3(aabb.min.x, aabb.max.y, aabb.max.z),
      new Vec3(aabb.max.x, aabb.max.y, aabb.max.z),
    ];
    for (const plane of this.planes) {
      let outside = true;
      for (const corner of corners) {
        if (plane.normal.dot(cor) + plane.distance >= 0) { outside = false; break; }
      }
      if (outside) return false;
    }
    return true;
  }
}
