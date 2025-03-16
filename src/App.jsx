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
      model.position.set(0, 0, -2);
      scene.add(model);
    });

    // Variables para el seguimiento del dispositivo
    let initialOrientation = null;
    const DISTANCE_FROM_OBJECT = 2;

    // Función para manejar la orientación del dispositivo
    function handleDeviceOrientation(event) {
      if (!model) return;

      // Convertir grados a radianes
      const alpha = event.alpha * (Math.PI / 180);
      const beta = event.beta * (Math.PI / 180);
      const gamma = event.gamma * (Math.PI / 180);

      if (!initialOrientation) {
        initialOrientation = { alpha, beta, gamma };
        return;
      }

      // Calcular el cambio en la orientación
      const deltaAlpha = alpha - initialOrientation.alpha;
      const deltaBeta = beta - initialOrientation.beta;

      // Calcular la nueva posición de la cámara
      camera.position.x = DISTANCE_FROM_OBJECT * Math.sin(deltaAlpha);
      camera.position.y = DISTANCE_FROM_OBJECT * Math.sin(deltaBeta);
      camera.position.z = DISTANCE_FROM_OBJECT * Math.cos(deltaAlpha);

      // Mantener la cámara mirando hacia el modelo
      camera.lookAt(model.position);
    }

    // Función para iniciar la cámara
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: window.innerWidth },
            height: { ideal: window.innerHeight }
          } 
        });
        video.srcObject = stream;
        await video.play();
      } catch (error) {
        console.error('Error al acceder a la cámara:', error);
      }
    }

    // Función para iniciar el seguimiento de orientación
    async function startDeviceOrientation() {
      try {
        if (typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
          // Para iOS 13+
          const response = await DeviceOrientationEvent.requestPermission();
          if (response === 'granted') {
            window.addEventListener('deviceorientation', handleDeviceOrientation, true);
          }
        } else {
          // Para otros dispositivos
          window.addEventListener('deviceorientation', handleDeviceOrientation, true);
        }
      } catch (error) {
        console.error('Error al configurar la orientación:', error);
      }
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
    startButton.textContent = 'Iniciar Visualización 3D';
    startButton.onclick = async () => {
      await startCamera();
      await startDeviceOrientation();
      startButton.style.display = 'none';
    };
    containerRef.current.appendChild(startButton);

    // Función de animación
    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }

    // Iniciar animación
    animate();

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
    instructions.innerHTML = 'Presiona el botón y mueve el dispositivo alrededor del objeto para verlo desde diferentes ángulos';
    containerRef.current.appendChild(instructions);

    // Limpiar al desmontar
    return () => {
      window.removeEventListener('deviceorientation', handleDeviceOrientation, true);
      if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
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

