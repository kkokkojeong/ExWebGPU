export const vertices = new Float32Array([
    // position
    -1, -1,  1,
     1, -1,  1,
     1,  1,  1,
    -1,  1,  1,
    -1, -1, -1,
     1, -1, -1,
     1,  1, -1,
    -1,  1, -1,
]);

export const normals = new Float32Array([
    // normal 다시 계산 필요
    0, 0, 0, // front
    1, -1, 0, // right
    1, -1, 0, // back
    1, -1, 0, // left
    1, -1, 0, // top
    1, -1, 0, // bottom
    1, -1, 0,
    1, 1, 0
])

export const colors = new Float32Array([
    // color
    0, 0, 1,
    1, 0, 1, 
    1, 1, 1, 
    0, 1, 1, 
    0, 0, 0, 
    1, 0, 0, 
    1, 1, 0, 
    0, 1, 0, 
]);

export const indices = new Uint32Array([
    // front
    0, 1, 2, 2, 3, 0,

    // right
    1, 5, 6, 6, 2, 1,

    // back
    4, 7, 6, 6, 5, 4,

    // left
    0, 3, 7, 7, 4, 0,

    // top
    3, 2, 6, 6, 7, 3,

    // bottom
    0, 4, 5, 5, 1, 0
])

// export const colors = new Float32Array([
    
// ]);


export const CubeData = (ul = 1, vl = 1) => {
    const positions = new Float32Array([
        // front
        -1, -1,  1,  
         1, -1,  1,  
         1,  1,  1,
         1,  1,  1,
        -1,  1,  1,
        -1, -1,  1,

        // right
         1, -1,  1,
         1, -1, -1,
         1,  1, -1,
         1,  1, -1,
         1,  1,  1,
         1, -1,  1,

        // back
        -1, -1, -1,
        -1,  1, -1,
         1,  1, -1,
         1,  1, -1,
         1, -1, -1,
        -1, -1, -1,

        // left
        -1, -1,  1,
        -1,  1,  1,
        -1,  1, -1,
        -1,  1, -1,
        -1, -1, -1,
        -1, -1,  1,

        // top
        -1,  1,  1,
         1,  1,  1,
         1,  1, -1,
         1,  1, -1,
        -1,  1, -1,
        -1,  1,  1,

        // bottom
        -1, -1,  1,
        -1, -1, -1,
         1, -1, -1,
         1, -1, -1,
         1, -1,  1,
        -1, -1,  1
    ]);

    const colors = new Float32Array([
        // front - blue
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,
        0, 0, 1,

        // right - red
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,
        1, 0, 0,

        //back - yellow
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,
        1, 1, 0,

        //left - aqua
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,
        0, 1, 1,

        // top - green
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,
        0, 1, 0,

        // bottom - fuchsia
        1, 0, 1,
        1, 0, 1,
        1, 0, 1,
        1, 0, 1,
        1, 0, 1,
        1, 0, 1
    ]);

    const normals = new Float32Array([
        // front
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,

        // right
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,

        // back           
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,

        // left
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,

        // top
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,

        // bottom
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0
    ]);

    const uvs = new Float32Array([
        //front
        0, 0, ul, 0, ul, vl, ul, vl, 0, vl, 0, 0,

        //right
        0, 0, ul, 0, ul, vl, ul, vl, 0, vl, 0, 0,

        //back
        0, 0, ul, 0, ul, vl, ul, vl, 0, vl, 0, 0,

        //left
        0, 0, ul, 0, ul, vl, ul, vl, 0, vl, 0, 0,

        //top
        0, 0, ul, 0, ul, vl, ul, vl, 0, vl, 0, 0,

        //bottom
        0, 0, ul, 0, ul, vl, ul, vl, 0, vl, 0, 0,
    ]);

    return {
        positions,
        colors,
        normals,
        uvs
    };
}