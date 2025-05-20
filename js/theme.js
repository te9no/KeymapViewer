export const themeColors = {
  light:   { normal: '#f3f4f6', special: '#e5e7eb', pressed: '#fef3c7', stroke: '#9ca3af', bg: '#ffffff', text: '#1f2937' },
  dark:    { normal: '#374151', special: '#1f2937', pressed: '#92400e', stroke: '#6b7280', bg: '#111827', text: '#ffffff' },
  blue:    { normal: '#dbeafe', special: '#bfdbfe', pressed: '#ffb347', stroke: '#60a5fa', bg: '#eff6ff', text: '#1e40af' },
  green:   { normal: '#d1fae5', special: '#a7f3d0', pressed: '#ffe066', stroke: '#34d399', bg: '#ecfdf5', text: '#065f46' },
  console: { normal: '#003300', special: '#001a00', pressed: '#00ff00', stroke: '#00ff00', bg: '#000000', text: '#00ff00' },
  myakumyaku: { normal: '#ff0000', special: '#0066cc', pressed: '#000000', stroke: '#ffffff', bg: '#0066cc', text: '#000000' }
};

export let currentTheme = 'light';
export let animationFrameId = null;

export function setCurrentTheme(theme) {
  currentTheme = theme;
}

export function setTheme(theme, onRedraw) {
  // Remove theme classes
  document.documentElement.classList.remove('light', 'dark', 'blue', 'green', 'console', 'myakumyaku');
  document.body.classList.remove('light', 'dark', 'blue', 'green', 'console', 'myakumyaku');
  
  // Add theme class
  document.documentElement.classList.add(theme);
  document.body.classList.add(theme);

  // Toggle wave ripple elements
  const ripples = ['wave-ripple-1', 'wave-ripple-2', 'wave-ripple-3'];
  ripples.forEach(id => {
    const el = document.getElementById(id);
    if (!el) {
      const div = document.createElement('div');
      div.id = id;
      div.className = 'absolute inset-0 rounded-lg opacity-50';
      div.style.animation = `wave-ripple 3s infinite ${-ripples.indexOf(id)}s`;
      document.getElementById('canvas-frame').prepend(div);
    }
  });

  // Add wave ripple animation style if not exists
  if (!document.getElementById('wave-ripple-style')) {
    const style = document.createElement('style');
    style.id = 'wave-ripple-style';
    style.textContent = `
      @keyframes wave-ripple {
        0% {
          border: 4px solid rgba(255, 0, 0, 0.5);
          transform: scale(1);
        }
        33% {
          border: 4px solid rgba(0, 255, 0, 0.5);
        }
        66% {
          border: 4px solid rgba(0, 0, 255, 0.5);
        }
        100% {
          border: 4px solid rgba(255, 0, 0, 0.5);
          transform: scale(1.2);
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Toggle wave ripple visibility
  ripples.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = theme === 'psychedelic' ? 'block' : 'none';
    }
  });
  
  // Apply theme colors
  const colors = themeColors[theme];
  document.documentElement.style.backgroundColor = colors.bg;
  document.documentElement.style.color = colors.text;
  document.body.style.backgroundColor = colors.bg;
  document.body.style.color = colors.text;

  // Update textarea colors
  const textareas = document.querySelectorAll('textarea');
  textareas.forEach(textarea => {
    textarea.style.backgroundColor = colors.special;
    textarea.style.color = colors.text;
  });

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