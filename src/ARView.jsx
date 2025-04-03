import { useEffect } from 'react';
import styles from './ARView.module.css';

export function ARView() {
  useEffect(() => {
    // Prevenir comportamientos no deseados en móviles
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.position = 'fixed';

    // Cargar scripts solo si no están ya cargados
    if (!document.querySelector('script[src*="aframe"]')) {
      const loadScripts = async () => {
        // Cargar A-Frame
        await new Promise((resolve) => {
          const aframe = document.createElement('script');
          aframe.src = 'https://cdn.jsdelivr.net/gh/aframevr/aframe@1.4.0/dist/aframe-master.min.js';
          aframe.onload = resolve;
          document.head.appendChild(aframe);
        });

        // Cargar AR.js después de que A-Frame esté listo
        await new Promise((resolve) => {
          const arjs = document.createElement('script');
          arjs.src = 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar.js';
          arjs.onload = resolve;
          document.head.appendChild(arjs);
        });

        // Configurar la escena AR
        const sceneContainer = document.createElement('div');
        sceneContainer.className = styles.arScene;

        // Configurar la cámara con zoom
        let videoTrack = null;
        const setupCamera = async () => {
          try {
            const aspectRatio = window.innerWidth / window.innerHeight;
            const constraints = {
              video: {
                facingMode: 'environment',
                width: { ideal: 1920, min: 1280 },
                height: { ideal: 1080, min: 720 },
                aspectRatio: { ideal: aspectRatio },
                zoom: true
              }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            videoTrack = stream.getVideoTracks()[0];

            // Aplicar configuraciones adicionales para mejorar la calidad
            await videoTrack.applyConstraints({
              advanced: [
                { exposureMode: "continuous" },
                { focusMode: "continuous" },
                { whiteBalanceMode: "continuous" }
              ]
            });

            // Configurar el rango de zoom si está disponible
            const capabilities = videoTrack.getCapabilities();
            if (capabilities.zoom) {
              const zoomControl = document.querySelector('#zoom-control');
              if (zoomControl) {
                zoomControl.min = capabilities.zoom.min;
                zoomControl.max = capabilities.zoom.max;
                zoomControl.step = (capabilities.zoom.max - capabilities.zoom.min) / 20;
                zoomControl.value = 1;
              }
            }
          } catch (error) {
            console.error('Error al configurar la cámara:', error);
          }
        };

        setupCamera();

        sceneContainer.innerHTML = `
          <a-scene
            embedded
            arjs="sourceType: webcam; 
                  debugUIEnabled: false; 
                  detectionMode: mono_and_matrix; 
                  matrixCodeType: 3x3;
                  sourceWidth: ${window.innerWidth};
                  sourceHeight: ${window.innerHeight};
                  displayWidth: ${window.innerWidth};
                  displayHeight: ${window.innerHeight};
                  maxDetectionRate: 60;
                  canvasWidth: ${window.innerWidth};
                  canvasHeight: ${window.innerHeight};
                  patternRatio: 0.75;"
            renderer="antialias: true; alpha: true; precision: mediump;"
            vr-mode-ui="enabled: false"
            loading-screen="enabled: false"
          >
            <a-assets>
              <a-asset-item id="model" src="/logo.glb"></a-asset-item>
            </a-assets>

            <a-marker 
              preset="hiro" 
              smooth="true" 
              smoothCount="5"
              smoothTolerance="0.01"
              smoothThreshold="2"
              raycaster="objects: .clickable"
              emitevents="true"
              cursor="fuse: false; rayOrigin: mouse;"
            >
              <a-entity
                position="0 0.1 0"
                scale="0.08 0.08 0.08"
                rotation="-90 0 0"
                gltf-model="#model"
                class="clickable"
                visible="true"
                animation-mixer="loop: repeat"
              >
                <a-entity
                  animation="property: rotation; from: 0 0 0; to: 0 360 0; dur: 8000; easing: linear; loop: true"
                ></a-entity>
              </a-entity>
            </a-marker>
            <a-entity camera="fov: 80; zoom: 1;" position="0 0 0"></a-entity>
          </a-scene>
        `;

        document.body.appendChild(sceneContainer);

        // Añadir controles
        const controls = document.createElement('div');
        controls.className = styles.zoomControl;
        controls.innerHTML = `
          <div style="
            display: flex;
            align-items: center;
            gap: 15px;
            width: 100%;
            touch-action: none;
          ">
            <label for="zoom-control" style="
              font-size: 16px;
              white-space: nowrap;
              user-select: none;
            ">Zoom:</label>
            <input 
              type="range" 
              id="zoom-control" 
              min="0.5" 
              max="2" 
              step="0.1" 
              value="1"
              style="
                width: 100%;
                height: 30px;
                touch-action: none;
              "
            >
            <span id="zoom-value" style="
              font-size: 14px;
              min-width: 40px;
              user-select: none;
            ">1x</span>
          </div>
        `;

        document.body.appendChild(controls);

        // Prevenir eventos táctiles no deseados
        const preventScroll = (e) => {
          e.preventDefault();
        };

        document.body.addEventListener('touchmove', preventScroll, { passive: false });
        document.body.addEventListener('touchstart', preventScroll, { passive: false });

        // Añadir funcionalidad al control de zoom
        const zoomControl = controls.querySelector('#zoom-control');
        const zoomValue = controls.querySelector('#zoom-value');

        zoomControl.addEventListener('input', async (event) => {
          const zoomFactor = parseFloat(event.target.value);
          zoomValue.textContent = `${zoomFactor}x`;
          
          if (videoTrack && videoTrack.getCapabilities().zoom) {
            try {
              await videoTrack.applyConstraints({
                advanced: [{ zoom: zoomFactor }]
              });
            } catch (error) {
              console.error('Error al aplicar zoom:', error);
            }
          } else {
            // Fallback al zoom por escala si el zoom nativo no está disponible
            const modelEntity = document.querySelector('[gltf-model]');
            if (modelEntity) {
              const baseScale = 0.08;
              const newScale = baseScale * zoomFactor;
              modelEntity.setAttribute('scale', `${newScale} ${newScale} ${newScale}`);
            }
          }
        });

        // Manejar cambios de orientación
        const updateDimensions = () => {
          const scene = document.querySelector('a-scene');
          if (scene) {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const aspectRatio = width / height;
            
            scene.setAttribute('arjs', `
              sourceWidth: ${width};
              sourceHeight: ${height};
              displayWidth: ${width};
              displayHeight: ${height};
              canvasWidth: ${width};
              canvasHeight: ${height};
            `);

            // Actualizar también las restricciones de video si es posible
            if (videoTrack) {
              videoTrack.applyConstraints({
                width: { ideal: 1920, min: 1280 },
                height: { ideal: 1080, min: 720 },
                aspectRatio: { ideal: aspectRatio }
              }).catch(console.error);
            }
          }
        };

        window.addEventListener('resize', updateDimensions);
        window.addEventListener('orientationchange', () => {
          setTimeout(updateDimensions, 100);
        });

        return () => {
          if (sceneContainer && sceneContainer.parentNode) {
            sceneContainer.parentNode.removeChild(sceneContainer);
          }
          if (controls && controls.parentNode) {
            controls.parentNode.removeChild(controls);
          }
          document.body.removeEventListener('touchmove', preventScroll);
          document.body.removeEventListener('touchstart', preventScroll);
          window.removeEventListener('resize', updateDimensions);
          window.removeEventListener('orientationchange', updateDimensions);
          document.body.style.overflow = '';
          document.body.style.position = '';
          document.documentElement.style.overflow = '';
          document.documentElement.style.position = '';
        };
      };

      loadScripts();
    }
  }, []);

  return null;
} 