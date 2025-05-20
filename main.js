// キー状態管理
let keyStates = {};
let keyRects = []; // キーごとの描画情報
let lastPressedKeyCenter = null; // 最後に押されたキーの中心座標
let currentTheme = 'light';
let animationFrameId = null;

// キーラベル正規化
function normalizeKeyLabel(label) {
  const keyMapping = {
    N1: '1', N2: '2', N3: '3', N4: '4', N5: '5',
    N6: '6', N7: '7', N8: '8', N9: '9', N0: '0',
    LALT: 'ALT', RALT: 'ALT', LSHFT: 'SHIFT', LSHIFT: 'SHIFT',
    RSHFT: 'SHIFT', RSHIFT: 'SHIFT', LCTRL: 'CTRL', RCTRL: 'CTRL',
    LGUI: 'WIN', RGUI: 'WIN', SPACE: 'SPACE', ENTER: 'ENTER',
    ESC: 'ESC', BKSP: 'BACKSPACE', BSPC: 'BACKSPACE', INT3: 'INT3',
    TAB: 'TAB', TRANS: '---', MINUS : '-', EQUAL: '=',
    LBRACKET: '[', RBRACKET: ']', SEMI: ';', SQT: '\'',
    BSLH: '\\', YEN: '\\', COMMA: ',', DOT: '.',
    FSLH: '/', LBKT : '{', RBKT: '}', ALPHANUMERIC: 'CAPS', COLON : ':',
    DELETE : 'DEL', PAGEUP: 'PG_UP', PAGEDOWN: 'PG_DN',PRINTSCREEN : 'PSCRN',
  };
  return keyMapping[label] || label;
}

// JSONレイアウトパース
function parseJsonLayout(text) {
  // ZMK形式かどうかを判定
  if (text.includes('compatible = "zmk,physical-layout"') || 
      text.includes('compatible = "zmk,keymap"')) {
    const keys = parseZmkPhysicalLayout(text);
    return keys;
  }

  // 既存のJSON解析処理
  try {
    const layoutData = JSON.parse(text);
    if (layoutData.layouts) {
      const layout = layoutData.layouts.layout_US.layout;
      return layout.map(key => ({
        x: (key.x || 0) * 100,
        y: (key.y || 0) * 100,
        w: (key.w || 1) * 100,
        h: (key.h || 1) * 100,
        r: key.r || 0,
        rx: (key.rx || 0) * 100,  // 回転の中心X
        ry: (key.ry || 0) * 100   // 回転の中心Y
      }));
    }
    return [];
  } catch (e) {
    updateLog('JSON Parse Error: ' + e.message);
    return [];
  }
}

// ZMKレイアウトパース
function parseZmkLayout(text) {
  const keys = [];
  let x = 0;
  let y = 0;
  let maxX = 0;

  // bindingsブロックを抽出
  const bindingsMatch = text.match(/bindings\s*=\s*<([^>]+)>/);
  if (!bindingsMatch) return [];

  // バインディング行を解析
  const lines = bindingsMatch[1].split('\n');
  lines.forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('//')) return;

    // キー定義を抽出
    const keyDefs = line.split(/\s+/).filter(k => k.startsWith('&'));
    keyDefs.forEach(keyDef => {
      keys.push({
        x: x * 100,
        y: y * 100,
        w: 100,
        h: 100,
        r: 0,
        rx: 0,
        ry: 0
      });
      x++;
      maxX = Math.max(maxX, x);
    });

    // 行末なら次の行へ
    x = 0;
    if (keyDefs.length > 0) y++;
  });

  return keys;
}


// キーの回転を計算
function rotatePoint(x, y, rx, ry, angle) {
  const rad = (angle * Math.PI) / 180;
  const dx = x - rx;
  const dy = y - ry;
  return {
    x: rx + (dx * Math.cos(rad) - dy * Math.sin(rad)),
    y: ry + (dx * Math.sin(rad) + dy * Math.cos(rad))
  };
}

// レイヤー選択UIの更新
function updateLayerSelector(layers) {
  const selector = document.getElementById('layer-select');
  const currentValue = selector ? selector.value : null; // 現在の選択値を保持

  if (!selector) {
    controlDiv.style.marginBottom = '10px';
    
    const label = document.createElement('label');
    label.textContent = 'Layer: ';
    controlDiv.appendChild(label);
    
    const select = document.createElement('select');
    select.id = 'layer-select';
    select.onchange = function() {
      redraw(true); // レイヤー変更時は強制的に再描画
    };
    controlDiv.appendChild(select);
    
    frame.insertBefore(controlDiv, frame.firstChild);
  }

  const select = document.getElementById('layer-select');
  const oldLength = select.options.length;
  select.innerHTML = '';
  
  Object.values(layers).forEach(layer => {
    const option = document.createElement('option');
    option.value = layer.name;
    option.textContent = `${layer.label} (${layer.name})`;
    select.appendChild(option);
  });

  // 以前選択されていた値を復元
  if (currentValue && select.options.length === oldLength) {
    select.value = currentValue;
  }

  return select.value; // 現在選択されているレイヤー名を返す
}

// ログ表示
function updateLog(msg) {
  console.log("updateLog:", msg);
  document.getElementById('log-label').textContent = msg;
}

// キャンバスサイズをウインドウいっぱいに調整
function resizeCanvas() {
  const canvasElem = document.getElementById('key-canvas');
  const frame = canvasElem.parentElement;
  
  // DOMのサイズを取得
  const rect = frame.getBoundingClientRect();
  const newWidth = rect.width;
  const newHeight = rect.height;
  
  // 現在のサイズと新しいサイズが異なる場合のみ更新
  if (canvasElem.width !== newWidth || canvasElem.height !== newHeight) {
    canvasElem.width = newWidth;
    canvasElem.height = newHeight;
    redraw(true);
  }
}

// イベントバインド
document.getElementById('update-btn').onclick = function() {
  console.log("update-btn clicked");
  keyStates = {};
  redraw(true);
  updateLog('Layout updated successfully');
};

// キャンバスサイズをウインドウいっぱいに調整
function resizeCanvas() {
  const canvasElem = document.getElementById('key-canvas');
  const frame = document.getElementById('canvas-frame');
  // キャンバスの幅は親要素に合わせる
  canvasElem.width = frame.clientWidth;
  // キャンバスの高さはウインドウの下端までに設定
  const frameRect = frame.getBoundingClientRect();
  canvasElem.height = window.innerHeight - frameRect.top - 20; // 20pxは余白
  redraw();
}

// ウインドウリサイズ時にキャンバスを調整
window.addEventListener('resize', resizeCanvas);

// テーマ切り替え
const themeSelect = document.getElementById('theme-select');
function Renderer.setTheme(theme) {
  document.body.classList.remove('light', 'dark', 'blue', 'green', 'console', 'myakumyaku', 'psychedelic');
  document.body.classList.add(theme);
  currentTheme = theme;  // グローバル変数を更新
  lastPressedKeyCenter = null;
  console.log("Theme changed:", theme);

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (theme === 'psychedelic') {
    function animate() {
      if (document.body.classList.contains('psychedelic')) {
        redraw();
        animationFrameId = requestAnimationFrame(animate);
      }
    }
    animate();
  }
  resizeCanvas();
}
if (themeSelect) {
  themeSelect.addEventListener('change', function() {
    setTheme(this.value);
    resizeCanvas();
  });
  // 初期テーマ
  setTheme(themeSelect.value);
}

// 初回ロード時にキャンバスサイズ調整
window.addEventListener('DOMContentLoaded', resizeCanvas);

// --- キー押下/離上イベントでハイライト ---
const canvas = document.getElementById('key-canvas');
canvas.tabIndex = 0; // フォーカス可能に
canvas.addEventListener('keydown', function(e) {
  // フォーカス移動やスクロールを防止
  if (
    e.key === 'Tab' ||
    e.key.startsWith('Arrow') ||
    e.key === ' ' ||
    e.key === 'PageUp' ||
    e.key === 'PageDown' ||
    e.key === 'Home' ||
    e.key === 'End' ||
    e.key === 'F1'  ||
    e.key === 'F2'  || // F2キーを追加
    e.key === 'F3'  || // F3キーを追加
    e.key === 'F4'  || // F4キーを追加
    e.key === 'F5'  || // F5キーを追加
    e.key === 'F6'  || // F6キーを追加
    e.key === 'F7'  || // F7キーを追加
    e.key === 'F8'  || // F8キーを追加
    e.key === 'F9'  || // F9キーを追加
    e.key === 'F10' || // F10キーを追加
    e.key === 'F11' || // F11キーを追加
    e.key === 'F12' 
  ) {
    e.preventDefault();
  }
  const key = mapKeyEventToLabel(e);
  console.log("keydown event:", e, "mapped key:", key);
  if (!key) return;
  keyStates[key] = true;
  
  // 押されたキーの中心位置を取得
  const keyRect = keyRects.find(r => r.label === key);
  if (keyRect && currentTheme === 'psychedelic') {  // currentThemeを使用
    lastPressedKeyCenter = {
      x: keyRect.x + keyRect.w / 2,
      y: keyRect.y + keyRect.h / 2
    };
  }
  
  if (currentTheme !== 'psychedelic') {  // currentThemeを使用
    redraw();
  }
  updateLog(`Key Pressed: ${key}`);
});
canvas.addEventListener('keyup', function(e) {
  // フォーカス移動やスクロールを防止
  if (
    e.key === 'Tab' ||
    e.key.startsWith('Arrow') ||
    e.key === ' ' ||
    e.key === 'PageUp' ||
    e.key === 'PageDown' ||
    e.key === 'Home' ||
    e.key === 'End' ||
    e.key === 'F1'  ||
    e.key === 'F2'  || // F2キーを追加
    e.key === 'F3'  || // F3キーを追加
    e.key === 'F4'  || // F4キーを追加
    e.key === 'F5'  || // F5キーを追加
    e.key === 'F6'  || // F6キーを追加
    e.key === 'F7'  || // F7キーを追加
    e.key === 'F8'  || // F8キーを追加
    e.key === 'F9'  || // F9キーを追加
    e.key === 'F10' || // F10キーを追加
    e.key === 'F11' || // F11キーを追加
    e.key === 'F12' 
  ) {
    e.preventDefault();
  }
  const key = mapKeyEventToLabel(e);
  console.log("keyup event:", e, "mapped key:", key);
  if (!key) return;
  keyStates[key] = false;
  redraw();
  updateLog(`Key Released: ${key}`);
});
canvas.addEventListener('blur', function() {
  console.log("canvas blur: reset all key states");
  // フォーカス外れたら全キーリセット
  Object.keys(keyStates).forEach(k => keyStates[k] = false);
  redraw();
});
canvas.focus();

// 再描画関数を修正
function redraw(forceUpdate = false) {
  const canvasElem = document.getElementById('key-canvas');
  
  // キャンバスが準備できていない場合は終了
  if (!canvasElem || !canvasElem.getContext) {
    console.log("Canvas not ready");
    return;
  }

  console.log("redraw called", { width: canvasElem.width, height: canvasElem.height });
  const jsonText = document.getElementById('json-text').value;
  const keymapText = document.getElementById('keymap-text').value;
  const keyPositions = parseJsonLayout(jsonText);
  const layers = parseKeymapMacro(keymapText);
  
  // レイヤー選択UIの更新（現在の選択を保持）
  const currentLayer = updateLayerSelector(layers);
  
  // 選択されているレイヤーのキーマップを取得
  const selectedLayer = layers[currentLayer];
  const keymap = selectedLayer ? selectedLayer.keys : [];
  
  const ctx = canvasElem.getContext('2d');
  drawKeys(ctx, keyPositions, keymap, 1.0);
}

// キーイベント→ラベル変換
function mapKeyEventToLabel(e) {
  let key = e.key.toUpperCase();
  // 一部特殊キー対応
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
  // 記号など追加
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
  // 正規化
  const normalized = normalizeKeyLabel(key);
  console.log("mapKeyEventToLabel:", e.key, "->", normalized);
  return normalized;
}