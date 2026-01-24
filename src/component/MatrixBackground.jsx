import React, { useEffect, useRef } from 'react';

const MatrixBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    let columns = Math.floor(width / 20);
    const drops = [];

    for (let i = 0; i < columns; i++) {
      drops[i] = Math.floor(Math.random() * -100); // Départ aléatoire pour une pluie naturelle
    }

    const draw = () => {
      // Effet de traînée : on redessine un fond semi-transparent à chaque frame
      // Couleur gray-50 (#f9fafb) avec faible opacité pour fondre avec le thème
      ctx.fillStyle = 'rgba(249, 250, 251, 0.2)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#2dd4bf'; // Couleur teal-400 du thème
      ctx.font = '15px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = String.fromCharCode(33 + Math.floor(Math.random() * 94)); // Caractères ASCII visibles

        // Variation d'opacité pour un effet plus organique et léger
        ctx.globalAlpha = Math.random() * 0.5 + 0.5;
        ctx.fillText(text, i * 20, drops[i] * 20);

        // Reset aléatoire des gouttes
        if (drops[i] * 20 > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
      ctx.globalAlpha = 1.0;
    };

    const interval = setInterval(draw, 50);

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;

      // Mise à jour des colonnes si l'écran s'agrandit
      const newColumns = Math.floor(width / 20);
      for (let i = columns; i < newColumns; i++) {
        drops[i] = Math.floor(Math.random() * -100);
      }
      columns = newColumns;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className='absolute inset-0 w-full h-full pointer-events-none'
    />
  );
};

export default MatrixBackground;
