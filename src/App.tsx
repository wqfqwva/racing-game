import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Trophy,
  Zap,
  Shield,
  Magnet,
  Wrench,
  Car,
  Flame,
  RotateCcw,
  Play,
  Pause,
  HelpCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Coins,
  Gauge,
  Sparkles,
} from 'lucide-react';
import { sound } from './audio';
import { drawPlayerSupercar } from './carGraphics';
import { GameEngine, GameStats, InputState } from './gameEngine';
import {
  CAR_CATALOG,
  DEFAULT_SAVE_DATA,
  HYUNDAI_BLUE,
  N_RED,
  PERFORMANCE_BLUE,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  SaveData,
  UPGRADE_INFO,
} from './types';

const STORAGE_KEY = 'hyundai_n_highway_racer_save_v1';

export default function App() {
  // Game states: MENU | PLAYING | PAUSED | GARAGE | GAMEOVER
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'PAUSED' | 'GARAGE' | 'GAMEOVER'>('MENU');
  const [saveData, setSaveData] = useState<SaveData>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...DEFAULT_SAVE_DATA, ...JSON.parse(stored) };
    } catch {
      // fallback
    }
    return DEFAULT_SAVE_DATA;
  });

  const [bgmOn, setBgmOn] = useState(true);
  const [sfxOn, setSfxOn] = useState(true);
  const [garageTab, setGarageTab] = useState<'CARS' | 'UPGRADES'>('CARS');
  const [selectedPreviewCar, setSelectedPreviewCar] = useState(saveData.selectedCar);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: saveData.highScore,
    distanceKm: 0,
    runCoins: 0,
    totalCoins: saveData.coins,
    smashedCars: 0,
    nearMisses: 0,
    speedKmh: 0,
    nitroGauge: 0,
    isBoosting: false,
    hp: 3,
    maxHp: 3,
    shieldTimer: 0,
    magnetTimer: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Keyboard & Touch input tracker
  const inputRef = useRef<InputState>({
    steerLeft: false,
    steerRight: false,
    accelerate: false,
    brake: false,
    drift: false,
    boost: false,
  });

  // Save changes to localStorage
  const updateSaveData = useCallback((updater: (prev: SaveData) => SaveData) => {
    setSaveData(prev => {
      const next = updater(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Initialize or reset game engine
  const startNewRace = useCallback(() => {
    sound.playClick();
    sound.startBGM();

    const engine = new GameEngine(saveData);
    engine.onGameOver = finalStats => {
      setStats(finalStats);
      updateSaveData(prev => ({
        ...prev,
        highScore: Math.max(prev.highScore, finalStats.score),
        coins: prev.coins + finalStats.runCoins,
      }));
      setGameState('GAMEOVER');
    };
    engine.isRunning = true;
    engineRef.current = engine;
    lastTimeRef.current = performance.now();
    setGameState('PLAYING');
  }, [saveData, updateSaveData]);

  // Main Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let mounted = true;

    const loop = (timestamp: number) => {
      if (!mounted) return;

      const dt = Math.min(0.05, (timestamp - (lastTimeRef.current || timestamp)) / 1000);
      lastTimeRef.current = timestamp;

      const engine = engineRef.current;
      if (engine && gameState === 'PLAYING') {
        engine.update(dt, inputRef.current);
        setStats(engine.getStats());
      }

      ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      if (engine) {
        engine.render(ctx);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      mounted = false;
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [gameState]);

  // Keyboard controls listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle audio
      if (e.key === 'm' || e.key === 'M') {
        const next = sound.toggleBGM();
        setBgmOn(next);
        return;
      }

      if (gameState === 'PLAYING') {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          inputRef.current.steerLeft = true;
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          inputRef.current.steerRight = true;
        } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          inputRef.current.accelerate = true;
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          inputRef.current.brake = true;
        } else if (e.key === 'Shift' || e.key === 'x' || e.key === 'X') {
          inputRef.current.drift = true;
        } else if (e.key === ' ' || e.key === 'z' || e.key === 'Z') {
          inputRef.current.boost = true;
        } else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
          sound.playClick();
          setGameState('PAUSED');
        }
      } else if (gameState === 'PAUSED') {
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
          sound.playClick();
          lastTimeRef.current = performance.now();
          setGameState('PLAYING');
        }
      } else if (gameState === 'MENU') {
        if (e.key === 'Enter' || e.key === ' ') {
          startNewRace();
        } else if (e.key === 'g' || e.key === 'G') {
          sound.playClick();
          setSelectedPreviewCar(saveData.selectedCar);
          setGameState('GARAGE');
        }
      } else if (gameState === 'GAMEOVER') {
        if (e.key === 'Enter' || e.key === 'r' || e.key === 'R' || e.key === ' ') {
          startNewRace();
        } else if (e.key === 'g' || e.key === 'G') {
          sound.playClick();
          setSelectedPreviewCar(saveData.selectedCar);
          setGameState('GARAGE');
        } else if (e.key === 'Escape') {
          sound.playClick();
          setGameState('MENU');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        inputRef.current.steerLeft = false;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        inputRef.current.steerRight = false;
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        inputRef.current.accelerate = false;
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        inputRef.current.brake = false;
      } else if (e.key === 'Shift' || e.key === 'x' || e.key === 'X') {
        inputRef.current.drift = false;
      } else if (e.key === ' ' || e.key === 'z' || e.key === 'Z') {
        inputRef.current.boost = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, startNewRace, saveData.selectedCar]);

  // Car preview canvas rendering helper
  const drawCarPreview = (carId: number, canvasEl: HTMLCanvasElement | null) => {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    const car = CAR_CATALOG[carId];
    if (!car) return;

    ctx.save();
    ctx.translate(canvasEl.width / 2, canvasEl.height / 2);
    drawPlayerSupercar(ctx, 58, 108, car.bodyColor, car.accentColor, car.glowColor, false);
    ctx.restore();
  };

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (gameState === 'GARAGE' || gameState === 'MENU') {
      drawCarPreview(selectedPreviewCar, previewCanvasRef.current);
    }
  }, [gameState, selectedPreviewCar]);

  const activeCar = CAR_CATALOG[saveData.selectedCar] || CAR_CATALOG[0];
  const previewCar = CAR_CATALOG[selectedPreviewCar] || CAR_CATALOG[0];
  const isPreviewUnlocked = saveData.unlockedCars.includes(previewCar.id);
  const isPreviewSelected = saveData.selectedCar === previewCar.id;

  // Upgrade handler
  const handleUpgrade = (key: 'speed' | 'handling' | 'nitro' | 'armor', baseCost: number) => {
    const currentLv = saveData.upgrades[key];
    const cost = baseCost * currentLv;
    if (currentLv < 5 && saveData.coins >= cost) {
      sound.playPowerup();
      updateSaveData(prev => ({
        ...prev,
        coins: prev.coins - cost,
        upgrades: {
          ...prev.upgrades,
          [key]: currentLv + 1,
        },
      }));
    } else {
      sound.playClick();
    }
  };

  // Car buy/select handler
  const handleCarAction = (carId: number) => {
    const car = CAR_CATALOG[carId];
    if (saveData.unlockedCars.includes(carId)) {
      sound.playPowerup();
      updateSaveData(prev => ({ ...prev, selectedCar: carId }));
    } else if (saveData.coins >= car.price) {
      sound.playPowerup();
      updateSaveData(prev => ({
        ...prev,
        coins: prev.coins - car.price,
        unlockedCars: [...prev.unlockedCars, carId],
        selectedCar: carId,
      }));
    } else {
      sound.playClick();
    }
  };

  return (
    <div className="relative w-screen h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Top Header Bar */}
      <header className="z-30 w-full h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#002C5F] border border-[#5FA8D3]/40 flex items-center justify-center font-bold text-white shadow-inner">
            N
          </div>
          <div>
            <span className="font-extrabold tracking-wider text-sm sm:text-base text-white">
              HYUNDAI <span className="text-[#5FA8D3]">N</span>
            </span>
            <span className="hidden sm:inline-block text-xs text-slate-400 ml-2">
              HIGHWAY RACER
            </span>
          </div>
        </div>

        {/* Currency & Quick Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 font-bold text-sm">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>${saveData.coins.toLocaleString()}</span>
          </div>

          <button
            onClick={() => {
              const next = sound.toggleBGM();
              setBgmOn(next);
            }}
            title="BGM 토글 (M)"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            {bgmOn ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          <button
            onClick={() => setShowHowToPlay(true)}
            title="게임 가이드 및 기믹 설명"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {gameState === 'PLAYING' && (
            <button
              onClick={() => {
                sound.playClick();
                setGameState('PAUSED');
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>일시정지</span>
            </button>
          )}

          {gameState !== 'PLAYING' && (
            <button
              onClick={() => {
                sound.playClick();
                setSelectedPreviewCar(saveData.selectedCar);
                setGameState(gameState === 'GARAGE' ? 'MENU' : 'GARAGE');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                gameState === 'GARAGE'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-[#002C5F] hover:bg-[#00387a] text-white'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              <span>{gameState === 'GARAGE' ? '메뉴로' : 'N 차고/튜닝'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Game Screen & Canvas Viewport */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-slate-950">
        {/* The 2D Canvas */}
        <canvas
          ref={canvasRef}
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          className="max-w-full max-h-full object-contain rounded-md shadow-2xl bg-[#161e2a]"
        />

        {/* ------------------------------------------------------------------ */}
        {/* IN-GAME HUD OVERLAYS (When playing) */}
        {/* ------------------------------------------------------------------ */}
        {gameState === 'PLAYING' && (
          <>
            {/* Top Center NGB Ready / Boosting Alert */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none text-center">
              {stats.isBoosting ? (
                <div className="px-5 py-2 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white font-extrabold text-sm sm:text-base rounded-full shadow-lg shadow-red-500/30 animate-pulse border border-yellow-300">
                  ⚡ [NGB] N 그린 부스트 질주 중! 전방 차량을 격파하세요! ⚡
                </div>
              ) : stats.nitroGauge >= 30.0 ? (
                <div className="px-4 py-1.5 bg-cyan-950/90 text-cyan-300 border border-cyan-400 font-bold text-xs sm:text-sm rounded-full shadow-md animate-bounce">
                  [SPACE / 터치] N 그린 부스트(NGB) 발동 가능! (차량 격파 & 연쇄 추돌)
                </div>
              ) : null}
            </div>

            {/* Left Scoreboard Panel */}
            <div className="absolute top-4 left-4 w-44 bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 shadow-xl backdrop-blur-sm pointer-events-none text-xs">
              <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-800 text-[#5FA8D3] font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E6322D]"></span>
                <span>HMG RACE TELEMETRY</span>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="text-slate-400">점수 (SCORE)</div>
                  <div className="text-xl font-extrabold text-white tabular-nums tracking-wide">
                    {stats.score.toLocaleString()}
                  </div>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">최고 기록</span>
                  <span className="font-bold text-amber-400 tabular-nums">
                    {stats.highScore.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">차량 격파</span>
                  <span className="font-bold text-orange-400 tabular-nums">
                    {stats.smashedCars}대
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">주행 거리</span>
                  <span className="font-bold text-cyan-400 tabular-nums">
                    {stats.distanceKm.toFixed(2)} km
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">획득 코인</span>
                  <span className="font-bold text-yellow-400 tabular-nums">
                    +${stats.runCoins}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Speedometer & NGB Booster Panel */}
            <div className="absolute top-4 right-4 w-44 bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 shadow-xl backdrop-blur-sm pointer-events-none text-xs">
              {/* Digital Speedometer */}
              <div className="text-center pb-2 border-b border-slate-800">
                <div className="text-slate-400 text-[10px]">CURRENT SPEED</div>
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`text-3xl font-extrabold tabular-nums ${stats.isBoosting ? 'text-cyan-400 animate-pulse' : stats.speedKmh > 240 ? 'text-orange-400' : 'text-white'}`}>
                    {stats.speedKmh}
                  </span>
                  <span className="text-slate-400 font-semibold">km/h</span>
                </div>
              </div>

              {/* NGB Button & Gauge */}
              <div className="mt-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-300 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-red-500" /> NGB 부스트
                  </span>
                  <span className={`font-extrabold ${stats.nitroGauge >= 30 ? 'text-cyan-400' : 'text-slate-500'}`}>
                    {Math.floor(stats.nitroGauge)}%
                  </span>
                </div>

                {/* Gauge Bar with 30% indicator line */}
                <div className="relative w-full h-3.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className={`h-full transition-all duration-75 rounded-full ${
                      stats.isBoosting
                        ? 'bg-gradient-to-r from-red-600 via-amber-400 to-cyan-400'
                        : stats.nitroGauge >= 100
                        ? 'bg-amber-400 shadow-[0_0_10px_#ffd732]'
                        : stats.nitroGauge >= 30
                        ? 'bg-[#5FA8D3]'
                        : 'bg-blue-700'
                    }`}
                    style={{ width: `${stats.nitroGauge}%` }}
                  />
                  {/* 30% Threshold marker */}
                  <div className="absolute top-0 bottom-0 left-[30%] w-[2px] bg-red-500/80 pointer-events-none" />
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>드리프트: 급속충전</span>
                  <span>스치기: +18%</span>
                </div>
              </div>

              {/* Health Durability HP Pips */}
              <div className="mt-2.5 pt-2 border-t border-slate-800">
                <div className="text-[10px] text-slate-400 mb-1">차체 내구도 (HP)</div>
                <div className="flex gap-1.5">
                  {Array.from({ length: stats.maxHp }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-3 rounded-sm border ${
                        i < stats.hp
                          ? 'bg-[#E6322D] border-red-400 shadow-[0_0_6px_#e6322d]'
                          : 'bg-slate-800 border-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Active Buffs */}
              {(stats.shieldTimer > 0 || stats.magnetTimer > 0) && (
                <div className="mt-2 pt-2 border-t border-slate-800 space-y-1 text-[11px]">
                  {stats.shieldTimer > 0 && (
                    <div className="text-cyan-400 flex items-center gap-1 font-semibold">
                      <Shield className="w-3 h-3" /> 보호막 {stats.shieldTimer.toFixed(1)}s
                    </div>
                  )}
                  {stats.magnetTimer > 0 && (
                    <div className="text-purple-400 flex items-center gap-1 font-semibold">
                      <Magnet className="w-3 h-3" /> 자석 {stats.magnetTimer.toFixed(1)}s
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Floating Hint */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 rounded-full text-slate-300 text-xs pointer-events-none hidden sm:block">
              드리프트(SHIFT) / 아슬아슬 회피로 게이지 충전 ➔ 부스터(SPACE)로 전방 차량 격파!
            </div>
          </>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TITLE / MENU MODAL */}
        {/* ------------------------------------------------------------------ */}
        {gameState === 'MENU' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-4 z-20">
            {/* Header Badge */}
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#002C5F] border border-[#5FA8D3]/50 text-xs font-bold text-[#aad2f5] mb-3 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-[#E6322D]"></span>
              <span>HYUNDAI MOTOR COMPANY · N DRIVING EXPERIENCE</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white text-center">
              HYUNDAI <span className="text-[#5FA8D3]">N</span> : HIGHWAY RACER
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 mb-6 text-center max-w-md">
              현대자동차 고성능 N 라인업 드리프트 & NGB 디스트로이어
            </p>

            {/* Selected Car Showcase Card */}
            <div className="w-full max-w-md bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 mb-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#5FA8D3] via-[#E6322D] to-[#5FA8D3]" />

              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">출전 슈퍼카</span>
                <span className="text-xs font-bold text-cyan-400">
                  최고기록: {saveData.highScore.toLocaleString()} pts
                </span>
              </div>

              <div className="flex items-center justify-center my-3">
                <canvas ref={previewCanvasRef} width={180} height={140} className="object-contain" />
              </div>

              <div className="text-center">
                <div className="text-lg font-extrabold text-white">{activeCar.name}</div>
                <div className="text-xs text-slate-400 mt-1">{activeCar.subtitle}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800 text-xs">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">PE 모터 출력</span>
                  <span className="font-bold text-cyan-300">{(activeCar.baseSpeed * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">N 코너링/드리프트</span>
                  <span className="font-bold text-cyan-300">{(activeCar.baseHandling * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">N 그린 부스트</span>
                  <span className="font-bold text-amber-300">{(activeCar.baseNitro * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">차체 내구도</span>
                  <span className="font-bold text-red-400">{activeCar.baseHp} HP</span>
                </div>
              </div>
            </div>

            {/* Menu Buttons */}
            <div className="w-full max-w-md space-y-2.5">
              <button
                onClick={startNewRace}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-base rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>주행 시작 (START RACE)</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setSelectedPreviewCar(saveData.selectedCar);
                  setGameState('GARAGE');
                }}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Car className="w-4 h-4 text-cyan-400" />
                <span>남양연구소 N 차고 & 튜닝 (보유: ${saveData.coins})</span>
              </button>

              <button
                onClick={() => setShowHowToPlay(true)}
                className="w-full py-2.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <HelpCircle className="w-4 h-4" />
                <span>게임 조작법 & 3대 기믹 안내</span>
              </button>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* GARAGE & TUNING MODAL */}
        {/* ------------------------------------------------------------------ */}
        {gameState === 'GARAGE' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-lg flex flex-col p-4 sm:p-6 z-20 overflow-y-auto">
            {/* Garage Header */}
            <div className="w-full max-w-4xl mx-auto flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#002C5F] border border-[#5FA8D3] flex items-center justify-center font-extrabold text-white text-lg">
                  N
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">현대자동차 남양연구소 N 차고</h2>
                  <p className="text-xs text-slate-400">HMG 고성능 모빌리티 라인업 & N 퍼포먼스 부품 튜닝</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 font-extrabold text-sm flex items-center gap-1.5">
                  <Coins className="w-4 h-4" />
                  <span>${saveData.coins.toLocaleString()}</span>
                </div>
                <button
                  onClick={() => {
                    sound.playClick();
                    setGameState('MENU');
                  }}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Garage Tabs */}
            <div className="w-full max-w-4xl mx-auto flex gap-2 mb-5">
              <button
                onClick={() => {
                  sound.playClick();
                  setGarageTab('CARS');
                }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
                  garageTab === 'CARS'
                    ? 'bg-[#002C5F] border-[#5FA8D3] text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Car className="w-4 h-4" />
                <span>현대 N 라인업 선택 / 구매</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setGarageTab('UPGRADES');
                }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-all ${
                  garageTab === 'UPGRADES'
                    ? 'bg-[#002C5F] border-[#5FA8D3] text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>N 퍼포먼스 튜닝 연구소</span>
              </button>
            </div>

            {/* Content Tab 1: Car Selection */}
            {garageTab === 'CARS' && (
              <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 items-center">
                {/* Visual Showcase */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-xl min-h-[300px]">
                  <div className="flex items-center justify-between w-full mb-3">
                    <button
                      onClick={() => {
                        sound.playClick();
                        setSelectedPreviewCar(prev => (prev - 1 + CAR_CATALOG.length) % CAR_CATALOG.length);
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-xs font-bold text-slate-400">
                      {selectedPreviewCar + 1} / {CAR_CATALOG.length}
                    </span>
                    <button
                      onClick={() => {
                        sound.playClick();
                        setSelectedPreviewCar(prev => (prev + 1) % CAR_CATALOG.length);
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="my-auto py-2">
                    <canvas ref={previewCanvasRef} width={220} height={170} className="object-contain" />
                  </div>

                  <div className="text-center w-full mt-2">
                    <div className="text-xl font-black text-white">{previewCar.name}</div>
                    <div className="text-xs text-[#5FA8D3] font-medium mt-1">{previewCar.subtitle}</div>
                  </div>
                </div>

                {/* Specs & Buy / Select */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
                  <div>
                    <div className="text-sm font-bold text-slate-400 mb-4 pb-2 border-b border-slate-800">
                      차량 제원 및 퍼포먼스 지표
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-300 font-semibold">PE 고출력 모터 최고속도</span>
                          <span className="font-bold text-cyan-400">{(previewCar.baseSpeed * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 rounded-full"
                            style={{ width: `${(previewCar.baseSpeed / 1.35) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-300 font-semibold">가속력 (런치 컨트롤)</span>
                          <span className="font-bold text-cyan-400">{(previewCar.baseAccel * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 rounded-full"
                            style={{ width: `${(previewCar.baseAccel / 1.35) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-300 font-semibold">N 코너링 및 드리프트 충전 효율</span>
                          <span className="font-bold text-cyan-400">{(previewCar.baseHandling * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 rounded-full"
                            style={{ width: `${(previewCar.baseHandling / 1.35) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-300 font-semibold">N 그린 부스트 (NGB) 위력</span>
                          <span className="font-bold text-amber-400">{(previewCar.baseNitro * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${(previewCar.baseNitro / 1.45) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-slate-300 font-semibold">기본 내구도 (Max HP)</span>
                          <span className="font-bold text-red-400">{previewCar.baseHp} HP</span>
                        </div>
                        <div className="flex gap-1.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={`flex-1 h-2 rounded-sm ${
                                i < previewCar.baseHp ? 'bg-red-500' : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-6 pt-4 border-t border-slate-800">
                    {isPreviewSelected ? (
                      <div className="w-full py-3.5 bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 font-extrabold text-sm rounded-xl text-center">
                        ✓ 현재 출전 차량으로 장착됨
                      </div>
                    ) : isPreviewUnlocked ? (
                      <button
                        onClick={() => handleCarAction(previewCar.id)}
                        className="w-full py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-cyan-900/40 transition-all active:scale-[0.99]"
                      >
                        이 차량으로 출전하기
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCarAction(previewCar.id)}
                        disabled={saveData.coins < previewCar.price}
                        className={`w-full py-3.5 font-extrabold text-sm rounded-xl shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2 ${
                          saveData.coins >= previewCar.price
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-900/40'
                            : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                        }`}
                      >
                        <Coins className="w-4 h-4" />
                        <span>차량 구매하기 (${previewCar.price.toLocaleString()})</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Content Tab 2: Upgrades */}
            {garageTab === 'UPGRADES' && (
              <div className="w-full max-w-4xl mx-auto space-y-3.5">
                {UPGRADE_INFO.map(upg => {
                  const lv = saveData.upgrades[upg.key];
                  const cost = upg.baseCost * lv;
                  const isMax = lv >= 5;
                  const canAfford = saveData.coins >= cost;

                  return (
                    <div
                      key={upg.key}
                      className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg transition-all"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-extrabold text-base text-white">{upg.name}</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-cyan-400 font-bold text-xs border border-slate-700">
                            Lv. {lv} / 5
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{upg.desc}</p>

                        {/* Level pip bar */}
                        <div className="flex gap-1.5 mt-3 max-w-[200px]">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={`flex-1 h-2 rounded-sm ${
                                i < lv ? 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]' : 'bg-slate-800'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isMax ? (
                          <div className="px-5 py-2.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-extrabold text-xs rounded-xl text-center">
                            MAX 완료
                          </div>
                        ) : (
                          <button
                            onClick={() => handleUpgrade(upg.key, upg.baseCost)}
                            disabled={!canAfford}
                            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-[0.98] ${
                              canAfford
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-900/30'
                                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            }`}
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>강화하기 (${cost.toLocaleString()})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* GAME OVER MODAL */}
        {/* ------------------------------------------------------------------ */}
        {gameState === 'GAMEOVER' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-20">
            <div className="w-full max-w-md bg-slate-900/95 border border-red-500/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse" />

              <div className="text-center mb-5">
                <span className="text-xs font-bold text-red-400 tracking-widest uppercase">Race Result</span>
                <h2 className="text-3xl font-black text-white mt-1">RACE OVER</h2>
              </div>

              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 mb-6 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">최종 점수</span>
                  <span className="text-xl font-extrabold text-white tabular-nums">
                    {stats.score.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">최고 기록</span>
                  <span className="font-bold text-amber-400 tabular-nums">
                    {saveData.highScore.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">주행 거리</span>
                  <span className="font-semibold text-cyan-400 tabular-nums">
                    {stats.distanceKm.toFixed(2)} km
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">격파한 차량 수</span>
                  <span className="font-semibold text-orange-400 tabular-nums">
                    {stats.smashedCars}대
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">슬립스트림 회피</span>
                  <span className="font-semibold text-cyan-400 tabular-nums">
                    {stats.nearMisses}회
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                  <span className="text-slate-400">획득 코인</span>
                  <span className="font-extrabold text-yellow-400 tabular-nums">
                    +${stats.runCoins} (총 ${saveData.coins.toLocaleString()})
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <button
                  onClick={startNewRace}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>다시 달리기 (RETRY)</span>
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setSelectedPreviewCar(saveData.selectedCar);
                      setGameState('GARAGE');
                    }}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <Car className="w-3.5 h-3.5 text-cyan-400" />
                    <span>차고 / 튜닝</span>
                  </button>
                  <button
                    onClick={() => {
                      sound.playClick();
                      setGameState('MENU');
                    }}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
                  >
                    메인 메뉴
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* PAUSE MODAL */}
        {/* ------------------------------------------------------------------ */}
        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-20">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center">
              <h3 className="text-2xl font-black text-white mb-2">PAUSED (일시정지)</h3>
              <p className="text-xs text-slate-400 mb-6">주행이 일시 중지되었습니다.</p>

              <div className="space-y-2.5">
                <button
                  onClick={() => {
                    sound.playClick();
                    lastTimeRef.current = performance.now();
                    setGameState('PLAYING');
                  }}
                  className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-sm rounded-xl flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>계속하기 (RESUME)</span>
                </button>

                <button
                  onClick={startNewRace}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>처음부터 다시하기</span>
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    setGameState('MENU');
                  }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-semibold text-xs rounded-xl"
                >
                  메인 메뉴로 나가기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* HOW TO PLAY / GIMMICK GUIDE MODAL */}
        {/* ------------------------------------------------------------------ */}
        {showHowToPlay && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-30">
            <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-red-500" />
                  <h3 className="font-black text-lg text-white">현대 N 레이서 조작법 & 3대 핵심 기믹</h3>
                </div>
                <button
                  onClick={() => setShowHowToPlay(false)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-slate-300">
                {/* Controls */}
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <div className="font-bold text-white text-sm mb-2 text-[#5FA8D3]">기본 조작키</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-white font-bold">A / D</span> 또는 <span className="text-white font-bold">← / →</span>: 조향(차선 이동)</div>
                    <div><span className="text-white font-bold">W / S</span> 또는 <span className="text-white font-bold">↑ / ↓</span>: 가속 / 감속</div>
                    <div><span className="text-white font-bold">SHIFT / X</span>: 드리프트 차징</div>
                    <div><span className="text-white font-bold">SPACE / Z</span>: N 그린 부스트 발동!</div>
                  </div>
                </div>

                {/* Gimmick 1 */}
                <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40">
                  <div className="font-bold text-cyan-300 mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    기믹 1: N 드리프트 부스터 충전 (DRIFT CHARGE)
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    핸들을 꺾으면서 <strong>SHIFT</strong> 또는 <strong>X</strong>를 누르면 타이어 스퀴크와 함께 드리프트를 시작합니다. 드리프트 중에는 N 그린 부스트 게이지가 초당 24%씩 초고속 충전됩니다!
                  </p>
                </div>

                {/* Gimmick 2 */}
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40">
                  <div className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    기믹 2: 슬립스트림 스치기 (NEAR MISS)
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    다른 차량 바로 옆을 고속으로 아슬아슬하게 스쳐 지나가면 번개 아크가 연결되며 <strong>부스터 게이지가 즉시 +18% 충전</strong>되고 보너스 점수를 획득합니다!
                  </p>
                </div>

                {/* Gimmick 3 */}
                <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-800/40">
                  <div className="font-bold text-red-300 mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400"></span>
                    기믹 3: N 그린 부스트(NGB) 파괴 질주 & 연쇄 추돌
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    게이지가 <strong>30% 이상</strong>일 때 <strong>SPACE</strong>를 누르면 트윈 애프터버너와 전방 V자 플라즈마 범퍼가 전개됩니다! 부딪히는 모든 차량을 날려버리며, 날아간 차량이 다른 차들과 연쇄 충돌(CHAIN SMASH)을 일으켜 콤보 점수를 쌓습니다!
                  </p>
                </div>

                {/* Collectibles */}
                <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                  <div className="font-bold text-white text-sm mb-2 text-yellow-400">아이템 안내</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>🪙 <strong>골드 코인</strong>: 부스터 +4.5% & 코인</div>
                    <div>⚡ <strong>에너지 코어</strong>: 부스터 +45% 대량 충전</div>
                    <div>🛡️ <strong>순간 보호막</strong>: 1.0초간 무적 충돌 방어</div>
                    <div>🧲 <strong>코인 자석</strong>: 8.0초간 코인 자동 흡수</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 text-center">
                <button
                  onClick={() => setShowHowToPlay(false)}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
                >
                  확인 완료
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* ON-SCREEN MOBILE TOUCH CONTROLS (Only visible on touch / mobile) */}
      {/* -------------------------------------------------------------------- */}
      {gameState === 'PLAYING' && (
        <div className="md:hidden z-30 w-full bg-slate-950/90 border-t border-slate-800 p-3 shrink-0 flex items-center justify-between gap-2">
          {/* Steering buttons */}
          <div className="flex gap-2">
            <button
              onTouchStart={() => (inputRef.current.steerLeft = true)}
              onTouchEnd={() => (inputRef.current.steerLeft = false)}
              onMouseDown={() => (inputRef.current.steerLeft = true)}
              onMouseUp={() => (inputRef.current.steerLeft = false)}
              className="w-14 h-14 bg-slate-800 active:bg-slate-700 rounded-2xl flex items-center justify-center font-extrabold text-xl text-white shadow-md active:scale-95"
            >
              ◀
            </button>
            <button
              onTouchStart={() => (inputRef.current.steerRight = true)}
              onTouchEnd={() => (inputRef.current.steerRight = false)}
              onMouseDown={() => (inputRef.current.steerRight = true)}
              onMouseUp={() => (inputRef.current.steerRight = false)}
              className="w-14 h-14 bg-slate-800 active:bg-slate-700 rounded-2xl flex items-center justify-center font-extrabold text-xl text-white shadow-md active:scale-95"
            >
              ▶
            </button>
          </div>

          {/* Center Drift Button */}
          <button
            onTouchStart={() => (inputRef.current.drift = true)}
            onTouchEnd={() => (inputRef.current.drift = false)}
            onMouseDown={() => (inputRef.current.drift = true)}
            onMouseUp={() => (inputRef.current.drift = false)}
            className={`px-4 h-14 rounded-2xl font-black text-xs flex flex-col items-center justify-center border shadow-md active:scale-95 ${
              inputRef.current.drift
                ? 'bg-cyan-500 border-cyan-300 text-slate-950'
                : 'bg-slate-900 border-cyan-500/40 text-cyan-300'
            }`}
          >
            <Sparkles className="w-4 h-4 mb-0.5" />
            <span>DRIFT</span>
          </button>

          {/* Right NGB Boost & Brake/Gas */}
          <div className="flex items-center gap-2">
            <button
              onTouchStart={() => (inputRef.current.brake = true)}
              onTouchEnd={() => (inputRef.current.brake = false)}
              onMouseDown={() => (inputRef.current.brake = true)}
              onMouseUp={() => (inputRef.current.brake = false)}
              className="w-12 h-14 bg-slate-800 active:bg-slate-700 rounded-2xl flex items-center justify-center text-xs font-bold text-slate-300"
            >
              BRAKE
            </button>

            {/* Glowing NGB Button */}
            <button
              onClick={() => {
                inputRef.current.boost = true;
                setTimeout(() => (inputRef.current.boost = false), 200);
              }}
              className={`w-16 h-14 rounded-2xl font-black text-xs flex flex-col items-center justify-center border shadow-lg transition-all active:scale-95 ${
                stats.nitroGauge >= 30
                  ? 'bg-gradient-to-br from-red-600 to-amber-500 border-yellow-300 text-white animate-pulse shadow-red-500/50'
                  : 'bg-slate-900 border-slate-700 text-slate-500'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>NGB</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
