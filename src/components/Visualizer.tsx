
import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isActive: boolean;
  isUserTalking: boolean;
  isModelTalking: boolean;
  isMuted?: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ isActive, isUserTalking, isModelTalking, isMuted }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let frame = 0;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const w = canvas.width;
      const h = canvas.height;
      const midY = h / 2;
      
      if (isActive && !isMuted) {
        const numBars = 16;
        const barWidth = 2;
        const barSpacing = 5;
        const totalWidth = numBars * (barWidth + barSpacing);
        const startX = (w - totalWidth) / 2;
        
        const baseIntensity = isUserTalking ? 12 : isModelTalking ? 14 : 2;

        for (let i = 0; i < numBars; i++) {
          const x = startX + i * (barWidth + barSpacing);
          const distFromCenter = Math.abs(i - (numBars - 1) / 2);
          const falloff = 1 - (distFromCenter / (numBars / 1.5));
          
          let amplitude = baseIntensity * falloff;
          if (isUserTalking || isModelTalking) {
             amplitude *= (Math.sin(frame * 0.15 + i * 0.4) * 0.6 + 0.8);
          } else {
             amplitude *= (Math.sin(frame * 0.05 + i * 0.3) * 0.2 + 0.5);
          }

          const barHeight = Math.max(2, amplitude);
          
          ctx.beginPath();
          ctx.fillStyle = isUserTalking ? 'rgba(34, 211, 238, 0.8)' : 'rgba(255, 255, 255, 0.6)';
          // Draw centered vertically
          ctx.roundRect(x, midY - barHeight / 2, barWidth, barHeight, 1);
          ctx.fill();
        }
      } else {
        // Subtle dots for idle/muted
        ctx.fillStyle = isMuted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.2)';
        const dots = 3;
        const dotSpacing = 8;
        const startX = (w - (dots * dotSpacing)) / 2;
        for (let i = 0; i < dots; i++) {
          ctx.beginPath();
          ctx.arc(startX + i * dotSpacing, midY, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [isActive, isUserTalking, isModelTalking, isMuted]);

  return (
    <canvas 
      ref={canvasRef} 
      width={120} 
      height={30} 
      className="opacity-90"
    />
  );
};

export default Visualizer;
