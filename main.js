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

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((r * Math.PI) / 180);
    ctx.fillStyle = label === '---' ? '#dddddd' : 'lightgray';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = 'black';
    ctx.font = `${Math.max(8, 12 * scaleFactor)}px Hackgen`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0);
    ctx.restore();
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
  drawKeys(ctx, keyPositions, keymap, scaleFactor);
  updateLog('Layout updated successfully');
};