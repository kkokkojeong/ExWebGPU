
import WebGPUHelper from "../util/WebGPUHelper";
import {vertices, normals, indices} from "../data/cube-vertices-colors-indices";
import { mat4 } from "gl-matrix";
import Transform from "../transform/transform";

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
    fn main(@location(0) pos: vec4<f32>) -> Output {
        var output: Output;

        output.Position = modelViewProj * pos;
        output.vColor = vec4<f32>(1.0, 1.0, 0.0, 1.0);

        return output;
    }
`;
const fragmentShader = `
    @fragment
    fn main(@location(0) vColor: vec4<f32>) -> @location(0) vec4<f32> {
        return vColor;
    }
`;

class ExLight {

    private _canvas: HTMLCanvasElement;

    private _adapter: GPUAdapter | null;
    private _device: GPUDevice | null;
    private _context: GPUCanvasContext | null;
    private _format: GPUTextureFormat;
    private _pipeline: GPURenderPipeline | null;

    private _vertexBuffer: GPUBuffer;
    private _normalBuffer: GPUBuffer;
    private _indexBuffer: GPUBuffer;

    private _initialized: boolean = false;

    constructor(id: string) {
        this._canvas = document.getElementById(id) as HTMLCanvasElement;

        console.log(vertices, vertices.length / 3);
    }

    public async render() {
        const start = performance.now();

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

        const numOfVertices = indices.length;
        const aspectRatio = this._canvas.width / this._canvas.height;

        const mvp = mat4.create();

        const m = Transform.getModelMatrix(undefined, undefined, undefined);
        const p = Transform.getProjectionMatrix(60, aspectRatio, 0.1, 100);
        const v = Transform.getCameraMatrix([2, 2, 4], [0, 0, 0], [0, 1, 0]);
        
        mat4.multiply(mvp, p, v);
        mat4.multiply(mvp, mvp, m);

        const uniformBuffer = device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        const uniformBindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: uniformBuffer,
                        offset: 0,
                        size: 64
                    }
                }
            ]
        });

        device.queue.writeBuffer(uniformBuffer as GPUBuffer, 0, mvp as ArrayBuffer);

        renderPass.setPipeline(pipeline);

        // draw vertices using buffer
        renderPass.setVertexBuffer(0, this._vertexBuffer);
        // renderPass.setVertexBuffer(1, this._colorBuffer);

        renderPass.setIndexBuffer(this._indexBuffer as GPUBuffer, "uint32");

        // binding unifrom
        renderPass.setBindGroup(0, uniformBindGroup);

        renderPass.drawIndexed(numOfVertices);

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
            alphaMode: 'opaque'
        });

        this._adapter = adapter;
        this._device = device;
        this._context = context;
        this._format = format;

        // create buffer, color
        this._vertexBuffer = WebGPUHelper.createBuffer(device, vertices, GPUBufferUsage.VERTEX);
        this._normalBuffer = WebGPUHelper.createBuffer(device, normals, GPUBufferUsage.VERTEX);
        this._indexBuffer = WebGPUHelper.createBuffer(device, indices, GPUBufferUsage.INDEX);

        // render pipeline
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
                ]
            },
            fragment: {
                module: device.createShaderModule({
                    code: fragmentShader
                }),
                entryPoint: "main",
                targets: [{
                    format: format
                }]
            },
            primitive: {
                topology: "triangle-list",
                cullMode: "back"
            },
            depthStencil:{
                format: "depth24plus",
                depthWriteEnabled: true,
                depthCompare: "less"
            }
        });

        this._initialized = true;
    }
}

export default ExLight;