import tkinter as tk
from tkinter import ttk
import streamlit as st
import math
import csv
import io
import json
import re

class KeyVisualizer:
    def __init__(self, master, key_positions, keymap):
        self.master = master
        self.key_positions = key_positions
        self.keymap = keymap
        self.scale_factor = 0.8  # デフォルトのスケール
        self.resize_timer = None  # リサイズタイマー用
        
        # メインフレーム（上下分割用）
        main_frame = ttk.Frame(master)
        main_frame.pack(fill='both', expand=True)
        
        # 入力フレーム（上部固定）
        input_frame = ttk.Frame(main_frame)
        input_frame.pack(fill='x', side='top', padx=10, pady=5)
        
        # キャンバスフレーム（下部伸縮）
        canvas_frame = ttk.Frame(main_frame)
        canvas_frame.pack(fill='both', expand=True)
        
        # キャンバスの作成
        self.canvas = tk.Canvas(canvas_frame, highlightthickness=0)
        self.canvas.pack(fill='both', expand=True)

        self.key_states = {}  # キーの押下状態を管理
        self.default_font = ("Hackgen", 14)
        self.title_font = ("Hackgen", 25)

        # ログ表示用のラベルをキャンバスの上部に配置
        self.log_label = tk.Label(canvas_frame, text="KEY LOG", font=("Hackgen", 25), anchor="center")
        self.log_label.pack(side='top', pady=10)

        # JSON入力用ラベルとテキストエリア
        json_label = ttk.Label(input_frame, text="Layout JSON:")
        json_label.pack(side='top', anchor='w')
        self.json_text = tk.Text(input_frame, height=5, width=50)
        self.json_text.pack(side='top', fill='x', padx=5)
        
        # Keymap入力用ラベルとテキストエリア
        keymap_label = ttk.Label(input_frame, text="Keymap Macro:")
        keymap_label.pack(side='top', anchor='w')
        self.keymap_text = tk.Text(input_frame, height=5, width=50)
        self.keymap_text.pack(side='top', fill='x', padx=5)
        
        # 更新ボタン
        update_btn = ttk.Button(input_frame, text="Update Layout", command=self.update_layout)
        update_btn.pack(side='top', pady=5)

        # スケール選択用フレーム
        scale_frame = ttk.Frame(input_frame)
        scale_frame.pack(side='top', fill='x', padx=5)
        
        scale_label = ttk.Label(scale_frame, text="Scale:")
        scale_label.pack(side='left')
        
        self.scale_var = tk.StringVar(value="80%")
        scales = ["25%", "50%", "80%", "100%", "125%", "150%"]
        self.scale_combo = ttk.Combobox(scale_frame, values=scales, 
                                      textvariable=self.scale_var, width=10)
        self.scale_combo.pack(side='left', padx=5)
        self.scale_combo.bind('<<ComboboxSelected>>', self.on_scale_change)

        self.key_buttons = {}
        self.mouse_buttons = {}
        self.create_keys()

        # イベントバインディング
        self.canvas.bind("<KeyPress>", self.on_key_press)
        self.canvas.bind("<KeyRelease>", self.on_key_release)
        self.canvas.bind("<ButtonPress-1>", self.on_mouse_press)
        self.canvas.bind("<ButtonRelease-1>", self.on_mouse_release)
        self.canvas.bind("<ButtonPress-3>", self.on_mouse_press)
        self.canvas.bind("<ButtonRelease-3>", self.on_mouse_release)
        self.canvas.bind("<ButtonPress-2>", self.on_mouse_press)
        self.canvas.bind("<ButtonRelease-2>", self.on_mouse_release)
        self.canvas.bind("<MouseWheel>", self.on_mouse_wheel)  # Windows / Mac 対応
        self.canvas.bind("<Button-4>", self.on_mouse_wheel)    # Linux: ホイール上
        self.canvas.bind("<Button-5>", self.on_mouse_wheel)    # Linux: ホイール下
        self.canvas.focus_set()

        # ウィンドウリサイズイベントをバインド
        self.master.bind("<Configure>", self.on_window_resize)
        self.master.update_idletasks()  # 初期サイズを取得するため
        self.last_width = self.master.winfo_width()
        self.last_height = self.master.winfo_height()

    def clear_canvas(self):
        """キャンバスの内容を完全にクリア"""
        # すべてのアイテムを削除
        self.canvas.delete("all")
        # キー状態をリセット
        self.key_states.clear()
        # キャンバスを更新
        self.canvas.update()
        # フォーカスを維持
        self.canvas.focus_force()

    def update_layout(self):
        # JSONテキストを解析
        json_text = self.json_text.get("1.0", "end-1c")
        keymap_text = self.keymap_text.get("1.0", "end-1c")
        
        try:
            print("\n=== Starting layout update ===")
            self.key_positions = self.parse_json_layout(json_text)
            self.keymap = self.parse_keymap_macro(keymap_text)
            print(f"\nTotal keys: {len(self.key_positions)}")
            print(f"Total keymap entries: {len(self.keymap)}")
            
            # キャンバスをクリアして再描画
            self.clear_canvas()
            self.create_keys()
            self.update_log("Layout updated successfully")
            
            # フォーカスを再設定
            self.canvas.focus_set()
            
        except Exception as e:
            error_msg = f"Error updating layout: {str(e)}"
            print(error_msg)
            self.update_log(error_msg)

    def parse_json_layout(self, json_text):
        try:
            layout_data = json.loads(json_text)
            if "layouts" in layout_data:
                # QMK互換のJSONフォーマット
                layout = layout_data["layouts"]["layout_US"]["layout"]
                positions = [{
                    'x': key.get('x', 0) * 100,
                    'y': key.get('y', 0) * 100,
                    'w': key.get('w', 1) * 100,
                    'h': key.get('h', 1) * 100,
                    'r': key.get('r', 0),
                } for key in layout]
                
                # デバッグ情報の表示
                print("Loaded key positions:")
                for i, pos in enumerate(positions):
                    print(f"Key {i}: x={pos['x']}, y={pos['y']}, w={pos['w']}, h={pos['h']}, r={pos['r']}")
                
                return positions
            return []
        except Exception as e:
            self.update_log(f"JSON Parse Error: {str(e)}")
            return []

    def parse_keymap_macro(self, keymap_text):
        keymap = []
        in_bindings = False
        # パターンとトランスフォーマーのペアを定義
        patterns = [
            (r'&kp\s+(\S+)', lambda x: x),               # 通常のキー
            (r'&lt\s+\d+\s+(\S+)', lambda x: x),        # レイヤータップ
            (r'&mt\s+\S+\s+(\S+)', lambda x: x),        # モッドタップ
            (r'&toJIS\s+\d+\s+(\S+)', lambda x: x),     # JIS変換
            (r'&mF(\d+)', lambda x: f"F{x}"),           # ファンクションキー
            (r'&trans', lambda _: "TRANS"),             # 透過キー
        ]

        for line in keymap_text.split('\n'):
            line = line.strip()
            
            # バインディングセクションの開始を検出
            if 'bindings = <' in line:
                in_bindings = True
                continue
            elif '>;' in line:
                in_bindings = False
                continue
            
            if not in_bindings or not line or line.startswith('//'):
                continue

            # キーコードを処理
            keycodes = [code.strip() for code in line.split('&') if code.strip()]
            for keycode in keycodes:
                key_found = False
                keycode = '&' + keycode  # 先頭の&を戻す
                print(f"Processing: {keycode}")
                
                for pattern, transformer in patterns:
                    match = re.match(pattern, keycode)
                    if match:
                        key = transformer(match.group(1))
                        keymap.append(key)
                        key_found = True
                        print(f"Matched: {keycode} -> {key}")
                        break
                
                if not key_found:
                    print(f"Warning: Unknown keycode: {keycode}")
                    keymap.append("?")

        print(f"\nTotal keys parsed: {len(keymap)}")
        for i, key in enumerate(keymap):
            print(f"Position {i}: {key}")
        
        return keymap

    def parse_keypos_csv(self, csv_text, scale_factor=0.8):
        keys = []
        reader = csv.DictReader(io.StringIO(csv_text))
        for row in reader:
            keys.append({
                'x': float(row['x']) * scale_factor,
                'y': float(row['y']) * scale_factor,
                'w': float(row['w']) * scale_factor,
                'h': float(row['h']) * scale_factor,
                'r': float(row.get('r', 0)),
            })
        return keys

    def parse_keymap_csv(self, csv_text):
        keymap = []
        reader = csv.reader(io.StringIO(csv_text))
        for row in reader:
            for item in row:
                item = item.strip()
                if item:
                    key = item.split()[-1]
                    keymap.append(key)
        return keymap

    # キーの位置と回転を計算
    def rotate(self, x, y, width, height, rotation):
        # 回転角度をラジアンに変換
        angle_rad = math.radians(rotation)

        def rotate_point(px, py):
            dx, dy = px - x, py - y
            rx = x + dx * math.cos(angle_rad) - dy * math.sin(angle_rad)
            ry = y + dx * math.sin(angle_rad) + dy * math.cos(angle_rad)
            return rx, ry

        p1 = rotate_point(x, y)
        p2 = rotate_point(x + width, y)
        p3 = rotate_point(x + width, y + height)
        p4 = rotate_point(x, y + height)

        return p1, p2, p3, p4

    # キーの描画
    def create_keys(self):
        # キャンバスが有効かチェック
        if not self.canvas.winfo_exists():
            return
            
        # キャンバスサイズが有効かチェック
        canvas_width = self.canvas.winfo_width()
        canvas_height = self.canvas.winfo_height()
        if canvas_width <= 1 or canvas_height <= 1:
            return

        # Validate input data
        if not self.key_positions:
            self.update_log("Error: No key positions loaded")
            return

        if not self.keymap:
            self.update_log("Error: No keymap loaded")
            return

        # キー全体の範囲を計算
        try:
            min_x = min(k['x'] for k in self.key_positions)
            min_y = min(k['y'] for k in self.key_positions)
            max_x = max(k['x'] + k['w'] for k in self.key_positions)
            max_y = max(k['y'] + k['h'] for k in self.key_positions)
            
            # キャンバスサイズに合わせて自動スケーリング
            layout_width = max_x - min_x
            layout_height = max_y - min_y
            
            # アスペクト比を保持しながらスケーリング
            width_scale = (canvas_width * 0.8) / layout_width
            height_scale = (canvas_height * 0.8) / layout_height
            auto_scale = min(width_scale, height_scale)
            
            # スケールファクターを更新
            self.scale_factor = auto_scale
            
        except Exception as e:
            self.update_log(f"Error calculating layout bounds: {str(e)}")
            return

        # スケールを適用
        key_width = (max_x - min_x) * self.scale_factor
        key_height = (max_y - min_y) * self.scale_factor

        offset_x = (canvas_width - key_width) / 2 - min_x * self.scale_factor
        offset_y = (canvas_height - key_height) / 2 - min_y * self.scale_factor

        for i, key in enumerate(self.key_positions):
            x = key['x'] * self.scale_factor + offset_x
            y = key['y'] * self.scale_factor + offset_y
            w = key['w'] * self.scale_factor
            h = key['h'] * self.scale_factor
            r = key['r']
            label = self.normalize_key_label(self.keymap[i] if i < len(self.keymap) else "?")
            # print(f"Key {i}: x={x}, y={y}, w={w}, h={h}, r={r}, label={label}")
            
            # 特殊キーの色分け
            fill_color = "gray"
            if label == "---":
                fill_color = "#dddddd"  # 透過キー
            elif label.startswith("F1"):
                fill_color = "#ffcccc"  # ファンクションキー
            else:
                fill_color = "lightgray"  # 通常のキー

            # 回転を適用
            p1, p2, p3, p4 = self.rotate(x, y, w, h, r)

            # ポリゴン描画
            polygon = self.canvas.create_polygon(
                [p1[0], p1[1], p2[0], p2[1], p3[0], p3[1], p4[0], p4[1]],
                fill=fill_color,
                outline="gray",
                tags=f"key_{label}"
            )

            # 文字の表示
            text_x = (p1[0] + p2[0] + p3[0] + p4[0]) / 4
            text_y = (p1[1] + p2[1] + p3[1] + p4[1]) / 4

            # フォントサイズをスケールに応じて調整
            font_size = int(12 * self.scale_factor)
            self.canvas.create_text(text_x, text_y, text=label, 
                                  font=("Hackgen", max(8, font_size)), 
                                  fill="black")

            # 初期のキーの状態を設定
            self.key_states[label] = False  # 最初はすべて押されていない

    def normalize_key_label(self, label):
        """キーラベルを正規化する"""
        key_mapping = {
            'N1': '1',
            'N2': '2',
            'N3': '3',
            'N4': '4',
            'N5': '5',
            'N6': '6',
            'N7': '7',
            'N8': '8',
            'N9': '9',
            'N0': '0',
            'LALT': 'ALT',
            'RALT': 'ALT',
            'LSHFT': 'SHIFT',
            'LSHIFT': 'SHIFT',
            'RSHFT': 'SHIFT',
            'RSHIFT': 'SHIFT',
            'LCTRL': 'CTRL',
            'RCTRL': 'CTRL',
            'LGUI': 'WIN',
            'RGUI': 'WIN',
            'SPACE': 'SPACE',
            'ENTER': 'ENTER',
            'ESC': 'ESC',
            'BKSP': 'BACKSPACE',
            'BSPC': 'BACKSPACE',
            'INT3': 'INT3',
            'TAB': 'TAB',
            'F13': 'F13',
            'F14': 'F14',
            'F15': 'F15',
            'F16': 'F16',
            'F17': 'F17',
            'F18': 'F18',
            'TRANS': '---',
        }
        return key_mapping.get(label, label)

    def update_log(self, message):
        # ログ表示を更新
        self.log_label.config(text=f"{message}")

    def on_scale_change(self, event=None):
        """スケール変更時の処理"""
        scale_text = self.scale_var.get().rstrip('%')
        self.scale_factor = float(scale_text) / 100.0
        self.update_layout()

    def on_window_resize(self, event):
        # ウィンドウサイズが変わった時だけ処理
        if event.width != self.last_width or event.height != self.last_height:
            self.last_width = event.width
            self.last_height = event.height
            
            # キャンバスサイズを更新
            self.canvas.configure(width=event.width, height=event.height)
            self.canvas.update()  # キャンバスの更新を待つ
            
            # 古いレイアウトをクリアしてから新しいレイアウトを描画
            self.clear_canvas()
            self.create_keys()
            
            # 変更を確実に反映
            self.canvas.update_idletasks()

    def do_resize(self, width, height):
        """実際のリサイズ処理を実行"""
        self.last_width = width
        self.last_height = height
        self.canvas.configure(width=width, height=height)
        
        # キャンバスの更新を待ってからレイアウトを更新
        self.master.update_idletasks()
        self.create_keys()

    def on_key_press(self, event):
        key = event.keysym.upper()
        print(f"Key Pressed: {key}")
        if key == "":
            key = ""
        elif key in ("ALT_L","ALT_R"):
            key = "ALT"
        elif key in ("SHIFT_R","SHIFT_L"):
            key = "SHIFT"
        elif key == "CONTROL_L":
            key = "CTRL"
        elif key == "SUPER_L":
            key = "WIN"
        elif key == "DELETE":
            key = "DELETE"
        elif key == "BACKSPACE":
            key = "BACKSPACE"
        elif key == "RETURN":
            key = "ENTER"
        elif key == "TAB":
            key = "TAB"
        elif key == "SPACE":
            key = "SPACE"
        elif key == "ESCAPE":
            key = "ESC"
        elif key == "BACKSLASH":
            key = "YEN"
        elif key == "BRACKETLEFT":
            key = "{"
        elif key == "BRACKETRIGHT":
            key = "}"
        elif key == "AT":
            key = "@"
        elif key == "SEMICOLON":
            key = ";"
        elif key == "COLON":
            key = ":"
        elif key == "XF86AUDIOMUTE":
            key = "MUTE"
        normalized_key = self.normalize_key_label(key)
        print(f"Key Pressed: keysym={event.keysym}, keycode={event.keycode}, key={key}, normalized={normalized_key}")
        self.update_log(f"Key Pressed: {normalized_key}")

        for canvas_key in self.key_states.keys():
            if canvas_key == normalized_key:
                self.key_states[canvas_key] = True
                self.canvas.itemconfig(f"key_{canvas_key}", fill="orange")
                break

    def on_key_release(self, event):
        key = event.keysym.upper()
        if key == "":
            key = ""
        elif key in ("ALT_L","ALT_R"):
            key = "ALT"
        elif key in ("SHIFT_R","SHIFT_L"):
            key = "SHIFT"
        elif key == "CONTROL_L":
            key = "CTRL"
        elif key == "SUPER_L":
            key = "WIN"
        elif key == "DELETE":
            key = "DELETE"
        elif key == "BACKSPACE":
            key = "BACKSPACE"
        elif key == "RETURN":
            key = "ENTER"
        elif key == "TAB":
            key = "TAB"
        elif key == "SPACE":
            key = "SPACE"
        elif key == "ESCAPE":
            key = "ESC"
        elif key == "BACKSLASH":
            key = "YEN"
        elif key == "BRACKETLEFT":
            key = "{"
        elif key == "BRACKETRIGHT":
            key = "}"
        elif key == "AT":
            key = "@"
        elif key == "SEMICOLON":
            key = ";"
        elif key == "COLON":
            key = ":"
        elif key == "XF86AUDIOMUTE":
            key = "MUTE"
        normalized_key = self.normalize_key_label(key)
        print(f"Key Released: keysym={event.keysym}, keycode={event.keycode}, key={key}, normalized={normalized_key}")

        for canvas_key in self.key_states.keys():
            if canvas_key == normalized_key:
                self.key_states[canvas_key] = False
                self.canvas.itemconfig(f"key_{canvas_key}", fill="lightgray")
                break

    def on_mouse_press(self, event):
        if event.num == 1:
            key = "LCLK"
        elif event.num == 2:
            key = "MCLK"
        elif event.num == 3:
            key = "RCLK"
        else:
            return
        print(f"Mouse Pressed: {key}")
        self.update_log(f"Mouse Pressed: {key}")  # ログを更新
        if key in self.key_states:
            self.key_states[key] = True
            self.canvas.itemconfig(f"key_{key}", fill="orange")

    def on_mouse_release(self, event):
        if event.num == 1:
            key = "LCLK"
        elif event.num == 2:
            key = "MCLK"
        elif event.num == 3:
            key = "RCLK"
        else:
            return
        print(f"Mouse Released: {key}")
        if key in self.key_states:
            self.key_states[key] = False
            self.canvas.itemconfig(f"key_{key}", fill="lightgray")

    def on_mouse_wheel(self, event):
        if hasattr(event, 'delta'):  # Windows / Mac
            key = "WHUP" if event.delta > 0 else "WHDN"
        elif event.num == 4:  # Linux 上スクロール
            key = "WHUP"
        elif event.num == 5:  # Linux 下スクロール
            key = "WHDN"
        else:
            return

        self.update_log(f"Mouse Wheel: {key}")  # ログを更新
        print(f"Mouse Wheel: {key}")
        if key in self.key_states:
            self.key_states[key] = True
            self.canvas.itemconfig(f"key_{key}", fill="orange")
            # ホイールは一瞬なので即座にリセット
            self.master.after(100, lambda: self.release_wheel(key))

    def release_wheel(self, key):
        if key in self.key_states:
            self.key_states[key] = False
            self.canvas.itemconfig(f"key_{key}", fill="lightgray")

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

def parse_keymap_layout(keymap_file):
    """Extract key positions from ZMK keymap file"""
    keys = []
    pattern = r'&key_physical_attrs\s+(\d+)\s+(\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)'
    
    try:
        with open(keymap_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Find all key definitions
        matches = re.finditer(pattern, content)
        for match in matches:
            w, h, x, y, rot, rx, ry = map(int, match.groups())
            keys.append({
                'x': x,
                'y': y,
                'w': w,
                'h': h,
                'r': rot
            })
            
        print(f"Found {len(keys)} keys in layout")
        return keys
        
    except Exception as e:
        print(f"Error parsing keymap layout: {str(e)}")
        return []

# GUIを作成
def create_gui(key_positions, keymap):
    root = tk.Tk()
    root.title("Key Visualizer")
    root.geometry("1600x1200")
    root.minsize(800, 600)  # 最小ウィンドウサイズを設定

    # キーボードビジュアライザーを初期化
    visualizer = KeyVisualizer(root, key_positions, keymap)
    root.mainloop()

if __name__ == "__main__":
    # キーレイアウトとkeymapを読み込む
    scale_factor = 0.8
    key_positions = parse_keymap_layout("Solstice.keymap")
    keymap = []  # Initialize with empty keymap for now
    create_gui(key_positions, keymap)
