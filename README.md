# KeymapViewer
https://keymap-viewer-test.netlify.app/

## 概要
キーボード入力に応じて視覚的に押されたキーをWebブラウザ上で表示するビューワーです。  

## 特徴
* QMK互換JSONでレイアウトを設定
* ZMK風マクロ記法でキーマップを設定
* テーマ切り替え（ライト/ダーク/ブルー/グリーン/コンソール風）
* キャンバスはウインドウサイズに自動フィット
* キー押下時にリアルタイムでハイライト表示
* ログ表示機能

## 動作環境
- Webブラウザ（Chrome, Edge, Firefox, Safari等）
- サーバ不要、Netlify等の静的ホスティングで動作

## 使い方
1. `Layout JSON` にQMK互換のレイアウトJSONを貼り付け
2. `Keymap Macro` にZMK風のキーマップマクロを貼り付け
3. `Update Layout` ボタンで反映
4. キーボードを押すと該当キーがハイライトされます
5. テーマは右上のセレクトボックスで切り替え可能

## レイアウトJSON例
```json
{
  "layouts": {
    "layout_US": {
      "layout": [
        { "x": 0.0, "y": 0.0 },
        { "x": 1.0, "y": 0.0 }
        // ...省略...
      ]
    }
  }
}
```

## キーマップマクロ例
```
keymap {
  compatible = "zmk,keymap";
  default_layer {
    bindings = <
      &kp Q &kp W &kp E &kp R &kp T
      // ...省略...
    >;
  };
};
```

## ログ
画面上部に直近のキーイベントが表示されます。  
![](./readmeimage/KeymapViewerLog.webp)

## 謝辞
このプロジェクトは[ataruno](https://github.com/ataruno)さんの[KeymapViewer](https://github.com/ataruno/KeymapViewer)をベースに、Web対応に改変したものです。
オリジナルのアイデアと実装を提供してくださったatarunoさんに深く感謝いたします。

原作: [KeymapViewer](https://github.com/ataruno/KeymapViewer) by [@ataruno](https://github.com/ataruno)