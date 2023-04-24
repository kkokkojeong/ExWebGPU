class WebGPUHelper {
    static isAvailable(): boolean {
        return !!navigator.gpu;
    }

    static createBuffer(device: GPUDevice, data: Float32Array): GPUBuffer {
        const buffer = device.createBuffer({
            size: data.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true
        });

        new Float32Array(buffer.getMappedRange()).set(data);
        buffer.unmap();

        return buffer;
    }
}

export default WebGPUHelper;