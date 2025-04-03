import { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import QRCode from 'qrcode.react';
import styles from './ARView.module.css';

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
      backgroundColor: '#f0f0f0',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%'
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

// Componente para el control de zoom
function ZoomControl({ onZoomChange }) {
  const [zoomValue, setZoomValue] = useState(1);
  
  const handleZoomChange = (e) => {
    const newValue = parseFloat(e.target.value);
    setZoomValue(newValue);
    onZoomChange(newValue);
  };
  
  return (
    <div className={styles.zoomControlContainer}>
      <div className={styles.zoomSliderContainer}>
        <label htmlFor="zoom-control" className={styles.zoomLabel}>Zoom:</label>
        <input
          type="range"
          id="zoom-control"
          min="0.5"
          max="2"
          step="0.1"
          value={zoomValue}
          onChange={handleZoomChange}
          className={styles.zoomSlider}
        />
        <span className={styles.zoomValue}>{zoomValue}x</span>
      </div>
      <div className={styles.zoomInstructions}>
        <p style={{ margin: 0 }}>Apunta la cámara al marcador Hiro</p>
        <a
          href="https://raw.githubusercontent.com/AR-js-org/AR.js/master/data/images/HIRO.jpg"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.markerLink}
        >
          Ver Marcador
        </a>
      </div>
    </div>
  );
}

// Componente para la vista AR
function ARView() {
  const [isScriptsLoaded, setIsScriptsLoaded] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isMarkerFound, setIsMarkerFound] = useState(false);
  const [error, setError] = useState(null);
  const [mirrorMode, setMirrorMode] = useState(true); // Por defecto, modo espejo
  const videoTrackRef = useRef(null);
  const sceneRef = useRef(null);
  const markerRef = useRef(null);
  const modelRef = useRef(null);
  
  // Cargar scripts de A-Frame y AR.js
  useEffect(() => {
    const loadScripts = async () => {
      try {
        // Cargar A-Frame
        if (!document.querySelector('script[src*="aframe"]')) {
          await new Promise((resolve) => {
            const aframe = document.createElement('script');
            aframe.src = 'https://cdn.jsdelivr.net/gh/aframevr/aframe@1.4.0/dist/aframe-master.min.js';
            aframe.onload = resolve;
            document.head.appendChild(aframe);
          });
        }
        
        // Cargar AR.js
        if (!document.querySelector('script[src*="ar.js"]')) {
          await new Promise((resolve) => {
            const arjs = document.createElement('script');
            arjs.src = 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar.js';
            arjs.onload = resolve;
            document.head.appendChild(arjs);
          });
        }
        
        setIsScriptsLoaded(true);
        console.log("Scripts cargados correctamente");
      } catch (error) {
        console.error('Error al cargar scripts:', error);
        setError('Error al cargar los scripts necesarios');
      }
    };
    
    loadScripts();
    
    return () => {
      // Limpieza al desmontar
      if (videoTrackRef.current) {
        videoTrackRef.current.stop();
      }
    };
  }, []);
  
  // Configurar la cámara
  useEffect(() => {
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
        
        videoTrackRef.current = stream.getVideoTracks()[0];
        console.log("Cámara configurada correctamente");
      } catch (error) {
        console.error('Error al configurar la cámara:', error);
        setError('Error al acceder a la cámara');
      }
    };
    
    if (isScriptsLoaded) {
      setupCamera();
    }
  }, [isScriptsLoaded]);
  
  // Manejar cambios de zoom
  const handleZoomChange = async (zoomFactor) => {
    if (videoTrackRef.current && videoTrackRef.current.getCapabilities().zoom) {
      try {
        await videoTrackRef.current.applyConstraints({
          advanced: [{ zoom: zoomFactor }]
        });
      } catch (error) {
        console.error('Error al aplicar zoom:', error);
      }
    } else if (modelRef.current) {
      // Fallback al zoom por escala si el zoom nativo no está disponible
      const baseScale = 0.05;
      const newScale = baseScale * zoomFactor;
      modelRef.current.setAttribute('scale', `${newScale} ${newScale} ${newScale}`);
    }
  };
  
  // Manejar eventos de A-Frame
  useEffect(() => {
    if (!isScriptsLoaded) return;
    
    const setupAframeEvents = () => {
      // Esperar a que los elementos estén disponibles
      const checkElements = setInterval(() => {
        const scene = document.querySelector('a-scene');
        const marker = document.querySelector('a-marker');
        const model = document.querySelector('[gltf-model]');
        
        if (scene && marker && model) {
          clearInterval(checkElements);
          
          sceneRef.current = scene;
          markerRef.current = marker;
          modelRef.current = model;
          
          console.log("Elementos A-Frame encontrados:", { scene, marker, model });
          
          // Eventos del marcador
          marker.addEventListener('markerFound', () => {
            console.log('Marcador encontrado');
            setIsMarkerFound(true);
            const modelEl = marker.querySelector('[gltf-model]');
            if (modelEl) {
              modelEl.setAttribute('visible', true);
              console.log("Modelo configurado como visible");
            }
          });
          
          marker.addEventListener('markerLost', () => {
            console.log('Marcador perdido');
            setIsMarkerFound(false);
            const modelEl = marker.querySelector('[gltf-model]');
            if (modelEl) {
              modelEl.setAttribute('visible', false);
            }
          });
          
          // Eventos del modelo
          model.addEventListener('model-loaded', () => {
            console.log('Modelo cargado correctamente');
            setIsModelLoaded(true);
            model.setAttribute('visible', true);
          });
          
          model.addEventListener('model-error', (error) => {
            console.error('Error al cargar el modelo:', error);
            setError('Error al cargar el modelo 3D');
          });
          
          // Verificar si el modelo está cargado
          if (model.components['gltf-model'] && model.components['gltf-model'].model) {
            console.log('Modelo ya cargado');
            setIsModelLoaded(true);
            model.setAttribute('visible', true);
          }
        }
      }, 500);
      
      return () => clearInterval(checkElements);
    };
    
    const cleanup = setupAframeEvents();
    return () => cleanup();
  }, [isScriptsLoaded]);
  
  // Aplicar clase para corregir la orientación de la cámara
  useEffect(() => {
    if (!isScriptsLoaded) return;
    
    // Esperar a que el elemento de video esté disponible
    const checkVideo = setInterval(() => {
      const video = document.querySelector('video');
      if (video) {
        clearInterval(checkVideo);
        // Aplicar la clase según el modo seleccionado
        if (mirrorMode) {
          video.classList.add(styles.videoMirror);
          video.classList.remove(styles.videoNormal);
        } else {
          video.classList.add(styles.videoNormal);
          video.classList.remove(styles.videoMirror);
        }
      }
    }, 500);
    
    return () => clearInterval(checkVideo);
  }, [isScriptsLoaded, mirrorMode]);
  
  if (!isScriptsLoaded) {
    return (
      <div className={styles.fullScreenContainer}>
        <div className={styles.messageBox}>
          <h2>Cargando...</h2>
          <p>Por favor, espera mientras se cargan los recursos necesarios.</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={styles.fullScreenContainer}>
        <div className={styles.messageBox}>
          <h2>Error</h2>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className={styles.arContainer}>
      {/* Escena AR */}
      <div className={styles.arScene}>
        <a-scene
          embedded
          arjs="sourceType: webcam; debugUIEnabled: true; detectionMode: mono_and_matrix; matrixCodeType: 3x3; sourceWidth: 1280; sourceHeight: 960; displayWidth: window.innerWidth; displayHeight: window.innerHeight;"
          renderer="antialias: true; alpha: true"
          vr-mode-ui="enabled: false"
          loading-screen="enabled: true"
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
          <a-entity camera="userHeight: 1.6; fov: 80"></a-entity>
        </a-scene>
      </div>
      
      {/* Controles */}
      <div className={styles.zoomControl}>
        <ZoomControl onZoomChange={handleZoomChange} />
        
        {/* Control para cambiar el modo de la cámara */}
        <div style={{ 
          marginTop: '10px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '10px'
        }}>
          <label htmlFor="mirror-mode" style={{ fontSize: '14px' }}>
            Modo espejo:
          </label>
          <button
            id="mirror-mode"
            onClick={() => setMirrorMode(!mirrorMode)}
            style={{
              padding: '5px 10px',
              backgroundColor: mirrorMode ? '#4CAF50' : '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {mirrorMode ? 'Activado' : 'Desactivado'}
          </button>
        </div>
      </div>
      
      {/* Indicador de estado */}
      {!isMarkerFound && (
        <div className={styles.statusIndicator}>
          <p style={{ margin: 0 }}>Busca el marcador Hiro para ver el modelo 3D</p>
        </div>
      )}
    </div>
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

