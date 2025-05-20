import * as Keyboard from './keyboard.js';
import * as Renderer from './renderer.js';
import * as Theme from './theme.js';
import { updateLog } from './utils.js';
import { KeyboardManager } from './keyboard.js';

let keyStates = {};
let lastPressedKeyCenter = null;

// Initialize at the top level
let keyboardManager = null;

// キー状態管理
let keyRects = []; // キーごとの描画情報
let animationFrameId = null;

// JSONレイアウトパース
function parseJsonLayout(text) {
  return Keyboard.parseJsonLayout(text);
}

// キーマップパース（複数レイヤー対応版）
function parseKeymapMacro(keymapText) {
  return Keyboard.parseKeymapMacro(keymapText);
}

// レイヤー選択UIの更新
function updateLayerSelector(layers = {}) {
  const selector = document.getElementById('layer-select');
  const currentValue = selector ? selector.value : null;

  if (!selector) return '';
  
  const select = document.getElementById('layer-select');
  const oldLength = select.options.length;
  select.innerHTML = '';
  
  if (!layers || Object.keys(layers).length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No layers';
    select.appendChild(option);
    return '';
  }

  Object.values(layers).forEach(layer => {
    const option = document.createElement('option');
    option.value = layer.name;
    option.textContent = `${layer.label || layer.name} (${layer.name})`;
    select.appendChild(option);
  });

  if (currentValue && select.options.length === oldLength) {
    select.value = currentValue;
  }

  return select.value;
}

// 再描画関数を修正
function redraw(forceUpdate = false) {
  const canvasElem = document.getElementById('key-canvas');
  if (!canvasElem || !canvasElem.getContext) {
    console.log("Canvas not ready");
    return;
  }

  try {
    const jsonText = document.getElementById('json-text').value || '{"layouts":{"layout_US":{"layout":[]}}}';
    const keymapText = document.getElementById('keymap-text').value || '';
    
    const keyPositions = Keyboard.parseJsonLayout(jsonText) || [];
    const layers = Keyboard.parseKeymapMacro(keymapText) || {};
    
    const currentLayer = updateLayerSelector(layers);
    const selectedLayer = layers[currentLayer] || { keys: [] };
    const keymap = selectedLayer.keys || [];
    
    const ctx = canvasElem.getContext('2d');
    Renderer.drawKeys(ctx, keyPositions, keymap, Theme.currentTheme, keyStates, lastPressedKeyCenter);
  } catch (e) {
    console.error('Error in redraw:', e);
    updateLog('Error updating layout: ' + e.message);
    // Clear canvas on error
    const ctx = canvasElem.getContext('2d');
    ctx.clearRect(0, 0, canvasElem.width, canvasElem.height);
  }
}

// Make redraw available globally for renderer
window.redraw = redraw;

// Move event listeners inside DOMContentLoaded
window.addEventListener('DOMContentLoaded', async () => {
  try {
    keyboardManager = new KeyboardManager();
    await keyboardManager.init();
    
    // Initialize empty state
    if (!document.getElementById('json-text').value) {
      document.getElementById('json-text').value = '{"layouts":{"layout_US":{"layout":[]}}}';
    }

    // Set up event listeners
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.addEventListener('change', function() {
        Theme.setTheme(this.value, redraw);
        Renderer.resizeCanvas();
      });
      // 初期テーマ
      Theme.setTheme(themeSelect.value, redraw);
    }

    document.getElementById('update-btn').addEventListener('click', () => {
      keyStates = {};
      redraw(true);
      updateLog('Layout updated successfully');
    });

    // Initial canvas setup
    Renderer.resizeCanvas();
  } catch (e) {
    console.error('Initialization error:', e);
    updateLog('Failed to initialize: ' + e.message);
  }
});

// --- キー押下/離上イベントでハイライト ---
const canvas = document.getElementById('key-canvas');
canvas.tabIndex = 0; // フォーカス可能に
canvas.addEventListener('keydown', function(e) {
  if (
    e.key === 'Tab' ||
    e.key.startsWith('Arrow') ||
    e.key === ' ' ||
    e.key === 'PageUp' ||
    e.key === 'PageDown' ||
    e.key === 'Home' ||
    e.key === 'End' ||
    e.key === 'F1'  ||
    e.key === 'F2'  ||
    e.key === 'F3'  ||
    e.key === 'F4'  ||
    e.key === 'F5'  ||
    e.key === 'F6'  ||
    e.key === 'F7'  ||
    e.key === 'F8'  ||
    e.key === 'F9'  ||
    e.key === 'F10' ||
    e.key === 'F11' ||
    e.key === 'F12' 
  ) {
    e.preventDefault();
  }
  const key = mapKeyEventToLabel(e);
  if (!key) return;
  keyStates[key] = true;
  
  const keyRect = keyRects.find(r => r.label === key);
  if (keyRect && Theme.currentTheme === 'psychedelic') {
    lastPressedKeyCenter = {
      x: keyRect.x + keyRect.w / 2,
      y: keyRect.y + keyRect.h / 2
    };
  }
  
  if (Theme.currentTheme !== 'psychedelic') {
    redraw();
  }
  updateLog(`Key Pressed: ${key}`);
});
canvas.addEventListener('keyup', function(e) {
  if (
    e.key === 'Tab' ||
    e.key.startsWith('Arrow') ||
    e.key === ' ' ||
    e.key === 'PageUp' ||
    e.key === 'PageDown' ||
    e.key === 'Home' ||
    e.key === 'End' ||
    e.key === 'F1'  ||
    e.key === 'F2'  ||
    e.key === 'F3'  ||
    e.key === 'F4'  ||
    e.key === 'F5'  ||
    e.key === 'F6'  ||
    e.key === 'F7'  ||
    e.key === 'F8'  ||
    e.key === 'F9'  ||
    e.key === 'F10' ||
    e.key === 'F11' ||
    e.key === 'F12' 
  ) {
    e.preventDefault();
  }
  const key = mapKeyEventToLabel(e);
  if (!key) return;
  keyStates[key] = false;
  redraw();
  updateLog(`Key Released: ${key}`);
});
canvas.addEventListener('blur', function() {
  Object.keys(keyStates).forEach(k => keyStates[k] = false);
  redraw();
});
canvas.focus();

// キーイベント→ラベル変換
function mapKeyEventToLabel(e) {
  let key = e.key.toUpperCase();
  if (key === ' ') key = 'SPACE';
  if (key === 'ESCAPE') key = 'ESC';
  if (key === 'SHIFT') key = 'SHIFT';
  if (key === 'CONTROL') key = 'CTRL';
  if (key === 'ALT') key = 'ALT';
  if (key === 'META' || key === 'OS') key = 'WIN';
  if (key === 'ENTER') key = 'ENTER';
  if (key === 'TAB') key = 'TAB';
  if (key === 'BACKSPACE') key = 'BACKSPACE';
  if (key === 'DELETE') key = 'DELETE';
  if (key === '\\') key = 'YEN';
  if (key === '[') key = '{';
  if (key === ']') key = '}';
  if (key === '@') key = '@';
  if (key === ';') key = 'SEMI';
  if (key === ':') key = 'COLON';
  if (key === '\'') key = 'SQT';
  if (key === ',') key = 'COMMA';
  if (key === '.') key = 'DOT';
  if (key === '/') key = 'SLASH';

  if (key === 'ARROWLEFT') key = 'LEFT';
  if (key === 'ARROWUP') key = 'UP';
  if (key === 'ARROWRIGHT') key = 'RIGHT';
  if (key === 'ARROWDOWN') key = 'DOWN';
  const normalized = Keyboard.normalizeKeyLabel(key);
  return normalized;
}