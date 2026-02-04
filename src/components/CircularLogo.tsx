import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import logoZapions from '@/assets/logo-zapions.png';

interface CircularLogoProps {
  size?: number;
  className?: string;
  editable?: boolean;
  src?: string;
  alt?: string;
}

export function CircularLogo({ 
  size = 60, 
  className,
  editable = false,
  src = logoZapions,
  alt = "Bolão Zapions"
}: CircularLogoProps) {
  const [scale, setScale] = useState(1.2);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Handle zoom with wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!editable) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.max(1, Math.min(3, prev + delta)));
  }, [editable]);

  // Handle drag start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!editable) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [editable, position]);

  // Handle drag move
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !editable) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    // Limit movement based on scale
    const maxOffset = (scale - 1) * size / 2;
    setPosition({
      x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, newY))
    });
  }, [isDragging, dragStart, scale, size, editable]);

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle touch events for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!editable) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
  }, [editable, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || !editable) return;
    const touch = e.touches[0];
    
    const newX = touch.clientX - dragStart.x;
    const newY = touch.clientY - dragStart.y;
    
    const maxOffset = (scale - 1) * size / 2;
    setPosition({
      x: Math.max(-maxOffset, Math.min(maxOffset, newX)),
      y: Math.max(-maxOffset, Math.min(maxOffset, newY))
    });
  }, [isDragging, dragStart, scale, size, editable]);

  // Add global mouse listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Reset position when scale changes to keep image within bounds
  useEffect(() => {
    const maxOffset = (scale - 1) * size / 2;
    setPosition(prev => ({
      x: Math.max(-maxOffset, Math.min(maxOffset, prev.x)),
      y: Math.max(-maxOffset, Math.min(maxOffset, prev.y))
    }));
  }, [scale, size]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden rounded-full bg-muted flex-shrink-0",
        editable && "cursor-move",
        className
      )}
      style={{ 
        width: size, 
        height: size,
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className="absolute w-full h-full object-cover select-none pointer-events-none"
        style={{
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          transformOrigin: 'center center',
        }}
        draggable={false}
      />
      
      {/* Circular border overlay */}
      <div 
        className="absolute inset-0 rounded-full ring-2 ring-border/20 pointer-events-none"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)' }}
      />
    </div>
  );
}
