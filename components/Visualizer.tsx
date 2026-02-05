
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
    let offset = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;
      const centerX = width / 2;
      
      offset += 0.15;

      if (isActive && !isMuted) {
        // --- Layer 1: Background faint wave ---
        ctx.beginPath();
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.12)';
        ctx.moveTo(0, centerY);
        for (let x = 0; x <= width; x += 4) {
          const amplitude = (isUserTalking || isModelTalking) ? Math.sin(x * 0.03 + offset * 0.5) * 3 : Math.sin(x * 0.02 + offset * 0.5) * 1.5;
          ctx.lineTo(x, centerY + amplitude);
        }
        ctx.stroke();

        // --- Layer 2: Main Neon Cyan Waveform ---
        ctx.beginPath();
        ctx.lineWidth = 1.8;
        
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, 'rgba(34, 211, 238, 0)');
        gradient.addColorStop(0.2, 'rgba(34, 211, 238, 0.6)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
        gradient.addColorStop(0.8, 'rgba(34, 211, 238, 0.6)');
        gradient.addColorStop(1, 'rgba(34, 211, 238, 0)');
        
        ctx.strokeStyle = gradient;
        ctx.shadowBlur = (isUserTalking || isModelTalking) ? 10 : 3;
        ctx.shadowColor = 'rgba(34, 211, 238, 0.8)';
        
        ctx.moveTo(0, centerY);
        
        for (let x = 0; x <= width; x += 2) {
          let amplitude = 0;
          if (isUserTalking || isModelTalking) {
            const intensity = isUserTalking ? 8 : 6;
            amplitude = Math.sin(x * 0.06 + offset) * intensity;
            amplitude += Math.sin(x * 0.15 - offset * 1.5) * (intensity / 3);
            
            // Taper the ends
            const taper = 1 - Math.pow(Math.abs(x - width/2) / (width/2), 2);
            amplitude *= taper;
          } else {
            // Subtle idle pulse
            amplitude = Math.sin(x * 0.02 + offset) * 1.0;
          }

          const y = centerY + amplitude;
          ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Reset shadow for subsequent drawings
        ctx.shadowBlur = 0;

        // --- Layer 3: Central Highlight Glow ---
        if (isUserTalking || isModelTalking) {
          ctx.beginPath();
          const flareRadius = 14;
          const flareGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, flareRadius);
          flareGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
          flareGradient.addColorStop(1, 'rgba(34, 211, 238, 0)');
          ctx.fillStyle = flareGradient;
          ctx.arc(centerX, centerY, flareRadius, 0, Math.PI * 2);
          ctx.fill();
        }

      } else {
        // Muted or Idle state: centered short line
        const lineLength = 40; // Reduced distance
        const startX = centerX - lineLength / 2;
        const endX = centerX + lineLength / 2;

        ctx.beginPath();
        ctx.lineWidth = 1.5;
        // Subtle gradient for the short line
        const lineGradient = ctx.createLinearGradient(startX, 0, endX, 0);
        const color = isMuted ? 'rgba(239, 68, 68, ' : 'rgba(255, 255, 255, ';
        lineGradient.addColorStop(0, `${color}0)`);
        lineGradient.addColorStop(0.5, `${color}0.3)`);
        lineGradient.addColorStop(1, `${color}0)`);
        
        ctx.strokeStyle = lineGradient;
        ctx.moveTo(startX, centerY);
        ctx.lineTo(endX, centerY);
        ctx.stroke();
        
        if (isMuted) {
           // Small Red Indicator if muted
           ctx.beginPath();
           ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
           ctx.arc(centerX, centerY, 1.2, 0, Math.PI * 2);
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
      width={100} 
      height={40} 
      className="flex-grow mx-2 opacity-90"
    />
  );
};

export default Visualizer;
