import * as Keyboard from './keyboard.js';
import { rotatePoint } from './utils.js';

export let keyRects = [];

export function drawKeys(ctx, keyPositions, keymap, theme, keyStates, lastPressedKeyCenter) {
  keyRects = [];
  // Clear canvas first
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Handle empty states
  if (!keyPositions || !keyPositions.length || !keymap || !keymap.length) {
    return;
  }

  // Draw keys
  console.log("drawKeys called", { keyPositions, keymap, theme });
  // 背景色をテーマに応じて設定
  if (document.body.classList.contains('myakumyaku')) {
    ctx.fillStyle = '#0066cc';  // ミャクミャク様テーマの時は青背景
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  } else {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  
  if (!keyPositions.length || !keymap.length) {
    console.log("drawKeys: keyPositions or keymap is empty");
    return;
  }

  const themeColors = {
    light:   { normal: '#f3f4f6', special: '#e5e7eb', pressed: '#fef3c7', stroke: '#9ca3af', bg: '#ffffff', text: '#1f2937' },
    dark:    { normal: '#374151', special: '#1f2937', pressed: '#92400e', stroke: '#6b7280', bg: '#111827', text: '#ffffff' },
    blue:    { normal: '#dbeafe', special: '#bfdbfe', pressed: '#ffb347', stroke: '#60a5fa', bg: '#eff6ff', text: '#1e40af' },
    green:   { normal: '#d1fae5', special: '#a7f3d0', pressed: '#ffe066', stroke: '#34d399', bg: '#ecfdf5', text: '#065f46' },
    console: { normal: '#003300', special: '#001a00', pressed: '#00ff00', stroke: '#00ff00', bg: '#000000', text: '#00ff00' },
    myakumyaku: { normal: '#ff0000', special: '#0066cc', pressed: '#ff69b4', stroke: '#ffffff', bg: '#0066cc', text: '#ffffff' },
    psychedelic: { 
      normal: '#ff1493', 
      special: '#00ff00', 
      pressed: '#ff00ff',
      stroke: '#ffffff',
      bg: 'rainbow',  // 特別な背景指定
      text: '#ffffff'
    }
  };
  const colors = themeColors[theme];

  // 背景色をテーマに応じて設定
  if (theme === 'psychedelic') {
    // グラデーション背景
    const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, ctx.canvas.height);
    const time = Date.now() / 1000;
    gradient.addColorStop(0, `hsl(${(time * 50) % 360}, 100%, 50%)`);
    gradient.addColorStop(0.5, `hsl(${(time * 50 + 120) % 360}, 100%, 50%)`);
    gradient.addColorStop(1, `hsl(${(time * 50 + 240) % 360}, 100%, 50%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // 波紋エフェクト - キーが押された位置から発生
    if (lastPressedKeyCenter) {
      const maxRadius = Math.max(ctx.canvas.width, ctx.canvas.height);
      for (let i = 0; i < 5; i++) {
        const radius = ((time * 100 + i * 50) % maxRadius);
        ctx.beginPath();
        ctx.arc(lastPressedKeyCenter.x, lastPressedKeyCenter.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${(time * 100 + i * 72) % 360}, 100%, 50%, ${0.5 - i * 0.1})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  } else if (document.body.classList.contains('myakumyaku')) {
    ctx.fillStyle = '#0066cc';  // ミャクミャク様テーマの時は青背景
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  } else {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  const minX = Math.min(...keyPositions.map(k => k.x));
  const minY = Math.min(...keyPositions.map(k => k.y));
  const maxX = Math.max(...keyPositions.map(k => k.x + k.w));
  const maxY = Math.max(...keyPositions.map(k => k.y + k.h));

  const layoutWidth = maxX - minX;
  const layoutHeight = maxY - minY;

  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;

  // スケーリング係数の調整
  const widthScale = (canvasWidth * 0.9) / layoutWidth;
  const heightScale = (canvasHeight * 0.9) / layoutHeight;
  const autoScale = Math.min(widthScale, heightScale);
  const scaleFactor = autoScale / 100; // スケーリング係数を追加

  // キャンバス中央に配置
  const offsetX = (canvasWidth - layoutWidth * autoScale) / 2 - minX * autoScale;
  const offsetY = (canvasHeight - layoutHeight * autoScale) / 2 - minY * autoScale;

  keyPositions.forEach((key, i) => {
    let x = key.x;
    let y = key.y;
    
    // 回転がある場合は座標を補正
    if (key.r !== 0) {
      const rotated = rotatePoint(x, y, key.rx, key.ry, key.r);
      x = rotated.x;
      y = rotated.y;
    }
    
    x = x * autoScale + offsetX;
    y = y * autoScale + offsetY;
    const w = key.w * autoScale;
    const h = key.h * autoScale;
    const r = key.r;
    const label = Keyboard.normalizeKeyLabel(keymap[i] || '?');

    // 押下状態による色分け
    let fillStyle = colors.normal;
    if (label === '---') {
      fillStyle = colors.special;
    }
    if (keyStates[label]) {
      fillStyle = colors.pressed;
    }

    // キーの影を追加
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((r * Math.PI) / 180);
    
    // 影を描画
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // キーの本体を描画
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 4); // 角を丸くする
    ctx.fill();
    
    // 枠線を描画
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 1.5;
    ctx.roundRect(-w / 2, -h / 2, w, h, 4);
    ctx.stroke();

    // フォントサイズの調整
    const fontSize = Math.max(12, Math.min(w / 3, h / 2)) * 0.8;
    ctx.font = `${fontSize}px Inter, sans-serif`;

    // テキストを描画
    ctx.shadowColor = 'transparent'; // テキストには影を付けない
    ctx.fillStyle = colors.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0);
    
    ctx.restore();

    // キーの位置情報を保存（押下判定用）
    keyRects.push({ label, x, y, w, h, r });
    // 初期化
    if (!(label in keyStates)) keyStates[label] = false;
  });
}

export function resizeCanvas() {
  const canvasElem = document.getElementById('key-canvas');
  const frame = document.getElementById('canvas-frame');
  if (!canvasElem || !frame) return;

  // アスペクト比を維持しながらリサイズ
  const frameWidth = frame.clientWidth;
  const frameHeight = window.innerHeight - frame.getBoundingClientRect().top - 40;
  
  canvasElem.width = frameWidth;
  canvasElem.height = frameHeight;

  if (window.redraw) {
    window.redraw();
  }
}