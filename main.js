// キー状態管理
let keyStates = {};
let keyRects = []; // キーごとの描画情報

// キーラベル正規化
function normalizeKeyLabel(label) {
  const keyMapping = {
    N1: '1', N2: '2', N3: '3', N4: '4', N5: '5',
    N6: '6', N7: '7', N8: '8', N9: '9', N0: '0',
    LALT: 'ALT', RALT: 'ALT', LSHFT: 'SHIFT', LSHIFT: 'SHIFT',
    RSHFT: 'SHIFT', RSHIFT: 'SHIFT', LCTRL: 'CTRL', RCTRL: 'CTRL',
    LGUI: 'WIN', RGUI: 'WIN', SPACE: 'SPACE', ENTER: 'ENTER',
    ESC: 'ESC', BKSP: 'BACKSPACE', BSPC: 'BACKSPACE', INT3: 'INT3',
    TAB: 'TAB', F13: 'F13', F14: 'F14', F15: 'F15', F16: 'F16',
    F17: 'F17', F18: 'F18', TRANS: '---'
  };
  return keyMapping[label] || label;
}

// JSONレイアウトパース
function parseJsonLayout(jsonText) {
  try {
    const layoutData = JSON.parse(jsonText);
    if (layoutData.layouts) {
      const layout = layoutData.layouts.layout_US.layout;
      return layout.map(key => ({
        x: (key.x || 0) * 100,
        y: (key.y || 0) * 100,
        w: (key.w || 1) * 100,
        h: (key.h || 1) * 100,
        r: key.r || 0
      }));
    }
    return [];
  } catch (e) {
    updateLog('JSON Parse Error: ' + e.message);
    return [];
  }
}

// キーマップパース（簡易版）
function parseKeymapMacro(keymapText) {
  const keymap = [];
  let inBindings = false;
  const patterns = [
    [/&kp\s+(\S+)/, x => x],
    [/&lt\s+\d+\s+(\S+)/, x => x],
    [/&mt\s+\S+\s+(\S+)/, x => x],
    [/&toJIS\s+\d+\s+(\S+)/, x => x],
    [/&mF(\d+)/, x => `F${x}`],
    [/&trans/, _ => 'TRANS']
  ];
  keymapText.split('\n').forEach(line => {
    line = line.trim();
    if (line.includes('bindings = <')) { inBindings = true; return; }
    if (line.includes('>;')) { inBindings = false; return; }
    if (!inBindings || !line || line.startsWith('//')) return;
    line.split('&').forEach(code => {
      code = code.trim();
      if (!code) return;
      code = '&' + code;
      let found = false;
      for (const [pat, fn] of patterns) {
        const m = code.match(pat);
        if (m) {
          keymap.push(fn(m[1]));
          found = true;
          break;
        }
      }
      if (!found) keymap.push('?');
    });
  });
  return keymap;
}

// キー描画
function drawKeys(ctx, keyPositions, keymap, scaleFactor) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  keyRects = [];
  if (!keyPositions.length || !keymap.length) return;

  const minX = Math.min(...keyPositions.map(k => k.x));
  const minY = Math.min(...keyPositions.map(k => k.y));
  const maxX = Math.max(...keyPositions.map(k => k.x + k.w));
  const maxY = Math.max(...keyPositions.map(k => k.y + k.h));

  const layoutWidth = maxX - minX;
  const layoutHeight = maxY - minY;

  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;

  const widthScale = (canvasWidth * 0.8) / layoutWidth;
  const heightScale = (canvasHeight * 0.8) / layoutHeight;
  const autoScale = Math.min(widthScale, heightScale);

  const keyWidth = layoutWidth * autoScale;
  const keyHeight = layoutHeight * autoScale;

  const offsetX = (canvasWidth - keyWidth) / 2 - minX * autoScale;
  const offsetY = (canvasHeight - keyHeight) / 2 - minY * autoScale;

  keyPositions.forEach((key, i) => {
    const x = key.x * autoScale + offsetX;
    const y = key.y * autoScale + offsetY;
    const w = key.w * autoScale;
    const h = key.h * autoScale;
    const r = key.r;
    const label = normalizeKeyLabel(keymap[i] || '?');

    // 押下状態による色分け
    let fillStyle = 'lightgray';
    if (label === '---') {
      fillStyle = '#dddddd';
    }
    if (keyStates[label]) {
      fillStyle = 'orange';
    }

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((r * Math.PI) / 180);
    ctx.fillStyle = fillStyle;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = 'gray';
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = 'black';
    ctx.font = `${Math.max(8, 12 * scaleFactor)}px Hackgen, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0);
    ctx.restore();

    // キーの位置情報を保存（押下判定用）
    keyRects.push({ label, x, y, w, h, r });
    // 初期化
    if (!(label in keyStates)) keyStates[label] = false;
  });
}

// ログ表示
function updateLog(msg) {
  document.getElementById('log-label').textContent = msg;
}

// イベントバインド
document.getElementById('update-btn').onclick = function() {
  const jsonText = document.getElementById('json-text').value;
  const keymapText = document.getElementById('keymap-text').value;
  const keyPositions = parseJsonLayout(jsonText);
  const keymap = parseKeymapMacro(keymapText);
  const scaleText = document.getElementById('scale-select').value.replace('%', '');
  const scaleFactor = parseFloat(scaleText) / 100.0;
  const canvas = document.getElementById('key-canvas');
  const ctx = canvas.getContext('2d');
  // キー状態リセット
  keyStates = {};
  drawKeys(ctx, keyPositions, keymap, scaleFactor);
  updateLog('Layout updated successfully');
};

// --- キー押下/離上イベントでハイライト ---
const canvas = document.getElementById('key-canvas');
canvas.tabIndex = 0; // フォーカス可能に
canvas.addEventListener('keydown', function(e) {
  const key = mapKeyEventToLabel(e);
  if (!key) return;
  keyStates[key] = true;
  redraw();
  updateLog(`Key Pressed: ${key}`);
});
canvas.addEventListener('keyup', function(e) {
  const key = mapKeyEventToLabel(e);
  if (!key) return;
  keyStates[key] = false;
  redraw();
  updateLog(`Key Released: ${key}`);
});
canvas.addEventListener('blur', function() {
  // フォーカス外れたら全キーリセット
  Object.keys(keyStates).forEach(k => keyStates[k] = false);
  redraw();
});
canvas.focus();

// 再描画関数
function redraw() {
  const jsonText = document.getElementById('json-text').value;
  const keymapText = document.getElementById('keymap-text').value;
  const keyPositions = parseJsonLayout(jsonText);
  const keymap = parseKeymapMacro(keymapText);
  const scaleText = document.getElementById('scale-select').value.replace('%', '');
  const scaleFactor = parseFloat(scaleText) / 100.0;
  const ctx = canvas.getContext('2d');
  drawKeys(ctx, keyPositions, keymap, scaleFactor);
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
  if (key === 'F13' || key === 'F14' || key === 'F15' || key === 'F16' || key === 'F17' || key === 'F18') key = key;
  // 記号など追加
  if (key === '\\') key = 'YEN';
  if (key === '[') key = '{';
  if (key === ']') key = '}';
  if (key === '@') key = '@';
  if (key === ';') key = ';';
  if (key === ':') key = ':';
  // 正規化
  return normalizeKeyLabel(key);
}