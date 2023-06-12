
import WebGPUHelper from "../util/WebGPUHelper";
import {vertices, normals, indices} from "../data/cube-vertices-colors-indices";

class ExLight {

    private _canvas: HTMLCanvasElement;

    private _adapter: GPUAdapter | null;
    private _device: GPUDevice | null;
    private _context: GPUCanvasContext | null;
    private _format: GPUTextureFormat;

    private _vertexBuffer: GPUBuffer;
    private _nomralBuffer: GPUBuffer;
    private _indexBuffer: GPUBuffer;

    private _initialized: boolean = false;

    constructor(id: string) {
        this._canvas = document.getElementById(id) as HTMLCanvasElement;

        console.log(vertices, vertices.length / 3);
    }

    public async render() {
        const start = performance.now();

        if (!this._initialized) await this.initialize();

        
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
        this._nomralBuffer = WebGPUHelper.createBuffer(device, normals, GPUBufferUsage.VERTEX);
        this._indexBuffer = WebGPUHelper.createBuffer(device, indices, GPUBufferUsage.INDEX);

        // render pipeline



        this._initialized = true;
    }
}

export default ExLight;