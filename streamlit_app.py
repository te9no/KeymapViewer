import streamlit as st
import json
import re
from PIL import Image, ImageDraw
import io
import base64

def init_session_state():
    if 'keymap_text' not in st.session_state:
        st.session_state.keymap_text = ''
    if 'json_text' not in st.session_state:
        st.session_state.json_text = ''
    if 'scale' not in st.session_state:
        st.session_state.scale = 0.8
    if 'pressed_keys' not in st.session_state:
        st.session_state.pressed_keys = set()

def parse_keymap_layout(keymap_text):
    """レイアウト情報を解析"""
    keys = []
    pattern = r'&key_physical_attrs\s+(\d+)\s+(\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)'
    
    matches = re.finditer(pattern, keymap_text)
    for match in matches:
        w, h, x, y, rot, rx, ry = map(int, match.groups())
        keys.append({
            'x': x,
            'y': y,
            'w': w,
            'h': h,
            'r': rot
        })
    return keys

def parse_keymap_macro(keymap_text):
    """キーマップを解析"""
    keymap = []
    in_bindings = False
    patterns = [
        (r'&kp\s+(\S+)', lambda x: x),
        (r'&lt\s+\d+\s+(\S+)', lambda x: x),
        (r'&mt\s+\S+\s+(\S+)', lambda x: x),
        (r'&toJIS\s+\d+\s+(\S+)', lambda x: x),
        (r'&mF(\d+)', lambda x: f"F{x}"),
        (r'&trans', lambda _: "TRANS"),
    ]

    for line in keymap_text.split('\n'):
        if 'bindings = <' in line:
            in_bindings = True
            continue
        elif '>;' in line:
            in_bindings = False
            continue
        
        if not in_bindings or not line.strip():
            continue

        keycodes = [code.strip() for code in line.split('&') if code.strip()]
        for keycode in keycodes:
            key_found = False
            keycode = '&' + keycode
            
            for pattern, transformer in patterns:
                match = re.match(pattern, keycode)
                if match:
                    key = transformer(match.group(1))
                    keymap.append(key)
                    key_found = True
                    break
            
            if not key_found:
                keymap.append("?")
    
    return keymap

def draw_keyboard(key_positions, keymap, scale=0.8):
    """キーボードレイアウトを描画"""
    if not key_positions or not keymap:
        return None

    # キャンバスサイズ計算
    min_x = min(k['x'] for k in key_positions)
    min_y = min(k['y'] for k in key_positions)
    max_x = max(k['x'] + k['w'] for k in key_positions)
    max_y = max(k['y'] + k['h'] for k in key_positions)

    # イメージ作成
    width = int((max_x - min_x) * scale) + 100
    height = int((max_y - min_y) * scale) + 100
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)

    # キーを描画
    offset_x = -min_x * scale + 50
    offset_y = -min_y * scale + 50

    for i, key in enumerate(key_positions):
        if i >= len(keymap):
            break

        x = key['x'] * scale + offset_x
        y = key['y'] * scale + offset_y
        w = key['w'] * scale
        h = key['h'] * scale

        # キーの四角形を描画
        draw.rectangle(
            [x, y, x + w, y + h],
            fill='lightgray' if keymap[i] not in st.session_state.pressed_keys else 'orange',
            outline='gray'
        )
        
        # キーラベルを描画
        label = keymap[i]
        draw.text((x + w/2, y + h/2), label, fill='black', anchor='mm')

    return img

def main():
    st.title("Keyboard Visualizer")
    init_session_state()

    # サイドバーの入力フォーム
    with st.sidebar:
        st.text_area("Keymap Macro", key="keymap_text", height=200)
        st.selectbox("Scale", ["25%", "50%", "80%", "100%", "125%", "150%"], 
                    index=2, key="scale")
        if st.button("Update Layout"):
            key_positions = parse_keymap_layout(st.session_state.keymap_text)
            keymap = parse_keymap_macro(st.session_state.keymap_text)
            st.session_state.key_positions = key_positions
            st.session_state.keymap = keymap

    # メインエリアのキーボード表示
    if 'key_positions' in st.session_state and 'keymap' in st.session_state:
        scale = float(st.session_state.scale.rstrip('%')) / 100.0
        img = draw_keyboard(st.session_state.key_positions, 
                          st.session_state.keymap, scale)
        if img:
            st.image(img)

if __name__ == "__main__":
    main()
