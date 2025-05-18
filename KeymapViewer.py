import streamlit as st
import streamlit.components.v1 as components
from streamlit_js_eval import streamlit_js_eval
import json
import re
from PIL import Image, ImageDraw, ImageFont
import io
from frontend import frontend_component

def init_state():
    """Initialize session state variables"""
    if 'layout_text' not in st.session_state:
        st.session_state.layout_text = ''
    if 'keymap_text' not in st.session_state:
        st.session_state.keymap_text = ''
    if 'key_positions' not in st.session_state:
        st.session_state.key_positions = []
    if 'keymap' not in st.session_state:
        st.session_state.keymap = []
    if 'scale' not in st.session_state:
        st.session_state.scale = 0.8
    if 'pressed_keys' not in st.session_state:
        st.session_state.pressed_keys = set()

def parse_keymap_layout(layout_text):
    """Extract key positions from JSON or ZMK format"""
    try:
        # Try parsing as JSON first
        try:
            layout_data = json.loads(layout_text)
            if "layouts" in layout_data:
                layout = layout_data["layouts"]["layout_US"]["layout"]
                return [{
                    'x': key.get('x', 0) * 100,
                    'y': key.get('y', 0) * 100,
                    'w': key.get('w', 1) * 100,
                    'h': key.get('h', 1) * 100,
                    'r': key.get('r', 0),
                } for key in layout]
        except json.JSONDecodeError:
            pass

        # Try parsing as ZMK format
        keys = []
        pattern = r'&key_physical_attrs\s+(\d+)\s+(\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)'
        matches = re.finditer(pattern, layout_text)
        for match in matches:
            w, h, x, y, rot, rx, ry = map(int, match.groups())
            keys.append({
                'x': x,
                'y': y,
                'w': w,
                'h': h,
                'r': rot
            })
        
        if keys:
            return keys
            
        st.error("Unable to parse layout in either JSON or ZMK format")
        return []
        
    except Exception as e:
        st.error(f"Error parsing layout: {str(e)}")
        return []

def parse_keymap_macro(keymap_text):
    """Parse keymap bindings"""
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

        for keycode in [c.strip() for c in line.split('&') if c.strip()]:
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

def draw_keyboard():
    """Draw keyboard layout"""
    if not st.session_state.key_positions or not st.session_state.keymap:
        return None

    # Calculate canvas size
    min_x = min(k['x'] for k in st.session_state.key_positions)
    min_y = min(k['y'] for k in st.session_state.key_positions)
    max_x = max(k['x'] + k['w'] for k in st.session_state.key_positions)
    max_y = max(k['y'] + k['h'] for k in st.session_state.key_positions)

    # Create image
    scale = st.session_state.scale
    width = int((max_x - min_x) * scale) + 100
    height = int((max_y - min_y) * scale) + 100
    img = Image.new('RGB', (width, height), 'white')
    draw = ImageDraw.Draw(img)

    # Draw keys
    offset_x = -min_x * scale + 50
    offset_y = -min_y * scale + 50

    for i, key in enumerate(st.session_state.key_positions):
        if i >= len(st.session_state.keymap):
            break

        x = key['x'] * scale + offset_x
        y = key['y'] * scale + offset_y
        w = key['w'] * scale
        h = key['h'] * scale

        # キーラベルを取得
        label = st.session_state.keymap[i]
        
        # 押下状態に応じて色を設定
        fill_color = 'orange' if label in st.session_state.pressed_keys else 'lightgray'

        # Draw key rectangle with state-dependent color
        draw.rectangle(
            [x, y, x + w, y + h],
            fill=fill_color,
            outline='gray'
        )
        
        # Draw key label
        w2, h2 = draw.textsize(label) if hasattr(draw, 'textsize') else (10, 10)
        draw.text((x + w/2 - w2/2, y + h/2 - h2/2), label, fill='black')

    return img

def main():
    st.set_page_config(page_title="Keyboard Visualizer", layout="wide")
    init_state()
    st.title("Keyboard Visualizer")

    # iframeでキー取得→iframe自身だけリロード
    html_code = """
    <script>
    window.addEventListener('keydown', function(e) {
        const key = e.key;
        const url = new URL(window.location.href);
        url.searchParams.set('key', key);
        window.location.replace(url);
    });
    </script>
    <p>Press any key!</p>
    """
    iframe = components.html(html_code, height=100)

    # iframeのクエリパラメータからキー取得
    iframe_key = st.query_params.get("key", [""])[0]
    if iframe_key:
        st.session_state.pressed_keys = {iframe_key.upper()}
        st.write(f"Pressed key: {iframe_key}")
        print(f"Pressed key: {iframe_key}")

    # サイドバーにスケール選択を配置
    with st.sidebar:
        st.subheader("Display Settings")
        scale_options = {
            "25%": 0.25, "50%": 0.5, "80%": 0.8,
            "100%": 1.0, "125%": 1.25, "150%": 1.5
        }
        selected_scale = st.selectbox(
            "Scale",
            options=list(scale_options.keys()),
            index=2
        )
        st.session_state.scale = scale_options[selected_scale]

    # メインエリアを2カラムに分割
    col1, col2 = st.columns([2, 1])
    
    with col2:
        st.subheader("Layout Settings")
        
        # キーレイアウト入力エリア
        st.text_area(
            "Key Positions",
            key="layout_text",
            height=200,
            help="Paste the physical layout definition here"
        )
        
        # キーマップ入力エリア
        st.text_area(
            "Keymap Macro",
            key="keymap_text",
            height=200,
            help="Paste the keymap bindings here"
        )
        
        if st.button("Update Layout"):
            # レイアウトとキーマップを別々に解析
            st.session_state.key_positions = parse_keymap_layout(st.session_state.layout_text)
            st.session_state.keymap = parse_keymap_macro(st.session_state.keymap_text)
            
            if len(st.session_state.key_positions) > 0:
                st.success(f"Loaded {len(st.session_state.key_positions)} key positions")
            else:
                st.error("No key positions found")

    with col1:
        # キーボードの表示
        img = draw_keyboard()
        if img:
            st.image(img, use_container_width=True)
        else:
            st.info("Please enter key positions and keymap data, then click 'Update Layout'")

    # Custom component example
    st.title("Streamlit Custom Component Example")

    # Python→JSへ渡す値
    input_value = st.text_input("PythonからJSへ渡す値", "Hello from Python")

    # カスタムコンポーネント呼び出し
    output = frontend_component(input_value=input_value, key="my_frontend")

    # JS→Pythonへの返却値を表示
    st.write("JSから返ってきた値:", output)

if __name__ == "__main__":
    main()
