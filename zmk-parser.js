// ZMKレイアウトパーサー
function parseZMKLayout(data) {
  console.log("Layout data:", hexDump(data));
  const layout = [];
  let offset = 1; // ヘッダーをスキップ

  const keyCount = data[offset++];
  for (let i = 0; i < keyCount; i++) {
    layout.push({
      x: data[offset++] / 10,
      y: data[offset++] / 10,
      w: data[offset++] / 10 || 1,
      h: data[offset++] / 10 || 1,
      r: (data[offset++] * 360) / 256 // 角度を0-360度に正規化
    });
  }
  return layout;
}

// ZMKキーマップパーサー
function parseZMKKeymap(data) {
  console.log("Keymap data:", hexDump(data));
  let offset = 1; // ヘッダーをスキップ
  const layerCount = data[offset++];
  const keyCount = data[offset++];
  
  // 最初のレイヤーのみ処理
  let keymap = "/ {\n\tbindings = <\n";
  for (let i = 0; i < keyCount; i++) {
    const keycode = (data[offset] << 8) | data[offset + 1];
    offset += 2;
    keymap += `\t\t${convertZMKKeycode(keycode)}\n`;
  }
  keymap += "\t>;\n};";
  
  return keymap;
}

// ZMKキーコード変換
function convertZMKKeycode(keycode) {
  console.log("Converting keycode:", keycode.toString(16));
  const keycodeMap = {
    0x0000: "&trans",
    // Letters
    0x0004: "&kp A", 0x0005: "&kp B", 0x0006: "&kp C", 0x0007: "&kp D",
    0x0008: "&kp E", 0x0009: "&kp F", 0x000A: "&kp G", 0x000B: "&kp H",
    0x000C: "&kp I", 0x000D: "&kp J", 0x000E: "&kp K", 0x000F: "&kp L",
    0x0010: "&kp M", 0x0011: "&kp N", 0x0012: "&kp O", 0x0013: "&kp P",
    0x0014: "&kp Q", 0x0015: "&kp R", 0x0016: "&kp S", 0x0017: "&kp T",
    0x0018: "&kp U", 0x0019: "&kp V", 0x001A: "&kp W", 0x001B: "&kp X",
    0x001C: "&kp Y", 0x001D: "&kp Z",
    // Numbers
    0x001E: "&kp N1", 0x001F: "&kp N2", 0x0020: "&kp N3", 0x0021: "&kp N4",
    0x0022: "&kp N5", 0x0023: "&kp N6", 0x0024: "&kp N7", 0x0025: "&kp N8",
    0x0026: "&kp N9", 0x0027: "&kp N0",
    // Special keys
    0x0028: "&kp ENTER", 0x0029: "&kp ESC", 0x002A: "&kp BSPC",
    0x002B: "&kp TAB", 0x002C: "&kp SPACE", 0x002D: "&kp MINUS",
    0x002E: "&kp EQUAL", 0x002F: "&kp LBKT", 0x0030: "&kp RBKT",
    // Modifiers
    0x00E0: "&kp LCTRL", 0x00E1: "&kp LSHFT", 0x00E2: "&kp LALT",
    0x00E3: "&kp LGUI", 0x00E4: "&kp RCTRL", 0x00E5: "&kp RSHFT",
    0x00E6: "&kp RALT", 0x00E7: "&kp RGUI",
    // Function keys
    0x003A: "&kp F1", 0x003B: "&kp F2", 0x003C: "&kp F3", 0x003D: "&kp F4",
    0x003E: "&kp F5", 0x003F: "&kp F6", 0x0040: "&kp F7", 0x0041: "&kp F8",
    0x0042: "&kp F9", 0x0043: "&kp F10", 0x0044: "&kp F11", 0x0045: "&kp F12"
  };
  return keycodeMap[keycode] || `&none /* 0x${keycode.toString(16).padStart(4, '0')} */`;
}

// デバッグ用：データバッファの16進ダンプ
function hexDump(data) {
  return Array.from(data)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
}

export { parseZMKLayout, parseZMKKeymap, hexDump };
