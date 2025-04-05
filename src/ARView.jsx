import { useEffect } from 'react';

export function ARView() {
  useEffect(() => {
    const loadScripts = async () => {
      if (document.querySelector('script[src*="aframe"]')) return;

      // 1) WebRTC Adapter (imprescindible)
      await new Promise((resolve) => {
        const adapterScript = document.createElement('script');
        adapterScript.src = 'https://webrtc.github.io/adapter/adapter-latest.js';
        adapterScript.onload = resolve;
        document.head.appendChild(adapterScript);
      });

      // 2) A-Frame
      await new Promise((resolve) => {
        const aframe = document.createElement('script');
        aframe.src = 'https://cdn.jsdelivr.net/gh/aframevr/aframe@1.4.0/dist/aframe-master.min.js';
        aframe.onload = resolve;
        document.head.appendChild(aframe);
      });

      // 3) AR.js
      await new Promise((resolve) => {
        const arjs = document.createElement('script');
        arjs.src = 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar.js';
        arjs.onload = resolve;
        document.head.appendChild(arjs);
      });

      // 4) Elemento video oculto (requerido por AR.js y cambio de cámara)
      const videoEl = document.createElement('video');
      videoEl.id = 'arjs-video';
      videoEl.style.display = 'none';
      document.body.appendChild(videoEl);

      // 5) Escena AR completa
      const sceneContainer = document.createElement('div');
      sceneContainer.style.cssText = `
        position:fixed;top:0;left:0;width:100%;height:100%;z-index:1000;
      `;
      sceneContainer.innerHTML = `
        <a-scene embedded
          arjs="sourceType:webcam;debugUIEnabled:false;detectionMode:mono_and_matrix;matrixCodeType:3x3;"
          renderer="antialias: true; 
                    alpha: true; 
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
              <a-animation attribute="rotation" dur="8000"
                to="0 360 0" repeat="indefinite"></a-animation>
            </a-entity>
          </a-marker>
          <a-entity camera></a-entity>
        </a-scene>
      `;
      document.body.appendChild(sceneContainer);

      // 6) Botón Switch Camera (funcionalidad tomada del repo)
      const switchCameraBtn = document.createElement('button');
      switchCameraBtn.textContent = 'Switch Camera';
      switchCameraBtn.style.cssText = `
        position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
        padding:10px;z-index:2000;background:#4CAF50;color:white;border-radius:8px;border:none;
      `;
      document.body.appendChild(switchCameraBtn);

      let currentFacingMode = 'environment';

      switchCameraBtn.onclick = () => {
        currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';

        navigator.mediaDevices.getUserMedia({
          video: { facingMode: currentFacingMode }
        }).then(stream => {
          const oldStream = videoEl.srcObject;
          if (oldStream) oldStream.getTracks().forEach(t => t.stop());

          videoEl.srcObject = stream;
          videoEl.play();

          const event = new CustomEvent('camera-init', { detail: { stream } });
          window.dispatchEvent(event);
        }).catch(console.error);
      };

      // 7) Control de zoom mediante escala del modelo
      const controls = document.createElement('div');
      controls.style.cssText = `
        position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
        padding:10px;background:rgba(0,0,0,0.5);color:white;border-radius:12px;z-index:2000;
      `;
      controls.innerHTML = `
        <label style="margin-right:10px;">Zoom:</label>
        <input type="range" min="0.5" max="2" step="0.1" value="1" id="zoom-control">
        <span id="zoom-value">1x</span>
      `;

      // Insertar controles cuando escena cargue completamente
      document.querySelector('a-scene').addEventListener('loaded', () => {
        document.body.appendChild(controls);
      });

      const zoomControl = controls.querySelector('#zoom-control');
      const zoomValue = controls.querySelector('#zoom-value');

      zoomControl.addEventListener('input', () => {
        const zoomFactor = zoomControl.value;
        zoomValue.textContent = `${zoomFactor}x`;

        const modelEntity = document.querySelector('[gltf-model]');
        if (modelEntity) {
          const baseScale = 0.05;
          const newScale = baseScale * zoomFactor;
          modelEntity.setAttribute('scale', `${newScale} ${newScale} ${newScale}`);
        }
      });

      // 8) Limpiar todo al desmontar componente
      return () => {
        [sceneContainer, controls, switchCameraBtn, videoEl].forEach(el => el.remove());
      };
    };

    loadScripts();
  }, []);

  return null;
}
