import streamlit as st
import math
import csv

# キー位置情報の読み込み
def load_key_positions(file_path, scale_factor=1.0):
    keys = []
    with open(file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            keys.append({
                'x': float(row['x']) * scale_factor,
                'y': float(row['y']) * scale_factor,
                'w': float(row['w']) * scale_factor,
                'h': float(row['h']) * scale_factor,
                'r': float(row.get('r', 0)),  # 回転（r）
            })
    return keys

# keymapを読み込み
def load_keymap(file_path):
    keymap = []
    with open(file_path, newline='', encoding='utf-8') as csvfile:
        reader = csv.reader(csvfile)
        for row in reader:
            for item in row:
                item = item.strip()
                if item:
                    key = item.split()[-1]
                    keymap.append(key)
    return keymap

def draw_key(x, y, w, h, r, label, pressed):
    # キーの中心座標に配置し、中央基準で回転
    color = "#FFA500" if pressed else ("#D3D3D3" if label not in ("[NUM]","[ARROW]") else "#888888")
    style = f"""
        position: absolute;
        left: {x + w/2}px; top: {y + h/2}px;
        width: {w}px; height: {h}px;
        background: {color};
        border: 1px solid #888;
        border-radius: 8px;
        display: flex; align-items: center; justify-content: center;
        font-family: Hackgen, monospace;
        font-size: 12px;
        z-index: 1;
        transform: translate(-50%, -50%) rotate({r}deg);
        box-sizing: border-box;
        user-select: none;
    """
    st.markdown(
        f'<div style="{style}">{label}</div>',
        unsafe_allow_html=True
    )

def main():
    st.set_page_config(layout="wide")
    st.title("Key Visualizer (Streamlit版)")
    st.markdown('<div style="font-family:Parakeet;font-size:35px;text-align:center;">Moooose<br>MooooseFree<br>MooooseMini<br><span style="font-size:16px;">designed by ataruno</span></div>', unsafe_allow_html=True)
    st.markdown('<div style="font-family:Hackgen;font-size:25px;text-align:center;">KEY LOG</div>', unsafe_allow_html=True)

    scale_factor = 0.8
    key_positions = load_key_positions("keypos.csv", scale_factor=scale_factor)
    keymap = load_keymap("keymap.csv")

    # Streamlitでキー押下状態を管理
    if "pressed_keys" not in st.session_state:
        st.session_state.pressed_keys = set()

    # キー選択UI
    pressed = st.multiselect("押下中のキーを選択", keymap, default=list(st.session_state.pressed_keys))
    st.session_state.pressed_keys = set(pressed)

    # キー全体の範囲を計算
    min_x = min(k['x'] for k in key_positions)
    min_y = min(k['y'] for k in key_positions)
    max_x = max(k['x'] + k['w'] for k in key_positions)
    max_y = max(k['y'] + k['h'] for k in key_positions)
    key_width = max_x - min_x
    key_height = max_y - min_y

    canvas_width = 1600
    canvas_height = 800
    offset_x = (canvas_width - key_width) / 2 - min_x
    offset_y = (canvas_height - key_height) / 2 - min_y

    # 親divのoverflowをvisibleに
    st.markdown(
        f'''
        <div style="position:relative;width:{canvas_width}px;height:{canvas_height}px;
        border:1px solid #ccc;margin:auto;overflow:visible;background:#f8f8f8;">
        ''',
        unsafe_allow_html=True
    )
    for i, key in enumerate(key_positions):
        x = key['x'] + offset_x
        y = key['y'] + offset_y
        w = key['w']
        h = key['h']
        r = key['r']
        label = keymap[i] if i < len(keymap) else "?"
        draw_key(x, y, w, h, r, label, label in st.session_state.pressed_keys)
    st.markdown('</div>', unsafe_allow_html=True)

if __name__ == "__main__":
    main()
