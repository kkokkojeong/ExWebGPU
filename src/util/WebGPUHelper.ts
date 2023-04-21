class WebGPUHelper {
    static isAvailable(): boolean {
        return !!navigator.gpu;
    }
}

export default WebGPUHelper;