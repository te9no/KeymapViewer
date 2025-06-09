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
    TAB: 'TAB', TRANS: '---'
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
  console.log("drawKeys called", { keyPositions, keymap, scaleFactor });
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  keyRects = [];
  if (!keyPositions.length || !keymap.length) {
    console.log("drawKeys: keyPositions or keymap is empty");
    return;
  }

  // テーマごとの色設定
  let theme = 'light';
  if (document.body.classList.contains('dark')) theme = 'dark';
  else if (document.body.classList.contains('blue')) theme = 'blue';
  else if (document.body.classList.contains('green')) theme = 'green';
  else if (document.body.classList.contains('console')) theme = 'console';

  const themeColors = {
    light:   { normal: 'lightgray', special: '#dddddd', pressed: 'orange' },
    dark:    { normal: '#444',      special: '#222',    pressed: 'orange' },
    blue:    { normal: '#b3e0ff',   special: '#eaf6fb', pressed: '#ffb347' },
    green:   { normal: '#b2f2c9',   special: '#eafbf0', pressed: '#ffe066' },
    console: { normal: '#003300',   special: '#001a00', pressed: '#00ff00' }
  };
  const colors = themeColors[theme];

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
    let fillStyle = colors.normal;
    if (label === '---') {
      fillStyle = colors.special;
    }
    if (keyStates[label]) {
      fillStyle = colors.pressed;
    }

    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((r * Math.PI) / 180);
    ctx.fillStyle = fillStyle;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = 'gray';
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = (theme === 'console') ? '#00ff00' : 'black';
    ctx.font = `${Math.max(8, 12 * scaleFactor)}px Hackgen, monospace, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0);
    ctx.restore();

    console.log(`drawKeys: drawing key ${label} at (${x},${y}) size (${w},${h}) r=${r} pressed=${keyStates[label]}`);

    // キーの位置情報を保存（押下判定用）
    keyRects.push({ label, x, y, w, h, r });
    // 初期化
    if (!(label in keyStates)) keyStates[label] = false;
  });
}

// ログ表示
function updateLog(msg) {
  console.log("updateLog:", msg);
  document.getElementById('log-label').textContent = msg;
}

// イベントバインド
document.getElementById('update-btn').onclick = function() {
  console.log("update-btn clicked");
  keyStates = {};
  resizeCanvas();
  updateLog('Layout updated successfully');
};

// ユーティリティ関数
function hexDump(data) {
  if (!data) return 'null';
  return Array.from(data)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
}

// ZMK Studioプロトコル定義を修正
const ZMK_PROTOCOL = {
  REPORT_ID: 0x01,  // デフォルトのレポートIDを1に変更
  USAGE_PAGE: 0xFF60,
  USAGE: 0x61,
  COMMANDS: {
    GET_PROTOCOL_VERSION: 0x01,
    GET_DEVICE_INFO: 0x02,
    GET_KEYMAP: 0x03,
    GET_LAYOUT: 0x04
  }
};

// HIDコマンド送信関数
async function sendZMKCommand(device, command, data = new Uint8Array(0)) {
  console.log("Device info:", {
    collections: device.collections,
    opened: device.opened,
    vendorId: device.vendorId,
    productId: device.productId
  });

  // デバイスの情報を解析
  const collection = device.collections?.[0];
  const hasReportId = collection?.outputReports?.some(r => r.reportId !== 0);
  const reportSize = collection?.outputReports?.[0]?.size || 64;
  
  // レポートを準備
  const report = new Uint8Array(reportSize);
  report[0] = command;
  report.set(data, 1);
  
  console.log(`Sending HID report (size=${reportSize}, hasReportId=${hasReportId}):`, hexDump(report));
  
  try {
    if (hasReportId) {
      // レポートIDを使用
      await device.sendReport(ZMK_PROTOCOL.REPORT_ID, report);
    } else {
      // レポートIDなし
      await device.sendReport(0, report);
    }
  } catch (e) {
    console.error("Failed to send report:", e);
    throw new Error(`HID report send failed: ${e.message}`);
  }
}

// HIDレスポンス待機関数
async function waitForZMKResponse(device) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      device.removeEventListener('inputreport', handler);
      clearTimeout(timeoutId);
    };

    const handler = event => {
      const data = new Uint8Array(event.data.buffer);
      console.log("Received HID report:", {
        reportId: event.reportId,
        data: hexDump(data)
      });
      cleanup();
      resolve(data);
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('HID response timeout'));
    }, 1000);

    device.addEventListener('inputreport', handler);
  });
}

// ZMK接続ボタンハンドラー
document.getElementById('zmk-connect-btn').onclick = async function() {
  updateLog("ZMKデバイスに接続中...");
  try {
    const filters = [
      { 
        vendorId: 0x1D50
      },
      { 
        vendorId: 0x2FE9,
        usagePage: 0xFF60  // ZMK固有のusagePage
      }
    ];
    
    // 既存のデバイスを確認
    const existingDevices = await navigator.hid.getDevices();
    console.log("Existing HID devices:", existingDevices.map(d => ({
      vendorId: d.vendorId,
      productId: d.productId,
      collections: d.collections?.map(c => ({
        usage: c.usage,
        usagePage: c.usagePage,
        reports: c.outputReports
      }))
    })));

    const devices = await navigator.hid.requestDevice({ filters });
    if (!devices.length) {
      updateLog("デバイスが選択されませんでした");
      return;
    }
    const device = devices[0];
    
    if (device.opened) await device.close();
    await device.open();

    try {
      // プロトコルバージョン確認
      await sendZMKCommand(device, ZMK_PROTOCOL.COMMANDS.GET_PROTOCOL_VERSION);
      const version = await waitForZMKResponse(device);
      console.log("Protocol version:", version[0]);

      // デバイス情報取得
      await sendZMKCommand(device, ZMK_PROTOCOL.COMMANDS.GET_DEVICE_INFO);
      const info = await waitForZMKResponse(device);
      console.log("Device info:", hexDump(info));

      // レイアウト取得
      await sendZMKCommand(device, ZMK_PROTOCOL.COMMANDS.GET_LAYOUT);
      const layout = await waitForZMKResponse(device);
      const layoutJson = convertLayoutData(layout);

      // キーマップ取得
      await sendZMKCommand(device, ZMK_PROTOCOL.COMMANDS.GET_KEYMAP);
      const keymap = await waitForZMKResponse(device);
      const keymapText = convertKeymapData(keymap);

      // テキストエリアに反映
      document.getElementById('json-text').value = layoutJson;
      document.getElementById('keymap-text').value = keymapText;
      updateLog("キーボードから取得完了。Update Layoutを押してください。");
    } finally {
      await device.close();
    }
  } catch (e) {
    console.error('Device connection error:', e);
    if (e.name === 'SecurityError') {
      updateLog("デバイスのアクセス権限がありません");
    } else if (e.name === 'TypeError' && e.message.includes('usage')) {
      updateLog("デバイスのHID設定が不正です");
    } else {
      updateLog("デバイス接続エラー: " + e.message);
    }
  }
};

// レイアウトデータをJSON形式に変換
function convertLayoutData(data) {
  // ZMK Studioのレイアウトフォーマットからの変換
  // 実際のフォーマットに合わせて実装
  return JSON.stringify({
    layouts: {
      layout_US: {
        layout: parseZMKLayout(data)
      }
    }
  });
}

// キーマップデータをZMK記法に変換
function convertKeymapData(data) {
  // ZMK Studioのキーマップフォーマットからの変換
  // 実際のフォーマットに合わせて実装
  return parseZMKKeymap(data);
}

// キャンバスサイズをウインドウいっぱいに調整
function resizeCanvas() {
  const canvasElem = document.getElementById('key-canvas');
  const frame = document.getElementById('canvas-frame');
  // キャンバスの幅・高さを親要素に合わせる
  canvasElem.width = frame.clientWidth;
  canvasElem.height = frame.clientHeight - document.getElementById('log-label').offsetHeight;
  redraw();
}

// ウインドウリサイズ時にキャンバスを調整
window.addEventListener('resize', resizeCanvas);

// テーマ切り替え
const themeSelect = document.getElementById('theme-select');
function setTheme(theme) {
  document.body.classList.remove('light', 'dark', 'blue', 'green', 'console');
  document.body.classList.add(theme);
  console.log("Theme changed:", theme);
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
    e.key === 'End'
  ) {
    e.preventDefault();
  }
  const key = mapKeyEventToLabel(e);
  console.log("keydown event:", e, "mapped key:", key);
  if (!key) return;
  keyStates[key] = true;
  redraw();
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
    e.key === 'End'
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

// 再描画関数
function redraw() {
  console.log("redraw called");
  const jsonText = document.getElementById('json-text').value;
  const keymapText = document.getElementById('keymap-text').value;
  const keyPositions = parseJsonLayout(jsonText);
  const keymap = parseKeymapMacro(keymapText);
  const canvasElem = document.getElementById('key-canvas');
  const ctx = canvasElem.getContext('2d');
  // スケールファクターは常に1.0（drawKeys内で自動スケーリング）
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