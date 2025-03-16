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

    // Variables para el control de la cámara
    let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    let initialOrientation = null;
    let isOrientationActive = false;
    let cameraActive = false;

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
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
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

    // Variables para el seguimiento de movimiento
    let lastAcceleration = { x: 0, y: 0, z: 0 };
    let velocity = { x: 0, y: 0, z: 0 };
    const damping = 0.95; // Factor de amortiguación
    let isTracking = false;

    // Función para manejar el movimiento del dispositivo
    function handleDeviceMotion(event) {
      if (!model || !isTracking) return;

      const acceleration = event.accelerationIncludingGravity;
      if (!acceleration) return;

      // Calcular el cambio en la aceleración
      const deltaX = acceleration.x - lastAcceleration.x;
      const deltaY = acceleration.y - lastAcceleration.y;
      const deltaZ = acceleration.z - lastAcceleration.z;

      // Actualizar velocidad con amortiguación
      velocity.x = (velocity.x + deltaX * 0.1) * damping;
      velocity.y = (velocity.y + deltaY * 0.1) * damping;
      velocity.z = (velocity.z + deltaZ * 0.1) * damping;

      // Actualizar posición del modelo
      model.position.x += velocity.x;
      model.position.y += velocity.y;
      model.position.z += velocity.z;

      // Actualizar última aceleración
      lastAcceleration = {
        x: acceleration.x,
        y: acceleration.y,
        z: acceleration.z
      };

      // Mantener el modelo dentro de límites razonables
      const maxDistance = 5;
      model.position.x = THREE.MathUtils.clamp(model.position.x, -maxDistance, maxDistance);
      model.position.y = THREE.MathUtils.clamp(model.position.y, -maxDistance, maxDistance);
      model.position.z = THREE.MathUtils.clamp(model.position.z, -maxDistance, maxDistance);

      // Hacer que el modelo mire hacia la cámara
      model.lookAt(camera.position);
    }

    // Función para manejar la orientación del dispositivo
    function handleDeviceOrientation(event) {
      if (!model || !isOrientationActive) return;

      const alpha = event.alpha || 0;
      const beta = event.beta || 0;
      const gamma = event.gamma || 0;

      if (!initialOrientation) {
        initialOrientation = { alpha, beta, gamma };
        isTracking = true;
        return;
      }

      // Actualizar la rotación del modelo
      const eulerRotation = new THREE.Euler(
        beta * Math.PI / 180,
        alpha * Math.PI / 180,
        -gamma * Math.PI / 180,
        'YXZ'
      );
      model.quaternion.setFromEuler(eulerRotation);
    }

    // Función para iniciar la cámara
    async function startCamera() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        if (videoDevices.length === 0) {
          throw new Error('No se encontraron cámaras disponibles');
        }

        // Crear selector de cámara
        const cameraSelect = document.createElement('select');
        cameraSelect.style.position = 'fixed';
        cameraSelect.style.top = '80px';
        cameraSelect.style.left = '50%';
        cameraSelect.style.transform = 'translateX(-50%)';
        cameraSelect.style.zIndex = '1000';
        cameraSelect.style.padding = '8px';
        cameraSelect.style.borderRadius = '4px';

        videoDevices.forEach((device, index) => {
          const option = document.createElement('option');
          option.value = device.deviceId;
          option.text = device.label || `Cámara ${index + 1}`;
          cameraSelect.appendChild(option);
        });

        containerRef.current.appendChild(cameraSelect);

        // Función para cambiar de cámara
        async function switchCamera() {
          try {
            if (video.srcObject) {
              const tracks = video.srcObject.getTracks();
              tracks.forEach(track => track.stop());
            }

            const stream = await navigator.mediaDevices.getUserMedia({
              video: {
                deviceId: { exact: cameraSelect.value },
                facingMode: isMobile ? 'environment' : 'user',
                width: { ideal: window.innerWidth },
                height: { ideal: window.innerHeight }
              }
            });

            video.srcObject = stream;
            await video.play();

            // Solicitar permisos de orientación y movimiento en iOS
            if (isMobile && typeof DeviceOrientationEvent.requestPermission === 'function') {
              const permission = await DeviceOrientationEvent.requestPermission();
              if (permission === 'granted') {
                window.addEventListener('deviceorientation', handleDeviceOrientation);
                window.addEventListener('devicemotion', handleDeviceMotion);
                isOrientationActive = true;
              }
            } else {
              window.addEventListener('deviceorientation', handleDeviceOrientation);
              window.addEventListener('devicemotion', handleDeviceMotion);
              isOrientationActive = true;
            }

            instructions.innerHTML = 'Mueve el dispositivo para mover el modelo en el espacio.';
          } catch (error) {
            console.error('Error al cambiar de cámara:', error);
            instructions.innerHTML = 'Error al cambiar de cámara. Por favor, intenta de nuevo.';
          }
        }

        cameraSelect.addEventListener('change', switchCamera);
        await switchCamera();

      } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        instructions.innerHTML = 'Error al acceder a la cámara. Por favor, asegúrate de haber dado los permisos necesarios.';
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
      try {
        startButton.disabled = true;
        startButton.textContent = 'Iniciando...';
        await startCamera();
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
        <li>Presiona "Iniciar Visualización 3D"</li>
        <li>Selecciona tu cámara preferida</li>
        <li>Mueve el dispositivo para mover el modelo</li>
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
      window.removeEventListener('deviceorientation', handleDeviceOrientation);
      window.removeEventListener('devicemotion', handleDeviceMotion);
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

