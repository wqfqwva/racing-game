import { N_RED, PERFORMANCE_BLUE } from './types';

// Helper to adjust color hex brightness
function adjustColor(hex: string, amount: number): string {
  let color = hex.replace('#', '');
  if (color.length === 3) {
    color = color.split('').map(c => c + c).join('');
  }
  const num = parseInt(color, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Draws the iconic slanted oval Hyundai "H" logo
 */
export function drawHyundaiEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  color: string,
  thickness = 2
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Slanted ellipse
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.5, h * 0.5, -0.08, 0, Math.PI * 2);
  ctx.stroke();

  // Left & right pillars + cross handshake bar
  const lx1 = cx - w * 0.22, ly1 = cy + h * 0.34;
  const lx2 = cx - w * 0.10, ly2 = cy - h * 0.34;
  const rx1 = cx + w * 0.10, ry1 = cy + h * 0.34;
  const rx2 = cx + w * 0.22, ry2 = cy - h * 0.34;

  ctx.beginPath();
  ctx.moveTo(lx1, ly1);
  ctx.lineTo(lx2, ly2);
  ctx.moveTo(rx1, ry1);
  ctx.lineTo(rx2, ry2);
  ctx.moveTo(cx - w * 0.16, cy + h * 0.05);
  ctx.lineTo(cx + w * 0.16, cy - h * 0.05);
  ctx.stroke();

  ctx.restore();
}

/**
 * Procedural renderer for Player Hyundai N Supercars
 * Center is at (0, 0)
 */
export function drawPlayerSupercar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bodyColor: string,
  accentColor: string,
  glowColor: string,
  isBoosting = false
) {
  ctx.save();

  const hw = width / 2;
  const hh = height / 2;

  // 1. Neon Underglow
  ctx.save();
  const glowExpands = [18, 12, 6];
  glowExpands.forEach((exp, idx) => {
    ctx.fillStyle = glowColor;
    ctx.globalAlpha = 0.12 + idx * 0.08;
    ctx.beginPath();
    ctx.roundRect(-hw - exp, -hh - exp * 0.5, (hw + exp) * 2, (hh + exp * 0.5) * 2, 22);
    ctx.fill();
  });
  ctx.restore();

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  ctx.ellipse(0, 6, hw + 8, hh + 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Tires & N Red Brake Calipers
  const wheelW = 9;
  const wheelH = 19;
  const wheelPositions = [
    [-hw - 3, -hh + 12],
    [hw + 3 - wheelW, -hh + 12],
    [-hw - 3, hh - 26],
    [hw + 3 - wheelW, hh - 26],
  ];

  wheelPositions.forEach(([wx, wy]) => {
    // Tire
    ctx.fillStyle = '#0e0f14';
    ctx.beginPath();
    ctx.roundRect(wx, wy, wheelW, wheelH, 3);
    ctx.fill();

    // Red Caliper
    ctx.fillStyle = N_RED;
    ctx.beginPath();
    ctx.roundRect(wx + 1, wy + 3, wheelW - 2, 4, 1);
    ctx.fill();

    // Rim glow stripe
    ctx.fillStyle = glowColor;
    ctx.fillRect(wx + 2, wy + 7, 2, wheelH - 12);
  });

  // 3. Front Splitter (N Red accent) & Aero Canards
  ctx.fillStyle = '#161920';
  ctx.beginPath();
  ctx.moveTo(0, -hh - 8);
  ctx.lineTo(hw + 4, -hh + 9);
  ctx.lineTo(-hw - 4, -hh + 9);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Rear Diffuser & Twin Exhaust
  ctx.fillStyle = '#14161c';
  ctx.beginPath();
  ctx.roundRect(-hw + 6, hh - 3, (hw - 6) * 2, 7, 2);
  ctx.fill();

  [-10, 6].forEach(exX => {
    ctx.fillStyle = '#5a6473';
    ctx.beginPath();
    ctx.roundRect(exX, hh - 1, 5, 5, 2);
    ctx.fill();

    ctx.fillStyle = '#00ebff';
    ctx.beginPath();
    ctx.arc(exX + 2.5, hh + 3, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // 4. Car Body (Sculpted Metallic with wide fenders)
  const darkBody = adjustColor(bodyColor, -55);
  const brightEdge = adjustColor(bodyColor, 80);

  const bodyPts: [number, number][] = [
    [0, -hh - 4],           // Nose tip
    [hw - 3, -hh + 8],       // Right front shoulder
    [hw + 3, -hh + 26],      // Right front wide fender
    [hw - 4, -hh + 46],      // Right waist air intake
    [hw + 4, hh - 18],       // Right rear wide fender
    [hw - 3, hh - 2],        // Right rear tail
    [-hw + 3, hh - 2],       // Left rear tail
    [-hw - 4, hh - 18],      // Left rear wide fender
    [-hw + 4, -hh + 46],     // Left waist air intake
    [-hw - 3, -hh + 26],     // Left front wide fender
    [-hw + 3, -hh + 8],      // Left front shoulder
  ];

  ctx.fillStyle = darkBody;
  ctx.beginPath();
  bodyPts.forEach(([px, py], i) => {
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();

  // Inner Body
  const innerPts: [number, number][] = [
    [0, -hh - 1],
    [hw - 6, -hh + 10],
    [hw - 1, -hh + 26],
    [hw - 7, -hh + 46],
    [hw - 1, hh - 18],
    [hw - 6, hh - 5],
    [-hw + 6, hh - 5],
    [-hw + 1, hh - 18],
    [-hw + 7, -hh + 46],
    [-hw + 1, -hh + 26],
    [-hw + 6, -hh + 10],
  ];

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  innerPts.forEach(([px, py], i) => {
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = brightEdge;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Side mirrors
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(-hw - 1, -hh + 28);
  ctx.lineTo(-hw - 7, -hh + 25);
  ctx.lineTo(-hw - 6, -hh + 31);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(hw + 1, -hh + 28);
  ctx.lineTo(hw + 7, -hh + 25);
  ctx.lineTo(hw + 6, -hh + 31);
  ctx.closePath();
  ctx.fill();

  // 5. Carbon Bonnet & Front Hyundai Emblem
  ctx.fillStyle = '#181c26';
  ctx.beginPath();
  ctx.moveTo(0, -hh + 2);
  ctx.lineTo(13, -hh + 24);
  ctx.lineTo(-13, -hh + 24);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  drawHyundaiEmblem(ctx, 0, -hh + 11, 14, 8, '#ffffff', 1.2);

  // 6. Cockpit Windshield & Glass Sheen
  const canopyPts: [number, number][] = [
    [0, -hh + 21],
    [hw - 7, -hh + 33],
    [hw - 9, -hh + 62],
    [0, -hh + 69],
    [-hw + 9, -hh + 62],
    [-hw + 7, -hh + 33],
  ];
  ctx.fillStyle = '#101624';
  ctx.beginPath();
  canopyPts.forEach(([px, py], i) => {
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();

  // Glass reflection
  ctx.fillStyle = 'rgba(95, 168, 211, 0.45)';
  ctx.beginPath();
  ctx.moveTo(-2, -hh + 24);
  ctx.lineTo(9, -hh + 33);
  ctx.lineTo(3, -hh + 45);
  ctx.lineTo(-8, -hh + 34);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 7. Rear Louver & PE Core Glow
  ctx.fillStyle = '#161a22';
  ctx.beginPath();
  ctx.roundRect(-8, -hh + 62, 16, 17, 3);
  ctx.fill();

  ctx.fillStyle = glowColor;
  ctx.beginPath();
  ctx.arc(0, -hh + 70, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -hh + 70, 2, 0, Math.PI * 2);
  ctx.fill();

  // Louver lines
  ctx.strokeStyle = '#282d3a';
  ctx.lineWidth = 1;
  for (let ly = -hh + 64; ly < -hh + 78; ly += 4) {
    ctx.beginPath();
    ctx.moveTo(-7, ly);
    ctx.lineTo(7, ly);
    ctx.stroke();
  }

  // 8. Swan-neck Carbon GT Wing & Hyundai N Triangular Stop Lamp
  const wingY = hh - 11;
  ctx.fillStyle = '#12141a';
  ctx.beginPath();
  ctx.roundRect(-hw - 6, wingY, (hw + 6) * 2, 8, 3);
  ctx.fill();

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Wing endplates with glow
  ctx.fillStyle = glowColor;
  ctx.fillRect(-hw - 7, wingY - 3, 3, 14);
  ctx.fillRect(hw + 4, wingY - 3, 3, 14);

  // Hyundai N Signature Inverted Triangle Brake Lamp
  ctx.fillStyle = N_RED;
  ctx.beginPath();
  ctx.moveTo(-4, hh - 4);
  ctx.lineTo(4, hh - 4);
  ctx.lineTo(0, hh);
  ctx.closePath();
  ctx.fill();

  // 9. Parametric Pixel LED Headlights & Full-Width Rear Tailbar
  ctx.fillStyle = '#ffffff';
  for (let px = -hw + 3; px < -hw + 16; px += 4) {
    ctx.fillRect(px, -hh + 14, 3, 3);
  }
  for (let px = hw - 15; px < hw - 2; px += 4) {
    ctx.fillRect(px, -hh + 14, 3, 3);
  }

  ctx.fillStyle = '#ff233c';
  for (let px = -hw + 5; px <= hw - 7; px += 5) {
    ctx.fillRect(px, hh - 5, 3, 3);
  }

  // Overdrive flame aura when boosting
  if (isBoosting) {
    ctx.fillStyle = '#00ffff';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(-10, hh + 6, 4, 0, Math.PI * 2);
    ctx.arc(10, hh + 6, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Procedural renderer for Traffic Cars (Sedan, Sports, Truck, Taxi, Police)
 */
export function drawTrafficCar(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  kind: 'sedan' | 'sports' | 'truck' | 'taxi' | 'police',
  bodyColor: string,
  stripeColor?: string,
  isBlinking = false,
  turnDirection = 0 // -1: left, 1: right
) {
  ctx.save();
  const hw = width / 2;
  const hh = height / 2;

  // Soft shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.roundRect(-hw + 3, -hh + 5, width, height, 10);
  ctx.fill();

  // Tires
  const wheelW = 6;
  const wheelH = 15;
  const wheelPositions = [
    [-hw - 3, -hh + 12],
    [hw + 3 - wheelW, -hh + 12],
    [-hw - 3, hh - 27],
    [hw + 3 - wheelW, hh - 27],
  ];
  ctx.fillStyle = '#121216';
  wheelPositions.forEach(([wx, wy]) => {
    ctx.beginPath();
    ctx.roundRect(wx, wy, wheelW, wheelH, 3);
    ctx.fill();
  });

  if (kind === 'truck') {
    // Heavy Container Truck
    const darkCab = adjustColor(bodyColor, -45);
    ctx.fillStyle = darkCab;
    ctx.beginPath();
    ctx.roundRect(-hw, -hh, width, 28, 6);
    ctx.fill();

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(-hw + 2, -hh + 2, width - 4, 24, 5);
    ctx.fill();

    // Windshield
    ctx.fillStyle = '#192638';
    ctx.beginPath();
    ctx.roundRect(-hw + 5, -hh + 6, width - 10, 13, 3);
    ctx.fill();

    ctx.strokeStyle = '#5a82aa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-hw + 8, -hh + 8);
    ctx.lineTo(-hw + 18, -hh + 16);
    ctx.stroke();

    // Container body & ribs
    ctx.fillStyle = '#b9c0cd';
    ctx.beginPath();
    ctx.roundRect(-hw + 1, -hh + 27, width - 2, height - 29, 4);
    ctx.fill();

    ctx.fillStyle = '#e1e6f0';
    ctx.beginPath();
    ctx.roundRect(-hw + 4, -hh + 29, width - 8, height - 34, 3);
    ctx.fill();

    ctx.strokeStyle = '#a5acb9';
    ctx.lineWidth = 2;
    for (let ry = -hh + 38; ry < hh - 10; ry += 12) {
      ctx.beginPath();
      ctx.moveTo(-hw + 3, ry);
      ctx.lineTo(hw - 3, ry);
      ctx.stroke();
    }

    // Lights
    ctx.fillStyle = '#fffad2';
    ctx.fillRect(-hw + 4, -hh + 1, 10, 4);
    ctx.fillRect(hw - 14, -hh + 1, 10, 4);

    ctx.fillStyle = '#dc2323';
    ctx.fillRect(-hw + 4, hh - 4, 11, 3);
    ctx.fillRect(hw - 15, hh - 4, 11, 3);

    ctx.restore();
    return;
  }

  // Sedan / Sports / Police / Taxi
  const darkCol = adjustColor(bodyColor, -48);
  const lightCol = adjustColor(bodyColor, 42);

  ctx.fillStyle = darkCol;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, width, height, 11);
  ctx.fill();

  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-hw + 2, -hh + 2, width - 4, height - 4, 10);
  ctx.fill();

  ctx.strokeStyle = lightCol;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-hw + 3, -hh + 5, width - 6, height - 10, 9);
  ctx.stroke();

  // Side mirrors
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-hw - 4, -hh + 22, 4, 6, 2);
  ctx.roundRect(hw, -hh + 22, 4, 6, 2);
  ctx.fill();

  // Racing stripe
  if (stripeColor) {
    const sw = Math.max(4, Math.floor(width / 6));
    ctx.fillStyle = stripeColor;
    ctx.beginPath();
    ctx.roundRect(-sw / 2, -hh + 2, sw, height - 4, 2);
    ctx.fill();
  }

  // Cabin & Windshield
  const cabinY = -hh + Math.floor(height * 0.24);
  const cabinH = Math.floor(height * 0.50);

  ctx.fillStyle = '#181e2c';
  ctx.beginPath();
  ctx.roundRect(-hw + 5, cabinY, width - 10, cabinH, 7);
  ctx.fill();

  ctx.strokeStyle = '#5f82af';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-hw + 9, cabinY + 3);
  ctx.lineTo(-hw + 17, cabinY + 11);
  ctx.stroke();

  // Roof top
  const roofColor = kind === 'police' ? '#ffffff' : lightCol;
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.roundRect(-hw + 8, cabinY + 11, width - 16, cabinH - 20, 5);
  ctx.fill();

  // Police Lightbar & Push Bumper
  if (kind === 'police') {
    ctx.fillStyle = '#3c414b';
    ctx.fillRect(-hw + 10, -hh - 2, width - 20, 4);

    const barY = cabinY + cabinH / 2 - 4;
    ctx.fillStyle = '#141419';
    ctx.beginPath();
    ctx.roundRect(-hw + 6, barY - 1, width - 12, 8, 3);
    ctx.fill();

    ctx.fillStyle = '#eb3741';
    ctx.fillRect(-hw + 7, barY, (width - 14) / 2, 6);
    ctx.fillStyle = '#377dff';
    ctx.fillRect(0, barY, (width - 14) / 2, 6);
  }

  // Taxi Roof Sign
  if (kind === 'taxi') {
    const signY = cabinY + cabinH / 2 - 4;
    ctx.fillStyle = '#1e1e23';
    ctx.beginPath();
    ctx.roundRect(-hw + 12, signY, width - 24, 8, 3);
    ctx.fill();

    ctx.fillStyle = '#ffe650';
    ctx.beginPath();
    ctx.roundRect(-hw + 14, signY + 1, width - 28, 6, 2);
    ctx.fill();
  }

  // Headlights & Tail lights
  ctx.fillStyle = '#fffad7';
  ctx.fillRect(-hw + 4, -hh + 1, 10, 4);
  ctx.fillRect(hw - 14, -hh + 1, 10, 4);

  ctx.fillStyle = '#f51e2d';
  ctx.fillRect(-hw + 4, hh - 5, 11, 4);
  ctx.fillRect(hw - 15, hh - 5, 11, 4);

  // Turn signal indicators
  if (isBlinking && turnDirection !== 0) {
    const blinkX = turnDirection < 0 ? -hw - 4 : hw + 4;
    ctx.fillStyle = '#ff9128';
    ctx.beginPath();
    ctx.arc(blinkX, -hh + 8, 4, 0, Math.PI * 2);
    ctx.arc(blinkX, hh - 8, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
