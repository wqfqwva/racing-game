export interface CarInfo {
  id: number;
  name: string;
  subtitle: string;
  price: number;
  bodyColor: string;
  accentColor: string;
  glowColor: string;
  baseSpeed: number;
  baseAccel: number;
  baseHandling: number;
  baseNitro: number;
  baseHp: number;
}

export interface UpgradeInfo {
  key: 'speed' | 'handling' | 'nitro' | 'armor';
  name: string;
  desc: string;
  baseCost: number;
}

export interface SaveData {
  highScore: number;
  coins: number;
  selectedCar: number;
  unlockedCars: number[];
  upgrades: {
    speed: number;
    handling: number;
    nitro: number;
    armor: number;
  };
}

export const SCREEN_WIDTH = 900;
export const SCREEN_HEIGHT = 750;
export const ROAD_LEFT = 170;
export const ROAD_RIGHT = 730;
export const ROAD_WIDTH = ROAD_RIGHT - ROAD_LEFT;
export const NUM_LANES = 5;
export const LANE_WIDTH = ROAD_WIDTH / NUM_LANES;

export const HYUNDAI_BLUE = '#002C5F';
export const PERFORMANCE_BLUE = '#5FA8D3';
export const N_RED = '#E6322D';

export const CAR_CATALOG: CarInfo[] = [
  {
    id: 0,
    name: 'AVANTE N (아반떼 N)',
    subtitle: '현대 N 시그니처 퍼포먼스 블루 스포츠 세단',
    price: 0,
    bodyColor: '#5FA8D3',    // N 퍼포먼스 블루
    accentColor: '#E6322D',  // N 시그니처 레드 스플리터
    glowColor: '#55CDFF',
    baseSpeed: 1.0,
    baseAccel: 1.0,
    baseHandling: 1.0,
    baseNitro: 1.0,
    baseHp: 3,
  },
  {
    id: 1,
    name: 'IONIQ 5 N (아이오닉 5 N)',
    subtitle: 'N 드리프트 옵티마이저 & 듀얼 모터 고성능 EV',
    price: 250,
    bodyColor: '#F55F23',    // 소울트로닉 오렌지 펄
    accentColor: '#EBF0FA', // 파라메트릭 픽셀 화이트
    glowColor: '#FF8C32',
    baseSpeed: 1.07,
    baseAccel: 1.12,
    baseHandling: 1.25,
    baseNitro: 1.20,
    baseHp: 3,
  },
  {
    id: 2,
    name: 'RN24 롤링랩 (Rolling Lab)',
    subtitle: '차세대 전동화 N 익스트림 고강성 테스트카',
    price: 550,
    bodyColor: '#2D5FC3',    // 현대 모터스포츠 딥 블루
    accentColor: '#E6322D',  // N 레드 액센트
    glowColor: '#5FAFFF',
    baseSpeed: 1.14,
    baseAccel: 1.14,
    baseHandling: 1.10,
    baseNitro: 1.35,
    baseHp: 4,
  },
  {
    id: 3,
    name: 'N Vision 74 (N 비전 74)',
    subtitle: '포니 쿠페 헤리티지 수소 하이브리드 슈퍼카',
    price: 1000,
    bodyColor: '#C3CDDA',    // 헤리티지 매트 실버
    accentColor: '#00EBFF',  // 파라메트릭 픽셀 사이버 시안
    glowColor: '#3CEBFF',
    baseSpeed: 1.26,
    baseAccel: 1.26,
    baseHandling: 1.24,
    baseNitro: 1.38,
    baseHp: 4,
  },
];

export const UPGRADE_INFO: UpgradeInfo[] = [
  {
    key: 'speed',
    name: 'PE 시스템 듀얼 모터',
    desc: '현대 E-GMP 고출력 모터로 최고 속도 및 가속력 증가',
    baseCost: 80,
  },
  {
    key: 'handling',
    name: 'N 드리프트 옵티마이저',
    desc: 'e-LSD 및 토크 킥 제어로 드리프트 NGB 충전율 향상',
    baseCost: 80,
  },
  {
    key: 'nitro',
    name: 'N 그린 부스트 (NGB)',
    desc: '오버부스트 출력 지속 시간 및 게이지 충전 효율 증가',
    baseCost: 90,
  },
  {
    key: 'armor',
    name: '초고장력강(AHSS) 섀시',
    desc: '현대제철 초고장력강 차체로 최대 내구도(HP) 증가',
    baseCost: 150,
  },
];

export const DEFAULT_SAVE_DATA: SaveData = {
  highScore: 0,
  coins: 0,
  selectedCar: 0,
  unlockedCars: [0],
  upgrades: {
    speed: 1,
    handling: 1,
    nitro: 1,
    armor: 1,
  },
};
