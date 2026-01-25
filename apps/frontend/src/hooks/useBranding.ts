import { useEffect } from 'react';
import type { LandingPageBusiness } from '@easyrate/shared';

/**
 * Injects business branding colors as CSS custom properties
 * This allows the landing page to use the business's primary color
 */
export function useBranding(business: LandingPageBusiness | null) {
  useEffect(() => {
    if (!business?.branding.primaryColor) return;

    const root = document.documentElement;
    const color = business.branding.primaryColor;

    // Convert hex to HSL for Tailwind CSS custom properties
    const hsl = hexToHSL(color);
    if (hsl) {
      root.style.setProperty('--primary', `${String(hsl.h)} ${String(hsl.s)}% ${String(hsl.l)}%`);
    }

    // Cleanup on unmount or color change
    return () => {
      root.style.removeProperty('--primary');
    };
  }, [business?.branding.primaryColor]);
}

/**
 * Convert hex color to HSL values
 */
function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex values
  let r: number, g: number, b: number;

  if (hex.length === 3) {
    r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
    g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
    b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else {
    return null;
  }

  // Convert to 0-1 range
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}
