import { updateLog } from './utils.js';

export class KeyboardManager {
  constructor() {
    this.keyboards = [];
    this.currentKeyboard = null;
  }

  async init() {
    try {
      await this.loadKeyboards();
      return true;
    } catch (e) {
      console.error('Initialization error:', e);
      return false;
    }
  }

  async loadKeyboards() {
    try {
      const response = await fetch('kbd/index.json');
      const data = await response.json();
      this.keyboards = data.keyboards || [];
      this.updateSelector();
      return true;
    } catch (e) {
      console.error('Failed to load keyboard list:', e);
      return false;
    }
  }

  updateSelector() {
    const select = document.getElementById('keyboard-select');
    if (!select) return;

    select.innerHTML = '<option value="">Select Keyboard</option>';
    
    this.keyboards.forEach(kbd => {
      const option = document.createElement('option');
      option.value = kbd.id;
      option.textContent = kbd.author ? 
        `${kbd.name} (by ${kbd.author})` : 
        kbd.name;
      select.appendChild(option);
    });
  }

  async loadKeyboardConfig(keyboardId) {
    try {
      const kbd = this.keyboards.find(k => k.id === keyboardId);
      if (!kbd) {
        throw new Error('Keyboard not found');
      }

      const [layoutRes, keymapRes] = await Promise.all([
        fetch(`kbd/${kbd.id}/${kbd.id}.json`),
        fetch(`kbd/${kbd.id}/${kbd.id}.keymap`)
      ]);

      if (!layoutRes.ok || !keymapRes.ok) {
        throw new Error('Failed to load keyboard files');
      }

      const [layoutJson, keymapText] = await Promise.all([
        layoutRes.text(),
        keymapRes.text()
      ]);

      document.getElementById('json-text').value = layoutJson;
      document.getElementById('keymap-text').value = keymapText;
      
      this.currentKeyboard = kbd;
      updateLog(`Loaded keyboard: ${kbd.name}`);
      return true;
    } catch (e) {
      console.error('Failed to load keyboard config:', e);
      updateLog('Failed to load keyboard configuration');
      return false;
    }
  }
}

export function normalizeKeyLabel(label) {
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

export function parseJsonLayout(text) {
  if (!text) return [];
  
  try {
    if (text.includes('compatible = "zmk,physical-layout"') || 
        text.includes('compatible = "zmk,keymap"')) {
      return parseZmkPhysicalLayout(text) || [];
    }

    const layoutData = JSON.parse(text);
    if (!layoutData || !layoutData.layouts) {
      return [];
    }

    // レイアウト名を動的に取得
    const layoutName = Object.keys(layoutData.layouts)[0];
    if (!layoutName) {
      console.warn('No layout found in JSON');
      return [];
    }

    const layout = layoutData.layouts[layoutName].layout || [];
    return layout.map(key => ({
      x: (key.x || 0) * 100,
      y: (key.y || 0) * 100,
      w: (key.w || 1) * 100,
      h: (key.h || 1) * 100,
      r: key.r || 0,
      rx: (key.rx || 0) * 100,
      ry: (key.ry || 0) * 100
    }));
  } catch (e) {
    console.error('JSON Parse Error:', e);
    return [];
  }
}

// ZMK物理レイアウトパース
function parseZmkPhysicalLayout(text) {
  const keys = new Set(); // 重複を防ぐためにSetを使用
  console.log("parseZmkPhysicalLayout called");

  // レイアウトブロック全体を抽出
  const layoutMatch = text.match(/layout_\w+\s*:\s*layout_\w+\s{[^}]*keys.*\s.*=[^;]*;/g);
  if (!layoutMatch) {
    console.log("No layout block found");
    return [];
  }

  const layoutBlock = layoutMatch[0];
  const keyPattern = /&key_physical_attrs\s+(\d+)\s+(\d+)\s+(-?\d+|\(-\d+\))\s+(-?\d+|\(-\d+\))\s+(-?\d+|\(-\d+\))\s+(-?\d+|\(-\d+\))\s+(-?\d+|\(-\d+\))/g;
  let match;
  
  while ((match = keyPattern.exec(layoutBlock)) !== null) {
    const values = match.slice(1).map(v => parseInt(v.replace(/[()]/g, ''), 10));
    const [w, h, x, y, r, rx, ry] = values;
    // キーの一意性を確保するために文字列化
    const keyString = JSON.stringify({w, h, x, y, r: r/100, rx, ry});
    keys.add(keyString);
  }

  // 重複を除去したキーを配列に変換
  const uniqueKeys = Array.from(keys).map(k => JSON.parse(k));
  console.log("Parsed unique keys:", uniqueKeys.length);
  return uniqueKeys;
}

// キーマップパース（複数レイヤー対応版）
export function parseKeymapMacro(keymapText) {
  if (keymapText.includes('PROGMEM keymaps[][')) {
    return parseQmkKeymap(keymapText);
  }
  
  const layers = {};
  let currentLayer = null;
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
    
    // レイヤー開始行の検出
    const layerMatch = line.match(/(\w+)_layer\s*{/);
    if (layerMatch) {
      currentLayer = layerMatch[1];
      layers[currentLayer] = {
        name: currentLayer,
        label: '',
        keys: []
      };
      return;
    }

    // レイヤーラベルの検出
    const labelMatch = line.match(/label\s*=\s*"([^"]+)"/);
    if (labelMatch && currentLayer) {
      layers[currentLayer].label = labelMatch[1];
      return;
    }

    if (line.includes('bindings = <')) { inBindings = true; return; }
    if (line.includes('>;')) { inBindings = false; return; }
    
    if (!inBindings || !line || line.startsWith('//') || !currentLayer) return;

    line.split('&').forEach(code => {
      code = code.trim();
      if (!code) return;
      code = '&' + code;
      let found = false;
      for (const [pat, fn] of patterns) {
        const m = code.match(pat);
        if (m) {
          layers[currentLayer].keys.push(fn(m[1]));
          found = true;
          break;
        }
      }
      if (!found) layers[currentLayer].keys.push('?');
    });
  });

  return layers;
}

function parseQmkKeymap(text) {
  const layers = {};
  const layerPattern = /\[_(\w+)\]\s*=\s*LAYOUT\(([\s\S]*?)\)/g;
  
  let match;
  while ((match = layerPattern.exec(text)) !== null) {
    const layerName = match[1];
    const keyList = match[2]
      .replace(/\s+/g, '')        // Remove whitespace
      .split(',')                 // Split into keys
      .filter(k => k.length > 0)  // Remove empty entries
      .map(normalizeQmkKeycode);  // Normalize keycodes
    
    layers[layerName] = {
      name: layerName,
      label: layerName,
      keys: keyList
    };
  }
  
  return layers;
}

function normalizeQmkKeycode(code) {
  // Remove prefix
  code = code.replace(/^KC_/, '');
  
  // Handle special cases
  if (code === '_______') return 'TRANS';
  if (code === '0x0068') return 'F13';
  if (code === '0x0069') return 'F14';
  
  // Handle modifiers
  const modPattern = /(LCTL|RCTL|LSFT|RSFT|LALT|RALT|LGUI|RGUI)\((.*?)\)/;
  const modMatch = code.match(modPattern);
  if (modMatch) {
    const mod = modMatch[1].replace(/^[LR]/, ''); // Remove L/R prefix
    const key = normalizeQmkKeycode(modMatch[2]);
    return `${mod}+${key}`;
  }
  
  // Map common keycodes
  const qmkToZmk = {
    'MINS': 'MINUS',
    'EQL': 'EQUAL',
    'LBRC': '[',
    'RBRC': ']',
    'QUOT': 'SQT',
    'SLSH': 'FSLH',
    'INT1': 'CAPS',
    'INT3': 'INT3',
    'MS_BTN1': 'BTN1',
    'MS_BTN2': 'BTN2',
    'MS_BTN3': 'BTN3',
    'WWW_BACK': 'WWW_PREV',
    'WWW_FORWARD': 'WWW_NEXT',
    // Add more mappings as needed
  };
  
  return qmkToZmk[code] || code;
}

