import tkinter as tk
import math
import csv

class KeyVisualizer:
    def __init__(self, master, key_positions, keymap):
        self.master = master
        self.key_positions = key_positions
        self.keymap = keymap
        self.key_states = {}  # キーの押下状態を管理
        self.canvas = tk.Canvas(master, width=1800, height=800, highlightthickness=0)
        self.canvas.pack()
        self.default_font = ("Hackgen", 14)
        self.title_font = ("Hackgen", 25)

        # ログ表示用のラベルを作成
        self.log_label = tk.Label(master, text="KEY LOG", font=("Hackgen", 25), anchor="center")
        self.log_label.place(relx=0.5, rely=0.32, anchor="center")

        # ロゴ用
        self.label1 = tk.Label(master, text="Moooose", font=("Parakeet", 35), anchor="center")
        self.label2 = tk.Label(master, text="MooooseFree", font=("Parakeet", 35), anchor="center")
        self.label3 = tk.Label(master, text="MooooseMini", font=("Parakeet", 35), anchor="center")
        self.label4 = tk.Label(master, text="designed by ataruno", font=("Parakeet", 16), anchor="center")
        self.label1.place(relx=0.5, rely=0.1, anchor="center")
        self.label2.place(relx=0.5, rely=0.16, anchor="center")
        self.label3.place(relx=0.5, rely=0.22, anchor="center")
        self.label4.place(relx=0.5, rely=0.27, anchor="center")

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

        # キー全体の範囲を計算
        min_x = min(k['x'] for k in self.key_positions)
        min_y = min(k['y'] for k in self.key_positions)
        max_x = max(k['x'] + k['w'] for k in self.key_positions)
        max_y = max(k['y'] + k['h'] for k in self.key_positions)

        key_width = max_x - min_x
        key_height = max_y - min_y

        canvas_width = int(self.canvas['width'])
        canvas_height = int(self.canvas['height'])

        offset_x = (canvas_width - key_width) / 2 - min_x
        offset_y = (canvas_height - key_height) / 2 - min_y

        for i, key in enumerate(self.key_positions):
            x = key['x'] + offset_x
            y = key['y'] + offset_y
            w = key['w']
            h = key['h']
            r = key['r']
            label = self.keymap[i] if i < len(self.keymap) else "?"

            # 回転を適用
            p1, p2, p3, p4 = self.rotate(x, y, w, h, r)

            fill_color = "gray" if label in ("[NUM]","[ARROW]") else "lightgray"

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
            self.canvas.create_text(text_x, text_y, text=label, font=("Hackgen", 12), fill="black")

            # 初期のキーの状態を設定
            self.key_states[label] = False  # 最初はすべて押されていない

    def update_log(self, message):
        # ログ表示を更新
        self.log_label.config(text=f"{message}")

    def on_key_press(self, event):
        key = event.keysym.upper()
        print(f"Key Pressed: keysym={event.keysym}, keycode={event.keycode}, key = {key}")
        self.update_log(f"Key Pressed: {key}")
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

        # キーが存在する場合、その色を変更
        if key in self.key_states:
            self.key_states[key] = True
            self.canvas.itemconfig(f"key_{key}", fill="orange")

    def on_key_release(self, event):
        key = event.keysym.upper()
        print(f"Key release: keysym={event.keysym}, keycode={event.keycode}, key = {key}")
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

        # キーが存在する場合、その色を変更
        if key and key in self.key_states:
            self.key_states[key] = False
            self.canvas.itemconfig(f"key_{key}", fill="lightgray")

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

# GUIを作成
def create_gui(key_positions, keymap):
    root = tk.Tk()
    root.title("Key Visualizer")
    root.geometry("1600x800")

    # キーボードビジュアライザーを初期化
    visualizer = KeyVisualizer(root, key_positions, keymap)
    root.mainloop()

if __name__ == "__main__":
    # 描画スケーリングを設定
    scale_factor = 0.8
    key_positions = load_key_positions("keypos.csv", scale_factor=scale_factor)
    keymap = load_keymap("keymap.csv")
    create_gui(key_positions, keymap)
