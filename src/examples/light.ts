
import WebGPUHelper from "../util/WebGPUHelper";
import {CubeData} from "../data/cube-vertices-colors-indices";
import { mat4, vec4 } from "gl-matrix";
import Transform from "../transform/transform";

//
// shader codes
//
const vertexShader = `
    struct Output {
        @builtin(position) position : vec4<f32>,
        @location(0) v_position : vec4<f32>,
        @location(1) v_normal: vec4<f32>,
    };

    @binding(0) @group(0) var<uniform> u_modelViewProj : mat4x4<f32>;
    @binding(1) @group(0) var<uniform> u_normal : mat4x4<f32>;

    @vertex
    fn main(@location(0) pos: vec4<f32>, @location(1) normal: vec4<f32>) -> Output {
        var output: Output;

        output.v_position = pos;
        output.v_normal = u_normal * normal; 

        // it is nessary to output position!!
        output.position = u_modelViewProj * pos;

        return output;
    }
`;
const fragmentShader = `

    @binding(2) @group(0) var<uniform> u_light_pos: vec4<f32>;
    @binding(3) @group(0) var<uniform> u_light_color: vec4<f32>;

    @fragment
    fn main(@location(0) v_position: vec4<f32>, @location(1) v_normal: vec4<f32>) -> @location(0) vec4<f32> {
        // using phong shading 
        // https://en.wikipedia.org/wiki/Phong_shading
        var N: vec3<f32> = normalize(v_normal.xyz);
        var L: vec3<f32> = normalize(u_light_pos.xyz - v_position.xyz);

        var diffuse: f32 = max(dot(N, L), 0.0);
        
        return u_light_color * diffuse;
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

    private _modelViewProjBuffer: GPUBuffer;
    private _normalMatBuffer: GPUBuffer;
    private _lightPosBuffer: GPUBuffer;
    private _lightColorBuffer: GPUBuffer;

    private _bindGroup: GPUBindGroup;

    private _initialized: boolean = false;

    private cube: {positions: Float32Array, normals: Float32Array} = CubeData();

    constructor(id: string) {
        this._canvas = document.getElementById(id) as HTMLCanvasElement;
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

        const numOfVertices = this.cube.positions.length / 3;
        const aspectRatio = this._canvas.width / this._canvas.height;

        console.log(this._canvas.width)

        console.log(numOfVertices);

        //
        // camera, projection properties
        //
        const mvp = mat4.create();

        const m = Transform.getModelMatrix(undefined, undefined, undefined);
        const p = Transform.getProjectionMatrix(60, aspectRatio, 0.1, 100);
        const v = Transform.getCameraMatrix([2, 2, 4], [0, 0, 0], [0, 1, 0]);
        
        mat4.multiply(mvp, p, v);
        mat4.multiply(mvp, mvp, m);

        const n = mat4.create();    // normal matrix
        mat4.invert(n, m);
        mat4.transpose(n, n);

        //
        // light properties
        //
        const lightPosition = vec4.fromValues(2, 2, 4, 1);
        const lightColor = vec4.fromValues(1.0, 0, 0, 1);

        // buffer on vertex shader
        device.queue.writeBuffer(this._modelViewProjBuffer as GPUBuffer, 0, mvp as ArrayBuffer);
        device.queue.writeBuffer(this._normalMatBuffer as GPUBuffer, 0, n as ArrayBuffer);

        // buffer on fragment shader
        device.queue.writeBuffer(this._lightPosBuffer as GPUBuffer, 0, lightPosition as ArrayBuffer);
        device.queue.writeBuffer(this._lightColorBuffer as GPUBuffer, 0, lightColor as ArrayBuffer);


        //
        // start rendering
        //
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

        renderPass.setPipeline(pipeline);

        // draw vertices using buffer
        renderPass.setVertexBuffer(0, this._vertexBuffer);
        renderPass.setVertexBuffer(1, this._normalBuffer);

        // binding unifrom
        renderPass.setBindGroup(0, this._bindGroup);    // model-view-projection matrix
        renderPass.setBindGroup(1, this._bindGroup);    // normal matrix
        renderPass.setBindGroup(2, this._bindGroup);    // light position
        renderPass.setBindGroup(3, this._bindGroup);    // light color

        renderPass.draw(numOfVertices);

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
        console.log(this.cube)
        this._vertexBuffer = WebGPUHelper.createBuffer(device, this.cube.positions, GPUBufferUsage.VERTEX);
        this._normalBuffer = WebGPUHelper.createBuffer(device, this.cube.normals, GPUBufferUsage.VERTEX);

        // create uniform buffer
        this._modelViewProjBuffer = device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this._normalMatBuffer = device.createBuffer({
            size: 64,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this._lightPosBuffer = device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this._lightColorBuffer = device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        // bind group layout
        const uniformBindGroupLayout = device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: 'uniform'
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: 'uniform'
                    }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'uniform'
                    }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.FRAGMENT,
                    buffer: {
                        type: 'uniform'
                    }
                }
            ]
        })

        this._bindGroup = device.createBindGroup({
            layout: uniformBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this._modelViewProjBuffer,
                        offset: 0,
                        size: 64
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this._modelViewProjBuffer,
                        offset: 0,
                        size: 64
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this._lightPosBuffer,
                        offset: 0,
                        size: 16
                    }
                },
                {
                    binding: 3,
                    resource: {
                        buffer: this._lightColorBuffer,
                        offset: 0,
                        size: 16
                    }
                }
            ]
        });

        // render pipeline
        this._pipeline = device.createRenderPipeline({
            // layout: "auto",
            layout: device.createPipelineLayout({
                bindGroupLayouts: [uniformBindGroupLayout]
            }),
            vertex: {
                module: device.createShaderModule({
                    code: vertexShader
                }),
                entryPoint: "main",
                // if use GPU buffers, the buffers property is a must
                buffers: [
                    // vertices
                    {
                        arrayStride: 12,
                        attributes: [{
                            shaderLocation: 0,
                            format: "float32x3",
                            offset: 0
                        }]
                    },
                    // normals
                    {
                        arrayStride: 12,
                        attributes: [{
                            shaderLocation: 1,
                            format: "float32x3",
                            offset: 0
                        }]
                    }
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