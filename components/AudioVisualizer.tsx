import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  amplitude: number; // 0 to 1
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive, amplitude }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let currentRadius = 50;
    const baseRadius = 50;
    const maxRadius = 120;

    const render = () => {
      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // Interpolate radius based on amplitude
      const targetRadius = baseRadius + (amplitude * (maxRadius - baseRadius) * 2); 
      // Smooth transition
      currentRadius += (targetRadius - currentRadius) * 0.2;

      // Draw outer glow
      if (isActive) {
        const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius, centerX, centerY, currentRadius * 1.5);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.4)'); // Blue-500
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, currentRadius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Draw main circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, isActive ? currentRadius : baseRadius, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? '#3b82f6' : '#94a3b8'; // Blue-500 or Gray-400
      ctx.fill();

      // Draw ripple effect if active
      if (isActive && amplitude > 0.05) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.arc(centerX, centerY, currentRadius * 0.8, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, amplitude]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={300} 
      className="w-64 h-64 md:w-80 md:h-80"
    />
  );
};

export default AudioVisualizer;