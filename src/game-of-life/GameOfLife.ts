
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
    @group(0) @binding(0) var<uniform> grid: vec2f;

    @vertex
    fn vs_main(
        @location(0) pos: vec2f,
        @builtin(instance_index) instance: u32
    ) -> @builtin(position) vec4f {
        let i = f32(instance);
        // Compute the cell coordinate from the instance_index
        let cell = vec2f(i % grid.x, floor(i / grid.x));
        let cellOffset = cell / grid * 2;
        let gridPos = (pos + 1) / grid - 1 + cellOffset;

        return vec4f(gridPos, 0, 1);
    }
`;

const fragmentShader = `
    @fragment
    fn fs_main(

    ) -> @location(0) vec4f {
        return vec4f(1, 0, 0, 1);
    }
`;


class GameOfLife {
    private readonly GRID_SIZE: number = 32;

    private _canvas: HTMLCanvasElement;

    private _device: GPUDevice;
    private _context: GPUCanvasContext;
    private _pipeline: GPURenderPipeline
    private _vertexBuffer: GPUBuffer;
    private _bindGroup: GPUBindGroup;

    private _initialized: boolean = false; 

    constructor(id: string) {
        this._canvas = document.getElementById(id) as HTMLCanvasElement;
    }

    public async render() {
        await this.initialize();

        const device = this._device;
        const context = this._context;

        const gridSize = this.GRID_SIZE;

        const commandEncoder = device.createCommandEncoder();

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
        renderPass.setBindGroup(0, this._bindGroup);

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

        // create an uniform buffer
        const gridSize = this.GRID_SIZE;
        const uniformArray = new Float32Array([gridSize, gridSize]);
        const uniformBuffer = device.createBuffer({
            label: "grid uniforms",
            size: uniformArray.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        device.queue.writeBuffer(uniformBuffer, 0, uniformArray);

        const cellShaderModule = device.createShaderModule({
            label: "cell shader",
            code: `${vertexShader} \n ${fragmentShader}`
        })

        const cellPipeline = device.createRenderPipeline({
            label: "cell pipeline",
            layout: "auto",
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

        const cellBindGroup = device.createBindGroup({
            label: "cell renderer bind group",
            layout: cellPipeline.getBindGroupLayout(0),
            entries: [{
                binding: 0,
                resource: { buffer: uniformBuffer }
            }]
        });

        this._device = device;
        this._context = context;
        this._pipeline = cellPipeline;

        this._vertexBuffer = vertexBuffer;
        this._bindGroup = cellBindGroup;

        this._initialized = true;
    }
}

export default GameOfLife;