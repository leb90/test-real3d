import { useEffect } from 'react';

export function ARView() {
  function setupLogOverlay() {
    const logBox = document.createElement('div');
    logBox.id = 'log-overlay';
    logBox.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      max-height: 40%;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.8);
      color: lime;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      z-index: 9999;
      white-space: pre-wrap;
    `;
    document.body.appendChild(logBox);
  
    const appendLog = (type, args) => {
      const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' ');
      const line = document.createElement('div');
      line.textContent = `[${type.toUpperCase()}] ${msg}`;
      line.style.color = type === 'error' ? 'red' : type === 'warn' ? 'orange' : 'lime';
      logBox.appendChild(line);
      logBox.scrollTop = logBox.scrollHeight;
    };
  
    ['log', 'warn', 'error'].forEach((type) => {
      const original = console[type];
      console[type] = (...args) => {
        appendLog(type, args);
        original.apply(console, args);
      };
    });
  }
  useEffect(() => {
    const loadScripts = async () => {
      if (!window.AFRAME) {
        const addScript = (src) => new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        await addScript('https://webrtc.github.io/adapter/adapter-latest.js');
        await addScript('https://aframe.io/releases/1.0.4/aframe.min.js');
        await addScript('/aframe-ar.js?v=' + Date.now());
      }

      if (!window.AFRAME) {
        console.error('AFRAME no cargado.');
        return;
      }

      // Video oculto (imprescindible antes de la escena)
      if (!document.querySelector('#arjs-video')) {
        const video = document.createElement('video');
        video.id = 'arjs-video';
        video.style.display = 'none';
        document.body.appendChild(video);
      }

      // Registrar componente (única vez)
      if (!window.AFRAME.components['switch-camera']) {
        AFRAME.registerComponent("switch-camera", {
          init: function () {
            this.selectedCamera = "environment";
            this.video = document.querySelector("#arjs-video");
            navigator.mediaDevices.enumerateDevices();
            this.createBtn();
          },
          createBtn: function () {
            if (document.querySelector("#switch-camera-btn")) return;
            const btn = document.createElement('button');
            btn.id = "switch-camera-btn";
            btn.textContent = 'Switch Camera';
            btn.style.cssText = `
              position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
              padding:10px;z-index:2000;background:#4CAF50;color:white;border-radius:8px;border:none;
            `;
            document.body.appendChild(btn);
            btn.onclick = this.switchCam.bind(this);
          },
          switchCam: function () {
            const constraints = {
              video: { facingMode: (this.selectedCamera === 'environment') ? 'user' : 'environment' }
            };
            this.selectedCamera = constraints.video.facingMode;
            if (this.video.srcObject) {
              this.video.srcObject.getTracks().forEach(track => track.stop());
            }
            navigator.mediaDevices.getUserMedia(constraints).then(stream => {
              this.video.srcObject = stream;
              this.video.play();
              window.dispatchEvent(new CustomEvent('camera-init', { detail: { stream } }));
            }).catch(console.error);
          }
        });
      }

      // Escena AR (una sola vez)
      if (!document.querySelector('a-scene')) {
        const div = document.createElement('div');
        div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1000;';
        div.innerHTML = `
          <a-scene embedded switch-camera
            arjs="sourceType:webcam;debugUIEnabled:false;detectionMode:mono_and_matrix;matrixCodeType:3x3_HAMMING63;"
            renderer="antialias:true;alpha:true;logarithmicDepthBuffer:true;
                    colorManagement: true; 
                    sortObjects: true;
                    physicallyCorrectLights: false;
                    gammaOutput: true;
                    exposure: 2.0;"
            vr-mode-ui="enabled:false"
            loading-screen="enabled:false">
            <a-assets>
              <a-asset-item id="model" src="/scene.glb"></a-asset-item>
            </a-assets>
            <a-marker preset="hiro" smooth="true">
              <a-entity position="0 0.05 0" scale="0.05 0.05 0.05" rotation="-90 0 0"
                gltf-model="#model" class="clickable" visible="true">
                <a-animation attribute="rotation" dur="8000" to="0 360 0" repeat="indefinite"></a-animation>
              </a-entity>
            </a-marker>
            <a-entity camera></a-entity>
          </a-scene>`;
        document.body.appendChild(div);
      }

      // Limpieza correcta al desmontar
      return () => {
        ['a-scene', '#switch-camera-btn', '#arjs-video'].forEach(sel => {
          const el = document.querySelector(sel);
          if (el) el.remove();
        });
      };
    };
    setupLogOverlay();
    loadScripts();
  }, []);

  return null;
}
