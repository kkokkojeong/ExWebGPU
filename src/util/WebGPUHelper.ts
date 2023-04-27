class WebGPUHelper {
    static isAvailable(): boolean {
        return !!navigator.gpu;
    }

    static createBuffer(device: GPUDevice, data: Float32Array | Uint32Array, usage: GPUBufferUsageFlags = GPUBufferUsage.VERTEX): GPUBuffer {
        const buffer = device.createBuffer({
            size: data.byteLength,
            usage: usage,
            mappedAtCreation: true
        });

        const TypedArray = data instanceof Float32Array ? Float32Array : Uint32Array;


        new TypedArray(buffer.getMappedRange()).set(data);
        buffer.unmap();

        return buffer;
    }
}

export default WebGPUHelper;