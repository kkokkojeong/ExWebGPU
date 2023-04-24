// https://github.com/mrdoob/three.js/blob/4843e710b333b8d23cf011751130b089d597471c/examples/jsm/renderers/webgpu/WebGPURenderer.js
// ref: https://carmencincotti.com/2022-04-18/drawing-a-webgpu-triangle/
type ExTriangleOptions = {
    color: string; // rgba
}

//
// shader codes
//
const vertexShader = `
    struct Output {
        @builtin(position) Position : vec4<f32>,
        @location(0) vColor : vec4<f32>,
    };

    @vertex
    fn main(@builtin(vertex_index) VertexIndex: u32) -> Output {
        var pos = array<vec2<f32>, 3>(
            vec2<f32>(0.0, 0.5),
            vec2<f32>(-0.5, -0.5),
            vec2<f32>(0.5, -0.5)
        );
        var color = array<vec3<f32>, 3>(
            vec3<f32>(1.0, 0.0, 0.0),
            vec3<f32>(0.0, 1.0, 0.0),
            vec3<f32>(0.0, 0.0, 1.0)
        );
        

        var output: Output;

        output.Position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
        output.vColor = vec4<f32>(color[VertexIndex], 1.0);

        return output;
    }
`;
const fragmentShader = `
    @fragment
    fn main(@location(0) vColor: vec4<f32>) -> @location(0) vec4<f32> {
        return vColor;
    }
`;

class ExTriangle {

    private _canvas: HTMLCanvasElement;
    private _options: ExTriangleOptions;

    // WebGPU
    private _adapter: GPUAdapter | null = null;
    private _device: GPUDevice | null = null;
    private _context: GPUCanvasContext | null = null;
    private _pipeline: GPURenderPipeline | null = null;

    private _initialized: boolean = false;

    constructor(canvasId: string, options: ExTriangleOptions) {
        this._canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this._options = options;
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
        renderPass.draw(3, 1, 0, 0);
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

        this.configureContext();

        this.createRenderPipeline();

        this._initialized = true;
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
                entryPoint: "main"
            },
            fragment: {
                module: device.createShaderModule({
                    code: fragmentShader
                }),
                entryPoint: "main",
                targets: [{
                    format: "bgra8unorm"
                }]
            }
        });
    }
}

export default ExTriangle;
