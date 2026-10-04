"use client";

import { useEffect, useRef, type ReactNode } from 'react';

export function timecode(seconds: number, fps = 24) {
  const safe = Math.max(0, seconds || 0);
  const whole = Math.floor(safe);
  const frames = Math.floor((safe - whole) * fps);
  return `${String(Math.floor(whole / 3600)).padStart(2, '0')}:${String(Math.floor((whole % 3600) / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

export function DemoPlate({ frame, playing }: { frame: number; playing: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const width = 1280;
    const height = 720;
    let request = 0;
    let localFrame = frame;
    const draw = (stamp: number) => {
      if (playing) localFrame = frame + Math.floor(stamp / 42);
      const horizon = 344;
      const glow = 0.55 + Math.sin(localFrame / 17) * 0.08;
      context.clearRect(0, 0, width, height);
      const wall = context.createLinearGradient(0, 0, 0, height);
      wall.addColorStop(0, '#111920'); wall.addColorStop(0.54, '#202c31'); wall.addColorStop(1, '#101517');
      context.fillStyle = wall; context.fillRect(0, 0, width, height);
      context.fillStyle = '#141b1e';
      context.beginPath(); context.moveTo(0, 72); context.lineTo(490, 188); context.lineTo(490, horizon); context.lineTo(0, 441); context.closePath(); context.fill();
      context.fillStyle = '#1b2529';
      context.beginPath(); context.moveTo(1280, 70); context.lineTo(774, 188); context.lineTo(774, horizon); context.lineTo(1280, 434); context.closePath(); context.fill();
      context.fillStyle = '#090e10';
      context.beginPath(); context.moveTo(0, 442); context.lineTo(490, horizon); context.lineTo(774, horizon); context.lineTo(1280, 436); context.lineTo(1280, 720); context.lineTo(0, 720); context.closePath(); context.fill();
      context.fillStyle = `rgba(218, 151, 85, ${glow * 0.16})`;
      context.beginPath(); context.ellipse(660, 367, 230, 118, 0, 0, Math.PI * 2); context.fill();
      context.strokeStyle = 'rgba(189, 199, 194, .12)'; context.lineWidth = 2;
      for (let x = 40; x < width; x += 95) { context.beginPath(); context.moveTo(640, horizon); context.lineTo(x, 720); context.stroke(); }
      for (let y = 410; y < height; y += 46) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
      context.fillStyle = '#28363a';
      for (let index = 0; index < 6; index += 1) {
        const x = 68 + index * 202;
        const top = 143 + (index % 3) * 22;
        context.fillRect(x, top, 132, 8);
        context.fillRect(x + 11, top + 8, 8, horizon - top - 20);
        context.fillRect(x + 118, top + 8, 8, horizon - top - 20);
        for (let shelf = 0; shelf < 4; shelf += 1) {
          context.fillStyle = ['#4a5550', '#5c5143', '#344b52', '#736344'][((index + shelf) % 4)];
          context.fillRect(x + 22, top + 35 + shelf * 39, 80, 27);
        }
        context.fillStyle = '#28363a'; context.fillRect(x, top + 30, 132, 5);
      }
      const beamX = 570 + Math.sin(localFrame / 26) * 88;
      const beam = context.createRadialGradient(beamX, 370, 8, beamX, 370, 170);
      beam.addColorStop(0, `rgba(249, 203, 138, ${glow * 0.44})`); beam.addColorStop(1, 'rgba(249, 203, 138, 0)');
      context.fillStyle = beam; context.fillRect(370, 210, 410, 300);
      context.fillStyle = '#0a0d0e';
      context.beginPath(); context.ellipse(658, 626, 72, 13, 0, 0, Math.PI * 2); context.fill();
      context.fillRect(637, 478, 40, 124); context.fillRect(622, 507, 70, 22);
      context.beginPath(); context.arc(657, 453, 23, 0, Math.PI * 2); context.fill();
      context.fillRect(636, 584, 18, 63); context.fillRect(662, 584, 18, 63);
      context.fillStyle = 'rgba(6, 10, 11, .3)'; context.fillRect(0, 0, width, height);
      context.fillStyle = 'rgba(255,255,255,.035)';
      for (let index = 0; index < 28; index += 1) {
        const x = (index * 197 + localFrame * (index % 3 + 1)) % width;
        const y = (index * 83 + localFrame * 0.7) % height;
        context.fillRect(x, y, 2, 2);
      }
      if (playing) request = window.requestAnimationFrame(draw);
    };
    draw(0);
    return () => window.cancelAnimationFrame(request);
  }, [frame, playing]);

  return <canvas ref={canvasRef} width={1280} height={720} className="plate-canvas" aria-label="Synthetic warehouse sample plate" />;
}

export function FilmFrame({ className = '', children }: { className?: string; children?: ReactNode }) {
  return <div className={`film-frame ${className}`}><div className="frame-safe" />{children}</div>;
}
