export const themeColors = {
  light:   { normal: '#f3f4f6', special: '#e5e7eb', pressed: '#fef3c7', stroke: '#9ca3af', bg: '#ffffff', text: '#1f2937' },
  dark:    { normal: '#374151', special: '#1f2937', pressed: '#92400e', stroke: '#6b7280', bg: '#111827', text: '#ffffff' },
  blue:    { normal: '#dbeafe', special: '#bfdbfe', pressed: '#ffb347', stroke: '#60a5fa', bg: '#eff6ff', text: '#1e40af' },
  green:   { normal: '#d1fae5', special: '#a7f3d0', pressed: '#ffe066', stroke: '#34d399', bg: '#ecfdf5', text: '#065f46' },
  console: { normal: '#003300', special: '#001a00', pressed: '#00ff00', stroke: '#00ff00', bg: '#000000', text: '#00ff00' },
  myakumyaku: { normal: '#ff0000', special: '#0066cc', pressed: '#ff69b4', stroke: '#ffffff', bg: '#0066cc', text: '#ffffff' },
  psychedelic: { 
    normal: '#ff1493', 
    special: '#00ff00', 
    pressed: '#ff00ff',
    stroke: '#ffffff',
    bg: 'rainbow',
    text: '#ffffff'
  }
};

export let currentTheme = 'light';
export let animationFrameId = null;

export function setCurrentTheme(theme) {
  currentTheme = theme;
}

export function setTheme(theme, onRedraw) {
  document.body.classList.remove('light', 'dark', 'blue', 'green', 'console', 'myakumyaku', 'psychedelic');
  document.body.classList.add(theme);
  setCurrentTheme(theme);

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (theme === 'psychedelic' && onRedraw) {
    function animate() {
      if (document.body.classList.contains('psychedelic')) {
        onRedraw();
        animationFrameId = requestAnimationFrame(animate);
      }
    }
    animate();
  }
}