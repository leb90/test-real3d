import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import QRCode from 'qrcode.react';

// Componente para la página principal
function Home() {
  const arURL = `${window.location.origin}/ar-view`;
  
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      padding: '20px',
      textAlign: 'center',
      backgroundColor: '#f0f0f0'
    }}>
      <h1>Visualizador de Modelo 3D</h1>
      <p style={{ marginBottom: '20px' }}>
        Escanea el código QR o haz clic en el enlace para ver el modelo 3D.
        Podrás verlo en realidad aumentada.
      </p>
      <div style={{ 
        margin: '20px',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <QRCode 
          value={arURL}
          size={256}
          level="H"
        />
      </div>
      <a 
        href={arURL} 
        style={{ 
          wordBreak: 'break-all',
          color: '#0066cc',
          textDecoration: 'none',
          marginTop: '10px'
        }}
      >
        Abrir visualizador AR
      </a>
    </div>
  );
}

// Componente para la vista AR
function ARView() {
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
              zoomControl.min = capabilities.zoom.min;
              zoomControl.max = capabilities.zoom.max;
              zoomControl.step = (capabilities.zoom.max - capabilities.zoom.min) / 20;
              zoomControl.value = 1;
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
              <a-asset-item id="model" src="./logo.glb"></a-asset-item>
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
            gap: 8px;
            align-items: center;
          ">
            <div style="
              display: flex;
              align-items: center;
              gap: 10px;
              width: 100%;
              padding: 5px 0;
            ">
              <label for="zoom-control" style="font-size: 14px; white-space: nowrap;">Zoom:</label>
              <input 
                type="range" 
                id="zoom-control" 
                min="0.5" 
                max="2" 
                step="0.1" 
                value="1"
                style="
                  width: 100%;
                  height: 20px;
                  border-radius: 10px;
                  outline: none;
                "
              >
              <span id="zoom-value" style="font-size: 12px; min-width: 30px;">1x</span>
            </div>
            <div style="
              font-size: 11px;
              opacity: 0.9;
              text-align: center;
              margin-top: 5px;
              line-height: 1.3;
            ">
              <p style="margin: 0">Apunta la cámara al marcador Hiro</p>
              <a 
                href="https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/HIRO.jpg" 
                target="_blank"
                style="
                  color: #4CAF50;
                  text-decoration: underline;
                  font-size: 10px;
                "
              >
                Ver Marcador
              </a>
            </div>
          </div>
        `;
        document.body.appendChild(controls);

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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ar-view" element={<ARView />} />
      </Routes>
    </Router>
  );
}

export default App;

