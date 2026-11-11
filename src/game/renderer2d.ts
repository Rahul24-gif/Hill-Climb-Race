import { VehiclePhysicsEngine } from './physics';
import {
  DriverSpec,
  RenderMode,
  VehicleSpec,
  WeatherOverride,
  WheelPhysicsState,
  WorldSpec,
} from './types';

function hashNum(n: number): number {
  const x = Math.sin(n * 91.3458 + 17.13) * 47453.5453;
  return x - Math.floor(x);
}

export class Illustrated2DRenderer {
  private weatherParticles: { x: number; y: number; speed: number; size: number }[] = [];

  constructor() {
    for (let i = 0; i < 85; i++) {
      this.weatherParticles.push({
        x: Math.random() * 2200,
        y: Math.random() * 1400,
        speed: 55 + Math.random() * 95,
        size: 2 + Math.random() * 3.5,
      });
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    engine: VehiclePhysicsEngine,
    mode: RenderMode,
    weatherOverride: WeatherOverride,
    timeSec: number
  ): void {
    ctx.clearRect(0, 0, width, height);

    const scale = Math.min(width, height) * 0.072 * engine.camZoom;
    const shakeX = (Math.random() - 0.5) * engine.camShake * 18;
    const shakeY = (Math.random() - 0.5) * engine.camShake * 18;

    const worldToScreenX = (wx: number) =>
      width * 0.44 + (wx - engine.camX) * scale + shakeX;
    const worldToScreenY = (wy: number) =>
      height * 0.58 - (wy - engine.camY) * scale + shakeY;

    if (mode === 'ILLUSTRATED_2D') {
      this.drawIllustratedSkyAndMountains(
        ctx,
        width,
        height,
        engine.world,
        weatherOverride,
        engine.camX,
        timeSec
      );
      this.drawForegroundTreesAndLandmarks(
        ctx,
        width,
        engine,
        scale,
        timeSec,
        worldToScreenX,
        worldToScreenY
      );
      this.drawDetailedRockyTerrain(
        ctx,
        width,
        height,
        engine,
        scale,
        worldToScreenX,
        worldToScreenY
      );
      this.drawRoadsideProps2D(ctx, engine, scale, worldToScreenX, worldToScreenY);
      this.drawPickups2D(ctx, engine, scale, timeSec, worldToScreenX, worldToScreenY);
      this.drawIllustratedVehicle(
        ctx,
        engine,
        scale,
        timeSec,
        worldToScreenX,
        worldToScreenY
      );
    }

    this.drawPostProcessingAndSunbeams(
      ctx,
      width,
      height,
      engine,
      weatherOverride,
      timeSec
    );
    this.drawParticles(ctx, engine, scale, worldToScreenX, worldToScreenY);
    this.drawWeatherEffects(ctx, width, height, engine.world, weatherOverride, timeSec);
    this.drawFloatingNotifications(ctx, engine, worldToScreenX, worldToScreenY);
  }

  private drawPostProcessingAndSunbeams(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    engine: VehiclePhysicsEngine,
    weatherOverride: WeatherOverride,
    timeSec: number
  ): void {
    const isNight =
      weatherOverride === 'NIGHT' ||
      engine.world.id === 'dark_forest' ||
      engine.world.id === 'neon_city';

    // 1. Golden-Hour Volumetric Sunbeams (God-Rays) from top-right sun
    if (!isNight && weatherOverride !== 'RAIN') {
      ctx.save();
      const sunX = width * 0.82;
      const sunY = height * 0.12;
      const sunGlow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 220);
      sunGlow.addColorStop(0, 'rgba(255, 251, 235, 0.55)');
      sunGlow.addColorStop(0.35, 'rgba(253, 224, 71, 0.18)');
      sunGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sunGlow;
      ctx.fillRect(0, 0, width, height);

      for (let r = 0; r < 5; r++) {
        const angle = 2.05 + r * 0.18 + Math.sin(timeSec * 0.4 + r) * 0.03;
        const spread = 0.055;
        const len = Math.max(width, height) * 0.95;
        const rayGrad = ctx.createLinearGradient(
          sunX,
          sunY,
          sunX + Math.cos(angle) * len,
          sunY + Math.sin(angle) * len
        );
        rayGrad.addColorStop(0, 'rgba(254, 249, 195, 0.14)');
        rayGrad.addColorStop(0.6, 'rgba(253, 224, 71, 0.04)');
        rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(sunX, sunY);
        ctx.lineTo(
          sunX + Math.cos(angle - spread) * len,
          sunY + Math.sin(angle - spread) * len
        );
        ctx.lineTo(
          sunX + Math.cos(angle + spread) * len,
          sunY + Math.sin(angle + spread) * len
        );
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. High-Speed Motion Blur Streaks when sprinting fast
    const speedAbs = Math.abs(engine.state.vx);
    if (speedAbs > 12.5) {
      const intensity = Math.min(0.45, (speedAbs - 12.5) / 18);
      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${intensity * 0.55})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 14; i++) {
        const sy = ((i * 83 + timeSec * 140) % height);
        const sx = width - (((i * 211 + timeSec * 980) % (width * 0.45)));
        const sideX = i % 2 === 0 ? sx : width - sx;
        const streakLen = 45 + (i % 5) * 28;
        ctx.beginPath();
        ctx.moveTo(sideX, sy);
        ctx.lineTo(sideX - streakLen, sy);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawRoadsideProps2D(
    ctx: CanvasRenderingContext2D,
    engine: VehiclePhysicsEngine,
    scale: number,
    toScreenX: (wx: number) => number,
    toScreenY: (wy: number) => number
  ): void {
    for (let i = 0; i < engine.terrain.props.length; i++) {
      const prop = engine.terrain.props[i];
      if (prop.hitTime > 2.4) continue;
      const sx = toScreenX(prop.x);
      if (sx < -60 || sx > ctx.canvas.width + 60) continue;
      const sy = toScreenY(prop.y);
      const sz = scale * 0.78;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(-prop.angle);

      if (prop.type === 'barrel') {
        ctx.fillStyle = '#EF4444';
        ctx.strokeStyle = '#090D16';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-sz * 0.42, -sz * 0.55, sz * 0.84, sz * 1.1, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-sz * 0.4, -sz * 0.25, sz * 0.8, sz * 0.2);
        ctx.fillRect(-sz * 0.4, sz * 0.1, sz * 0.8, sz * 0.2);
      } else {
        ctx.fillStyle = '#B45309';
        ctx.strokeStyle = '#3B2313';
        ctx.lineWidth = 2.5;
        ctx.fillRect(-sz * 0.48, -sz * 0.48, sz * 0.96, sz * 0.96);
        ctx.strokeRect(-sz * 0.48, -sz * 0.48, sz * 0.96, sz * 0.96);
        ctx.beginPath();
        ctx.moveTo(-sz * 0.45, -sz * 0.45);
        ctx.lineTo(sz * 0.45, sz * 0.45);
        ctx.moveTo(sz * 0.45, -sz * 0.45);
        ctx.lineTo(-sz * 0.45, sz * 0.45);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawIllustratedSkyAndMountains(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    world: WorldSpec,
    weatherOverride: WeatherOverride,
    camX: number,
    timeSec: number
  ): void {
    const isNight =
      weatherOverride === 'NIGHT' ||
      world.id === 'dark_forest' ||
      world.id === 'neon_city';
    const isRain = weatherOverride === 'RAIN';

    // 1. Vibrant Sky Gradient (Matching reference alpine sky)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.78);
    if (isNight) {
      skyGrad.addColorStop(0, '#071126');
      skyGrad.addColorStop(0.55, '#172E54');
      skyGrad.addColorStop(1, '#2D4D7A');
    } else if (isRain) {
      skyGrad.addColorStop(0, '#2B4257');
      skyGrad.addColorStop(0.6, '#567590');
      skyGrad.addColorStop(1, '#8CA7BC');
    } else {
      skyGrad.addColorStop(0, world.skyTop);
      skyGrad.addColorStop(0.55, world.skyBottom);
      skyGrad.addColorStop(1, world.horizonFog);
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Warm Sun Glow & Subtle Sunbeams
    const sunX = width * 0.8;
    const sunY = height * 0.16;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 170);
    sunGrad.addColorStop(
      0,
      isNight ? 'rgba(224, 242, 254, 0.95)' : 'rgba(255, 253, 232, 0.98)'
    );
    sunGrad.addColorStop(
      0.32,
      isNight ? 'rgba(125, 211, 252, 0.35)' : 'rgba(253, 224, 71, 0.42)'
    );
    sunGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 170, 0, Math.PI * 2);
    ctx.fill();

    // 3. Fluffy Illustrated Cumulus Clouds
    for (let c = 0; c < 7; c++) {
      const span = width + 420;
      const cx =
        (((c * 310 - camX * 7 - timeSec * 10) % span) + span) % span - 210;
      const cy = height * (0.1 + (c % 3) * 0.07);
      const cScale = 0.85 + (c % 3) * 0.24;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(cScale, cScale);

      ctx.fillStyle = isNight
        ? 'rgba(148, 163, 184, 0.18)'
        : 'rgba(186, 230, 253, 0.72)';
      ctx.beginPath();
      ctx.arc(-38, 10, 28, 0, Math.PI * 2);
      ctx.arc(0, 8, 38, 0, Math.PI * 2);
      ctx.arc(44, 12, 30, 0, Math.PI * 2);
      ctx.arc(76, 15, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isNight
        ? 'rgba(226, 232, 240, 0.25)'
        : 'rgba(255, 255, 255, 0.96)';
      ctx.beginPath();
      ctx.arc(-40, 2, 28, 0, Math.PI * 2);
      ctx.arc(-8, -10, 38, 0, Math.PI * 2);
      ctx.arc(32, -6, 34, 0, Math.PI * 2);
      ctx.arc(68, 6, 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 4. Majestic Snow-Capped Alpine Mountain Range (Matching both Reference Images)
    const numPeaks = 9;
    const peakSpan = width / 4.4;
    const parallaxX = camX * 5.2;
    const firstPeak = Math.floor((parallaxX - peakSpan) / peakSpan);

    for (let p = firstPeak; p < firstPeak + numPeaks; p++) {
      const peakWorldX = p * peakSpan;
      const sx = peakWorldX - parallaxX;
      const hSeed = hashNum(p * 13.7);
      const peakH = height * (0.31 + hSeed * 0.16);
      const peakY = height * 0.63 - peakH;
      const baseW = peakSpan * (1.3 + hashNum(p * 7.3) * 0.35);

      // Left sunlit mountain face
      ctx.fillStyle = isNight
        ? '#1E3A5F'
        : world.id === 'desert_run'
        ? '#D97706'
        : '#60A5FA';
      ctx.beginPath();
      ctx.moveTo(sx, peakY);
      ctx.lineTo(sx - baseW * 0.54, height * 0.72);
      ctx.lineTo(sx + baseW * 0.04, height * 0.72);
      ctx.closePath();
      ctx.fill();

      // Right shaded mountain face
      ctx.fillStyle = isNight
        ? '#0F2342'
        : world.id === 'desert_run'
        ? '#92400E'
        : '#3B82F6';
      ctx.beginPath();
      ctx.moveTo(sx, peakY);
      ctx.lineTo(sx + baseW * 0.04, height * 0.72);
      ctx.lineTo(sx + baseW * 0.56, height * 0.72);
      ctx.closePath();
      ctx.fill();

      // Detailed Jagged Snow Cap on top 42% of peak
      if (world.id !== 'desert_run' && world.id !== 'volcanic_land') {
        const snowY = peakY + peakH * 0.4;
        ctx.fillStyle = isNight ? '#CBD5E1' : '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(sx, peakY);
        ctx.lineTo(sx - baseW * 0.21, snowY);
        ctx.lineTo(sx - baseW * 0.12, snowY - 8);
        ctx.lineTo(sx - baseW * 0.06, snowY + 12);
        ctx.lineTo(sx + baseW * 0.02, snowY - 4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = isNight ? '#64748B' : '#DBEAFE';
        ctx.beginPath();
        ctx.moveTo(sx, peakY);
        ctx.lineTo(sx + baseW * 0.02, snowY - 4);
        ctx.lineTo(sx + baseW * 0.1, snowY + 10);
        ctx.lineTo(sx + baseW * 0.22, snowY);
        ctx.closePath();
        ctx.fill();
      }
    }

    // 5. Distant Valley Forest Hills & Shimmering Alpine Lake (Matching Reference Image 2)
    ctx.fillStyle = isNight ? '#062C21' : world.mountainMid;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.75);
    for (let sx = 0; sx <= width + 24; sx += 24) {
      const mx = sx * 0.006 + camX * 0.038;
      const treeJagged = Math.abs(Math.sin(mx * 18)) * 10;
      const my =
        height * 0.63 -
        Math.sin(mx * 1.3) * 34 -
        Math.cos(mx * 2.9) * 18 -
        treeJagged;
      ctx.lineTo(sx, my);
    }
    ctx.lineTo(width, height * 0.75);
    ctx.closePath();
    ctx.fill();

    // Shimmering Blue Alpine Valley Lake Band at Foot of Mountains
    if (world.id === 'green_valley' || world.id === 'snow_mountains') {
      const lakeTop = height * 0.64;
      const lakeBottom = height * 0.74;
      const lakeGrad = ctx.createLinearGradient(0, lakeTop, 0, lakeBottom);
      lakeGrad.addColorStop(0, isNight ? '#0F172A' : '#38BDF8');
      lakeGrad.addColorStop(0.5, isNight ? '#1E3A8A' : '#0284C7');
      lakeGrad.addColorStop(1, isNight ? '#172554' : '#0369A1');
      ctx.fillStyle = lakeGrad;
      ctx.fillRect(0, lakeTop, width, lakeBottom - lakeTop);

      // Shimmering White Water Ripples
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      for (let r = 0; r < 10; r++) {
        const rx = (((r * 190 - camX * 14) % width) + width) % width;
        const ry = lakeTop + 8 + (r % 4) * 9;
        ctx.beginPath();
        ctx.moveTo(rx - 22, ry);
        ctx.lineTo(rx + 22, ry);
        ctx.stroke();
      }
    }

    // Lush Green Meadow Foothills in Front of Lake
    ctx.fillStyle = isNight ? '#052E16' : '#15803D';
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let sx = 0; sx <= width + 24; sx += 24) {
      const mx = sx * 0.005 + camX * 0.055;
      const my = height * 0.69 - Math.sin(mx * 1.7) * 28 - Math.cos(mx * 3.1) * 14;
      ctx.lineTo(sx, my);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Draws multi-tier pine trees, bushes, wooden "HILL RUSH" trail signboards,
   * and wooden lookout watchtowers with waving red flags along the hills!
   */
  private drawForegroundTreesAndLandmarks(
    ctx: CanvasRenderingContext2D,
    width: number,
    engine: VehiclePhysicsEngine,
    scale: number,
    timeSec: number,
    toScreenX: (wx: number) => number,
    toScreenY: (wy: number) => number
  ): void {
    const minWorldX = engine.camX - (width * 0.65) / scale;
    const maxWorldX = engine.camX + (width * 0.65) / scale;
    const propSpacing = 5.2;
    const startIdx = Math.floor(minWorldX / propSpacing) - 1;
    const endIdx = Math.ceil(maxWorldX / propSpacing) + 1;

    for (let idx = startIdx; idx <= endIdx; idx++) {
      const hVal = hashNum(idx * 17.3);
      const wx = idx * propSpacing + (hVal - 0.5) * 1.6;
      if (engine.terrain.getBridgeAt(wx)) continue;

      const wy = engine.terrain.getRawSplineHeightAt(wx);
      const sx = toScreenX(wx);
      const sy = toScreenY(wy);
      const unitScale = scale / 36;

      // Every 9th slot (including near start at idx === 0), draw the iconic Wooden "HILL RUSH" Trail Signboard!
      if (((idx % 9) + 9) % 9 === 0) {
        ctx.save();
        ctx.translate(sx, sy + 4 * unitScale);
        ctx.scale(unitScale * 0.95, unitScale * 0.95);
        this.drawWoodenHillRushSign(ctx);
        ctx.restore();
        continue;
      }

      // Every 9th slot offset by 4, draw the Wooden Lookout Watchtower with Waving Red Flag!
      if (((idx % 9) + 9) % 9 === 4) {
        ctx.save();
        ctx.translate(sx, sy + 8 * unitScale);
        ctx.scale(unitScale * 1.05, unitScale * 1.05);
        this.drawWoodenWatchtower(ctx, timeSec);
        ctx.restore();
        continue;
      }

      if (hVal < 0.26) continue;

      const treeScale = (0.78 + hashNum(idx * 31.1) * 0.68) * unitScale;

      ctx.save();
      ctx.translate(sx, sy + 6 * treeScale);
      ctx.scale(treeScale, treeScale);

      if (engine.world.id === 'desert_run') {
        ctx.fillStyle = '#15803D';
        ctx.strokeStyle = '#052E16';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-8, -95, 16, 98, 8);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.roundRect(-28, -68, 22, 12, 6);
        ctx.roundRect(-28, -88, 12, 28, 6);
        ctx.roundRect(8, -58, 20, 12, 6);
        ctx.roundRect(16, -80, 12, 30, 6);
        ctx.fill();
        ctx.stroke();
      } else {
        // Wooden Trunk
        ctx.fillStyle = '#5C3A21';
        ctx.fillRect(-7, -34, 14, 38);
        ctx.fillStyle = '#3B2313';
        ctx.fillRect(0, -34, 7, 38);

        // 4 Layered Pine Tiers
        const tiers = [
          { y: -24, w: 50, h: 44 },
          { y: -52, w: 42, h: 40 },
          { y: -78, w: 32, h: 35 },
          { y: -102, w: 23, h: 30 },
        ];

        for (let t = 0; t < tiers.length; t++) {
          const tr = tiers[t];
          ctx.fillStyle =
            engine.world.id === 'snow_mountains' ? '#1E3A5F' : '#14532D';
          ctx.beginPath();
          ctx.moveTo(0, tr.y - tr.h);
          ctx.lineTo(-tr.w, tr.y);
          ctx.lineTo(tr.w, tr.y);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle =
            engine.world.id === 'snow_mountains' ? '#E2E8F0' : '#22C55E';
          ctx.beginPath();
          ctx.moveTo(0, tr.y - tr.h);
          ctx.lineTo(-tr.w * 0.92, tr.y - 3);
          ctx.lineTo(2, tr.y - 5);
          ctx.closePath();
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  /**
   * Draws the rustic wooden "HILL RUSH" plank signboard on twin posts
   * (Matching the left side of the user's attached Vehicle Selection image)
   */
  private drawWoodenHillRushSign(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.rotate(-0.08);

    // Twin vertical timber posts
    ctx.fillStyle = '#5C3A21';
    ctx.strokeStyle = '#2B1404';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-34, -96, 12, 98);
    ctx.strokeRect(-34, -96, 12, 98);
    ctx.fillRect(22, -96, 12, 98);
    ctx.strokeRect(22, -96, 12, 98);

    // 3 Horizontal weathered wooden planks
    const planksY = [-90, -70, -50];
    for (let i = 0; i < planksY.length; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#9A5B25' : '#854D1E';
      ctx.beginPath();
      ctx.roundRect(-52, planksY[i], 104, 19, 3);
      ctx.fill();
      ctx.stroke();
    }

    // White painted "HILL RUSH" lettering
    ctx.fillStyle = '#FFFBEB';
    ctx.font = '900 18px "Chakra Petch", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HILL', 0, -68);
    ctx.fillText('RUSH', 0, -48);

    ctx.restore();
  }

  /**
   * Draws the wooden lookout watchtower with crisscross bracing & waving red flag
   * (Matching the right side of the user's attached Vehicle Selection image)
   */
  private drawWoodenWatchtower(ctx: CanvasRenderingContext2D, timeSec: number): void {
    ctx.save();

    // 4 Tapered Support Timber Legs
    ctx.strokeStyle = '#5C3A21';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-36, 0);
    ctx.lineTo(-22, -92);
    ctx.moveTo(36, 0);
    ctx.lineTo(22, -92);
    ctx.stroke();

    // Crisscross X Timber Bracing (2 tiers)
    ctx.strokeStyle = '#7C4A21';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    // Lower X
    ctx.moveTo(-34, -8);
    ctx.lineTo(28, -48);
    ctx.moveTo(34, -8);
    ctx.lineTo(-28, -48);
    ctx.moveTo(-30, -48);
    ctx.lineTo(30, -48);
    // Upper X
    ctx.moveTo(-28, -48);
    ctx.lineTo(22, -88);
    ctx.moveTo(28, -48);
    ctx.lineTo(-22, -88);
    ctx.stroke();

    // Observation Deck & Railing
    ctx.fillStyle = '#854D1E';
    ctx.strokeStyle = '#2B1404';
    ctx.lineWidth = 2;
    ctx.fillRect(-32, -96, 64, 10);
    ctx.strokeRect(-32, -96, 64, 10);

    // Cabin Posts
    ctx.fillStyle = '#5C3A21';
    ctx.fillRect(-24, -124, 5, 28);
    ctx.fillRect(19, -124, 5, 28);
    ctx.fillRect(-28, -108, 56, 4);

    // Pitched Wooden Roof
    ctx.fillStyle = '#9A5B25';
    ctx.beginPath();
    ctx.moveTo(0, -148);
    ctx.lineTo(-38, -122);
    ctx.lineTo(38, -122);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Flagpole & Waving Red Pennant Flag on Peak
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -148);
    ctx.lineTo(0, -172);
    ctx.stroke();

    const wave = Math.sin(timeSec * 6) * 3;
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.moveTo(0, -171);
    ctx.quadraticCurveTo(12, -174 + wave, 24, -166 + wave);
    ctx.lineTo(0, -159);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draws the sculpted stacked rocky cliff ledge track topped with lush green grass turf
   * and wildflowers (Matching both Reference Images)
   */
  private drawDetailedRockyTerrain(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    engine: VehiclePhysicsEngine,
    scale: number,
    toScreenX: (wx: number) => number,
    toScreenY: (wy: number) => number
  ): void {
    const world = engine.world;
    const minWorldX = engine.camX - (width * 0.65) / scale;
    const maxWorldX = engine.camX + (width * 0.65) / scale;
    const step = 0.5;

    // 1. Clip & Fill Deep Rocky Cliff Cross-Section
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(toScreenX(minWorldX), height + 120);
    for (let wx = minWorldX; wx <= maxWorldX; wx += step) {
      const wy = engine.terrain.getRawSplineHeightAt(wx);
      ctx.lineTo(toScreenX(wx), toScreenY(wy));
    }
    ctx.lineTo(toScreenX(maxWorldX), height + 120);
    ctx.closePath();

    const earthGrad = ctx.createLinearGradient(0, height * 0.35, 0, height);
    earthGrad.addColorStop(0, world.terrainSub);
    earthGrad.addColorStop(0.45, '#6B3E1B');
    earthGrad.addColorStop(1, world.terrainDeep);
    ctx.fillStyle = earthGrad;
    ctx.fill();

    ctx.clip();

    // 2. Upper Rim Stacked Stone Ledge Blocks (Right under the grass turf, matching Vehicle Selection ledge)
    const ledgeGrid = 1.25;
    const startLedge = Math.floor(minWorldX / ledgeGrid) - 1;
    const endLedge = Math.ceil(maxWorldX / ledgeGrid) + 1;

    for (let col = startLedge; col <= endLedge; col++) {
      const wx = col * ledgeGrid;
      const topY = engine.terrain.getRawSplineHeightAt(wx);
      const sx = toScreenX(wx);
      const sy = toScreenY(topY) + scale * 0.38;
      const bw = ledgeGrid * scale * 0.96;
      const bh = scale * 0.58;

      ctx.fillStyle = col % 2 === 0 ? '#A67B5B' : '#8C6239';
      ctx.strokeStyle = '#3B2313';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(sx - bw * 0.5, sy - bh * 0.5, bw, bh, 5);
      ctx.fill();
      ctx.stroke();

      // Top bevel highlight on stone block
      ctx.fillStyle = 'rgba(254, 243, 199, 0.25)';
      ctx.fillRect(sx - bw * 0.42, sy - bh * 0.42, bw * 0.84, bh * 0.22);
    }

    // 3. Deeper Faceted Rock Chunks & Boulders
    const rockGrid = 1.65;
    const startCol = Math.floor(minWorldX / rockGrid) - 1;
    const endCol = Math.ceil(maxWorldX / rockGrid) + 1;

    for (let col = startCol; col <= endCol; col++) {
      const wx = col * rockGrid;
      const topY = engine.terrain.getRawSplineHeightAt(wx);
      for (let row = 0; row < 5; row++) {
        const seed = hashNum(col * 37.1 + row * 101.7);
        if (seed < 0.22) continue;

        const rx = wx + (hashNum(col * 13.3 + row) - 0.5) * 0.9;
        const ry = topY - 1.15 - row * 1.45 + (seed - 0.5) * 0.45;
        const sx = toScreenX(rx);
        const sy = toScreenY(ry);
        const rw = (0.44 + seed * 0.58) * scale;
        const rh = (0.3 + hashNum(col * 7.1 + row * 19) * 0.42) * scale;

        ctx.fillStyle =
          row % 2 === 0
            ? 'rgba(138, 82, 41, 0.82)'
            : 'rgba(92, 48, 16, 0.88)';
        ctx.strokeStyle = 'rgba(38, 18, 4, 0.85)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(sx - rw * 0.6, sy - rh * 0.2);
        ctx.lineTo(sx - rw * 0.2, sy - rh * 0.65);
        ctx.lineTo(sx + rw * 0.45, sy - rh * 0.5);
        ctx.lineTo(sx + rw * 0.68, sy + rh * 0.15);
        ctx.lineTo(sx + rw * 0.15, sy + rh * 0.6);
        ctx.lineTo(sx - rw * 0.5, sy + rh * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(217, 149, 82, 0.28)';
        ctx.beginPath();
        ctx.moveTo(sx - rw * 0.55, sy - rh * 0.2);
        ctx.lineTo(sx - rw * 0.2, sy - rh * 0.6);
        ctx.lineTo(sx + rw * 0.4, sy - rh * 0.45);
        ctx.lineTo(sx, sy);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();

    // 4. Surface Boulders
    for (let i = 0; i < engine.terrain.rocks.length; i++) {
      const r = engine.terrain.rocks[i];
      if (r.x < minWorldX - 2 || r.x > maxWorldX + 2) continue;
      const rx = toScreenX(r.x);
      const ry = toScreenY(r.y);
      const radPx = r.radius * scale;

      ctx.fillStyle = '#64748B';
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(rx - radPx, ry + 4);
      ctx.lineTo(rx - radPx * 0.7, ry - radPx * 0.75);
      ctx.lineTo(rx + radPx * 0.1, ry - radPx * 0.92);
      ctx.lineTo(rx + radPx * 0.8, ry - radPx * 0.55);
      ctx.lineTo(rx + radPx, ry + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 5. Thick Overhanging Lush Grass Turf, Blades & Wildflowers
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = '#14532D';
    ctx.lineWidth = Math.max(13, scale * 0.54);
    ctx.beginPath();
    for (let wx = minWorldX; wx <= maxWorldX; wx += step) {
      const wy = engine.terrain.getRawSplineHeightAt(wx);
      const sx = toScreenX(wx);
      const sy = toScreenY(wy) + scale * 0.18;
      if (wx === minWorldX) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    ctx.strokeStyle = world.terrainEdge;
    ctx.lineWidth = Math.max(9, scale * 0.38);
    ctx.beginPath();
    for (let wx = minWorldX; wx <= maxWorldX; wx += step) {
      const wy = engine.terrain.getRawSplineHeightAt(wx);
      const sx = toScreenX(wx);
      const sy = toScreenY(wy) + scale * 0.06;
      if (wx === minWorldX) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    ctx.strokeStyle = world.terrainTop;
    ctx.lineWidth = Math.max(5, scale * 0.22);
    ctx.beginPath();
    for (let wx = minWorldX; wx <= maxWorldX; wx += step) {
      const wy = engine.terrain.getRawSplineHeightAt(wx);
      const sx = toScreenX(wx);
      const sy = toScreenY(wy) - scale * 0.03;
      if (wx === minWorldX) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Grass tufts & golden wildflowers along the ridge
    for (let wx = Math.floor(minWorldX); wx <= maxWorldX; wx += 1.1) {
      const wy = engine.terrain.getRawSplineHeightAt(wx);
      const sx = toScreenX(wx);
      const sy = toScreenY(wy) - scale * 0.05;
      ctx.fillStyle = world.terrainTop;
      ctx.beginPath();
      ctx.moveTo(sx - 6, sy + 2);
      ctx.lineTo(sx - 2, sy - 9);
      ctx.lineTo(sx + 2, sy + 1);
      ctx.lineTo(sx + 6, sy - 7);
      ctx.lineTo(sx + 9, sy + 3);
      ctx.closePath();
      ctx.fill();

      // Occasional yellow wildflower
      if (hashNum(wx * 19.7) > 0.72 && world.id === 'green_valley') {
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.arc(sx + 3, sy - 7, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 6. Wooden Suspension Bridges
    for (let i = 0; i < engine.terrain.bridges.length; i++) {
      const br = engine.terrain.bridges[i];
      if (br.endX < minWorldX || br.startX > maxWorldX) continue;

      const postW = scale * 0.35;
      const postH = scale * 1.65;
      const sx1 = toScreenX(br.startX);
      const sy1 = toScreenY(br.startY);
      const sx2 = toScreenX(br.endX);
      const sy2 = toScreenY(br.endY);

      ctx.fillStyle = '#78350F';
      ctx.fillRect(sx1 - postW * 0.5, sy1 - postH, postW, postH + scale * 0.6);
      ctx.fillRect(sx2 - postW * 0.5, sy2 - postH, postW, postH + scale * 0.6);

      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx1, sy1 - postH * 0.9);
      const midX = (br.startX + br.endX) * 0.5;
      const midY = engine.terrain.getHeightAt(midX) + 0.35;
      ctx.quadraticCurveTo(toScreenX(midX), toScreenY(midY), sx2, sy2 - postH * 0.9);
      ctx.stroke();

      const planks = 18;
      for (let p = 0; p <= planks; p++) {
        const u = p / planks;
        const px = br.startX + (br.endX - br.startX) * u;
        const py = engine.terrain.getHeightAt(px);
        const scX = toScreenX(px);
        const scY = toScreenY(py);
        ctx.fillStyle = p % 2 === 0 ? '#B45309' : '#78350F';
        ctx.fillRect(scX - scale * 0.36, scY - scale * 0.12, scale * 0.72, scale * 0.26);
      }
    }
  }

  private drawPickups2D(
    ctx: CanvasRenderingContext2D,
    engine: VehiclePhysicsEngine,
    scale: number,
    timeSec: number,
    toScreenX: (wx: number) => number,
    toScreenY: (wy: number) => number
  ): void {
    for (let i = 0; i < engine.terrain.pickups.length; i++) {
      const p = engine.terrain.pickups[i];
      if (p.collected) continue;
      const sx = toScreenX(p.x);
      if (sx < -60 || sx > ctx.canvas.width + 60) continue;
      const bob = Math.sin(timeSec * 4 + p.id) * 0.12;
      const sy = toScreenY(p.y + bob);

      if (p.type === 'fuel') {
        const w = scale * 0.82;
        const h = scale * 0.96;
        ctx.save();
        ctx.translate(sx, sy);

        ctx.shadowColor = 'rgba(239, 68, 68, 0.55)';
        ctx.shadowBlur = 12;

        ctx.fillStyle = '#DC2626';
        ctx.strokeStyle = '#450A0A';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-w * 0.5, -h * 0.45, w, h * 0.9, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#EF4444';
        ctx.fillRect(-w * 0.25, -h * 0.62, w * 0.5, h * 0.18);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(w * 0.18, -h * 0.66, w * 0.18, h * 0.14);

        ctx.strokeStyle = '#FCA5A5';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-w * 0.26, -h * 0.2);
        ctx.lineTo(w * 0.26, h * 0.26);
        ctx.moveTo(w * 0.26, -h * 0.2);
        ctx.lineTo(-w * 0.26, h * 0.26);
        ctx.stroke();

        ctx.restore();
      } else {
        const r = scale * 0.46;
        const spinWidth = Math.max(0.55, Math.abs(Math.cos(timeSec * 2.5 + p.id * 0.4)));
        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(spinWidth, 1);

        const coinGrad = ctx.createLinearGradient(-r, -r, r, r);
        coinGrad.addColorStop(0, '#FEF08A');
        coinGrad.addColorStop(0.5, '#FACC15');
        coinGrad.addColorStop(1, '#CA8A04');
        ctx.fillStyle = coinGrad;
        ctx.strokeStyle = '#713F12';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#B45309';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#FEF9C3';
        ctx.beginPath();
        for (let pt = 0; pt < 5; pt++) {
          const outerA = (pt * 2 * Math.PI) / 5 - Math.PI / 2;
          const innerA = outerA + Math.PI / 5;
          if (pt === 0) ctx.moveTo(Math.cos(outerA) * r * 0.42, Math.sin(outerA) * r * 0.42);
          else ctx.lineTo(Math.cos(outerA) * r * 0.42, Math.sin(outerA) * r * 0.42);
          ctx.lineTo(Math.cos(innerA) * r * 0.18, Math.sin(innerA) * r * 0.18);
        }
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    }
  }

  private drawIllustratedVehicle(
    ctx: CanvasRenderingContext2D,
    engine: VehiclePhysicsEngine,
    scale: number,
    timeSec: number,
    toScreenX: (wx: number) => number,
    toScreenY: (wy: number) => number
  ): void {
    const s = engine.state;
    const spec = engine.spec;

    const cosA = Math.cos(s.angle);
    const sinA = Math.sin(s.angle);

    // 1. Draw Live Articulating Suspension Struts & Coil Springs
    const drawSuspensionAssembly = (w: WheelPhysicsState) => {
      const mountX = s.x + w.offsetX * cosA;
      const mountY = s.y + w.offsetX * sinA;
      const sx1 = toScreenX(mountX);
      const sy1 = toScreenY(mountY);
      const sx2 = toScreenX(w.worldX);
      const sy2 = toScreenY(w.worldY);

      const centerUnderX = toScreenX(s.x);
      const centerUnderY = toScreenY(s.y - 0.15);
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = Math.max(4, scale * 0.12);
      ctx.beginPath();
      ctx.moveTo(centerUnderX, centerUnderY);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();

      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = Math.max(4, scale * 0.14);
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
      ctx.stroke();

      const dx = sx2 - sx1;
      const dy = sy2 - sy1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      ctx.strokeStyle = '#475569';
      ctx.lineWidth = Math.max(7, scale * 0.24);
      ctx.beginPath();
      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx1 + dx * 0.42, sy1 + dy * 0.42);
      ctx.stroke();

      // Coil spring color matches vehicle signature shocks
      ctx.strokeStyle =
        spec.id === 'monster'
          ? '#A855F7'
          : spec.id === 'buggy' || spec.id === 'jeep'
          ? '#EF4444'
          : '#FACC15';
      ctx.lineWidth = Math.max(2.5, scale * 0.09);
      const coils = 7;
      const coilAmp = scale * 0.19;
      ctx.beginPath();
      ctx.moveTo(sx1 + dx * 0.12, sy1 + dy * 0.12);
      for (let c = 1; c <= coils; c++) {
        const u = 0.12 + (c / coils) * 0.76;
        const side = c % 2 === 0 ? 1 : -1;
        ctx.lineTo(
          sx1 + dx * u + nx * coilAmp * side,
          sy1 + dy * u + ny * coilAmp * side
        );
      }
      ctx.lineTo(sx2, sy2);
      ctx.stroke();
    };

    drawSuspensionAssembly(s.rearWheel);
    drawSuspensionAssembly(s.frontWheel);

    // 2. Draw Detailed Illustrated Vehicle Bodywork + Seated Cartoon Driver
    ctx.save();
    ctx.translate(toScreenX(s.x), toScreenY(s.y));
    ctx.rotate(-s.angle);

    drawDetailedJeepBody(ctx, spec, scale, timeSec, engine.driver, s);

    ctx.restore();

    // 2b. If Cartoon Driver was Ejected on Extreme Bounce / Hard Impact, Draw Tumbling Ragdoll!
    if (s.driverEjected) {
      ctx.save();
      ctx.translate(toScreenX(s.driverRagdollX), toScreenY(s.driverRagdollY));
      ctx.rotate(-s.driverRagdollAngle);
      draw2DCartoonDriverCharacter(
        ctx,
        engine.driver,
        scale,
        timeSec,
        true
      );
      ctx.restore();
    }

    // 2c. Draw Flying Detached Front Bumper & Roof Rack Parts if Knocked Off
    if (s.frontBumper.detached) {
      ctx.save();
      ctx.translate(toScreenX(s.frontBumper.x), toScreenY(s.frontBumper.y));
      ctx.rotate(-s.frontBumper.angle);
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = '#090D16';
      ctx.lineWidth = 2;
      ctx.fillRect(-scale * 0.16, -scale * 0.1, scale * 0.32, scale * 0.2);
      ctx.strokeRect(-scale * 0.16, -scale * 0.1, scale * 0.32, scale * 0.2);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(scale * 0.04, -scale * 0.04, scale * 0.1, scale * 0.08);
      ctx.restore();
    }

    if (s.roofAccessory.detached) {
      ctx.save();
      ctx.translate(toScreenX(s.roofAccessory.x), toScreenY(s.roofAccessory.y));
      ctx.rotate(-s.roofAccessory.angle);
      ctx.fillStyle = '#18181B';
      ctx.fillRect(-scale * 0.36, -scale * 0.05, scale * 0.72, scale * 0.1);
      for (let l = 0; l < 4; l++) {
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(-scale * 0.24 + l * scale * 0.16, -scale * 0.08, scale * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 3. Draw Detailed Rotating Tires & Rims
    const drawOffroadWheel = (w: WheelPhysicsState) => {
      const wx = toScreenX(w.worldX);
      const wy = toScreenY(w.worldY);
      const rPx = w.radius * scale;

      if (w.grounded) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(wx, wy + rPx * 0.9, rPx * 1.05, rPx * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      drawDetailedWheelSprite(ctx, wx, wy, rPx, w.angle, spec.id);
    };

    drawOffroadWheel(s.rearWheel);
    drawOffroadWheel(s.frontWheel);
  }

  private drawParticles(
    ctx: CanvasRenderingContext2D,
    engine: VehiclePhysicsEngine,
    scale: number,
    toScreenX: (wx: number) => number,
    toScreenY: (wy: number) => number
  ): void {
    for (let i = 0; i < engine.particles.length; i++) {
      const p = engine.particles[i];
      if (!p.active) continue;
      const sx = toScreenX(p.x);
      const sy = toScreenY(p.y);
      const r = Math.max(2.5, p.size * (scale / 42));

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));

      if (p.type === 'clod') {
        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#2B1404';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx - r, sy);
        ctx.lineTo(sx - r * 0.4, sy - r * 0.85);
        ctx.lineTo(sx + r * 0.7, sy - r * 0.5);
        ctx.lineTo(sx + r, sy + r * 0.4);
        ctx.lineTo(sx - r * 0.3, sy + r * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.type === 'flame') {
        ctx.shadowColor = '#F97316';
        ctx.shadowBlur = 10;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 1.25, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawWeatherEffects(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    world: WorldSpec,
    weatherOverride: WeatherOverride,
    timeSec: number
  ): void {
    let activeWeather: string = world.weatherType;
    if (weatherOverride === 'RAIN') activeWeather = 'neon_rain';
    else if (weatherOverride === 'SNOW') activeWeather = 'snow';
    else if (weatherOverride === 'SUNNY') activeWeather = 'none';

    if (activeWeather === 'none') return;

    ctx.save();
    for (let i = 0; i < this.weatherParticles.length; i++) {
      const w = this.weatherParticles[i];
      const wx = ((w.x - timeSec * w.speed) % width + width) % width;
      const wy =
        activeWeather === 'embers'
          ? ((w.y - timeSec * w.speed * 0.8) % height + height) % height
          : ((w.y + timeSec * w.speed * 1.35) % height + height) % height;

      if (activeWeather === 'snow') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(wx, wy, w.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (activeWeather === 'embers') {
        ctx.fillStyle = 'rgba(251, 146, 60, 0.85)';
        ctx.beginPath();
        ctx.arc(wx, wy, w.size * 0.9, 0, Math.PI * 2);
        ctx.fill();
      } else if (activeWeather === 'neon_rain') {
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.lineTo(wx - 6, wy + 18);
        ctx.stroke();
      } else if (activeWeather === 'dust') {
        ctx.fillStyle = 'rgba(253, 230, 138, 0.28)';
        ctx.beginPath();
        ctx.arc(wx, wy, w.size * 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  private drawFloatingNotifications(
    ctx: CanvasRenderingContext2D,
    engine: VehiclePhysicsEngine,
    toScreenX: (wx: number) => number,
    toScreenY: (wy: number) => number
  ): void {
    for (let i = 0; i < engine.notifications.length; i++) {
      const n = engine.notifications[i];
      const sx = toScreenX(n.x);
      const sy = toScreenY(n.y);
      const alpha = 1 - Math.pow(n.life / n.maxLife, 2);

      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = '900 26px "Chakra Petch", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#090D16';
      ctx.strokeText(n.text, sx, sy);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, sx, sy);

      if (n.subtext) {
        ctx.font = '800 15px "JetBrains Mono", monospace';
        ctx.strokeText(n.subtext, sx, sy + 22);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(n.subtext, sx, sy + 22);
      }
      ctx.restore();
    }
  }
}

/**
 * Renders the exact chosen vehicle body on the 2D gameplay canvas so it looks 100%
 * identical to the 5 vehicles in the user's attached Vehicle Selection image!
 */
export function draw2DCartoonDriverCharacter(
  ctx: CanvasRenderingContext2D,
  driver: DriverSpec,
  scale: number,
  timeSec: number,
  isRagdoll: boolean
): void {
  const r = scale * 0.21;

  // If ejected ragdoll, draw flailing cartoon legs and arms!
  if (isRagdoll) {
    const wave = Math.sin(timeSec * 22) * 0.55;
    ctx.strokeStyle = driver.outfitPrimary;
    ctx.lineWidth = Math.max(4, scale * 0.11);
    ctx.lineCap = 'round';
    ctx.beginPath();
    // Legs
    ctx.moveTo(-r * 0.3, r * 1.2);
    ctx.lineTo(-r * 1.1, r * (2.3 + wave));
    ctx.moveTo(r * 0.3, r * 1.2);
    ctx.lineTo(r * 1.1, r * (2.3 - wave));
    // Flailing arms
    ctx.moveTo(-r * 0.4, r * 0.4);
    ctx.lineTo(-r * 1.6, -r * (0.6 + wave));
    ctx.moveTo(r * 0.4, r * 0.4);
    ctx.lineTo(r * 1.6, -r * (0.6 - wave));
    ctx.stroke();
  }

  // Cartoon Torso / Racing Suit
  ctx.fillStyle = driver.outfitPrimary;
  ctx.strokeStyle = '#090D16';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-r * 0.75, 0, r * 1.5, r * 1.55, 5);
  ctx.fill();
  ctx.stroke();

  // Suit Accent Stripe
  ctx.fillStyle = driver.visorColor;
  ctx.fillRect(-r * 0.22, r * 0.1, r * 0.44, r * 1.35);

  // Expressive Cartoon Head
  ctx.fillStyle = driver.skinColor;
  ctx.strokeStyle = '#090D16';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, -r * 0.65, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cartoon Eye & Expression (Wide-eyed O face when flying in ragdoll!)
  ctx.fillStyle = '#090D16';
  ctx.beginPath();
  ctx.arc(r * 0.38, -r * 0.68, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(r * 0.42, -r * 0.73, r * 0.07, 0, Math.PI * 2);
  ctx.fill();

  if (isRagdoll) {
    ctx.fillStyle = '#090D16';
    ctx.beginPath();
    ctx.arc(r * 0.42, -r * 0.28, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.32, r * 0.22, 0, Math.PI);
    ctx.fill();
  }

  // Signature Headgear for each of the 6 Cartoon Drivers
  if (driver.headgearType === 'cap') {
    // Rex: Backwards Red Cap + Goggles
    ctx.fillStyle = driver.outfitPrimary;
    ctx.beginPath();
    ctx.arc(0, -r * 0.75, r * 1.02, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(-r * 1.45, -r * 0.92, r * 0.65, r * 0.24);
    ctx.fillStyle = driver.visorColor;
    ctx.fillRect(r * 0.15, -r * 1.15, r * 0.65, r * 0.34);
  } else if (driver.headgearType === 'horned_helmet') {
    // Duke: Horned Viking Helmet + Beard
    ctx.fillStyle = driver.hairColor;
    ctx.beginPath();
    ctx.arc(r * 0.2, -r * 0.2, r * 0.65, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(0, -r * 0.75, r * 1.05, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 1.5);
    ctx.lineTo(-r * 1.1, -r * 2.15);
    ctx.lineTo(0, -r * 1.65);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (driver.headgearType === 'visor_helmet') {
    // Maya (Female): High Flowing Ponytail + Neon Visor
    ctx.fillStyle = driver.hairColor;
    ctx.beginPath();
    ctx.arc(0, -r * 0.78, r * 1.02, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-r * 1.25, -r * 0.85, r * 0.55, r * 0.28, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = driver.visorColor;
    ctx.fillRect(r * 0.1, -r * 0.98, r * 0.95, r * 0.25);
  } else if (driver.headgearType === 'moto_goggles') {
    // Axel: Spiky Mohawk + Goggles
    ctx.fillStyle = driver.hairColor;
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 1.4);
    ctx.lineTo(-r * 0.3, -r * 2.25);
    ctx.lineTo(0, -r * 1.55);
    ctx.lineTo(r * 0.35, -r * 2.2);
    ctx.lineTo(r * 0.65, -r * 1.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = driver.visorColor;
    ctx.fillRect(r * 0.08, -r * 0.92, r * 0.75, r * 0.36);
  } else if (driver.headgearType === 'desert_goggles') {
    // Zara (Female): Gold Bandana + Twin Braids
    ctx.fillStyle = driver.hairColor;
    ctx.beginPath();
    ctx.roundRect(-r * 0.95, -r * 0.4, r * 0.38, r * 1.25, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = driver.visorColor;
    ctx.fillRect(-r * 0.98, -r * 1.12, r * 1.96, r * 0.32);
  } else {
    // Viktor: White Pro Rally Helmet + Visor
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.arc(-r * 0.08, -r * 0.7, r * 1.08, Math.PI * 0.75, Math.PI * 0.15);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = driver.visorColor;
    ctx.fillRect(r * 0.15, -r * 0.95, r * 0.78, r * 0.34);
  }
}

export function drawDetailedJeepBody(
  ctx: CanvasRenderingContext2D,
  spec: VehicleSpec,
  scale: number,
  timeSec: number,
  driver?: DriverSpec,
  vehicleState?: VehiclePhysicsEngine['state']
): void {
  const wPx = spec.wheelbase * 1.32 * scale;
  const hPx = 0.96 * scale;
  const seatBouncePx = vehicleState
    ? -vehicleState.driverOffsetY * scale
    : Math.sin(timeSec * 10) * 1.5;
  const driverLean = vehicleState ? -vehicleState.driverLeanAngle : 0;
  const isEjected = vehicleState?.driverEjected ?? false;
  const roofDetached = vehicleState?.roofAccessory.detached ?? false;
  const bumperDetached = vehicleState?.frontBumper.detached ?? false;

  if (spec.id === 'monster') {
    /* =========================================================
       MONSTER TRUCK: Blue Pickup Body + Hot-Rod Flames + 4 Roof Lights
       ========================================================= */
    // High-lift chassis frame
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#090D16';
    ctx.lineWidth = 2;
    ctx.fillRect(-wPx * 0.38, -hPx * 0.12, wPx * 0.76, hPx * 0.18);

    // 4 Round Roof Floodlights
    for (let i = 0; i < 4; i++) {
      const lx = -wPx * 0.06 + i * (wPx * 0.055);
      ctx.fillStyle = '#FEF08A';
      ctx.strokeStyle = '#090D16';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(lx, -hPx * 1.02, scale * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Lifted Blue Pickup Body
    const blueGrad = ctx.createLinearGradient(0, -hPx * 0.95, 0, -hPx * 0.1);
    blueGrad.addColorStop(0, '#38BDF8');
    blueGrad.addColorStop(0.55, '#0284C7');
    blueGrad.addColorStop(1, '#1E3A8A');
    ctx.fillStyle = blueGrad;
    ctx.strokeStyle = '#090D16';
    ctx.lineWidth = 2.8;

    ctx.beginPath();
    ctx.moveTo(-wPx * 0.5, -hPx * 0.54);
    ctx.lineTo(-wPx * 0.18, -hPx * 0.54);
    ctx.lineTo(-wPx * 0.08, -hPx * 0.94);
    ctx.lineTo(wPx * 0.22, -hPx * 0.94);
    ctx.lineTo(wPx * 0.32, -hPx * 0.56);
    ctx.lineTo(wPx * 0.52, -hPx * 0.48);
    ctx.lineTo(wPx * 0.54, -hPx * 0.12);
    ctx.lineTo(-wPx * 0.5, -hPx * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cab windows
    ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
    ctx.beginPath();
    ctx.moveTo(-wPx * 0.04, -hPx * 0.88);
    ctx.lineTo(wPx * 0.19, -hPx * 0.88);
    ctx.lineTo(wPx * 0.28, -hPx * 0.56);
    ctx.lineTo(-wPx * 0.12, -hPx * 0.56);
    ctx.closePath();
    ctx.fill();

    if (driver && !isEjected) {
      ctx.save();
      ctx.translate(wPx * 0.05, -hPx * 0.6 + seatBouncePx);
      ctx.rotate(driverLean);
      draw2DCartoonDriverCharacter(ctx, driver, scale * 0.85, timeSec, false);
      ctx.restore();
    }

    // Hot-Rod Yellow/Orange/Red Flame Livery
    const flameGrad = ctx.createLinearGradient(wPx * 0.5, 0, -wPx * 0.35, 0);
    flameGrad.addColorStop(0, '#FEF08A');
    flameGrad.addColorStop(0.5, '#F97316');
    flameGrad.addColorStop(1, '#DC2626');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(wPx * 0.48, -hPx * 0.44);
    ctx.lineTo(wPx * 0.14, -hPx * 0.48);
    ctx.lineTo(wPx * 0.24, -hPx * 0.36);
    ctx.lineTo(-wPx * 0.08, -hPx * 0.42);
    ctx.lineTo(wPx * 0.08, -hPx * 0.28);
    ctx.lineTo(-wPx * 0.32, -hPx * 0.26);
    ctx.lineTo(wPx * 0.48, -hPx * 0.16);
    ctx.closePath();
    ctx.fill();

    // Chrome Grille & Bumper
    if (!bumperDetached) {
      ctx.fillStyle = '#E2E8F0';
      ctx.fillRect(wPx * 0.48, -hPx * 0.46, scale * 0.18, hPx * 0.32);
    }
    return;
  }

  if (spec.id === 'buggy') {
    /* =========================================================
       DUNE BUGGY: Golden-Yellow Sand Rail Cage + Flame Side Panel
       ========================================================= */
    // Driver & Racing Bucket Seat
    ctx.fillStyle = '#18181B';
    ctx.fillRect(-wPx * 0.12, -hPx * 0.56, scale * 0.26, scale * 0.4);
    if (driver && !isEjected) {
      ctx.save();
      ctx.translate(-wPx * 0.02, -hPx * 0.45 + seatBouncePx);
      ctx.rotate(driverLean);
      draw2DCartoonDriverCharacter(ctx, driver, scale * 0.95, timeSec, false);
      ctx.restore();
    }

    // Lower Flame Body Hull
    ctx.fillStyle = '#FACC15';
    ctx.strokeStyle = '#090D16';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-wPx * 0.46, -hPx * 0.22);
    ctx.lineTo(-wPx * 0.18, -hPx * 0.42);
    ctx.lineTo(wPx * 0.28, -hPx * 0.36);
    ctx.lineTo(wPx * 0.5, -hPx * 0.14);
    ctx.lineTo(wPx * 0.44, hPx * 0.12);
    ctx.lineTo(-wPx * 0.42, hPx * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Red/Orange Flame Decal
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.moveTo(-wPx * 0.3, hPx * 0.06);
    ctx.lineTo(0, -hPx * 0.28);
    ctx.lineTo(-wPx * 0.04, -hPx * 0.12);
    ctx.lineTo(wPx * 0.28, -hPx * 0.22);
    ctx.lineTo(wPx * 0.38, hPx * 0.06);
    ctx.closePath();
    ctx.fill();

    // Golden-Yellow Tubular Sand Rail Roll Cage
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = Math.max(4, scale * 0.13);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-wPx * 0.42, -hPx * 0.2);
    ctx.lineTo(-wPx * 0.18, -hPx * 0.86);
    ctx.lineTo(wPx * 0.18, -hPx * 0.86);
    ctx.lineTo(wPx * 0.44, -hPx * 0.16);
    ctx.moveTo(-wPx * 0.18, -hPx * 0.86);
    ctx.lineTo(0, -hPx * 0.2);
    ctx.stroke();

    // 4 Round Roof Floodlights
    if (!roofDetached) {
      for (let i = 0; i < 4; i++) {
        const lx = -wPx * 0.1 + i * (wPx * 0.07);
        ctx.fillStyle = '#FEF08A';
        ctx.strokeStyle = '#090D16';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(lx, -hPx * 0.95, scale * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    return;
  }

  if (spec.id === 'dirtbike') {
    /* =========================================================
       DIRT BIKE: Lime-Green #27 Motocross Bike + Gold Forks + Rider
       ========================================================= */
    // Silver Engine & Chrome Exhaust
    ctx.fillStyle = '#94A3B8';
    ctx.strokeStyle = '#090D16';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-wPx * 0.12, -hPx * 0.28, wPx * 0.28, hPx * 0.36, 4);
    ctx.fill();
    ctx.stroke();

    // Long Gold Front Forks
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = Math.max(4, scale * 0.14);
    ctx.beginPath();
    ctx.moveTo(wPx * 0.22, -hPx * 0.78);
    ctx.lineTo(wPx * 0.48, hPx * 0.28);
    ctx.stroke();

    // Lime-Green Motocross Plastics & High Front Fender
    ctx.fillStyle = '#22C55E';
    ctx.strokeStyle = '#090D16';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-wPx * 0.48, -hPx * 0.46);
    ctx.lineTo(-wPx * 0.06, -hPx * 0.36);
    ctx.lineTo(wPx * 0.26, -hPx * 0.72);
    ctx.lineTo(wPx * 0.48, -hPx * 0.38);
    ctx.lineTo(wPx * 0.18, -hPx * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // White "#27" Number Plate
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(wPx * 0.16, -hPx * 0.7, scale * 0.26, scale * 0.22);
    ctx.fillStyle = '#090D16';
    ctx.font = `900 ${Math.round(scale * 0.16)}px "Chakra Petch", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('27', wPx * 0.29, -hPx * 0.54);

    // Motocross Cartoon Rider
    if (driver && !isEjected) {
      ctx.save();
      ctx.translate(-wPx * 0.04, -hPx * 0.74 + seatBouncePx);
      ctx.rotate(driverLean);
      draw2DCartoonDriverCharacter(ctx, driver, scale * 1.02, timeSec, false);
      ctx.restore();
    }
    return;
  }

  if (spec.id === 'rally') {
    /* =========================================================
       RALLY CAR: Metallic Blue #23 WRC Coupe + White Stripes + Wing
       ========================================================= */
    // Rear WRC Wing Spoiler
    if (!roofDetached) {
      ctx.fillStyle = '#1D4ED8';
      ctx.strokeStyle = '#090D16';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-wPx * 0.48, -hPx * 0.36);
      ctx.lineTo(-wPx * 0.56, -hPx * 0.68);
      ctx.lineTo(-wPx * 0.38, -hPx * 0.68);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Metallic Blue Coupe Body
    const rallyGrad = ctx.createLinearGradient(0, -hPx * 0.75, 0, hPx * 0.2);
    rallyGrad.addColorStop(0, '#3B82F6');
    rallyGrad.addColorStop(0.6, '#1D4ED8');
    rallyGrad.addColorStop(1, '#1E1B4B');
    ctx.fillStyle = rallyGrad;
    ctx.strokeStyle = '#090D16';
    ctx.lineWidth = 2.8;

    ctx.beginPath();
    ctx.moveTo(-wPx * 0.5, -hPx * 0.34);
    ctx.lineTo(-wPx * 0.34, -hPx * 0.38);
    ctx.lineTo(-wPx * 0.14, -hPx * 0.76);
    ctx.lineTo(wPx * 0.18, -hPx * 0.76);
    ctx.lineTo(wPx * 0.36, -hPx * 0.38);
    ctx.lineTo(wPx * 0.54, -hPx * 0.24);
    ctx.lineTo(wPx * 0.54, hPx * 0.16);
    ctx.lineTo(-wPx * 0.5, hPx * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tinted Rally Windows
    ctx.fillStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.beginPath();
    ctx.moveTo(-wPx * 0.1, -hPx * 0.7);
    ctx.lineTo(wPx * 0.15, -hPx * 0.7);
    ctx.lineTo(wPx * 0.31, -hPx * 0.38);
    ctx.lineTo(-wPx * 0.28, -hPx * 0.38);
    ctx.closePath();
    ctx.fill();

    if (driver && !isEjected) {
      ctx.save();
      ctx.translate(wPx * 0.04, -hPx * 0.44 + seatBouncePx);
      ctx.rotate(driverLean);
      draw2DCartoonDriverCharacter(ctx, driver, scale * 0.85, timeSec, false);
      ctx.restore();
    }

    // White Door Number Plate "23"
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#090D16';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-wPx * 0.08, -hPx * 0.28, scale * 0.42, scale * 0.34);
    ctx.strokeRect(-wPx * 0.08, -hPx * 0.28, scale * 0.42, scale * 0.34);
    ctx.fillStyle = '#090D16';
    ctx.font = `900 ${Math.round(scale * 0.24)}px "Chakra Petch", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('23', -wPx * 0.08 + scale * 0.21, -hPx * 0.28 + scale * 0.26);

    // Yellow Fog Lamp
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(wPx * 0.5, -hPx * 0.1, scale * 0.1, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  /* =========================================================
     DEFAULT / OFFROAD JEEP: Red 4x4 Wrangler + 4 Roof Floodlights + Mountain Decal
     ========================================================= */
  // 1. Rear-mounted Spare Tire
  ctx.save();
  ctx.translate(-wPx * 0.53, -hPx * 0.25);
  ctx.rotate(-0.18);
  ctx.fillStyle = '#18181B';
  ctx.strokeStyle = '#09090B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-scale * 0.16, -scale * 0.38, scale * 0.28, scale * 0.76, 5);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 2. Detachable Roof Rack & 4 Round Floodlights (Matching Reference Image)
  if (!roofDetached) {
    ctx.fillStyle = '#18181B';
    ctx.fillRect(-wPx * 0.34, -hPx * 0.98, wPx * 0.54, scale * 0.08);
    for (let i = 0; i < 4; i++) {
      const lx = -wPx * 0.06 + i * (wPx * 0.075);
      ctx.fillStyle = '#FEF08A';
      ctx.strokeStyle = '#090D16';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(lx, -hPx * 1.04, scale * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // 3. Hardtop & Roll Cage
  ctx.strokeStyle = '#18181B';
  ctx.lineWidth = Math.max(4, scale * 0.13);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-wPx * 0.44, -hPx * 0.25);
  ctx.lineTo(-wPx * 0.32, -hPx * 0.92);
  ctx.lineTo(wPx * 0.18, -hPx * 0.92);
  ctx.lineTo(wPx * 0.32, -hPx * 0.32);
  ctx.moveTo(-wPx * 0.04, -hPx * 0.92);
  ctx.lineTo(-wPx * 0.04, -hPx * 0.25);
  ctx.stroke();

  // Windshield glass tint
  ctx.fillStyle = 'rgba(186, 230, 253, 0.5)';
  ctx.beginPath();
  ctx.moveTo(wPx * 0.13, -hPx * 0.88);
  ctx.lineTo(wPx * 0.29, -hPx * 0.34);
  ctx.lineTo(-wPx * 0.02, -hPx * 0.34);
  ctx.lineTo(-wPx * 0.02, -hPx * 0.88);
  ctx.closePath();
  ctx.fill();

  // 4. Expressive Cartoon Driver in Cockpit (or empty seat if ejected!)
  if (driver && !isEjected) {
    ctx.save();
    ctx.translate(wPx * 0.04, -hPx * 0.48 + seatBouncePx);
    ctx.rotate(driverLean);
    draw2DCartoonDriverCharacter(ctx, driver, scale * 0.95, timeSec, false);
    ctx.restore();
  } else if (!isEjected) {
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.roundRect(-wPx * 0.02, -hPx * 0.56, scale * 0.26, scale * 0.34, 4);
    ctx.fill();
  }

  // 5. Main Glossy Red Wrangler Body Hull
  const bodyGrad = ctx.createLinearGradient(0, -hPx * 0.42, 0, hPx * 0.28);
  bodyGrad.addColorStop(0, spec.primaryColor);
  bodyGrad.addColorStop(0.65, spec.primaryColor);
  bodyGrad.addColorStop(1, spec.secondaryColor);

  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = '#090D16';
  ctx.lineWidth = 2.8;

  ctx.beginPath();
  ctx.moveTo(-wPx * 0.48, -hPx * 0.32);
  ctx.lineTo(wPx * 0.32, -hPx * 0.32);
  ctx.lineTo(wPx * 0.5, -hPx * 0.24);
  ctx.lineTo(wPx * 0.52, hPx * 0.15);
  ctx.lineTo(-wPx * 0.48, hPx * 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Specular highlight strip
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.beginPath();
  ctx.roundRect(-wPx * 0.44, -hPx * 0.28, wPx * 0.9, hPx * 0.09, 4);
  ctx.fill();

  // White Mountain Graphic Decal on Side Door (Matching Offroad Jeep in Reference Image)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.beginPath();
  ctx.moveTo(-wPx * 0.18, hPx * 0.12);
  ctx.lineTo(-wPx * 0.05, -hPx * 0.18);
  ctx.lineTo(wPx * 0.03, -hPx * 0.02);
  ctx.lineTo(wPx * 0.12, -hPx * 0.22);
  ctx.lineTo(wPx * 0.24, hPx * 0.12);
  ctx.closePath();
  ctx.fill();

  // 6. Black Offroad Fender Flares
  ctx.fillStyle = '#18181B';
  ctx.strokeStyle = '#090D16';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-wPx * 0.36, hPx * 0.2, scale * 0.44, Math.PI * 1.08, Math.PI * 1.92);
  ctx.lineTo(-wPx * 0.12, hPx * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(wPx * 0.36, hPx * 0.2, scale * 0.44, Math.PI * 1.08, Math.PI * 1.92);
  ctx.lineTo(wPx * 0.52, hPx * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 7. Detachable Front Winch Bumper, Red Tow Hook & Glowing Headlight
  if (!bumperDetached) {
    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(wPx * 0.48, hPx * 0.02, scale * 0.24, scale * 0.18, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#EF4444';
    ctx.fillRect(wPx * 0.54, hPx * 0.06, scale * 0.1, scale * 0.08);
  }

  ctx.fillStyle = '#FEF08A';
  ctx.beginPath();
  ctx.arc(wPx * 0.5, -hPx * 0.12, scale * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

export function drawDetailedWheelSprite(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wy: number,
  rPx: number,
  angle: number,
  vehicleId?: string
): void {
  ctx.save();
  ctx.translate(wx, wy);
  ctx.rotate(angle);

  // 1. Aggressive Outer Mud-Terrain Knobby Lugs
  const lugs = vehicleId === 'monster' ? 16 : 14;
  ctx.fillStyle = '#18181B';
  for (let i = 0; i < lugs; i++) {
    const a = (i / lugs) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.roundRect(rPx * 0.82, -rPx * 0.11, rPx * 0.22, rPx * 0.22, 2);
    ctx.fill();
    ctx.restore();
  }

  // 2. Main Tire Sidewall
  const tireGrad = ctx.createRadialGradient(0, 0, rPx * 0.45, 0, 0, rPx * 0.96);
  tireGrad.addColorStop(0, '#3F3F46');
  tireGrad.addColorStop(0.6, '#18181B');
  tireGrad.addColorStop(1, '#09090B');
  ctx.fillStyle = tireGrad;
  ctx.beginPath();
  ctx.arc(0, 0, rPx * 0.92, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#52525B';
  ctx.lineWidth = Math.max(1.5, rPx * 0.05);
  ctx.beginPath();
  ctx.arc(0, 0, rPx * 0.72, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Metallic Alloy Rim (Purple beadlock for Monster Truck, Wire-Spoke for Dirt Bike)
  const rimGrad = ctx.createLinearGradient(-rPx * 0.5, -rPx * 0.5, rPx * 0.5, rPx * 0.5);
  if (vehicleId === 'monster') {
    rimGrad.addColorStop(0, '#C084FC');
    rimGrad.addColorStop(0.5, '#7E22CE');
    rimGrad.addColorStop(1, '#3B0764');
  } else {
    rimGrad.addColorStop(0, '#F8FAFC');
    rimGrad.addColorStop(0.5, '#94A3B8');
    rimGrad.addColorStop(1, '#475569');
  }
  ctx.fillStyle = rimGrad;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, rPx * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#1E293B';
  ctx.beginPath();
  ctx.arc(0, 0, rPx * 0.44, 0, Math.PI * 2);
  ctx.fill();

  // 4. 6 Metallic Spokes
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = Math.max(2.5, rPx * 0.13);
  for (let sp = 0; sp < 6; sp++) {
    const a = (sp / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * rPx * 0.48, Math.sin(a) * rPx * 0.48);
    ctx.stroke();
  }

  // 5. Center Hubcap
  ctx.fillStyle = '#334155';
  ctx.beginPath();
  ctx.arc(0, 0, rPx * 0.19, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = vehicleId === 'monster' ? '#A855F7' : '#EF4444';
  ctx.beginPath();
  ctx.arc(0, 0, rPx * 0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
