import { vec3, mat4, glMatrix } from "gl-matrix";


const toRadian = glMatrix.toRadian;

class Transform {
    public static getModelMatrix(translation: vec3 = [0, 0, 0], rotation: vec3 = [0, 0, 0], scaling: vec3 = [1, 1, 1]) {
        const rx = mat4.create();
        const ry = mat4.create();
        const rz = mat4.create();

        const t = mat4.create();
        const s = mat4.create();

        const m = mat4.create();

        mat4.fromXRotation(rx, toRadian(rotation[0]));
        mat4.fromXRotation(ry, toRadian(rotation[1]));
        mat4.fromXRotation(rz, toRadian(rotation[2]));

        mat4.fromTranslation(t, translation);
        mat4.fromScaling(s, scaling);

        // first multiply scaling certainly!
        mat4.multiply(m, rx, s);
        mat4.multiply(m, ry, m);
        mat4.multiply(m, rz, m);
        mat4.multiply(m, t, m);

        return m;
    }

    // like glPerspective
    public static getProjectionMatrix(fovy: number = 45, aspect: number = 1.0, near: number = 0.1, far: number = 100) {
        const p = mat4.create();

        mat4.perspective(p, toRadian(fovy), aspect, near, far);

        return p;
    }

    // like gluLookAt 
    public static getCameraMatrix(pos: vec3, at: vec3 = [0, 0, 0], up: vec3 = [0, 1, 0]) {
        const c = mat4.create();

        mat4.lookAt(c, pos, at, up);

        return c;
    }
}

export default Transform;