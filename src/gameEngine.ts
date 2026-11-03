import { sound } from './audio';
import { drawHyundaiEmblem, drawPlayerSupercar, drawTrafficCar } from './carGraphics';
import {
  CAR_CATALOG,
  CarInfo,
  HYUNDAI_BLUE,
  LANE_WIDTH,
  N_RED,
  NUM_LANES,
  PERFORMANCE_BLUE,
  ROAD_LEFT,
  ROAD_RIGHT,
  ROAD_WIDTH,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  SaveData,
} from './types';

export interface GameStats {
  score: number;
  highScore: number;
  distanceKm: number;
  runCoins: number;
  totalCoins: number;
  smashedCars: number;
  nearMisses: number;
  speedKmh: number;
  nitroGauge: number; // 0 to 100
  isBoosting: boolean;
  hp: number;
  maxHp: number;
  shieldTimer: number;
  magnetTimer: number;
}

export interface InputState {
  steerLeft: boolean;
  steerRight: boolean;
  accelerate: boolean;
  brake: boolean;
  drift: boolean;
  boost: boolean;
}

class Particle {
  constructor(
    public x: number,
    public y: number,
    public vx: number,
    public vy: number,
    public color: string,
    public size: number,
    public life: number,
    public maxLife: number = life,
    public shrink: boolean = true
  ) {}

  update(dt: number, worldScrollVy: number) {
    this.x += this.vx * dt;
    this.y += (this.vy + worldScrollVy) * dt;
    this.life -= dt;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.life <= 0) return;
    const ratio = Math.max(0, this.life / this.maxLife);
    const r = Math.max(1, this.size * (this.shrink ? ratio : 1.0));
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

class ShockwaveRing {
  public life = 0.28;
  public maxLife = 0.28;

  constructor(
    public x: number,
    public y: number,
    public color: string,
    public maxRadius: number = 95
  ) {}

  update(dt: number) {
    this.life -= dt;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.life <= 0) return;
    const prog = 1.0 - this.life / this.maxLife;
    const radius = 12 + (this.maxRadius - 12) * prog;
    const width = Math.max(1, 6 * (1.0 - prog));
    ctx.strokeStyle = this.color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

class SkidMark {
  public life = 1.4;

  constructor(
    public x1: number,
    public y1: number,
    public x2: number,
    public y2: number,
    public color: string = '#16161a'
  ) {}

  update(dt: number, scrollSpeed: number) {
    const dy = scrollSpeed * dt;
    this.y1 += dy;
    this.y2 += dy;
    this.life -= dt;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.life <= 0 || Math.min(this.y1, this.y2) > SCREEN_HEIGHT + 50) return;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(this.x1, this.y1);
    ctx.lineTo(this.x2, this.y2);
    ctx.stroke();
  }
}

class FloatingText {
  public life = 1.05;
  public maxLife = 1.05;

  constructor(
    public x: number,
    public y: number,
    public text: string,
    public color: string,
    public size: number = 20
  ) {}

  update(dt: number) {
    this.y -= 58 * dt;
    this.life -= dt;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.life <= 0) return;
    ctx.save();
    ctx.font = `bold ${this.size}px 'Plus Jakarta Sans', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shadow
    ctx.fillStyle = '#000000';
    ctx.fillText(this.text, this.x + 2, this.y + 2);

    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

class CollectibleItem {
  public animT = Math.random() * Math.PI * 2;
  public radius: number;

  constructor(
    public x: number,
    public y: number,
    public kind: 'coin' | 'nitro' | 'shield' | 'magnet' | 'repair'
  ) {
    this.radius = kind === 'coin' ? 16 : 20;
  }

  update(dt: number, scrollSpeed: number, playerX: number, playerY: number, hasMagnet: boolean) {
    this.animT += dt * 6.0;
    this.y += scrollSpeed * dt;

    if (hasMagnet) {
      const dx = playerX - this.x;
      const dy = playerY - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 320 && dist > 1) {
        const pull = 580 * dt;
        this.x += (dx / dist) * pull;
        this.y += (dy / dist) * pull;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const cx = this.x;
    const cy = this.y;
    const pulse = Math.sin(this.animT) * 3;

    ctx.save();
    if (this.kind === 'coin') {
      const w = Math.max(5, Math.abs(Math.cos(this.animT * 0.85)) * 14);
      ctx.fillStyle = '#50410f';
      ctx.beginPath();
      ctx.arc(cx, cy, 17, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#eb9b0f';
      ctx.beginPath();
      ctx.ellipse(cx, cy, w + 2, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffd732';
      ctx.beginPath();
      ctx.ellipse(cx, cy, w, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      if (w > 8) {
        ctx.strokeStyle = '#fff5b4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy, w * 0.5, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (this.kind === 'nitro') {
      ctx.fillStyle = '#0f465f';
      ctx.beginPath();
      ctx.arc(cx, cy, 22 + pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#2de1ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffd732';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', cx, cy);
    } else if (this.kind === 'shield') {
      ctx.fillStyle = '#143073';
      ctx.beginPath();
      ctx.arc(cx, cy, 22 + pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#00ebff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('S', cx, cy);
    } else if (this.kind === 'magnet') {
      ctx.fillStyle = '#501673';
      ctx.beginPath();
      ctx.arc(cx, cy, 22 + pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#b94bff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ff46a5';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('M', cx, cy);
    } else if (this.kind === 'repair') {
      ctx.fillStyle = '#12582d';
      ctx.beginPath();
      ctx.arc(cx, cy, 22 + pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#32d76e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', cx, cy);
    }
    ctx.restore();
  }
}

class TrafficVehicle {
  public width: number;
  public height: number;
  public mass: number;
  public speed: number;
  public color: string;
  public stripeColor?: string;
  public kind: 'sedan' | 'sports' | 'truck' | 'taxi' | 'police';

  public targetLane: number;
  public vx = 0;
  public knockVy = 0;
  public angle = 0;
  public angularVel = 0;
  public isWrecked = false;
  public wreckTimer = 0;
  public bumpCooldown = 0;
  public nearMissed = false;
  public laneChangeCooldown: number;
  public blinkTimer: number;
  public changingLane = false;

  constructor(
    public lane: number,
    public x: number,
    public y: number,
    difficultyScale = 1.0
  ) {
    this.targetLane = lane;
    this.laneChangeCooldown = 0.9 + Math.random() * 1.9;
    this.blinkTimer = Math.random() * 2.0;

    const roll = Math.random();
    if (roll < 0.40) this.kind = 'sedan';
    else if (roll < 0.62) this.kind = 'sports';
    else if (roll < 0.77) this.kind = 'truck';
    else if (roll < 0.92) this.kind = 'taxi';
    else this.kind = 'police';

    if (this.kind === 'truck') {
      this.width = 52;
      this.height = 122;
      this.mass = 2.4;
      this.speed = 190 + Math.random() * 55;
      const colors = ['#4169af', '#af463c', '#46915a'];
      this.color = colors[Math.floor(Math.random() * colors.length)];
    } else if (this.kind === 'sports') {
      this.width = 45;
      this.height = 82;
      this.mass = 1.0;
      this.speed = (320 + Math.random() * 110) * (1.0 + 0.05 * difficultyScale);
      const colors = ['#fa6e23', '#2dd273', '#dc329b'];
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.stripeColor = '#ffffff';
    } else if (this.kind === 'taxi') {
      this.width = 46;
      this.height = 82;
      this.mass = 1.1;
      this.speed = 250 + Math.random() * 90;
      this.color = '#f5c31e';
      this.stripeColor = '#1e1e23';
    } else if (this.kind === 'police') {
      this.width = 46;
      this.height = 84;
      this.mass = 1.25;
      this.speed = (340 + Math.random() * 100) * (1.0 + 0.06 * difficultyScale);
      this.color = '#1c2230';
    } else {
      this.width = 46;
      this.height = 82;
      this.mass = 1.1;
      this.speed = 225 + Math.random() * 95;
      const colors = ['#919bac', '#417dcf', '#55a587', '#b9555a'];
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }
  }

  applyImpulse(ivx: number, ivy: number, spin: number, wrecked = false) {
    this.vx += ivx;
    this.knockVy += ivy;
    this.angularVel += spin;
    this.changingLane = false;
    if (wrecked) {
      this.isWrecked = true;
      this.wreckTimer = 1.8;
    }
  }

  update(dt: number, playerSpeed: number, allTraffic: TrafficVehicle[]) {
    if (this.bumpCooldown > 0) {
      this.bumpCooldown -= dt;
    }

    if (this.isWrecked) {
      this.x += this.vx * dt;
      this.y += (playerSpeed - this.speed + this.knockVy) * dt;
      this.angle = (this.angle + this.angularVel * dt) % 360;
      this.vx *= Math.max(0, 1.0 - 1.2 * dt);
      this.knockVy *= Math.max(0, 1.0 - 1.0 * dt);
      this.wreckTimer -= dt;
      return;
    }

    const relVy = (playerSpeed - this.speed) + this.knockVy;
    this.y += relVy * dt;
    this.x += this.vx * dt;

    this.vx *= Math.max(0, 1.0 - 4.5 * dt);
    this.knockVy *= Math.max(0, 1.0 - 3.8 * dt);
    this.angle += this.angularVel * dt;
    this.angularVel *= Math.max(0, 1.0 - 6.0 * dt);
    this.angle *= Math.max(0, 1.0 - 5.5 * dt);

    const minX = ROAD_LEFT + this.width / 2 + 4;
    const maxX = ROAD_RIGHT - this.width / 2 - 4;
    if (this.x < minX) {
      this.x = minX;
      this.vx = Math.abs(this.vx) * 0.75 + 90;
      this.angularVel = -140;
      this.changingLane = false;
    } else if (this.x > maxX) {
      this.x = maxX;
      this.vx = -Math.abs(this.vx) * 0.75 - 90;
      this.angularVel = 140;
      this.changingLane = false;
    }

    this.blinkTimer += dt;
    if (Math.abs(this.vx) < 35 && this.y > 30 && this.y < SCREEN_HEIGHT - 180) {
      this.laneChangeCooldown -= dt;
      const frontBlocked = allTraffic.some(
        other =>
          other !== this &&
          !other.isWrecked &&
          Math.abs(other.x - this.x) < 42 &&
          this.y - other.y > 0 &&
          this.y - other.y < 135
      );

      if ((this.laneChangeCooldown <= 0 || frontBlocked) && !this.changingLane) {
        if (['sports', 'taxi', 'police'].includes(this.kind) || frontBlocked) {
          const possible: number[] = [];
          if (this.lane > 0) possible.push(this.lane - 1);
          if (this.lane < NUM_LANES - 1) possible.push(this.lane + 1);
          if (possible.length > 0) {
            this.targetLane = possible[Math.floor(Math.random() * possible.length)];
            this.changingLane = true;
            this.laneChangeCooldown = 2.0 + Math.random() * 2.2;
          }
        }
      }
    }

    if (this.changingLane) {
      const targetX = ROAD_LEFT + (this.targetLane + 0.5) * LANE_WIDTH;
      const dx = targetX - this.x;
      const step = 155.0 * dt;
      if (Math.abs(dx) <= step) {
        this.x = targetX;
        this.lane = this.targetLane;
        this.changingLane = false;
        this.angle = 0;
      } else {
        const dir = Math.sign(dx);
        this.x += dir * step;
        this.angle = -dir * 7.0;
      }
    } else {
      this.lane = Math.max(0, Math.min(NUM_LANES - 1, Math.floor((this.x - ROAD_LEFT) / LANE_WIDTH)));
    }
  }

  getHitbox() {
    return {
      x: this.x - this.width * 0.42,
      y: this.y - this.height * 0.42,
      w: this.width * 0.84,
      h: this.height * 0.84,
    };
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);

    if (this.kind === 'police' && !this.isWrecked) {
      const isRed = Math.floor(this.blinkTimer * 10) % 2 === 0;
      ctx.fillStyle = isRed ? 'rgba(255, 40, 60, 0.22)' : 'rgba(40, 120, 255, 0.22)';
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.angle !== 0) {
      ctx.rotate((this.angle * Math.PI) / 180);
    }

    const isBlinking = this.changingLane && !this.isWrecked && Math.floor(this.blinkTimer * 8) % 2 === 0;
    const turnDir = this.targetLane < this.lane ? -1 : 1;

    drawTrafficCar(
      ctx,
      this.width,
      this.height,
      this.kind,
      this.color,
      this.stripeColor,
      isBlinking,
      turnDir
    );

    ctx.restore();
  }
}

export class GameEngine {
  public carInfo: CarInfo;
  public saveData: SaveData;
  public onGameOver?: (stats: GameStats) => void;

  // Player stats
  public playerX = (ROAD_LEFT + ROAD_RIGHT) / 2;
  public playerY = SCREEN_HEIGHT - 135;
  public playerVx = 0;
  public playerVy = 0;
  public playerAngle = 0;
  public playerWidth = 48;
  public playerHeight = 88;

  public baseMaxSpeed: number;
  public nitroMaxSpeed: number;
  public minSpeed = 240.0;
  public speed = 350.0;
  public accel: number;
  public steerPower: number;
  public nitroDrain: number;
  public gimmickChargeMult: number;

  public maxHp: number;
  public hp: number;
  public nitro = 0.0; // 0 to 100
  public isBoosting = false;
  public isDrifting = false;
  public driftScoreAccum = 0.0;
  public smashCombo = 0;

  public shieldTimer = 0.0;
  public magnetTimer = 0.0;
  public invincibleTimer = 0.0;
  public trailHistory: [number, number, number][] = [];

  // World state
  public score = 0.0;
  public distanceKm = 0.0;
  public runCoins = 0;
  public nearMissCount = 0;
  public smashedCarsCount = 0;
  public cameraShake = 0.0;

  private roadScroll = 0.0;
  private brandScroll = 220.0;
  private sceneryItems: { y: number; type: 'lamp' | 'tree' | 'neon' }[] = [];

  private traffic: TrafficVehicle[] = [];
  private collectibles: CollectibleItem[] = [];
  private particles: Particle[] = [];
  private shockwaves: ShockwaveRing[] = [];
  private skidMarks: SkidMark[] = [];
  private floatingTexts: FloatingText[] = [];
  private energyArcs: { x1: number; y1: number; x2: number; y2: number; life: number }[] = [];

  private trafficSpawnTimer = 0.5;
  private itemSpawnTimer = 1.5;
  private driftSoundTimer = 0.0;
  public isRunning = false;

  constructor(saveData: SaveData) {
    this.saveData = saveData;
    this.carInfo = CAR_CATALOG[saveData.selectedCar] || CAR_CATALOG[0];

    const spdLv = saveData.upgrades.speed;
    const hndLv = saveData.upgrades.handling;
    const nitLv = saveData.upgrades.nitro;
    const armLv = saveData.upgrades.armor;

    this.baseMaxSpeed = 630.0 * this.carInfo.baseSpeed * (1.0 + 0.06 * (spdLv - 1));
    this.nitroMaxSpeed = this.baseMaxSpeed * 1.52;
    this.accel = 330.0 * this.carInfo.baseAccel * (1.0 + 0.07 * (spdLv - 1));
    this.steerPower = 485.0 * this.carInfo.baseHandling * (1.0 + 0.07 * (hndLv - 1));
    this.nitroDrain = 26.0 / (this.carInfo.baseNitro * (1.0 + 0.08 * (nitLv - 1)));
    this.gimmickChargeMult = this.carInfo.baseNitro * (1.0 + 0.08 * (nitLv - 1));
    this.maxHp = this.carInfo.baseHp + Math.floor((armLv - 1) / 2);
    this.hp = this.maxHp;

    this.initScenery();
  }

  private initScenery() {
    this.sceneryItems = [];
    for (let y = 0; y < SCREEN_HEIGHT + 200; y += 140) {
      const roll = Math.random();
      const type = roll < 0.45 ? 'lamp' : roll < 0.85 ? 'tree' : 'neon';
      this.sceneryItems.push({ y, type });
    }
  }

  addBoosterGauge(amount: number): boolean {
    if (this.isBoosting) return false;
    const before = this.nitro;
    this.nitro = Math.min(100.0, this.nitro + amount * this.gimmickChargeMult);
    return before < 100.0 && this.nitro >= 100.0;
  }

  getPlayerHitbox() {
    const extraW = this.isBoosting ? 10 : 0;
    const extraH = this.isBoosting ? 12 : 0;
    return {
      x: this.playerX - (this.playerWidth * 0.42 + extraW),
      y: this.playerY - (this.playerHeight * 0.42 + extraH),
      w: (this.playerWidth * 0.42 + extraW) * 2,
      h: (this.playerHeight * 0.42 + extraH) * 2,
    };
  }

  spawnTraffic() {
    const difficulty = 1.0 + this.distanceKm * 0.25;
    const lanes = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);

    const count = Math.random() < Math.min(0.60, 0.25 + this.distanceKm * 0.05) ? 2 : 1;
    let spawned = 0;

    for (const lane of lanes) {
      if (spawned >= count) break;
      const laneX = ROAD_LEFT + (lane + 0.5) * LANE_WIDTH;
      const tooClose = this.traffic.some(t => Math.abs(t.x - laneX) < 42 && t.y < 130);
      if (!tooClose) {
        this.traffic.push(new TrafficVehicle(lane, laneX, -190 - Math.random() * 90, difficulty));
        spawned++;
      }
    }
  }

  spawnCollectibles() {
    const lane = Math.floor(Math.random() * NUM_LANES);
    const x = ROAD_LEFT + (lane + 0.5) * LANE_WIDTH;

    const roll = Math.random();
    if (roll < 0.62) {
      const numCoins = 5 + Math.floor(Math.random() * 3);
      for (let i = 0; i < numCoins; i++) {
        this.collectibles.push(new CollectibleItem(x, -60 - i * 48, 'coin'));
      }
    } else {
      const kindRoll = Math.random();
      const kind: 'nitro' | 'shield' | 'magnet' | 'repair' =
        kindRoll < 0.45 ? 'nitro' : kindRoll < 0.67 ? 'shield' : kindRoll < 0.88 ? 'magnet' : 'repair';
      this.collectibles.push(new CollectibleItem(x, -80, kind));
    }
  }

  handleTrafficCollisions() {
    const n = this.traffic.length;
    for (let i = 0; i < n; i++) {
      const a = this.traffic[i];
      const boxA = a.getHitbox();

      for (let j = i + 1; j < n; j++) {
        const b = this.traffic[j];
        const boxB = b.getHitbox();

        // AABB Collision check
        if (
          boxA.x < boxB.x + boxB.w &&
          boxA.x + boxA.w > boxB.x &&
          boxA.y < boxB.y + boxB.h &&
          boxA.y + boxA.h > boxB.y
        ) {
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
            dx = Math.random() < 0.5 ? -10 : 10;
          }

          // 1) Chain smash from player's booster launch
          if (a.isWrecked && !b.isWrecked) {
            this.triggerChainSmash(a, b);
            continue;
          } else if (b.isWrecked && !a.isWrecked) {
            this.triggerChainSmash(b, a);
            continue;
          }

          // 2) Normal AI bumper jostle
          const pushX = Math.abs(dx) > 4 ? Math.sign(dx) : Math.random() < 0.5 ? -1 : 1;
          const pushY = Math.abs(dy) > 4 ? Math.sign(dy) : 1;

          const overlapX = (a.width + b.width) * 0.44 - Math.abs(dx);
          if (overlapX > 0 && Math.abs(dy) < (a.height + b.height) * 0.36) {
            a.x -= pushX * (overlapX * 0.5 + 2);
            b.x += pushX * (overlapX * 0.5 + 2);
          }

          const forceX = 240.0;
          const forceY = 140.0;
          a.applyImpulse(-pushX * (forceX / a.mass), -pushY * (forceY / a.mass), -pushX * 165.0);
          b.applyImpulse(pushX * (forceX / b.mass), pushY * (forceY / b.mass), pushX * 165.0);

          if (a.y > b.y && a.speed > b.speed) {
            const temp = a.speed;
            a.speed = b.speed * 0.9;
            b.speed = temp * 1.08;
          } else if (b.y > a.y && b.speed > a.speed) {
            const temp = b.speed;
            b.speed = a.speed * 0.9;
            a.speed = temp * 1.08;
          }

          const midX = (a.x + b.x) * 0.5;
          const midY = (a.y + b.y) * 0.5;
          this.spawnSparks(midX, midY, 12, '#ffd732');

          if (a.bumpCooldown <= 0 && b.bumpCooldown <= 0) {
            if (midY >= 0 && midY <= SCREEN_HEIGHT) {
              sound.playBump();
            }
            a.bumpCooldown = 0.35;
            b.bumpCooldown = 0.35;
          }
        }
      }
    }
  }

  triggerChainSmash(flyingCar: TrafficVehicle, victimCar: TrafficVehicle) {
    const dx = victimCar.x - flyingCar.x;
    const dirX = Math.abs(dx) > 2 ? Math.sign(dx) : Math.random() < 0.5 ? -1 : 1;

    victimCar.applyImpulse(
      dirX * (340 + Math.random() * 180) + flyingCar.vx * 0.4,
      -(450 + Math.random() * 200),
      dirX * (520 + Math.random() * 300),
      true
    );

    this.smashedCarsCount++;
    this.score += 450;
    this.runCoins += 2;
    this.cameraShake = Math.max(this.cameraShake, 14.0);
    sound.playSmash();

    this.spawnExplosion(victimCar.x, victimCar.y, '#b94bff');
    this.shockwaves.push(new ShockwaveRing(victimCar.x, victimCar.y, '#ffd732', 90));
    this.floatingTexts.push(
      new FloatingText(victimCar.x, victimCar.y - 30, '연쇄 격파! +450 (+2$)', '#ffd732', 22)
    );
  }

  spawnSparks(x: number, y: number, count: number, color: string) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 70 + Math.random() * 150;
      this.particles.push(
        new Particle(
          x,
          y,
          Math.cos(ang) * spd,
          Math.sin(ang) * spd,
          Math.random() < 0.5 ? color : '#ffffff',
          3 + Math.random() * 3,
          0.25
        )
      );
    }
  }

  spawnExplosion(x: number, y: number, baseColor: string) {
    const colors = [baseColor, '#ffd732', '#ffffff', '#eb3741'];
    for (let i = 0; i < 32; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 240;
      this.particles.push(
        new Particle(
          x,
          y,
          Math.cos(ang) * spd,
          Math.sin(ang) * spd,
          colors[Math.floor(Math.random() * colors.length)],
          4 + Math.random() * 7,
          0.3 + Math.random() * 0.35
        )
      );
    }
  }

  update(dt: number, input: InputState) {
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    if (this.shieldTimer > 0) this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    if (this.magnetTimer > 0) this.magnetTimer -= dt;
    if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 26.0);

    // 1. NGB Booster Overdrive
    if (!this.isBoosting && input.boost && this.nitro >= 30.0) {
      this.isBoosting = true;
      this.smashCombo = 0;
      sound.playNitro();
      this.shockwaves.push(new ShockwaveRing(this.playerX, this.playerY, N_RED, 120));
      this.floatingTexts.push(
        new FloatingText(this.playerX, this.playerY - 65, '[NGB] N 그린 부스트 발동! 차량 격파 돌진!', '#00ebff', 22)
      );
    }

    if (this.isBoosting) {
      this.nitro = Math.max(0, this.nitro - this.nitroDrain * dt);
      const targetMax = this.nitroMaxSpeed;
      this.speed = Math.min(targetMax, this.speed + this.accel * 2.8 * dt);
      this.cameraShake = Math.max(this.cameraShake, 3.5);

      // Plasma afterburner particles
      [-12, 12].forEach(offset => {
        const colors = ['#00ebff', '#ff46a5', '#ffd732', '#ffffff'];
        this.particles.push(
          new Particle(
            this.playerX + offset + (Math.random() * 4 - 2),
            this.playerY + this.playerHeight / 2 + 4,
            Math.random() * 60 - 30,
            140 + Math.random() * 120,
            colors[Math.floor(Math.random() * colors.length)],
            6 + Math.random() * 5,
            0.24
          )
        );
      });

      if (this.nitro <= 0.0) {
        this.isBoosting = false;
        this.smashCombo = 0;
        this.invincibleTimer = Math.max(this.invincibleTimer, 0.8);
      }
    } else {
      if (input.accelerate) {
        this.speed = Math.min(this.baseMaxSpeed, this.speed + this.accel * dt);
      } else if (input.brake) {
        this.speed = Math.max(this.minSpeed, this.speed - this.accel * 1.8 * dt);
      } else {
        const cruise = this.baseMaxSpeed * 0.74;
        if (this.speed < cruise) {
          this.speed = Math.min(cruise, this.speed + this.accel * 0.55 * dt);
        } else if (this.speed > this.baseMaxSpeed) {
          this.speed = Math.max(this.baseMaxSpeed, this.speed - this.accel * 1.2 * dt);
        }
      }
    }

    // 2. Steering & Gimmick 1: Drift Charge
    let steerDir = 0;
    if (input.steerLeft) steerDir -= 1;
    if (input.steerRight) steerDir += 1;

    const wantDrift = input.drift && steerDir !== 0 && this.speed > 310;
    const prevX = this.playerX;
    const prevY = this.playerY;

    if (wantDrift) {
      this.isDrifting = true;
      const targetVx = steerDir * this.steerPower * 1.34;
      this.playerVx += (targetVx - this.playerVx) * Math.min(1.0, dt * 8.0);
      const targetAngle = -steerDir * 23.0;
      this.playerAngle += (targetAngle - this.playerAngle) * Math.min(1.0, dt * 10.0);

      // Rapid boost recharge during drift
      const hitFull = this.addBoosterGauge(24.0 * dt);
      if (hitFull) {
        sound.playPowerup();
        this.floatingTexts.push(
          new FloatingText(this.playerX, this.playerY - 70, 'MAX 부스터 완충! [SPACE]', '#ffd732', 24)
        );
      }

      this.driftScoreAccum += 95.0 * dt;
      this.score += 95.0 * dt;

      // Skid marks & sparks
      this.skidMarks.push(new SkidMark(prevX - 15, prevY + 30, this.playerX - 15, this.playerY + 30, '#23122d'));
      this.skidMarks.push(new SkidMark(prevX + 15, prevY + 30, this.playerX + 15, this.playerY + 30, '#23122d'));

      [-15, 15].forEach(side => {
        this.particles.push(
          new Particle(
            this.playerX + side,
            this.playerY + 34,
            Math.random() * 110 - 55,
            40 + Math.random() * 80,
            Math.random() < 0.5 ? this.carInfo.glowColor : '#ffd732',
            4 + Math.random() * 4,
            0.28
          )
        );
      });

      this.driftSoundTimer -= dt;
      if (this.driftSoundTimer <= 0) {
        sound.playDrift();
        this.driftSoundTimer = 0.14;
      }
    } else {
      if (this.isDrifting && this.driftScoreAccum >= 45) {
        const bonus = Math.floor(this.driftScoreAccum);
        this.floatingTexts.push(
          new FloatingText(this.playerX, this.playerY - 50, `드리프트 차징 +${bonus}!`, '#00ebff', 20)
        );
      }
      this.isDrifting = false;
      this.driftScoreAccum = 0.0;

      const targetVx = steerDir * this.steerPower;
      this.playerVx += (targetVx - this.playerVx) * Math.min(1.0, dt * 12.5);
      const targetAngle = -steerDir * 8.5;
      this.playerAngle += (targetAngle - this.playerAngle) * Math.min(1.0, dt * 12.0);
    }

    this.playerX += this.playerVx * dt;

    const minX = ROAD_LEFT + this.playerWidth / 2 + 6;
    const maxX = ROAD_RIGHT - this.playerWidth / 2 - 6;
    if (this.playerX < minX) {
      this.playerX = minX;
      this.playerVx = 0;
    } else if (this.playerX > maxX) {
      this.playerX = maxX;
      this.playerVx = 0;
    }

    // High-speed / boost / drift ghost trail
    if (this.isBoosting || this.isDrifting) {
      this.trailHistory.push([this.playerX, this.playerY, this.playerAngle]);
      if (this.trailHistory.length > 5) this.trailHistory.shift();
    } else if (this.trailHistory.length > 0) {
      this.trailHistory.shift();
    }

    // 3. Distance & Road Scroll
    this.roadScroll = (this.roadScroll + this.speed * dt) % 80;
    this.brandScroll = (this.brandScroll + this.speed * dt) % 2160;
    this.distanceKm += (this.speed * dt) / 2800.0;
    this.score += (this.speed * dt) * 0.08;

    for (const item of this.sceneryItems) {
      item.y += this.speed * dt;
      if (item.y > SCREEN_HEIGHT + 80) {
        item.y -= SCREEN_HEIGHT + 220;
        const roll = Math.random();
        item.type = roll < 0.45 ? 'lamp' : roll < 0.85 ? 'tree' : 'neon';
      }
    }

    // 4. Traffic Spawn & Updates
    this.trafficSpawnTimer -= dt;
    if (this.trafficSpawnTimer <= 0) {
      this.spawnTraffic();
      const baseInterval = Math.max(0.35, 0.85 - this.distanceKm * 0.05);
      this.trafficSpawnTimer = baseInterval * (420.0 / Math.max(300.0, this.speed));
    }

    for (const t of this.traffic) {
      t.update(dt, this.speed, this.traffic);
    }

    // Traffic-traffic collisions
    this.handleTrafficCollisions();

    // Player vs Traffic Collisions
    const pHitbox = this.getPlayerHitbox();

    for (let i = this.traffic.length - 1; i >= 0; i--) {
      const t = this.traffic[i];

      if (
        t.y > SCREEN_HEIGHT + 220 ||
        t.y < -420 ||
        t.x < -120 ||
        t.x > SCREEN_WIDTH + 120 ||
        (t.isWrecked && t.wreckTimer <= 0)
      ) {
        this.traffic.splice(i, 1);
        continue;
      }

      if (t.isWrecked) continue;

      const tHitbox = t.getHitbox();

      // Check collision with player
      const isColliding =
        pHitbox.x < tHitbox.x + tHitbox.w &&
        pHitbox.x + pHitbox.w > tHitbox.x &&
        pHitbox.y < tHitbox.y + tHitbox.h &&
        pHitbox.y + pHitbox.h > tHitbox.y;

      if (isColliding) {
        // Booster ram or shield protects player and destroys target!
        if (this.isBoosting || this.shieldTimer > 0) {
          if (!this.isBoosting && this.shieldTimer > 0) {
            this.shieldTimer = 0.0;
          }

          this.smashCombo++;
          this.smashedCarsCount++;
          const smashPts = 300 * this.smashCombo;
          this.score += smashPts;
          this.runCoins += 1;

          const dx = t.x - this.playerX;
          const launchDir = Math.abs(dx) > 4 ? Math.sign(dx) : Math.random() < 0.5 ? -1 : 1;
          t.applyImpulse(
            launchDir * (360 + Math.random() * 220) + this.playerVx * 0.5,
            -(600 + Math.random() * 220),
            launchDir * (580 + Math.random() * 340),
            true
          );

          sound.playSmash();
          this.cameraShake = 15.0;
          this.spawnExplosion(t.x, t.y, '#ff9128');
          this.shockwaves.push(new ShockwaveRing(t.x, t.y, '#00ebff', 105));
          this.floatingTexts.push(
            new FloatingText(
              t.x,
              t.y - 35,
              `SMASH x${this.smashCombo}! +${smashPts}`,
              this.smashCombo === 1 ? '#ff9128' : '#ffd732',
              23
            )
          );
          continue;
        } else if (this.invincibleTimer <= 0) {
          // Normal crash
          const dx = t.x - this.playerX;
          const pushDir = Math.abs(dx) > 4 ? Math.sign(dx) : Math.random() < 0.5 ? -1 : 1;
          t.applyImpulse(pushDir * 380, -320, pushDir * 360);

          sound.playCrash();
          this.hp -= 1;
          this.invincibleTimer = 1.6;
          this.speed = Math.max(this.minSpeed, this.speed * 0.60);
          this.cameraShake = 16.0;
          this.spawnExplosion((this.playerX + t.x) * 0.5, (this.playerY + t.y) * 0.5, '#eb3741');
          this.floatingTexts.push(new FloatingText(this.playerX, this.playerY - 45, '충돌! -1 HP', '#eb3741', 24));

          if (this.hp <= 0) {
            this.triggerGameOver();
            return;
          }
          continue;
        }
      }

      // Gimmick 2: Slipstream Near-miss graze (+18% boost gauge)
      if (!this.isBoosting && !t.nearMissed && Math.abs(t.y - this.playerY) < 46) {
        const horizGap = Math.abs(t.x - this.playerX) - (this.playerWidth + t.width) * 0.5;
        if (horizGap > 0 && horizGap < 34 && this.speed > 350) {
          t.nearMissed = true;
          this.nearMissCount++;
          this.score += 180;
          const hitFull = this.addBoosterGauge(18.0);
          sound.playNearMiss();
          if (hitFull) sound.playPowerup();

          // Connect lightning arc
          this.energyArcs.push({
            x1: t.x,
            y1: t.y,
            x2: this.playerX,
            y2: this.playerY,
            life: 0.25,
          });

          this.floatingTexts.push(
            new FloatingText(this.playerX, this.playerY - 60, '슬립스트림 회피! 부스터 +18%', '#ffd732', 20)
          );
        }
      }
    }

    // 5. Collectibles
    this.itemSpawnTimer -= dt;
    if (this.itemSpawnTimer <= 0) {
      this.spawnCollectibles();
      this.itemSpawnTimer = 1.9 + Math.random() * 1.3;
    }

    const hasMagnet = this.magnetTimer > 0 || this.isBoosting;
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      c.update(dt, this.speed * 0.75, this.playerX, this.playerY, hasMagnet);

      const dist = Math.hypot(c.x - this.playerX, c.y - this.playerY);
      if (dist < c.radius + 30) {
        if (c.kind === 'coin') {
          this.runCoins += 1;
          this.score += 50;
          this.addBoosterGauge(4.5);
          sound.playCoin();
        } else if (c.kind === 'nitro') {
          this.addBoosterGauge(45.0);
          sound.playPowerup();
          this.floatingTexts.push(new FloatingText(this.playerX, this.playerY - 45, '에너지 코어! 부스터 +45%', '#00ebff', 22));
        } else if (c.kind === 'shield') {
          this.shieldTimer = 1.0;
          sound.playPowerup();
          this.floatingTexts.push(new FloatingText(this.playerX, this.playerY - 45, '순간 보호막 1.0초!', '#377dff', 22));
        } else if (c.kind === 'magnet') {
          this.magnetTimer = 8.0;
          sound.playPowerup();
          this.floatingTexts.push(new FloatingText(this.playerX, this.playerY - 45, '코인 자석 8초!', '#b94bff', 22));
        } else if (c.kind === 'repair') {
          if (this.hp < this.maxHp) {
            this.hp += 1;
            this.floatingTexts.push(new FloatingText(this.playerX, this.playerY - 45, '내구도 회복 +1!', '#32d76e', 22));
          } else {
            this.score += 250;
            this.floatingTexts.push(new FloatingText(this.playerX, this.playerY - 45, '보너스 +250!', '#32d76e', 22));
          }
          sound.playPowerup();
        }

        this.collectibles.splice(i, 1);
      } else if (c.y > SCREEN_HEIGHT + 80) {
        this.collectibles.splice(i, 1);
      }
    }

    // 6. Effects updates
    for (let i = this.skidMarks.length - 1; i >= 0; i--) {
      this.skidMarks[i].update(dt, this.speed);
      if (this.skidMarks[i].life <= 0) this.skidMarks.splice(i, 1);
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt, this.speed * 0.35);
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      this.shockwaves[i].update(dt);
      if (this.shockwaves[i].life <= 0) this.shockwaves.splice(i, 1);
    }

    for (let i = this.energyArcs.length - 1; i >= 0; i--) {
      const arc = this.energyArcs[i];
      arc.life -= dt;
      arc.x2 = this.playerX;
      arc.y2 = this.playerY;
      if (arc.life <= 0) this.energyArcs.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].update(dt);
      if (this.floatingTexts[i].life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  triggerGameOver() {
    this.isRunning = false;
    const finalScore = Math.floor(this.score);
    if (finalScore > this.saveData.highScore) {
      this.saveData.highScore = finalScore;
    }
    this.saveData.coins += this.runCoins;

    if (this.onGameOver) {
      this.onGameOver(this.getStats());
    }
  }

  getStats(): GameStats {
    return {
      score: Math.floor(this.score),
      highScore: Math.max(Math.floor(this.score), this.saveData.highScore),
      distanceKm: this.distanceKm,
      runCoins: this.runCoins,
      totalCoins: this.saveData.coins,
      smashedCars: this.smashedCarsCount,
      nearMisses: this.nearMissCount,
      speedKmh: Math.floor(this.speed * 0.42),
      nitroGauge: this.nitro,
      isBoosting: this.isBoosting,
      hp: this.hp,
      maxHp: this.maxHp,
      shieldTimer: this.shieldTimer,
      magnetTimer: this.magnetTimer,
    };
  }

  // ------------------------------------------------------------------------
  // High-fidelity Canvas Render
  // ------------------------------------------------------------------------
  render(ctx: CanvasRenderingContext2D) {
    ctx.save();

    // Camera shake
    if (this.cameraShake > 0) {
      const ox = (Math.random() * 2 - 1) * this.cameraShake;
      const oy = (Math.random() * 2 - 1) * this.cameraShake;
      ctx.translate(ox, oy);
    }

    const stage = Math.floor(this.distanceKm / 3.0) % 3;
    let sideColor = '#161e2a';
    let gridColor = '#223044';
    if (stage === 1) {
      sideColor = '#2c1826';
      gridColor = '#48263e';
    } else if (stage === 2) {
      sideColor = '#0e0c1e';
      gridColor = '#261848';
    }

    ctx.fillStyle = sideColor;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // 1. Cyber Grid Side Pattern
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let gy = -80; gy < SCREEN_HEIGHT + 80; gy += 40) {
      const sy = Math.floor(gy + this.roadScroll);
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(ROAD_LEFT - 20, sy);
      ctx.moveTo(ROAD_RIGHT + 20, sy);
      ctx.lineTo(SCREEN_WIDTH, sy);
      ctx.stroke();
    }
    [45, 95, 135, SCREEN_WIDTH - 135, SCREEN_WIDTH - 95, SCREEN_WIDTH - 45].forEach(gx => {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, SCREEN_HEIGHT);
      ctx.stroke();
    });

    // 2. Asphalt Base
    ctx.fillStyle = '#262830';
    ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, SCREEN_HEIGHT);

    // Road shoulders
    ctx.fillStyle = '#1e2028';
    ctx.fillRect(ROAD_LEFT, 0, 18, SCREEN_HEIGHT);
    ctx.fillRect(ROAD_RIGHT - 18, 0, 18, SCREEN_HEIGHT);

    // Tire wear track textures in each lane
    ctx.fillStyle = '#21232b';
    for (let lane = 0; lane < NUM_LANES; lane++) {
      const cx = ROAD_LEFT + (lane + 0.5) * LANE_WIDTH;
      ctx.fillRect(cx - 18, 0, 10, SCREEN_HEIGHT);
      ctx.fillRect(cx + 8, 0, 10, SCREEN_HEIGHT);
    }

    // 2-1. Hyundai N Performance road surface painting (2160px periodicity)
    const markY = Math.floor(this.brandScroll) - 120;
    if (markY >= -80 && markY <= SCREEN_HEIGHT + 80) {
      const roadCx = (ROAD_LEFT + ROAD_RIGHT) / 2;
      ctx.fillStyle = '#223048';
      ctx.beginPath();
      ctx.roundRect(roadCx - 170, markY - 34, 340, 68, 10);
      ctx.fill();

      ctx.strokeStyle = PERFORMANCE_BLUE;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = N_RED;
      ctx.beginPath();
      ctx.roundRect(roadCx - 170, markY + 26, 340, 8, [0, 0, 10, 10]);
      ctx.fill();

      drawHyundaiEmblem(ctx, roadCx - 122, markY - 4, 24, 13, '#aad2f5', 2);

      ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#afcdee';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('HYUNDAI   N   PERFORMANCE', roadCx + 22, markY - 4);
    }

    // 3. Metal Guardrails & Tri-color Curbs
    const curbW = 14;
    ctx.fillStyle = '#4b525f';
    ctx.fillRect(ROAD_LEFT - curbW - 8, 0, 6, SCREEN_HEIGHT);
    ctx.fillRect(ROAD_RIGHT + curbW + 2, 0, 6, SCREEN_HEIGHT);

    for (let y = -80; y < SCREEN_HEIGHT + 80; y += 40) {
      const cy = Math.floor(y + this.roadScroll);
      const segMod = Math.floor(y / 40) % 3;
      const cCol = segMod === 0 ? N_RED : segMod === 1 ? '#ebf0f5' : PERFORMANCE_BLUE;

      ctx.fillStyle = cCol;
      ctx.fillRect(ROAD_LEFT - curbW, cy, curbW, 40);
      ctx.fillRect(ROAD_RIGHT, cy, curbW, 40);

      ctx.fillStyle = '#788291';
      ctx.beginPath();
      ctx.roundRect(ROAD_LEFT - curbW - 10, cy, 8, 6, 1);
      ctx.roundRect(ROAD_RIGHT + curbW + 2, cy, 8, 6, 1);
      ctx.fill();
    }

    // 4. Broken Lane Lines & Cat's-Eye Reflectors
    for (let lane = 1; lane < NUM_LANES; lane++) {
      const lx = ROAD_LEFT + lane * LANE_WIDTH;
      for (let y = -80; y < SCREEN_HEIGHT + 80; y += 80) {
        const ly = Math.floor(y + this.roadScroll);
        ctx.fillStyle = '#c3cad7';
        ctx.beginPath();
        ctx.roundRect(lx - 3, ly, 6, 42, 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(lx - 1, ly + 4, 2, 34);

        // Reflective stud
        const refY = ly + 58;
        ctx.fillStyle = PERFORMANCE_BLUE;
        ctx.beginPath();
        ctx.arc(lx, refY, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(lx, refY, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. Roadside Scenery (Lamps, Trees, Neon Signs)
    this.sceneryItems.forEach(item => {
      const iy = item.y;
      [75, SCREEN_WIDTH - 75].forEach((sideX, idx) => {
        if (item.type === 'lamp') {
          const armEnd = idx === 0 ? ROAD_LEFT - 4 : ROAD_RIGHT + 4;
          ctx.strokeStyle = '#6e7687';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(sideX, iy);
          ctx.lineTo(armEnd, iy);
          ctx.stroke();

          ctx.fillStyle = '#505564';
          ctx.beginPath();
          ctx.arc(sideX, iy, 9, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#fff5be';
          ctx.beginPath();
          ctx.arc(armEnd, iy, 6, 0, Math.PI * 2);
          ctx.fill();

          // Soft volumetric lighting halo
          const grad = ctx.createRadialGradient(armEnd, iy, 4, armEnd, iy, 55);
          grad.addColorStop(0, 'rgba(255, 245, 200, 0.22)');
          grad.addColorStop(0.5, 'rgba(255, 230, 150, 0.10)');
          grad.addColorStop(1, 'rgba(255, 230, 150, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(armEnd, iy, 55, 0, Math.PI * 2);
          ctx.fill();
        } else if (item.type === 'tree') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.beginPath();
          ctx.arc(sideX + 5, iy + 6, 24, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#184830';
          ctx.beginPath();
          ctx.arc(sideX, iy, 24, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#266944';
          ctx.beginPath();
          ctx.arc(sideX - 3, iy - 3, 18, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#3e8c58';
          ctx.beginPath();
          ctx.arc(sideX - 6, iy - 6, 10, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Hyundai / N Neon Billboard
          ctx.fillStyle = HYUNDAI_BLUE;
          ctx.beginPath();
          ctx.roundRect(sideX - 28, iy - 16, 56, 32, 5);
          ctx.fill();

          ctx.strokeStyle = PERFORMANCE_BLUE;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = N_RED;
          ctx.beginPath();
          ctx.roundRect(sideX - 28, iy + 11, 56, 5, [0, 0, 5, 5]);
          ctx.fill();

          if (idx === 0) {
            drawHyundaiEmblem(ctx, sideX, iy - 2, 18, 10, '#ffffff', 1.5);
          } else {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('HYUNDAI N', sideX, iy - 2);
          }
        }
      });
    });

    // Skid marks
    this.skidMarks.forEach(sk => sk.draw(ctx));

    // Collectibles
    this.collectibles.forEach(c => c.draw(ctx));

    // Player Headlight beam
    ctx.save();
    const beamGrad = ctx.createLinearGradient(
      this.playerX,
      this.playerY - this.playerHeight / 2 - 180,
      this.playerX,
      this.playerY - this.playerHeight / 2
    );
    beamGrad.addColorStop(0, 'rgba(85, 205, 255, 0.35)');
    beamGrad.addColorStop(0.7, 'rgba(255, 255, 240, 0.20)');
    beamGrad.addColorStop(1, 'rgba(255, 255, 240, 0.0)');

    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(this.playerX - 70, this.playerY - this.playerHeight / 2 - 180);
    ctx.lineTo(this.playerX + 70, this.playerY - this.playerHeight / 2 - 180);
    ctx.lineTo(this.playerX + 22, this.playerY - this.playerHeight / 2);
    ctx.lineTo(this.playerX - 22, this.playerY - this.playerHeight / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Traffic Cars
    this.traffic.forEach(t => t.draw(ctx));

    // Particles & Shockwaves
    this.particles.forEach(p => p.draw(ctx));
    this.shockwaves.forEach(sw => sw.draw(ctx));

    // Slipstream Energy Arcs
    this.energyArcs.forEach(arc => {
      const midX = (arc.x1 + arc.x2) * 0.5 + (Math.random() * 28 - 14);
      const midY = (arc.y1 + arc.y2) * 0.5 + (Math.random() * 28 - 14);

      ctx.strokeStyle = '#00ebff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(arc.x1, arc.y1);
      ctx.lineTo(midX, midY);
      ctx.lineTo(arc.x2, arc.y2);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Player Ghost Trails
    this.trailHistory.forEach(([tx, ty, tang], idx) => {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate((tang * Math.PI) / 180);
      ctx.globalAlpha = 0.08 + idx * 0.05;
      drawPlayerSupercar(
        ctx,
        this.playerWidth,
        this.playerHeight,
        this.carInfo.bodyColor,
        this.carInfo.accentColor,
        this.carInfo.glowColor,
        false
      );
      ctx.restore();
    });

    // Player Underglow pulse ring
    const pulseR = 46 + Math.sin(Date.now() * 0.012) * 5;
    ctx.strokeStyle = this.carInfo.glowColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(this.playerX, this.playerY, pulseR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // Player Supercar Body
    if (this.invincibleTimer <= 0 || Math.floor(this.invincibleTimer * 15) % 2 === 0) {
      ctx.save();
      ctx.translate(this.playerX, this.playerY);
      ctx.rotate((this.playerAngle * Math.PI) / 180);
      drawPlayerSupercar(
        ctx,
        this.playerWidth,
        this.playerHeight,
        this.carInfo.bodyColor,
        this.carInfo.accentColor,
        this.carInfo.glowColor,
        this.isBoosting
      );
      ctx.restore();
    }

    // Overdrive V-Ram Plasma Barrier
    if (this.isBoosting) {
      ctx.save();
      ctx.translate(this.playerX, this.playerY);
      ctx.rotate((this.playerAngle * Math.PI) / 180);

      const ramPts: [number, number][] = [
        [0, -this.playerHeight / 2 - 28],
        [-46, -4],
        [-32, 18],
        [0, -this.playerHeight / 2 - 10],
        [32, 18],
        [46, -4],
      ];

      ctx.fillStyle = 'rgba(0, 235, 255, 0.45)';
      ctx.beginPath();
      ramPts.forEach(([px, py], i) => {
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Cyber speed lines
      ctx.strokeStyle = 'rgba(0, 235, 255, 0.6)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 10; i++) {
        const sx = Math.random() < 0.5 ? 20 + Math.random() * (ROAD_LEFT - 40) : ROAD_RIGHT + 20 + Math.random() * (SCREEN_WIDTH - ROAD_RIGHT - 40);
        const sy = Math.random() * SCREEN_HEIGHT;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx, sy + 75);
        ctx.stroke();
      }
    }

    // Rotating Hexagonal Energy Shield
    if (this.shieldTimer > 0) {
      ctx.save();
      const rotT = Date.now() * 0.008;
      ctx.strokeStyle = '#00ebff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const hx = this.playerX + 56 * Math.cos(rotT + (i * Math.PI) / 3);
        const hy = this.playerY + 56 * Math.sin(rotT + (i * Math.PI) / 3);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.strokeStyle = '#377dff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.playerX, this.playerY, 58 * Math.min(1.0, this.shieldTimer), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Coin Magnet Aura
    if (this.magnetTimer > 0) {
      const magR = 48 + Math.sin(Date.now() * 0.01) * 6;
      ctx.strokeStyle = '#b94bff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.playerX, this.playerY, magR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Overhead HMG Driving Experience Arch Gantry (2160px periodicity)
    const gantryY = Math.floor((this.brandScroll + 1080) % 2160) - 90;
    if (gantryY >= -70 && gantryY <= SCREEN_HEIGHT + 40) {
      ctx.fillStyle = '#414858';
      ctx.beginPath();
      ctx.roundRect(ROAD_LEFT - 18, gantryY - 16, 12, 34, 3);
      ctx.roundRect(ROAD_RIGHT + 6, gantryY - 16, 12, 34, 3);
      ctx.fill();

      ctx.strokeStyle = '#5f697d';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(ROAD_LEFT - 12, gantryY);
      ctx.lineTo(ROAD_RIGHT + 12, gantryY);
      ctx.stroke();

      const signW = 430;
      const signX = SCREEN_WIDTH / 2 - signW / 2;
      ctx.fillStyle = '#0a1a38';
      ctx.beginPath();
      ctx.roundRect(signX, gantryY - 18, signW, 34, 6);
      ctx.fill();

      ctx.strokeStyle = PERFORMANCE_BLUE;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = N_RED;
      ctx.beginPath();
      ctx.roundRect(signX, gantryY + 11, signW, 5, [0, 0, 6, 6]);
      ctx.fill();

      drawHyundaiEmblem(ctx, signX + 28, gantryY - 2, 16, 9, '#ffffff', 1.5);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('HYUNDAI MOTOR GROUP  |  HMG DRIVING EXPERIENCE', SCREEN_WIDTH / 2 + 14, gantryY - 2);
    }

    // Floating text scores & combos
    this.floatingTexts.forEach(ft => ft.draw(ctx));

    ctx.restore();
  }
}
