//
// shader codes

import WebGPUHelper from "../util/WebGPUHelper";

//
const vertexShader = `
    struct Output {
        @builtin(position) Position : vec4<f32>,
        @location(0) vColor : vec4<f32>,
    };

    @vertex
    fn main(@location(0) pos: vec4<f32>, @location(1) color: vec4<f32>) -> Output {
        var output: Output;

        output.Position = pos;
        output.vColor = color;

        return output;
    }
`;
const fragmentShader = `
    @fragment
    fn main(@location(0) vColor: vec4<f32>) -> @location(0) vec4<f32> {
        return vColor;
    }
`;

class ExSquare {

    private _canvas: HTMLCanvasElement;

    // WebGPU
    private _adapter: GPUAdapter | null = null;
    private _device: GPUDevice | null = null;
    private _context: GPUCanvasContext | null = null;
    private _pipeline: GPURenderPipeline | null = null;

    private _vertexBuffer: GPUBuffer | null = null;
    private _colorBuffer: GPUBuffer | null = null;
    private _indexBuffer: GPUBuffer | null = null;

    private _initialized: boolean = false;

    constructor(canvasId: string) {
        this._canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    }

    public async render() {
        if (!this._initialized) await this.initialize();
        
        const device = this._device as GPUDevice;
        const context = this._context as GPUCanvasContext;
        const pipeline = this._pipeline as GPURenderPipeline;

        const commandEncoder = device.createCommandEncoder();
        const textureView = context.getCurrentTexture().createView();
        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.8, g: 0.8, b: 0.8, a: 1.0 }, // background color
                loadOp: 'clear',
                storeOp: 'store'
            }]
        });

        renderPass.setPipeline(pipeline);

        // draw vertices using buffer
        renderPass.setVertexBuffer(0, this._vertexBuffer);
        renderPass.setVertexBuffer(1, this._colorBuffer);

        // using indices
        renderPass.setIndexBuffer(this._indexBuffer as GPUBuffer, "uint32");

        // renderPass.draw(6);

        // draw using indcies
        renderPass.drawIndexed(6);

        renderPass.end();

        device.queue.submit([commandEncoder.finish()]);
    }

    private async initialize() {
        if (this._initialized) return;

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("WebGPURenderer: Unable to create WebGPU adapter.");
        }

        const device = await adapter.requestDevice();

        const context = this._canvas.getContext("webgpu");
        
        this._adapter = adapter;
        this._device = device;
        this._context = context;

        this.createVerticesAndColors();

        this.configureContext();

        this.createRenderPipeline();

        this._initialized = true;
    }

    private createVerticesAndColors() {
        const device = this._device;
        if (!device) {
            return;
        }

        // square data
        // const vertices = new Float32Array([
        //     -0.5, -0.5,  // vertex a
        //      0.5, -0.5,  // vertex b
        //     -0.5,  0.5,  // vertex d
        //     -0.5,  0.5,  // vertex d
        //      0.5, -0.5,  // vertex b
        //      0.5,  0.5,  // vertex c
        // ]);
        // const colors = new Float32Array([
        //     1, 0, 0,    // vertex a: red
        //     0, 1, 0,    // vertex b: green
        //     1, 1, 0,    // vertex d: yellow
        //     1, 1, 0,    // vertex d: yellow
        //     0, 1, 0,    // vertex b: green
        //     0, 0, 1     // vertex c: blue
        // ]);

        // using index buffer
        const vertices = new Float32Array([
            -0.5, -0.5,  // vertex a
             0.5, -0.5,  // vertex b
             0.5,  0.5,  // vertex c
            -0.5,  0.5,  // vertex d
        ]);
        const colors = new Float32Array([
            1, 0, 0,    // vertex a: red
            0, 1, 0,    // vertex b: green
            0, 0, 1,    // vertex b: green
            1, 1, 1     // vertex c: blue
        ]);
        const indices = new Uint32Array([0, 1, 3, 3, 1, 2]);

        this._vertexBuffer = WebGPUHelper.createBuffer(device, vertices, GPUBufferUsage.VERTEX);
        this._indexBuffer = WebGPUHelper.createBuffer(device, indices, GPUBufferUsage.INDEX);
        this._colorBuffer = WebGPUHelper.createBuffer(device, colors, GPUBufferUsage.VERTEX);
    }

    private configureContext() {
        const device = this._device;
        const context = this._context;
        if (!device || !context) {
            return;
        }

        context.configure({
            device,
            format: "bgra8unorm",
            alphaMode: "opaque"
        });
    }

    private createRenderPipeline() {
        const device = this._device;
        if (!device) {
            return;
        }

        this._pipeline = device.createRenderPipeline({
            layout: "auto",
            vertex: {
                module: device.createShaderModule({
                    code: vertexShader
                }),
                entryPoint: "main",
                // if use GPU buffers, the buffers property is a must
                buffers: [
                    {
                        arrayStride: 8,
                        attributes: [{
                            shaderLocation: 0,
                            format: "float32x2",
                            offset: 0
                        }]
                    },
                    {
                        arrayStride: 12,
                        attributes: [{
                            shaderLocation: 1,
                            format: "float32x3",
                            offset: 0
                        }]
                    },
                ]
            },
            fragment: {
                module: device.createShaderModule({
                    code: fragmentShader
                }),
                entryPoint: "main",
                targets: [{
                    format: "bgra8unorm"
                }]
            },
            primitive: {
                topology: "triangle-list", // "triangle-strip",
                stripIndexFormat: undefined, // "uint32"
            }
        });
    }
}

export default ExSquare;
