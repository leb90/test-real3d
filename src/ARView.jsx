import { useEffect } from 'react';

export function ARView() {
  useEffect(() => {
    const loadScripts = async () => {
      if (document.querySelector('script[src*="aframe"]')) return;

      // Adapter WebRTC (imprescindible)
      await new Promise(resolve => {
        const script = document.createElement('script');
        script.src = 'https://webrtc.github.io/adapter/adapter-latest.js';
        script.onload = resolve;
        document.head.appendChild(script);
      });

      // A-Frame
      await new Promise(resolve => {
        const script = document.createElement('script');
        script.src = 'https://aframe.io/releases/1.0.4/aframe.min.js';
        script.onload = resolve;
        document.head.appendChild(script);
      });

      // AR.js
      await new Promise(resolve => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar.js';
        script.onload = resolve;
        document.head.appendChild(script);
      });

      // Componente switch-camera (registrado en A-Frame, exactamente igual al repo funcional)
      AFRAME.registerComponent("switch-camera", {
        init: function () {
          this.selectedCamera = "environment";
          this.video = document.querySelector("#arjs-video");
          navigator.mediaDevices.enumerateDevices();
          this.createBtn();
        },
        createBtn: function () {
          const btn = document.createElement('button');
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

      // Crear escena AR
      const div = document.createElement('div');
      div.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1000;';
      div.innerHTML = `
        <a-scene embedded switch-camera
          arjs="sourceType:webcam;debugUIEnabled:false;detectionMode:mono_and_matrix;matrixCodeType:3x3_HAMMING63;"
          renderer="antialias:true; alpha:true; logarithmicDepthBuffer:true;"
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
        </a-scene>
      `;
      document.body.appendChild(div);

      // Añadir video necesario explícitamente
      const video = document.createElement('video');
      video.id = 'arjs-video';
      video.style.display = 'none';
      document.body.appendChild(video);

      // Control zoom mediante escala
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
      document.querySelector('a-scene').addEventListener('loaded', () => document.body.appendChild(controls));

      controls.querySelector('#zoom-control').oninput = e => {
        const zoom = e.target.value;
        controls.querySelector('#zoom-value').textContent = `${zoom}x`;
        const model = document.querySelector('[gltf-model]');
        if (model) model.setAttribute('scale', `${0.05 * zoom} ${0.05 * zoom} ${0.05 * zoom}`);
      };

      // Limpiar al desmontar
      return () => [div, controls, video].forEach(el => el.remove());
    };

    loadScripts();
  }, []);

  return null;
}
