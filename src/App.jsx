import { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import QRCode from 'qrcode.react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

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
        Podrás rotarlo y hacer zoom para verlo desde todos los ángulos.
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
        Abrir visualizador 3D
      </a>
    </div>
  );
}

// Componente para la vista AR
function ARView() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Crear escena Three.js
    const scene = new THREE.Scene();
    
    // Configurar cámara
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    // Configurar renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.xr.enabled = true; // Habilitar WebXR

    // Variables para AR
    let xrSession = null;
    let xrRefSpace = null;
    let hitTestSource = null;
    let modelPlaced = false;

    // Añadir luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    // Crear contenedor principal
    const mainContainer = document.createElement('div');
    mainContainer.style.position = 'relative';
    mainContainer.style.width = '100%';
    mainContainer.style.height = '100%';
    containerRef.current.appendChild(mainContainer);

    // Agregar video
    const video = document.createElement('video');
    video.style.position = 'absolute';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'cover';
    video.style.zIndex = '0';
    mainContainer.appendChild(video);

    // Agregar canvas del renderer
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '1';
    mainContainer.appendChild(renderer.domElement);

    // Cargar modelo 3D
    const loader = new GLTFLoader();
    let model = null;
    loader.load('./logo.glb', (gltf) => {
      model = gltf.scene;
      model.scale.set(0.05, 0.05, 0.05);
      model.position.set(0, 0, 0);
      scene.add(model);
    });

    // Función para iniciar AR
    async function startAR() {
      try {
        if (!navigator.xr) {
          instructions.innerHTML = 'WebXR no está disponible en tu navegador';
          return;
        }

        // Verificar soporte de AR
        const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
        if (!isSupported) {
          instructions.innerHTML = 'AR no está soportado en tu dispositivo';
          return;
        }

        // Iniciar sesión AR
        xrSession = await navigator.xr.requestSession('immersive-ar', {
          requiredFeatures: ['hit-test', 'local-floor'],
          optionalFeatures: ['dom-overlay'],
          domOverlay: { root: containerRef.current }
        });

        // Configurar renderer para AR
        await renderer.xr.setSession(xrSession);

        // Configurar espacio de referencia
        xrRefSpace = await xrSession.requestReferenceSpace('local-floor');
        const hitTestSourceInit = {
          space: await xrSession.requestReferenceSpace('viewer')
        };
        hitTestSource = await xrSession.requestHitTestSource(hitTestSourceInit);

        // Actualizar instrucciones
        instructions.innerHTML = 'Apunta al suelo para colocar el modelo';

        // Manejar fin de sesión
        xrSession.addEventListener('end', () => {
          xrSession = null;
          hitTestSource = null;
          modelPlaced = false;
          instructions.innerHTML = 'Sesión AR finalizada';
        });

        // Iniciar bucle de renderizado AR
        renderer.setAnimationLoop(renderAR);

      } catch (error) {
        console.error('Error al iniciar AR:', error);
        instructions.innerHTML = 'Error al iniciar AR. Asegúrate de usar un dispositivo y navegador compatibles.';
      }
    }

    // Función de renderizado AR
    function renderAR(timestamp, frame) {
      if (!frame) return;

      // Obtener pose
      const pose = frame.getViewerPose(xrRefSpace);
      if (!pose) return;

      if (!modelPlaced && hitTestSource) {
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length > 0) {
          const hit = hitTestResults[0];
          const hitPose = hit.getPose(xrRefSpace);

          if (model && hitPose) {
            // Colocar modelo en la posición del hit test
            model.position.set(
              hitPose.transform.position.x,
              hitPose.transform.position.y,
              hitPose.transform.position.z
            );
            modelPlaced = true;
            instructions.innerHTML = 'Modelo colocado. Muévete alrededor para verlo.';
          }
        }
      }

      // Renderizar escena
      renderer.render(scene, camera);
    }

    // Botón para iniciar la experiencia
    const startButton = document.createElement('button');
    startButton.style.position = 'fixed';
    startButton.style.bottom = '20px';
    startButton.style.left = '50%';
    startButton.style.transform = 'translateX(-50%)';
    startButton.style.padding = '15px 30px';
    startButton.style.backgroundColor = '#0066cc';
    startButton.style.color = 'white';
    startButton.style.border = 'none';
    startButton.style.borderRadius = '25px';
    startButton.style.fontSize = '16px';
    startButton.style.zIndex = '1000';
    startButton.textContent = 'Iniciar AR';
    
    // Manejar clic del botón
    startButton.onclick = async () => {
      try {
        startButton.disabled = true;
        startButton.textContent = 'Iniciando...';
        await startAR();
        startButton.style.display = 'none';
      } catch (error) {
        console.error('Error:', error);
        startButton.disabled = false;
        startButton.textContent = 'Reintentar';
        instructions.innerHTML = 'Error al iniciar. Por favor, intenta de nuevo.';
      }
    };
    
    containerRef.current.appendChild(startButton);

    // Instrucciones
    const instructions = document.createElement('div');
    instructions.style.position = 'fixed';
    instructions.style.top = '20px';
    instructions.style.left = '50%';
    instructions.style.transform = 'translateX(-50%)';
    instructions.style.backgroundColor = 'rgba(0,0,0,0.7)';
    instructions.style.color = 'white';
    instructions.style.padding = '15px';
    instructions.style.borderRadius = '8px';
    instructions.style.textAlign = 'center';
    instructions.style.maxWidth = '300px';
    instructions.style.zIndex = '1000';
    instructions.innerHTML = `
      <p style="margin: 0 0 10px 0">Instrucciones:</p>
      <ul style="text-align: left; margin: 0; padding-left: 20px;">
        <li>Presiona "Iniciar AR"</li>
        <li>Apunta al suelo donde quieras colocar el modelo</li>
        <li>Una vez colocado, muévete alrededor para verlo</li>
      </ul>
    `;
    containerRef.current.appendChild(instructions);

    // Función de animación
    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }

    // Iniciar animación
    animate();

    // Limpiar al desmontar
    return () => {
      if (xrSession) {
        xrSession.end();
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} style={{ 
      width: '100vw', 
      height: '100vh', 
      overflow: 'hidden',
      backgroundColor: 'transparent',
      position: 'relative'
    }} />
  );
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

