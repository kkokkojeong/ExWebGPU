import WebGPUHelper from "./util/WebGPUHelper";

// check if WebGPU is available
if (!WebGPUHelper.isAvailable()) {
    console.log(document.getElementById("gpu-check"));
    const el = document.getElementById("gpu-check");
    if (el) {
        el.innerHTML = `Your current browser does not support WebGPU! Make sure you are on a system 
            with WebGPU enabled. Currently, WebGPU is supported in  
            <a href="https://www.google.com/chrome/canary/">Chrome canary</a>
            with the flag "enable-unsafe-webgpu" enabled. See the 
            <a href="https://github.com/gpuweb/gpuweb/wiki/Implementation-Status"> 
            Implementation Status</a> page for more details.   
            You can also use your regular Chrome to try a pre-release version of WebGPU via
            <a href="https://developer.chrome.com/origintrials/#/view_trial/118219490218475521">Origin Trial</a>.                
        `;
    }
}
