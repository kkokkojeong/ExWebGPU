
const vertices = new Float32Array([
    //   X,    Y,
    -0.8, -0.8, // Triangle 1 (Blue)
     0.8, -0.8,
     0.8,  0.8,

    -0.8, -0.8, // Triangle 2 (Red)
     0.8,  0.8,
    -0.8,  0.8,
]);

const vertexShader = `
    struct VertexOutput {
        @builtin(position) pos: vec4f,
        @location(0) cell: vec2f
    };

    @group(0) @binding(0) var<uniform> grid: vec2f;
    @group(0) @binding(1) var<storage> cellState: array<u32>;

    @vertex
    fn vs_main(
        @location(0) pos: vec2f,
        @builtin(instance_index) instance: u32
    ) -> VertexOutput {
        let i = f32(instance);
        
        // Compute the cell coordinate from the instance_index
        let cell = vec2f(i % grid.x, floor(i / grid.x));
        let state = f32(cellState[instance]);

        let cellOffset = cell / grid * 2;

        // New: Scale the position by the cell's active state.
        let gridPos = (pos*state+1) / grid - 1 + cellOffset;

        var output: VertexOutput;
        output.pos = vec4(gridPos, 0, 1);
        output.cell = cell;

        return output;
    }
`;

const fragmentShader = `
    @fragment
    fn fs_main(
        input: VertexOutput
    ) -> @location(0) vec4f {
        return vec4f(input.cell, 1.0 - input.cell.x, 1);
    }
`;

const WORKGROUP_SIZE = 8;
const computeShader = `
    @group(0) @binding(0) var<uniform> grid: vec2f;

    @group(0) @binding(1) var<storage> cellStateIn: array<u32>;
    @group(0) @binding(2) var<storage, read_write> cellStateOut: array<u32>;

    fn cellIndex(cell: vec2u) -> u32 {
        return (cell.y % u32(grid.y)) * u32(grid.x) +
                (cell.x % u32(grid.x));
    }
  
    fn cellActive(x: u32, y: u32) -> u32 {
        return cellStateIn[cellIndex(vec2(x, y))];
    }

    @compute @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
    fn cs_main(
        @builtin(global_invocation_id) cell: vec3u
    ) {
        // if (cellStateIn[cellIndex(cell.xy)] == 1) {
        //     cellStateOut[cellIndex(cell.xy)] = 0;
        // } else {
        //     cellStateOut[cellIndex(cell.xy)] = 1;
        // }
        // Determine how many active neighbors this cell has.
            let activeNeighbors = cellActive(cell.x+1, cell.y+1) +
                                  cellActive(cell.x+1, cell.y) +
                                  cellActive(cell.x+1, cell.y-1) +
                                  cellActive(cell.x, cell.y-1) +
                                  cellActive(cell.x-1, cell.y-1) +
                                  cellActive(cell.x-1, cell.y) +
                                  cellActive(cell.x-1, cell.y+1) +
                                  cellActive(cell.x, cell.y+1);

            let i = cellIndex(cell.xy);

            // Conway's game of life rules:
            switch activeNeighbors {
              case 2: { // Active cells with 2 neighbors stay active.
                cellStateOut[i] = cellStateIn[i];
              }
              case 3: { // Cells with 3 neighbors become or stay active.
                cellStateOut[i] = 1;
              }
              default: { // Cells with < 2 or > 3 neighbors become inactive.
                cellStateOut[i] = 0;
              }
            }
    }
`;


class GameOfLife {
    private readonly GRID_SIZE: number = 32;

    public step: number = 0;

    private _canvas: HTMLCanvasElement;

    private _device: GPUDevice;
    private _context: GPUCanvasContext;
    private _pipeline: GPURenderPipeline
    private _computePipeline: GPUComputePipeline;
    private _vertexBuffer: GPUBuffer;
    private _bindGroups: GPUBindGroup[];

    private _initialized: boolean = false; 

    constructor(id: string) {
        this._canvas = document.getElementById(id) as HTMLCanvasElement;
    }

    public async render() {
        if (!this._initialized) await this.initialize();

        const device = this._device;
        const context = this._context;

        const gridSize = this.GRID_SIZE;

        const commandEncoder = device.createCommandEncoder();

        // compute pass 가 먼저 실행되고 Render pass 실행
        const computePass = commandEncoder.beginComputePass();

        computePass.setPipeline(this._computePipeline),
        computePass.setBindGroup(0, this._bindGroups[this.step % 2]);

        const workgroupCount = Math.ceil(gridSize / WORKGROUP_SIZE);
        computePass.dispatchWorkgroups(workgroupCount, workgroupCount);

        computePass.end();

        this.step++;

        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: context.getCurrentTexture().createView(),
                loadOp: "clear",
                storeOp: "store",
                clearValue: { r: 0, g: 0, b: 0.4, a: 1 }
            }]
        });

        

        renderPass.setPipeline(this._pipeline);

        renderPass.setVertexBuffer(0, this._vertexBuffer);
        renderPass.setBindGroup(0, this._bindGroups[this.step % 2]);

        renderPass.draw(vertices.length / 2, gridSize * gridSize);

        renderPass.end();

        device.queue.submit([commandEncoder.finish()]);

    }

    private async initialize() {
        if (this._initialized) return;

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("No appropriate GPUAdapter found.");
        }

        const device = await adapter.requestDevice();
        
        const context = this._canvas.getContext("webgpu") as GPUCanvasContext;
        const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
        // 기기와 연결
        context.configure({
            device: device,
            format: canvasFormat
        });

        // create a vertex buffer
        const vertexBuffer = device.createBuffer({
            label: "cell vertices",
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });

        device.queue.writeBuffer(vertexBuffer, 0, vertices);

        const vertexBufferLayout = {
            arrayStride: 8,
            attributes: [{
                format:"float32x2",
                offset: 0,
                shaderLocation: 0 // Position, see vertex shader
            }]
        } as GPUVertexBufferLayout;

    
        const cellShaderModule = device.createShaderModule({
            label: "cell shader",
            code: `${vertexShader} \n ${fragmentShader}`
        })

        const bindGroupLayout = device.createBindGroupLayout({
            label: "cell bind group layout",
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
                    buffer: {} // Grid uniform buffer
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
                    buffer: { type: "read-only-storage" } // cell state input buffer
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: "storage" } // cell state output buffer
                }
            ]
        });

        const pipelineLayout = device.createPipelineLayout({
            label: "cell pipeline layout",
            bindGroupLayouts: [ bindGroupLayout ]
        })

        const cellPipeline = device.createRenderPipeline({
            label: "cell pipeline!!",
            layout: pipelineLayout,
            // layout: "auto", //pipelineLayout,
            vertex: {
                module: cellShaderModule,
                entryPoint: "vs_main",
                buffers: [vertexBufferLayout]
            },
            fragment: {
                module: cellShaderModule,
                entryPoint: "fs_main",
                targets: [{
                    format: canvasFormat
                }]
            }
        });

        // Create the compute shader that will process the game of life simulation.
        const simulationShaderModule = device.createShaderModule({
            label: "simulation shader",
            code: computeShader
        });

        // Create a compute pipeline that updates the game state.
        const simulationPipeline = device.createComputePipeline({
            label: "cell simulation pipeline",
            layout: pipelineLayout,
            compute: {
                module: simulationShaderModule,
                entryPoint: "cs_main"
            }
        });

        // create an uniform buffer
        const gridSize = this.GRID_SIZE;
        const uniformArray = new Float32Array([gridSize, gridSize]);
        const uniformBuffer = device.createBuffer({
            label: "grid uniforms",
            size: uniformArray.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        device.queue.writeBuffer(uniformBuffer, 0, uniformArray);

        // create an array representing the active state of each cell.
        const cellStateArray = new Uint32Array(gridSize * gridSize);

        // create a storage buffer to hold the cell state.
        const cellStateStorage = [
            device.createBuffer({
                label: "cell state A",
                size: cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            }),
            device.createBuffer({
                label: "cell state B",
                size: cellStateArray.byteLength,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            })
        ];

        // Mark every third cell of the first grid as active.
        // for (let i = 0; i < cellStateArray.length; i +=3) {
        //     cellStateArray[i] = 1;
        // }
        // device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);

        // Mark every other cell of the second grid as active.
        // for (let i = 0; i < cellStateArray.length; i++) {
        //     cellStateArray[i] = i % 2;
        // }
        // device.queue.writeBuffer(cellStateStorage[1], 0, cellStateArray);

        // Set each cell to a random state, then copy the JavaScript array
        // into the storage buffer.
        for (let i = 0; i < cellStateArray.length; ++i) {
            cellStateArray[i] = Math.random() > 0.6 ? 1 : 0;
        }
        device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);

        const bindGroups = [
            device.createBindGroup({
                label: "cell renderer bind group A",
                layout: bindGroupLayout,
                // layout: cellPipeline.getBindGroupLayout(0), //bindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: uniformBuffer }
                    },
                    {
                        binding: 1,
                        resource: { buffer: cellStateStorage[0] }
                    },
                    {
                        binding: 2,
                        resource: { buffer: cellStateStorage[1] }
                    }
                ]
            }),
            device.createBindGroup({
                label: "cell renderer bind group B",
                layout: bindGroupLayout,
                // layout: cellPipeline.getBindGroupLayout(0), //bindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: { buffer: uniformBuffer }
                    },
                    {
                        binding: 1,
                        resource: { buffer: cellStateStorage[1] }
                    },
                    {
                        binding: 2,
                        resource: { buffer: cellStateStorage[0] }
                    }
                ]
            })
        ];


        this._device = device;
        this._context = context;
        this._pipeline = cellPipeline;
        this._computePipeline = simulationPipeline;


        this._vertexBuffer = vertexBuffer;
        this._bindGroups = bindGroups;

        this._initialized = true;
    }
}

export default GameOfLife;