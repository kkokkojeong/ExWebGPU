import {CubeData} from "../data/cube-vertices-colors-indices";
import WebGPUHelper from "../util/WebGPUHelper";

//
// shader codes
//
const vertexShader = `
    struct Output {
        @builtin(position) position : vec4<f32>,
        @location(0) texcoord: vec2f,
    }

    @vertex
    fn main(
        @builtin(vertex_index) vertexIndex : u32
    ) -> Output {
        var pos = array(
            // 1st triangle
            vec2f( 0.0,  0.0),  // center
            vec2f( 1.0,  0.0),  // right, center
            vec2f( 0.0,  1.0),  // center, top
  
            // 2st triangle
            vec2f( 0.0,  1.0),  // center, top
            vec2f( 1.0,  0.0),  // right, center
            vec2f( 1.0,  1.0),  // right, top
        );
        
        var vsOutput: Output;
        let xy = pos[vertexIndex];
        vsOutput.position = vec4f(xy, 0.0, 1.0);
        vsOutput.texcoord = xy;
        return vsOutput;
    }
`;

const fragmentShader = `
    struct Input {
        @builtin(position) position : vec4<f32>,
        @location(0) texcoord: vec2f,
    }

    @group(0) @binding(0) var ourSampler: sampler;
    @group(0) @binding(1) var ourTexture: texture_2d<f32>;

    @fragment
    fn main(
        fsInput: Input
    ) -> @location(0) vec4<f32> {
        // return vec4<f32>(1.0, 0.0, 0.0, 1.0);
        return textureSample(ourTexture, ourSampler, fsInput.texcoord);
    }
`;

class ExTextureMapping {
    private _canvas: HTMLCanvasElement;

    private _adapter: GPUAdapter | null;
    private _device: GPUDevice | null;
    private _context: GPUCanvasContext | null;
    private _format: GPUTextureFormat;
    private _pipeline: GPURenderPipeline | null;
    private _bindGroup: GPUBindGroup | null;

    private _initialized: boolean = false;

    constructor(id: string) {
        this._canvas = document.getElementById(id) as HTMLCanvasElement;

        // by device pixel ratio
        const w = this._canvas.width;
        const h = this._canvas.height;

        this._canvas.style.width = `${w}px`;
        this._canvas.style.height = `${h}px`;
        this._canvas.width = w * devicePixelRatio || 1;
        this._canvas.height = h * devicePixelRatio || 1;
    }

    public async render() {
        const start = performance.now();
        
        if (!this._initialized) await this.initialize();

        const device = this._device as GPUDevice;
        const context = this._context as GPUCanvasContext;
        const pipeline = this._pipeline as GPURenderPipeline;
        const bindGroup = this._bindGroup;

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
        renderPass.setBindGroup(0, bindGroup);
        renderPass.draw(9, 1, 0, 0);
        renderPass.end();

        device.queue.submit([commandEncoder.finish()]);

        const end = performance.now();
        const elapsedTime = (end - start) / 1000;

        console.info(`elapsedTime: ${elapsedTime}ms`);
    }

    private async initialize() {
        if (this._initialized) return;

        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            return;
        }

        const device = await adapter.requestDevice();
        const context = this._canvas.getContext("webgpu");
        const format = navigator.gpu.getPreferredCanvasFormat();
        context?.configure({
            device,
            format,
        });

        this._adapter = adapter;
        this._device = device;
        this._context = context;
        this._format = format;

        const pipeline = device.createRenderPipeline({
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
            },
            primitive: {
                topology: "triangle-list", // "triangle-strip",
                stripIndexFormat: undefined, // "uint32"
            }
        });

        const kTextureWidth = 5;
        const kTextureHeight = 7;
        const _ = [255,   0,   0, 255];  // red
        const y = [255, 255,   0, 255];  // yellow
        const b = [  0,   0, 255, 255];  // blue
        const textureData = new Uint8Array([
            b, _, _, _, _,
            _, y, y, y, _,
            _, y, _, _, _,
            _, y, y, _, _,
            _, y, _, _, _,
            _, y, _, _, _,
            _, _, _, _, _,
        ].flat());

        const texture = device.createTexture({
            label: 'yellow F on red',
            size: [kTextureWidth, kTextureHeight],
            format: 'rgba8unorm',
            usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST,
        });
        device.queue.writeTexture(
            { texture },
            textureData,
            { bytesPerRow: kTextureWidth * 4 },
            { width: kTextureWidth, height: kTextureHeight },
        );

        const sampler = device.createSampler();

        const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: texture.createView() },
            ],
        });

        this._bindGroup = bindGroup;

    
        this._pipeline = pipeline;

        this._initialized = true;
    } 
}

export default ExTextureMapping;
