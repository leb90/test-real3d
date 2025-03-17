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

            <a-marker preset="hiro" smooth="true" smoothCount="5">
              <a-entity
                position="0 0.5 0"
                scale="0.5 0.5 0.5"
                rotation="-90 0 0"
                gltf-model="#model"
                animation="property: rotation; to: -90 360 0; dur: 5000; easing: linear; loop: true"
              ></a-entity>
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

        // Añadir instrucciones
        const instructions = document.createElement('div');
        instructions.style.position = 'fixed';
        instructions.style.top = '20px';
        instructions.style.left = '50%';
        instructions.style.transform = 'translateX(-50%)';
        instructions.style.backgroundColor = 'rgba(0,0,0,0.7)';
        instructions.style.color = 'white';
        instructions.style.padding = '15px';
        instructions.style.borderRadius = '8px';
        instructions.style.zIndex = '2000';
        instructions.innerHTML = `
          <p style="margin: 0 0 10px 0">Apunta la cámara al marcador Hiro para ver el modelo 3D</p>
          <p style="margin: 0 0 10px 0; font-size: 12px;">Asegúrate de que el marcador esté bien iluminado y visible</p>
          <a 
            href="https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/HIRO.jpg" 
            target="_blank"
            style="
              display: inline-block;
              background-color: white;
              color: black;
              padding: 8px 16px;
              text-decoration: none;
              border-radius: 4px;
              font-size: 14px;
            "
          >
            Ver Marcador Hiro
          </a>
        `;
        document.body.appendChild(instructions);

        return () => {
          if (sceneContainer && sceneContainer.parentNode) {
            sceneContainer.parentNode.removeChild(sceneContainer);
          }
          if (instructions && instructions.parentNode) {
            instructions.parentNode.removeChild(instructions);
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

