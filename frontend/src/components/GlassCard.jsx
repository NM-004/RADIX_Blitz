import React from 'react';

export default function GlassCard({ children, className = '', hoverEffect = false, ...props }) {
  return (
    <div 
      className={`glass-card rounded-2xl p-6 transition-all duration-300 ${
        hoverEffect ? 'hover:shadow-glass-hover hover:border-radix-primary/30 hover:-translate-y-1' : 'shadow-glass'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
