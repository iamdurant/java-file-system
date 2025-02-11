import { useState } from 'react';
import styles from './ImagePreview.module.css';

const ImagePreview = ({ src, alt }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [scale, setScale] = useState(1);

  const handleZoomIn = (e) => {
    e.stopPropagation();
    setScale(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = (e) => {
    e.stopPropagation();
    setScale(prev => Math.max(prev - 0.2, 0.5));
  };

  const handlePreviewClick = () => {
    setIsPreviewOpen(false);
    setScale(1);
  };

  const handleImageClick = (e) => {
    e.stopPropagation();
    console.log('Image clicked');
    setIsPreviewOpen(true);
  };

  return (
    <>
      <img 
        src={src} 
        alt={alt} 
        className={styles.thumbnail}
        onClick={handleImageClick}
      />
      
      {isPreviewOpen && (
        <div className={styles.previewOverlay} onClick={handlePreviewClick}>
          <div className={styles.previewControls}>
            <button onClick={handleZoomIn}>+</button>
            <button onClick={handleZoomOut}>-</button>
          </div>
          <img 
            src={src} 
            alt={alt}
            className={styles.previewImage}
            style={{ transform: `scale(${scale})` }}
          />
        </div>
      )}
    </>
  );
};

export default ImagePreview; 