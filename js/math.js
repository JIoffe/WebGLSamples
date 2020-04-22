import {mat4, vec3, quat, mat3} from 'gl-matrix'

export const VEC3_UP = new Float32Array([0,1,0]);
export const VEC3_ZERO = new Float32Array([0,0,0]);
export const VEC3_TEMP = vec3.create();

export const Constants = {
    RadToDeg: 57.295779513082320876798154814105,    // 180 / Pi
    DegToRad: 0.01745329251994329576923690768489,     //Pi / 180
    HalfPi: Math.PI / 2
}

export function lerp(a, b, s){
    return b - ((1.0 - s) * (b - a));
}

export function clampDegrees(d){
    d = d % 360;
    if(d < 0)
        d += 360;
    
    return d;
}

export function clampRadians(r){
    r = r % 2;
    if(r < 0)
        r += 2;

    return r;
}

export function buildProjectionMatrix(projectionMatrix, fovDegrees, w, h, zNear, zFar){
    const fov = fovDegrees * Constants.DegToRad;
    const aspect = w / h;
    projectionMatrix = projectionMatrix || mat4.create();
  
    mat4.perspective(projectionMatrix, fov, aspect, zNear, zFar);

    return projectionMatrix;
}