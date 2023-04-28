import { vec3, mat4 } from "gl-matrix";

class Transform {
    // like glPerspective
    public static getProjectionMatrix(fovy: number = 45, aspect: number = 1.0, near: number = 0.1, far: number = 100) {
        const p = mat4.create();

        mat4.perspective(p, fovy, aspect, near, far);

        return p;
    }

    // like gluLookAt 
    public static getCameraMatrix(pos: vec3, up: vec3 = [0, 1, 0], at: vec3 = [0, 0, 0]) {
        const c = mat4.create();

        mat4.lookAt(c, pos, up, at);

        return c;
    }
}

export default Transform;