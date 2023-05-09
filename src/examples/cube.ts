import { vec3, mat4 } from "gl-matrix";
import {vertices, colors, indices} from "../data/cube-vertices-colors-indices";
// import {vertices, colors} from "../data/cube-vertices-colors";
import Transform from "../transform/transform";
import WebGPUHelper from "../util/WebGPUHelper";

//
// shader codes
//
const vertexShader = `
    struct Output {
        @builtin(position) Position : vec4<f32>,
        @location(0) vColor : vec4<f32>,
    };

    @binding(0) @group(0) var<uniform> modelViewProj : mat4x4<f32>;

    @vertex
    fn main(@location(0) pos: vec4<f32>, @location(1) color: vec4<f32>) -> Output {
        var output: Output;

        output.Position = modelViewProj * pos;
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

class ExCube {
    private _canvas: HTMLCanvasElement;

    // WebGPU
    private _adapter: GPUAdapter | null = null;
    private _device: GPUDevice | null = null;
    private _context: GPUCanvasContext | null = null;
    private _pipeline: GPURenderPipeline | null = null;

    private _vertexBuffer: GPUBuffer | null = null;
    private _colorBuffer: GPUBuffer | null = null;
    private _indexBuffer: GPUBuffer | null = null;

    private _uniformBuffer: GPUBuffer | null = null;
    private _uniformBindGroup: GPUBindGroup | null = null;

    // rotation for animation
    private _rotation: vec3 = [0, 0, 0];

    private _initialized: boolean = false;

    constructor(canvasId: string) {
        this._canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        console.log(vertices, colors);
    }

    public setRotation(rotation: vec3) {
        this._rotation = rotation;
    }

    public async render() {
        if (!this._initialized) await this.initialize();
        
        const device = this._device as GPUDevice;
        const context = this._context as GPUCanvasContext;
        const pipeline = this._pipeline as GPURenderPipeline;

        const commandEncoder = device.createCommandEncoder();

        const textureView = context.getCurrentTexture().createView();
        const depthTexture = device.createTexture({
            size: [this._canvas.width, this._canvas.height, 1],
            format: "depth24plus",
            usage: GPUTextureUsage.RENDER_ATTACHMENT
        });

        const renderPass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: textureView,
                clearValue: { r: 0.8, g: 0.8, b: 0.8, a: 1.0 }, // background color
                loadOp: 'clear',
                storeOp: 'store'
            }],
            // for 3d, set depth buffer
            depthStencilAttachment: {
                view: depthTexture.createView(),
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: "store",
                /*stencilClearValue: 0,
                stencilLoadValue: 0,
                stencilLoadOp: 'clear',
                stencilStoreOp: "store"*/
            }
        });

        // const numOfVertices = vertices.length / 3; // 18 / 3(x,y,z)
        const numOfVertices = indices.length;
        const aspectRatio = this._canvas.width / this._canvas.height;

        // uniforms
        const mvp = mat4.create();

        const m = Transform.getModelMatrix(undefined, this._rotation, undefined);

        // test model matrix...
        // const m = Transform.getModelMatrix([0, 0, 0], [0, 0, 0], [0.5, 0.5, 0.5]);

        const p = Transform.getProjectionMatrix(60, aspectRatio, 0.1, 100);
        // const v = Transform.getCameraMatrix([0, 0, 3], [0, 0, 0], [0, 1, 0]);
        const v = Transform.getCameraMatrix([2, 2, 4], [0, 0, 0], [0, 1, 0]);

        mat4.multiply(mvp, p, v);
        mat4.multiply(mvp, mvp, m);

        this.createUniformBufferBinding();

        device.queue.writeBuffer(this._uniformBuffer as GPUBuffer, 0, mvp as ArrayBuffer);

        renderPass.setPipeline(pipeline);

        // draw vertices using buffer
        renderPass.setVertexBuffer(0, this._vertexBuffer);
        renderPass.setVertexBuffer(1, this._colorBuffer);

        renderPass.setIndexBuffer(this._indexBuffer as GPUBuffer, "uint32");

        // binding unifrom
        renderPass.setBindGroup(0, this._uniformBindGroup);

        // renderPass.draw(numOfVertices);

        renderPass.drawIndexed(numOfVertices);

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

        this.createVerticesAndColors();

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

    private createVerticesAndColors() {
        const device = this._device;
        if (!device) {
            return;
        }

        this._vertexBuffer = WebGPUHelper.createBuffer(device, vertices, GPUBufferUsage.VERTEX);
        this._colorBuffer = WebGPUHelper.createBuffer(device, colors, GPUBufferUsage.VERTEX);
        
        this._indexBuffer = WebGPUHelper.createBuffer(device, indices, GPUBufferUsage.INDEX);
    }

    private createUniformBufferBinding() {
        const device = this._device;
        const pipeline = this._pipeline;
        if (!device || !pipeline) {
            return;
        }

        this._uniformBuffer = device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this._uniformBindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this._uniformBuffer,
                        offset: 0,
                        size: 64
                    }
                }
            ]
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
                        arrayStride: 12,
                        attributes: [{
                            shaderLocation: 0,
                            format: "float32x3",
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
                // stripIndexFormat: undefined, // "uint32"
                cullMode: "back", // back-culling
            },
            depthStencil: {
                format: "depth24plus",
                depthWriteEnabled: true,
                depthCompare: "less"
            }
        });
    }
}

export default ExCube;