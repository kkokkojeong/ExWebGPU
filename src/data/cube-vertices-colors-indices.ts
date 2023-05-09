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

export const colors = new Float32Array([
    //  color
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