import { Link } from 'react-router-dom';
import styles from './Home.module.css';

export function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoCircle}></div>
            <div className={styles.logoRect}></div>
          </div>
          <h1 className={styles.title}>El lenguaje oculto de la forma</h1>
        </div>

        <div className={styles.description}>
          <p>
            En esta muestra, la imagen es más que forma: es vibración, es poder. 
            Cada obra opera como un talismán contemporaneo, una herramienta visual 
            de transformación simbolica (o real).
          </p>
          <p>
            José Dios propone un lenguaje que conecta lo ancestral con lo urbano, 
            lo digital y lo ritual. En ese cruce, la geometría se vuelve mágica.
          </p>
        </div>

        <Link to="/ar" className={styles.arButton}>
          ABRIR VISUALIZADOR AR
        </Link>

        <div className={styles.exhibitInfo}>
          <div className={styles.venue}>
            <span>espacio cabrales</span>
            <span>mar del plata</span>
            <span>abril 2025</span>
          </div>
        </div>

        <div className={styles.instructions}>
          <p>Para ver la obra virtual:</p>
          <ol>
            <li>Presiona el botón "ABRIR VISUALIZADOR AR"</li>
            <li>Permite el acceso a la cámara</li>
            <li>Apunta al marcador HIRO para ver la obra</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 