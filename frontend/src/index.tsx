// frontend/src/index.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// MEMO:
// このReactアプリは、Vercel・Netlify・GitHub Pages（静的）・Render（無料枠あり）など
// 無料でデプロイできるサービスにそのままデプロイ可能です。
// 動的なAPIやサーバーサイド処理が必要な場合は、Vercel/Netlify Functionsや
// Cloudflare Pages Functionsなども検討できます。

// 例: Vercel/Netlifyなら `npm run build` → ディレクトリごとアップロードでOK
// 例: GitHub Pagesなら静的ファイルのみ（APIは不可）

// Netlifyでデプロイする場合のポイント:
// - `npm run build` で `dist` または `build` ディレクトリを生成
// - Netlifyの「Site settings」で「Publish directory」を `dist` または `build` に設定
// - 動的APIが必要なら Netlify Functions も利用可能
// - ルーティングや404対応は `public/_redirects` で設定できる

const App = () => {
  return <h1>Hello from KeymapViewer Component!</h1>;
};

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
