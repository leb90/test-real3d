import { useEffect } from 'react';

export function ARView() {
  useEffect(() => {
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

        // Crear la escena después de que los scripts estén cargados
        const sceneContainer = document.createElement('div');

        // Configurar la cámara con zoom
        let videoTrack = null;
        const setupCamera = async () => {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                facingMode: 'environment',
                zoom: true
              }
            });
            
            videoTrack = stream.getVideoTracks()[0];
            const capabilities = videoTrack.getCapabilities();
            
            // Configurar el rango de zoom si está disponible
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

        sceneContainer.style.position = 'fixed';
        sceneContainer.style.top = '0';
        sceneContainer.style.left = '0';
        sceneContainer.style.width = '100%';
        sceneContainer.style.height = '100%';
        sceneContainer.style.zIndex = '1000';
        sceneContainer.innerHTML = `
          <a-scene
            embedded
            arjs="sourceType: webcam; debugUIEnabled: false; detectionMode: mono_and_matrix; matrixCodeType: 3x3;"
            renderer="antialias: true; alpha: true"
            vr-mode-ui="enabled: false"
            loading-screen="enabled: false"
          >
            <a-assets>
              <a-asset-item id="model" src="/logo.glb"></a-asset-item>
            </a-assets>

            <a-marker 
              preset="hiro" 
              smooth="true" 
              smoothCount="10"
              smoothTolerance="0.05"
              smoothThreshold="5"
              raycaster="objects: .clickable"
              emitevents="true"
              cursor="fuse: false; rayOrigin: mouse;"
            >
              <a-entity
                position="0 0.05 0"
                scale="0.05 0.05 0.05"
                rotation="-90 0 0"
                gltf-model="#model"
                class="clickable"
                visible="true"
              >
                <a-entity
                  animation="property: rotation; from: 0 0 0; to: 0 360 0; dur: 8000; easing: linear; loop: true"
                ></a-entity>
              </a-entity>
            </a-marker>
            <a-entity camera></a-entity>
          </a-scene>
        `;
        document.body.appendChild(sceneContainer);

        // Añadir eventos para depuración
        setTimeout(() => {
          const scene = document.querySelector('a-scene');
          const marker = document.querySelector('a-marker');
          const model = document.querySelector('[gltf-model]');

          // Eventos del marcador
          marker.addEventListener('markerFound', () => {
            console.log('Marcador encontrado');
            const modelEl = marker.querySelector('[gltf-model]');
            if (modelEl) {
              modelEl.setAttribute('visible', true);
            }
          });

          marker.addEventListener('markerLost', () => {
            console.log('Marcador perdido');
            const modelEl = marker.querySelector('[gltf-model]');
            if (modelEl) {
              modelEl.setAttribute('visible', false);
            }
          });

          // Eventos del modelo
          model.addEventListener('model-loaded', () => {
            console.log('Modelo cargado correctamente');
          });

          model.addEventListener('model-error', (error) => {
            console.error('Error al cargar el modelo:', error);
          });
        }, 1000);

        // Añadir instrucciones y controles
        const controls = document.createElement('div');
        controls.style.position = 'fixed';
        controls.style.bottom = '20px';
        controls.style.left = '50%';
        controls.style.transform = 'translateX(-50%)';
        controls.style.backgroundColor = 'rgba(0,0,0,0.5)';
        controls.style.color = 'white';
        controls.style.padding = '10px 15px';
        controls.style.borderRadius = '12px';
        controls.style.zIndex = '2000';
        controls.style.width = 'auto';
        controls.style.minWidth = '200px';
        controls.style.maxWidth = '90%';
        controls.style.backdropFilter = 'blur(5px)';
        controls.innerHTML = `
          <div style="
            display: flex;
            flex-direction: column;
            gap: 12px;
            align-items: center;
            touch-action: none;
            pointer-events: auto;
          ">
            <div style="
              display: flex;
              align-items: center;
              gap: 15px;
              width: 100%;
              padding: 8px 0;
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
                  border-radius: 15px;
                  outline: none;
                  -webkit-appearance: none;
                  appearance: none;
                  background: rgba(255,255,255,0.2);
                  touch-action: none;
                  cursor: pointer;
                "
              >
              <span id="zoom-value" style="
                font-size: 14px; 
                min-width: 40px;
                user-select: none;
              ">1x</span>
            </div>
            <div style="
              font-size: 12px;
              opacity: 0.9;
              text-align: center;
              line-height: 1.4;
              user-select: none;
            ">
              <p style="margin: 0">Apunta la cámara al marcador Hiro</p>
              <a 
                href="https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/HIRO.jpg" 
                target="_blank"
                style="
                  color: #4CAF50;
                  text-decoration: underline;
                  font-size: 11px;
                  padding: 8px 4px;
                  display: inline-block;
                "
              >
                Ver Marcador
              </a>
            </div>
          </div>
        `;
        document.body.appendChild(controls);

        // Estilizar el control deslizante para móviles
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
          #zoom-control::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 25px;
            height: 25px;
            border-radius: 50%;
            background: #ffffff;
            cursor: pointer;
            border: 2px solid rgba(0,0,0,0.2);
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          }
          #zoom-control::-moz-range-thumb {
            width: 25px;
            height: 25px;
            border-radius: 50%;
            background: #ffffff;
            cursor: pointer;
            border: 2px solid rgba(0,0,0,0.2);
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          }
          #zoom-control:active::-webkit-slider-thumb {
            background: #e0e0e0;
          }
          #zoom-control:active::-moz-range-thumb {
            background: #e0e0e0;
          }
        `;
        document.head.appendChild(styleSheet);

        // Prevenir eventos táctiles no deseados
        controls.addEventListener('touchstart', (e) => {
          if (e.target.id !== 'zoom-control') {
            e.preventDefault();
          }
        }, { passive: false });

        controls.addEventListener('touchmove', (e) => {
          if (e.target.id !== 'zoom-control') {
            e.preventDefault();
          }
        }, { passive: false });

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
              // Fallback al zoom por escala
              const modelEntity = document.querySelector('[gltf-model]');
              if (modelEntity) {
                const baseScale = 0.05;
                const newScale = baseScale * zoomFactor;
                modelEntity.setAttribute('scale', `${newScale} ${newScale} ${newScale}`);
              }
            }
          } else {
            // Fallback al zoom por escala
            const modelEntity = document.querySelector('[gltf-model]');
            if (modelEntity) {
              const baseScale = 0.05;
              const newScale = baseScale * zoomFactor;
              modelEntity.setAttribute('scale', `${newScale} ${newScale} ${newScale}`);
            }
          }
        });

        return () => {
          if (sceneContainer && sceneContainer.parentNode) {
            sceneContainer.parentNode.removeChild(sceneContainer);
          }
          if (controls && controls.parentNode) {
            controls.parentNode.removeChild(controls);
          }
        };
      };

      loadScripts();
    }
  }, []);

  // Retornamos null en lugar de un div negro
  return null;
} 