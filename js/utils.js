export function updateLog(msg) {
  console.log("updateLog:", msg);
  document.getElementById('log-label').textContent = msg;
}

export function rotatePoint(x, y, rx, ry, angle) {
  const rad = (angle * Math.PI) / 180;
  const dx = x - rx;
  const dy = y - ry;
  return {
    x: rx + (dx * Math.cos(rad) - dy * Math.sin(rad)),
    y: ry + (dx * Math.sin(rad) + dy * Math.cos(rad))
  };
}
