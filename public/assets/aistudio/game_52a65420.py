import math
import json
import os
import random
import sys
from array import array
import pygame
import asyncio

# ============================================================================
# 초기 설정 및 상수 정의
# ============================================================================
SCREEN_WIDTH = 900
SCREEN_HEIGHT = 750
FPS = 60

ROAD_LEFT = 170
ROAD_RIGHT = 730
ROAD_WIDTH = ROAD_RIGHT - ROAD_LEFT
NUM_LANES = 5
LANE_WIDTH = ROAD_WIDTH / NUM_LANES

SAVE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "save_data.json")

# 색상 팔레트
WHITE = (255, 255, 255)
BLACK = (15, 15, 20)
GRAY = (120, 125, 135)
DARK_GRAY = (45, 48, 56)
ASPHALT = (38, 40, 48)
RED = (235, 55, 65)
ORANGE = (255, 145, 40)
YELLOW = (255, 215, 50)
GREEN = (50, 215, 110)
CYAN = (45, 225, 255)
BLUE = (55, 125, 255)
PURPLE = (185, 75, 255)
PINK = (255, 70, 165)

# 현대자동차 시그니처 컬러
HYUNDAI_BLUE = (0, 44, 95)
PERFORMANCE_BLUE = (95, 168, 211)
N_RED = (230, 50, 45)

# 현대자동차 고성능 N & 미래 모빌리티 라인업 카탈로그
CAR_CATALOG = [
    {
        "id": 0,
        "name": "AVANTE N (아반떼 N)",
        "subtitle": "현대 N 시그니처 퍼포먼스 블루 스포츠 세단",
        "price": 0,
        "body_color": (95, 168, 211),    # N 퍼포먼스 블루
        "accent_color": (230, 50, 45),   # N 시그니처 레드 스플리터
        "glow_color": (85, 205, 255),
        "base_speed": 1.0,
        "base_accel": 1.0,
        "base_handling": 1.0,
        "base_nitro": 1.0,
        "base_hp": 3,
    },
    {
        "id": 1,
        "name": "IONIQ 5 N (아이오닉 5 N)",
        "subtitle": "N 드리프트 옵티마이저 & 듀얼 모터 고성능 EV",
        "price": 250,
        "body_color": (245, 95, 35),     # 소울트로닉 오렌지 펄
        "accent_color": (235, 240, 250), # 파라메트릭 픽셀 화이트
        "glow_color": (255, 140, 50),
        "base_speed": 1.07,
        "base_accel": 1.12,
        "base_handling": 1.25,
        "base_nitro": 1.20,
        "base_hp": 3,
    },
    {
        "id": 2,
        "name": "RN24 롤링랩 (Rolling Lab)",
        "subtitle": "차세대 전동화 N 익스트림 고강성 테스트카",
        "price": 550,
        "body_color": (45, 95, 195),     # 현대 모터스포츠 딥 블루
        "accent_color": (230, 50, 45),   # N 레드 액센트
        "glow_color": (95, 175, 255),
        "base_speed": 1.14,
        "base_accel": 1.14,
        "base_handling": 1.10,
        "base_nitro": 1.35,
        "base_hp": 4,
    },
    {
        "id": 3,
        "name": "N Vision 74 (N 비전 74)",
        "subtitle": "포니 쿠페 헤리티지 수소 하이브리드 슈퍼카",
        "price": 1000,
        "body_color": (195, 205, 218),   # 헤리티지 매트 실버
        "accent_color": (0, 235, 255),   # 파라메트릭 픽셀 사이버 시안
        "glow_color": (60, 235, 255),
        "base_speed": 1.26,
        "base_accel": 1.26,
        "base_handling": 1.24,
        "base_nitro": 1.38,
        "base_hp": 4,
    },
]

UPGRADE_INFO = [
    {"key": "speed", "name": "PE 시스템 듀얼 모터", "desc": "현대 E-GMP 고출력 모터로 최고 속도 및 가속력 증가", "base_cost": 80},
    {"key": "handling", "name": "N 드리프트 옵티마이저", "desc": "e-LSD 및 토크 킥 제어로 드리프트 NGB 충전율 향상", "base_cost": 80},
    {"key": "nitro", "name": "N 그린 부스트 (NGB)", "desc": "오버부스트 출력 지속 시간 및 게이지 충전 효율 증가", "base_cost": 90},
    {"key": "armor", "name": "초고장력강(AHSS) 섀시", "desc": "현대제철 초고장력강 차체로 최대 내구도(HP) 증가", "base_cost": 150},
]


# ============================================================================
# 프로시저럴 사운드 합성기 (외부 오디오 파일 없이 효과음 & BGM 생성)
# ============================================================================
class SoundManager:
    def __init__(self):
        self.enabled = True
        self.bgm_enabled = True
        self.sounds = {}
        self.bgm_channel = None
        try:
            pygame.mixer.init(frequency=22050, size=-16, channels=1, buffer=512)
            self._build_sounds()
        except Exception:
            self.enabled = False

    def _make_wave(self, samples):
        buf = array("h", [max(-32767, min(32767, int(s))) for s in samples])
        return pygame.mixer.Sound(buffer=buf)

    def _build_sounds(self):
        sr = 22050

        # 1. 코인 획득음
        coin_samples = []
        for i in range(int(sr * 0.16)):
            t = i / sr
            freq = 987.77 if t < 0.06 else 1318.51
            env = max(0.0, 1.0 - (t / 0.16)) ** 1.3
            val = math.sin(2 * math.pi * freq * t) * 0.6 + math.sin(4 * math.pi * freq * t) * 0.2
            coin_samples.append(val * env * 12000)
        self.sounds["coin"] = self._make_wave(coin_samples)

        # 2. 파워업 / 부스터 완충 알림음
        power_samples = []
        notes = [523.25, 659.25, 783.99, 1046.50]
        for i in range(int(sr * 0.28)):
            t = i / sr
            idx = min(3, int(t / 0.07))
            freq = notes[idx]
            env = max(0.0, 1.0 - (t / 0.28))
            val = math.sin(2 * math.pi * freq * t) + 0.3 * math.sin(4 * math.pi * freq * t)
            power_samples.append(val * env * 10500)
        self.sounds["powerup"] = self._make_wave(power_samples)

        # 3. 부스터(파괴 돌진) 발동음
        nitro_samples = []
        for i in range(int(sr * 0.38)):
            t = i / sr
            freq = 110 + 440 * (t / 0.38)
            noise = random.uniform(-0.5, 0.5)
            saw = 2.0 * ((t * freq) - math.floor(0.5 + t * freq))
            env = math.sin(math.pi * (t / 0.38))
            nitro_samples.append((saw * 0.65 + noise * 0.35) * env * 14000)
        self.sounds["nitro"] = self._make_wave(nitro_samples)

        # 4. 아슬아슬 회피 (기믹 충전) 효과음
        near_samples = []
        for i in range(int(sr * 0.18)):
            t = i / sr
            freq = 580 + 680 * (t / 0.18)
            env = 1.0 - (t / 0.18)
            val = math.sin(2 * math.pi * freq * t)
            near_samples.append(val * env * 11000)
        self.sounds["nearmiss"] = self._make_wave(near_samples)

        # 5. 플레이어 피격 효과음
        crash_samples = []
        for i in range(int(sr * 0.4)):
            t = i / sr
            env = (1.0 - t / 0.4) ** 1.8
            low = math.sin(2 * math.pi * (95 - 50 * t) * t)
            noise = random.uniform(-1.0, 1.0)
            crash_samples.append((low * 0.55 + noise * 0.65) * env * 18000)
        self.sounds["crash"] = self._make_wave(crash_samples)

        # 6. 부스터 차량 격파(SMASH) 사운드 (묵직한 타격 + 금속 파열음)
        smash_samples = []
        for i in range(int(sr * 0.32)):
            t = i / sr
            env = (1.0 - t / 0.32) ** 1.4
            punch = math.sin(2 * math.pi * (160 - 110 * (t / 0.32)) * t)
            clang = math.sin(2 * math.pi * 620 * t) * math.exp(-t * 18)
            noise = random.uniform(-1.0, 1.0)
            smash_samples.append((punch * 0.55 + clang * 0.35 + noise * 0.5) * env * 19000)
        self.sounds["smash"] = self._make_wave(smash_samples)

        # 7. 일반 차량끼리 추돌하는 소리 (가벼운 범퍼 충돌음)
        bump_samples = []
        for i in range(int(sr * 0.15)):
            t = i / sr
            env = (1.0 - t / 0.15) ** 1.8
            val = math.sin(2 * math.pi * 180 * t) * 0.6 + random.uniform(-0.6, 0.6) * 0.4
            bump_samples.append(val * env * 11000)
        self.sounds["bump"] = self._make_wave(bump_samples)

        # 8. 드리프트 타이어 스퀴크
        drift_samples = []
        for i in range(int(sr * 0.12)):
            t = i / sr
            freq = 1450 + 80 * math.sin(2 * math.pi * 25 * t)
            val = math.sin(2 * math.pi * freq * t) * 0.5 + random.uniform(-0.4, 0.4)
            env = math.sin(math.pi * t / 0.12)
            drift_samples.append(val * env * 4500)
        self.sounds["drift"] = self._make_wave(drift_samples)

        # 9. 메뉴 클릭음
        click_samples = []
        for i in range(int(sr * 0.05)):
            t = i / sr
            val = math.sin(2 * math.pi * 800 * t) * (1.0 - t / 0.05)
            click_samples.append(val * 10000)
        self.sounds["click"] = self._make_wave(click_samples)

        # 10. 신스웨이브 레이싱 BGM 루프
        step_dur = 0.2
        bass_notes = [
            110.0, 110.0, 220.0, 110.0,
            130.81, 130.81, 261.63, 130.81,
            146.83, 146.83, 293.66, 146.83,
            130.81, 146.83, 164.81, 196.00,
        ]
        lead_notes = [
            440.0, 0, 523.25, 659.25,
            587.33, 0, 523.25, 440.0,
            587.33, 0, 659.25, 783.99,
            659.25, 587.33, 523.25, 392.00,
        ]
        bgm_samples = []
        total_steps = len(bass_notes)
        samples_per_step = int(sr * step_dur)
        for step in range(total_steps):
            bf = bass_notes[step]
            lf = lead_notes[step]
            for j in range(samples_per_step):
                lt = j / sr
                env_b = max(0.0, 1.0 - lt / step_dur) ** 1.2
                bass = (math.sin(2 * math.pi * bf * lt) + 0.5 * math.sin(4 * math.pi * bf * lt)) * env_b * 0.45
                lead = 0.0
                if lf > 0:
                    env_l = max(0.0, 1.0 - lt / (step_dur * 0.95)) ** 0.8
                    lead = math.sin(2 * math.pi * lf * lt) * env_l * 0.3
                hat = random.uniform(-0.2, 0.2) * max(0.0, 1.0 - lt / 0.04) if (step % 2 == 1) else 0.0
                bgm_samples.append((bass + lead + hat) * 7500)
        self.sounds["bgm"] = self._make_wave(bgm_samples)

    def play(self, name):
        if self.enabled and name in self.sounds:
            self.sounds[name].play()

    def start_bgm(self):
        if self.enabled and self.bgm_enabled and "bgm" in self.sounds:
            if self.bgm_channel is None or not self.bgm_channel.get_busy():
                self.bgm_channel = self.sounds["bgm"].play(loops=-1)

    def stop_bgm(self):
        if self.bgm_channel is not None:
            self.bgm_channel.stop()

    def toggle_bgm(self):
        self.bgm_enabled = not self.bgm_enabled
        if self.bgm_enabled:
            self.start_bgm()
        else:
            self.stop_bgm()


# ============================================================================
# 세이브 데이터 관리
# ============================================================================
def load_save_data():
    default_data = {
        "high_score": 0,
        "coins": 0,
        "selected_car": 0,
        "unlocked_cars": [0],
        "upgrades": {"speed": 1, "handling": 1, "nitro": 1, "armor": 1},
    }
    if os.path.exists(SAVE_FILE):
        try:
            with open(SAVE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                for k, v in default_data.items():
                    if k not in data:
                        data[k] = v
                return data
        except Exception:
            return default_data
    return default_data


def save_game_data(data):
    try:
        with open(SAVE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


# ============================================================================
# 시각 효과 객체 (파티클, 스키드마크, 플로팅 텍스트, 충격파 링)
# ============================================================================
class Particle:
    def __init__(self, x, y, vx, vy, color, size, life, shrink=True):
        self.x = x
        self.y = y
        self.vx = vx
        self.vy = vy
        self.color = color
        self.size = size
        self.max_life = life
        self.life = life
        self.shrink = shrink

    def update(self, dt, world_scroll_vy=0.0):
        self.x += self.vx * dt
        self.y += (self.vy + world_scroll_vy) * dt
        self.life -= dt

    def draw(self, surf):
        if self.life <= 0:
            return
        ratio = max(0.0, self.life / self.max_life)
        r = max(1, int(self.size * (ratio if self.shrink else 1.0)))
        pygame.draw.circle(surf, self.color, (int(self.x), int(self.y)), r)


class ShockwaveRing:
    def __init__(self, x, y, color, max_radius=95):
        self.x = x
        self.y = y
        self.color = color
        self.max_radius = max_radius
        self.life = 0.28
        self.max_life = 0.28

    def update(self, dt):
        self.life -= dt

    def draw(self, surf):
        if self.life <= 0:
            return
        prog = 1.0 - (self.life / self.max_life)
        radius = int(12 + (self.max_radius - 12) * prog)
        width = max(1, int(6 * (1.0 - prog)))
        pygame.draw.circle(surf, self.color, (int(self.x), int(self.y)), radius, width)


class SkidMark:
    def __init__(self, x1, y1, x2, y2, color=(22, 22, 26)):
        self.x1 = x1
        self.y1 = y1
        self.x2 = x2
        self.y2 = y2
        self.color = color
        self.life = 1.4

    def update(self, dt, scroll_speed):
        dy = scroll_speed * dt
        self.y1 += dy
        self.y2 += dy
        self.life -= dt

    def draw(self, surf):
        if self.life > 0 and min(self.y1, self.y2) < SCREEN_HEIGHT + 50:
            pygame.draw.line(surf, self.color, (int(self.x1), int(self.y1)), (int(self.x2), int(self.y2)), 4)


class FloatingText:
    def __init__(self, x, y, text, color, size=22):
        self.x = x
        self.y = y
        self.text = text
        self.color = color
        self.life = 1.05
        self.max_life = 1.05
        self.size = size

    def update(self, dt):
        self.y -= 58 * dt
        self.life -= dt

    def draw(self, surf, font):
        if self.life <= 0:
            return
        shadow = font.render(self.text, True, BLACK)
        txt = font.render(self.text, True, self.color)
        rect = txt.get_rect(center=(int(self.x), int(self.y)))
        surf.blit(shadow, (rect.x + 2, rect.y + 2))
        surf.blit(txt, rect)


# ============================================================================
# 현대자동차 H 엠블럼 & 차량 그래픽 생성기
# ============================================================================
def draw_hyundai_emblem(surf, cx, cy, w, h, color, thickness=2):
    """현대자동차 시그니처 타원형 H 엠블럼 드로잉"""
    rect = pygame.Rect(int(cx - w // 2), int(cy - h // 2), int(w), int(h))
    pygame.draw.ellipse(surf, color, rect, thickness)
    # 기울어진 H자의 좌/우 기둥 및 대각선 악수 크로스바
    lx1, ly1 = int(cx - w * 0.22), int(cy + h * 0.34)
    lx2, ly2 = int(cx - w * 0.10), int(cy - h * 0.34)
    rx1, ry1 = int(cx + w * 0.10), int(cy + h * 0.34)
    rx2, ry2 = int(cx + w * 0.22), int(cy - h * 0.34)
    pygame.draw.line(surf, color, (lx1, ly1), (lx2, ly2), thickness)
    pygame.draw.line(surf, color, (rx1, ry1), (rx2, ry2), thickness)
    pygame.draw.line(surf, color, (int(cx - w * 0.16), int(cy + h * 0.05)), (int(cx + w * 0.16), int(cy - h * 0.05)), thickness)


def draw_player_supercar_surface(width, height, body_color, accent_color, glow_color):
    pad = 28
    surf = pygame.Surface((width + pad * 2, height + pad * 2), pygame.SRCALPHA)
    ox, oy = pad, pad
    cx = ox + width // 2

    # 1. 다단계 소프트 네온 언더글로우 (바닥 오라 + 그림자)
    pygame.draw.ellipse(surf, (0, 0, 0, 120), (ox - 6, oy + 4, width + 12, height + 4))
    for idx, expand in enumerate((18, 13, 8, 4)):
        alpha = 28 + idx * 32
        glow_rect = (ox - expand, oy - expand // 2, width + expand * 2, height + expand)
        pygame.draw.rect(surf, (*glow_color, alpha), glow_rect, border_radius=22)

    # 2. 광폭 레이싱 슬릭 타이어 & N 레드 브레이크 캘리퍼 디테일
    wheel_w, wheel_h = 9, 19
    for wx, wy in [
        (ox - 4, oy + 11),
        (ox + width - 5, oy + 11),
        (ox - 5, oy + height - 29),
        (ox + width - 4, oy + height - 29),
    ]:
        pygame.draw.rect(surf, (14, 15, 20), (wx, wy, wheel_w, wheel_h), border_radius=3)
        pygame.draw.rect(surf, N_RED, (wx + 1, wy + 3, wheel_w - 2, 4), border_radius=1)
        pygame.draw.rect(surf, glow_color, (wx + 2, wy + 7, 2, wheel_h - 12))

    # 3. N 레드 포인트 프론트 스플리터 & 에어로 카나드 날개
    splitter_pts = [
        (cx, oy - 8),
        (ox + width + 2, oy + 9),
        (ox - 2, oy + 9),
    ]
    pygame.draw.polygon(surf, (22, 25, 32), splitter_pts)
    pygame.draw.polygon(surf, accent_color, splitter_pts, 2)

    # 리어 디퓨저 핀 & 대구경 N 듀얼 배기 파이프
    pygame.draw.rect(surf, (20, 22, 28), (ox + 6, oy + height - 3, width - 12, 6), border_radius=2)
    for ex_x in (cx - 10, cx + 6):
        pygame.draw.rect(surf, (90, 100, 115), (ex_x, oy + height - 1, 5, 5), border_radius=2)
        pygame.draw.circle(surf, CYAN, (ex_x + 2, oy + height + 3), 2)

    # 4. 현대 N 슈퍼카 조각 바디 (메탈릭 다층 음영 실루엣)
    dark_body = tuple(max(0, c - 55) for c in body_color)
    bright_edge = tuple(min(255, c + 80) for c in body_color)
    body_pts = [
        (cx, oy - 4),                       # 노즈 끝
        (ox + width - 3, oy + 8),           # 우측 프론트 숄더
        (ox + width + 2, oy + 26),          # 우측 프론트 와이드 펜더
        (ox + width - 4, oy + 46),          # 우측 사이드 에어 인테이크(잘록한 허리)
        (ox + width + 3, oy + height - 18), # 우측 리어 와이드 펜더
        (ox + width - 3, oy + height - 2),  # 우측 리어 테일
        (ox + 3, oy + height - 2),          # 좌측 리어 테일
        (ox - 3, oy + height - 18),         # 좌측 리어 와이드 펜더
        (ox + 4, oy + 46),                  # 좌측 사이드 에어 인테이크
        (ox - 2, oy + 26),                  # 좌측 프론트 와이드 펜더
        (ox + 3, oy + 8),                   # 좌측 프론트 숄더
    ]
    pygame.draw.polygon(surf, dark_body, body_pts)

    inner_pts = [
        (cx, oy - 1),
        (ox + width - 6, oy + 10),
        (ox + width - 2, oy + 26),
        (ox + width - 7, oy + 46),
        (ox + width - 1, oy + height - 18),
        (ox + width - 6, oy + height - 5),
        (ox + 6, oy + height - 5),
        (ox + 1, oy + height - 18),
        (ox + 7, oy + 46),
        (ox + 2, oy + 26),
        (ox + 6, oy + 10),
    ]
    pygame.draw.polygon(surf, body_color, inner_pts)
    pygame.draw.polygon(surf, bright_edge, body_pts, 2)

    # 사이드 미러
    pygame.draw.polygon(surf, body_color, [(ox - 1, oy + 28), (ox - 7, oy + 25), (ox - 6, oy + 31)])
    pygame.draw.polygon(surf, body_color, [(ox + width + 1, oy + 28), (ox + width + 7, oy + 25), (ox + width + 6, oy + 31)])

    # 5. 본넷 카본 후드 & 전면 현대자동차 H 엠블럼
    hood_pts = [
        (cx, oy + 2),
        (cx + 13, oy + 24),
        (cx - 13, oy + 24),
    ]
    pygame.draw.polygon(surf, (24, 28, 38), hood_pts)
    pygame.draw.polygon(surf, accent_color, hood_pts, 2)
    # 본넷 노즈 중앙 현대 H 로고
    draw_hyundai_emblem(surf, cx, oy + 11, 14, 8, WHITE, 1)

    # 6. 사이드 에어 덕트 (입체 흡기구)
    pygame.draw.polygon(surf, (14, 16, 22), [(ox + 2, oy + 38), (ox + 11, oy + 47), (ox + 2, oy + 63)])
    pygame.draw.polygon(surf, (14, 16, 22), [(ox + width - 2, oy + 38), (ox + width - 11, oy + 47), (ox + width - 2, oy + 63)])

    # 7. 유광 콕핏 & 앞유리 빛반사
    canopy_pts = [
        (cx, oy + 21),
        (ox + width - 7, oy + 33),
        (ox + width - 9, oy + 62),
        (cx, oy + 69),
        (ox + 9, oy + 62),
        (ox + 7, oy + 33),
    ]
    pygame.draw.polygon(surf, (16, 22, 36), canopy_pts)
    pygame.draw.polygon(
        surf,
        (95, 135, 185, 110),
        [(cx - 2, oy + 24), (cx + 9, oy + 33), (cx + 3, oy + 45), (cx - 8, oy + 34)],
    )
    pygame.draw.polygon(surf, glow_color, canopy_pts, 2)

    # 8. 리어 루버(N Vision 74 스타일) & 고출력 PE 코어 글로우
    pygame.draw.rect(surf, (22, 26, 34), (cx - 8, oy + 62, 16, 17), border_radius=4)
    pygame.draw.circle(surf, glow_color, (cx, oy + 70), 5)
    pygame.draw.circle(surf, WHITE, (cx, oy + 70), 2)
    for ly in range(oy + 64, oy + 78, 4):
        pygame.draw.line(surf, (40, 45, 58), (cx - 7, ly), (cx + 7, ly), 1)

    # 9. 대형 카본 스완넥 GT 윙 & 루프 삼각형 보조 제동등(N 전용 디테일)
    wing_y = oy + height - 11
    pygame.draw.rect(surf, (18, 20, 26), (ox - 6, wing_y, width + 12, 8), border_radius=3)
    pygame.draw.rect(surf, accent_color, (ox - 6, wing_y, width + 12, 8), width=2, border_radius=3)
    pygame.draw.rect(surf, glow_color, (ox - 7, wing_y - 3, 4, 14), border_radius=1)
    pygame.draw.rect(surf, glow_color, (ox + width + 3, wing_y - 3, 4, 14), border_radius=1)
    # 현대 N 시그니처 역삼각형 보조제동등
    pygame.draw.polygon(surf, N_RED, [(cx - 4, oy + height - 4), (cx + 4, oy + height - 4), (cx, oy + height)])

    # 10. 아이오닉/N 비전 74 스타일 파라메트릭 픽셀 LED 헤드라이트 & 리어 테일바
    for px in range(ox + 3, ox + 16, 4):
        pygame.draw.rect(surf, WHITE, (px, oy + 14, 3, 3))
    for px in range(ox + width - 15, ox + width - 2, 4):
        pygame.draw.rect(surf, WHITE, (px, oy + 14, 3, 3))
    for px in range(ox + 5, ox + width - 5, 5):
        pygame.draw.rect(surf, (255, 35, 60), (px, oy + height - 5, 3, 3))

    return surf


def draw_traffic_car_surface(width, height, body_color, stripe_color=None, is_truck=False, is_police=False, is_taxi=False):
    surf = pygame.Surface((width + 20, height + 20), pygame.SRCALPHA)
    ox, oy = 10, 10

    # 1. 부드러운 입체 그림자
    pygame.draw.rect(surf, (0, 0, 0, 105), (ox + 3, oy + 5, width, height), border_radius=10)

    # 2. 타이어 4개
    wheel_w, wheel_h = 6, 15
    for wx, wy in [
        (ox - 3, oy + 12),
        (ox + width - 3, oy + 12),
        (ox - 3, oy + height - 27),
        (ox + width - 3, oy + height - 27),
    ]:
        pygame.draw.rect(surf, (18, 18, 22), (wx, wy, wheel_w, wheel_h), border_radius=3)

    if is_truck:
        # 대형 컨테이너 트럭 고디테일 그래픽
        dark_cab = tuple(max(0, c - 45) for c in body_color)
        pygame.draw.rect(surf, dark_cab, (ox, oy, width, 28), border_radius=6)
        pygame.draw.rect(surf, body_color, (ox + 2, oy + 2, width - 4, 24), border_radius=5)
        # 트럭 앞유리 & 광택
        pygame.draw.rect(surf, (25, 38, 56), (ox + 5, oy + 6, width - 10, 13), border_radius=3)
        pygame.draw.line(surf, (90, 130, 170), (ox + 8, oy + 8), (ox + 18, oy + 16), 2)
        # 루프 에어 디플렉터
        pygame.draw.rect(surf, tuple(min(255, c + 30) for c in body_color), (ox + 7, oy + 19, width - 14, 6), border_radius=2)
        # 화물 컨테이너 및 리브(Rib) 주름
        pygame.draw.rect(surf, (185, 192, 205), (ox + 1, oy + 27, width - 2, height - 29), border_radius=4)
        pygame.draw.rect(surf, (225, 230, 240), (ox + 4, oy + 29, width - 8, height - 34), border_radius=3)
        for ry in range(oy + 36, oy + height - 10, 12):
            pygame.draw.line(surf, (165, 172, 185), (ox + 3, ry), (ox + width - 3, ry), 2)
        # 헤드라이트 & 후미등
        pygame.draw.rect(surf, (255, 250, 210), (ox + 4, oy + 1, 10, 4), border_radius=2)
        pygame.draw.rect(surf, (255, 250, 210), (ox + width - 14, oy + 1, 10, 4), border_radius=2)
        pygame.draw.rect(surf, (220, 35, 35), (ox + 4, oy + height - 4, 11, 3), border_radius=1)
        pygame.draw.rect(surf, (220, 35, 35), (ox + width - 15, oy + height - 4, 11, 3), border_radius=1)
        return surf

    # 일반/스포츠/택시/경찰차 차체 음영 및 메탈릭 코팅
    dark_col = tuple(max(0, c - 48) for c in body_color)
    light_col = tuple(min(255, c + 42) for c in body_color)
    pygame.draw.rect(surf, dark_col, (ox, oy, width, height), border_radius=11)
    pygame.draw.rect(surf, body_color, (ox + 2, oy + 2, width - 4, height - 4), border_radius=10)
    pygame.draw.rect(surf, light_col, (ox + 3, oy + 5, width - 6, height - 10), width=1, border_radius=9)

    # 사이드 미러
    pygame.draw.rect(surf, body_color, (ox - 4, oy + 22, 4, 6), border_radius=2)
    pygame.draw.rect(surf, body_color, (ox + width, oy + 22, 4, 6), border_radius=2)

    # 본넷 라인 디테일
    pygame.draw.line(surf, dark_col, (ox + 9, oy + 4), (ox + 11, oy + 20), 1)
    pygame.draw.line(surf, dark_col, (ox + width - 9, oy + 4), (ox + width - 11, oy + 20), 1)

    if stripe_color:
        sw = max(4, width // 6)
        pygame.draw.rect(surf, stripe_color, (ox + width // 2 - sw // 2, oy + 2, sw, height - 4), border_radius=2)

    # 유리창 프레임 & 앞유리 반사광
    cabin_y = oy + int(height * 0.24)
    cabin_h = int(height * 0.50)
    pygame.draw.rect(surf, (24, 30, 44), (ox + 5, cabin_y, width - 10, cabin_h), border_radius=7)
    pygame.draw.line(surf, (95, 130, 175), (ox + 9, cabin_y + 3), (ox + 17, cabin_y + 11), 2)

    # 루프 탑
    roof_color = WHITE if is_police else light_col
    pygame.draw.rect(surf, roof_color, (ox + 8, cabin_y + 11, width - 16, cabin_h - 20), border_radius=5)

    # 경찰차 전용 푸시범퍼 & 경광등 바
    if is_police:
        pygame.draw.rect(surf, (60, 65, 75), (ox + 10, oy - 2, width - 20, 4), border_radius=1)
        bar_y = cabin_y + cabin_h // 2 - 4
        pygame.draw.rect(surf, (20, 20, 25), (ox + 6, bar_y - 1, width - 12, 8), border_radius=3)
        pygame.draw.rect(surf, RED, (ox + 7, bar_y, (width - 14) // 2, 6), border_radius=2)
        pygame.draw.rect(surf, BLUE, (ox + width // 2, bar_y, (width - 14) // 2, 6), border_radius=2)

    # 택시 전용 루프 사인 (TAXI 표시등)
    if is_taxi:
        sign_y = cabin_y + cabin_h // 2 - 4
        pygame.draw.rect(surf, (30, 30, 35), (ox + 12, sign_y, width - 24, 8), border_radius=3)
        pygame.draw.rect(surf, (255, 230, 80), (ox + 14, sign_y + 1, width - 28, 6), border_radius=2)

    # 헤드라이트 & 브레이크 테일램프 글로우
    pygame.draw.rect(surf, (255, 250, 215), (ox + 4, oy + 1, 10, 4), border_radius=2)
    pygame.draw.rect(surf, (255, 250, 215), (ox + width - 14, oy + 1, 10, 4), border_radius=2)
    pygame.draw.rect(surf, (245, 30, 45), (ox + 4, oy + height - 5, 11, 4), border_radius=2)
    pygame.draw.rect(surf, (245, 30, 45), (ox + width - 15, oy + height - 5, 11, 4), border_radius=2)

    return surf


# ============================================================================
# 플레이어 슈퍼카 클래스
# ============================================================================
class PlayerCar:
    def __init__(self, car_info, upgrades):
        self.car_info = car_info
        self.width = 48
        self.height = 88
        self.x = (ROAD_LEFT + ROAD_RIGHT) / 2
        self.y = SCREEN_HEIGHT - 135
        self.vx = 0.0
        self.vy = 0.0

        spd_lv = upgrades.get("speed", 1)
        hnd_lv = upgrades.get("handling", 1)
        nit_lv = upgrades.get("nitro", 1)
        arm_lv = upgrades.get("armor", 1)

        self.base_max_speed = 630.0 * car_info["base_speed"] * (1.0 + 0.06 * (spd_lv - 1))
        self.nitro_max_speed = self.base_max_speed * 1.52
        self.min_speed = 240.0
        self.speed = 350.0

        self.accel = 330.0 * car_info["base_accel"] * (1.0 + 0.07 * (spd_lv - 1))
        self.steer_power = 485.0 * car_info["base_handling"] * (1.0 + 0.07 * (hnd_lv - 1))

        # 기믹형 파괴 부스터(Overdrive) 스탯
        self.nitro_drain = 26.0 / (car_info["base_nitro"] * (1.0 + 0.08 * (nit_lv - 1)))
        self.gimmick_charge_mult = car_info["base_nitro"] * (1.0 + 0.08 * (nit_lv - 1))

        self.max_hp = car_info["base_hp"] + (arm_lv - 1) // 2
        self.hp = self.max_hp

        self.nitro = 0.0
        self.is_boosting = False
        self.is_drifting = False
        self.angle = 0.0
        self.drift_score_accum = 0.0
        self.smash_combo = 0

        # 방어막 지속 시간 타이머 (획득 시 1.0초만 유지!)
        self.shield_timer = 0.0
        self.magnet_timer = 0.0
        self.invincible_timer = 0.0
        self.trail_history = []  # 고속/부스터/드리프트 네온 잔상 좌표

        self.base_surf = draw_player_supercar_surface(
            self.width,
            self.height,
            car_info["body_color"],
            car_info["accent_color"],
            car_info["glow_color"],
        )

    def add_booster_gauge(self, amount):
        # 부스터 사용 중에는 어떤 기믹이나 충돌로도 부스터가 충전되지 않음 (무한 부스터 방지)
        if self.is_boosting:
            return False
        before = self.nitro
        self.nitro = min(100.0, self.nitro + amount * self.gimmick_charge_mult)
        return before < 100.0 and self.nitro >= 100.0

    def get_hitbox(self):
        extra_w = 10 if self.is_boosting else 0
        extra_h = 12 if self.is_boosting else 0
        return pygame.Rect(
            int(self.x - (self.width * 0.42 + extra_w)),
            int(self.y - (self.height * 0.42 + extra_h)),
            int(self.width * 0.84 + extra_w * 2),
            int(self.height * 0.84 + extra_h * 2),
        )


# ============================================================================
# 트래픽(AI) 차량 클래스 (차량 간 충돌 물리 & 튕겨나가기 & 연쇄 추돌 포함)
# ============================================================================
class TrafficCar:
    def __init__(self, lane, y, difficulty_scale=1.0):
        self.lane = lane
        self.target_lane = lane
        self.x = ROAD_LEFT + (lane + 0.5) * LANE_WIDTH
        self.y = y

        self.vx = 0.0
        self.knock_vy = 0.0
        self.angle = 0.0
        self.angular_vel = 0.0
        self.is_wrecked = False
        self.wreck_timer = 0.0
        self.bump_cooldown = 0.0

        kind = random.choices(
            ["sedan", "sports", "truck", "taxi", "police"],
            weights=[40, 22, 15, 15, 8],
        )[0]
        self.kind = kind
        self.near_missed = False
        self.lane_change_cooldown = random.uniform(0.9, 2.8)
        self.blink_timer = random.uniform(0.0, 2.0)
        self.changing_lane = False

        if kind == "truck":
            self.width = 52
            self.height = 122
            self.mass = 2.4
            self.speed = random.uniform(190, 245)
            color = random.choice([(65, 105, 175), (175, 70, 60), (70, 145, 90)])
            self.surf = draw_traffic_car_surface(self.width, self.height, color, is_truck=True)
        elif kind == "sports":
            self.width = 45
            self.height = 82
            self.mass = 1.0
            self.speed = random.uniform(320, 430) * (1.0 + 0.05 * difficulty_scale)
            color = random.choice([(250, 110, 35), (45, 210, 115), (220, 50, 155)])
            self.surf = draw_traffic_car_surface(self.width, self.height, color, WHITE)
        elif kind == "taxi":
            self.width = 46
            self.height = 82
            self.mass = 1.1
            self.speed = random.uniform(250, 340)
            self.surf = draw_traffic_car_surface(self.width, self.height, (245, 195, 30), (30, 30, 35), is_taxi=True)
        elif kind == "police":
            self.width = 46
            self.height = 84
            self.mass = 1.25
            self.speed = random.uniform(340, 440) * (1.0 + 0.06 * difficulty_scale)
            self.surf = draw_traffic_car_surface(self.width, self.height, (28, 34, 48), is_police=True)
        else:
            self.width = 46
            self.height = 82
            self.mass = 1.1
            self.speed = random.uniform(225, 320)
            color = random.choice([(145, 155, 172), (65, 125, 205), (85, 165, 135), (185, 85, 90)])
            self.surf = draw_traffic_car_surface(self.width, self.height, color)

    def apply_impulse(self, ivx, ivy, spin, wrecked=False):
        self.vx += ivx
        self.knock_vy += ivy
        self.angular_vel += spin
        self.changing_lane = False
        if wrecked:
            self.is_wrecked = True
            self.wreck_timer = 1.8

    def update(self, dt, player_speed, all_traffic):
        if self.bump_cooldown > 0:
            self.bump_cooldown -= dt

        if self.is_wrecked:
            self.x += self.vx * dt
            self.y += (player_speed - self.speed + self.knock_vy) * dt
            self.angle = (self.angle + self.angular_vel * dt) % 360
            self.vx *= max(0.0, 1.0 - 1.2 * dt)
            self.knock_vy *= max(0.0, 1.0 - 1.0 * dt)
            self.wreck_timer -= dt
            return

        rel_vy = (player_speed - self.speed) + self.knock_vy
        self.y += rel_vy * dt
        self.x += self.vx * dt

        self.vx *= max(0.0, 1.0 - 4.5 * dt)
        self.knock_vy *= max(0.0, 1.0 - 3.8 * dt)
        self.angle += self.angular_vel * dt
        self.angular_vel *= max(0.0, 1.0 - 6.0 * dt)
        self.angle *= max(0.0, 1.0 - 5.5 * dt)

        min_x = ROAD_LEFT + self.width // 2 + 4
        max_x = ROAD_RIGHT - self.width // 2 - 4
        if self.x < min_x:
            self.x = min_x
            self.vx = abs(self.vx) * 0.75 + 90
            self.angular_vel = -140
            self.changing_lane = False
        elif self.x > max_x:
            self.x = max_x
            self.vx = -abs(self.vx) * 0.75 - 90
            self.angular_vel = 140
            self.changing_lane = False

        self.blink_timer += dt
        if abs(self.vx) < 35 and 30 < self.y < SCREEN_HEIGHT - 180:
            self.lane_change_cooldown -= dt
            front_blocked = any(
                other is not self
                and not other.is_wrecked
                and abs(other.x - self.x) < 42
                and 0 < (self.y - other.y) < 135
                for other in all_traffic
            )
            if (self.lane_change_cooldown <= 0 or front_blocked) and not self.changing_lane:
                if self.kind in ("sports", "taxi", "police") or front_blocked:
                    possible = []
                    if self.lane > 0:
                        possible.append(self.lane - 1)
                    if self.lane < NUM_LANES - 1:
                        possible.append(self.lane + 1)
                    if possible:
                        self.target_lane = random.choice(possible)
                        self.changing_lane = True
                        self.lane_change_cooldown = random.uniform(2.0, 4.2)

        if self.changing_lane:
            target_x = ROAD_LEFT + (self.target_lane + 0.5) * LANE_WIDTH
            dx = target_x - self.x
            step = 155.0 * dt
            if abs(dx) <= step:
                self.x = target_x
                self.lane = self.target_lane
                self.changing_lane = False
                self.angle = 0.0
            else:
                dir_sign = math.copysign(1.0, dx)
                self.x += dir_sign * step
                self.angle = -dir_sign * 7.0
        else:
            self.lane = max(0, min(NUM_LANES - 1, int((self.x - ROAD_LEFT) / LANE_WIDTH)))

    def get_hitbox(self):
        return pygame.Rect(
            int(self.x - self.width * 0.42),
            int(self.y - self.height * 0.42),
            int(self.width * 0.84),
            int(self.height * 0.84),
        )

    def draw(self, surf):
        cx, cy = int(self.x), int(self.y)
        # 경찰차 사이렌 점등 글로우 효과
        if self.kind == "police" and not self.is_wrecked:
            siren_col = (255, 40, 60, 55) if int(self.blink_timer * 10) % 2 == 0 else (40, 120, 255, 55)
            s_surf = pygame.Surface((76, 76), pygame.SRCALPHA)
            pygame.draw.circle(s_surf, siren_col, (38, 38), 34)
            surf.blit(s_surf, (cx - 38, cy - 38))

        if abs(self.angle) > 1.5:
            rot = pygame.transform.rotate(self.surf, self.angle)
            rect = rot.get_rect(center=(cx, cy))
            surf.blit(rot, rect)
        else:
            rect = self.surf.get_rect(center=(cx, cy))
            surf.blit(self.surf, rect)

        if self.changing_lane and not self.is_wrecked and int(self.blink_timer * 8) % 2 == 0:
            side_x = int(self.x - self.width // 2 - 4) if self.target_lane < self.lane else int(self.x + self.width // 2 + 4)
            pygame.draw.circle(surf, ORANGE, (side_x, int(self.y - self.height // 2 + 8)), 5)
            pygame.draw.circle(surf, ORANGE, (side_x, int(self.y + self.height // 2 - 8)), 5)


# ============================================================================
# 아이템 및 코인 클래스 (글로우 오라 & 고품질 아이콘)
# ============================================================================
class Collectible:
    def __init__(self, x, y, kind="coin"):
        self.x = x
        self.y = y
        self.kind = kind  # "coin", "nitro", "shield", "magnet", "repair"
        self.anim_t = random.uniform(0, 6.28)
        self.radius = 16 if kind == "coin" else 20

    def update(self, dt, scroll_speed, player):
        self.anim_t += dt * 6.0
        self.y += scroll_speed * dt

        if player.magnet_timer > 0 or player.is_boosting:
            pull_range = 300 if player.magnet_timer > 0 else 150
            dx = player.x - self.x
            dy = player.y - self.y
            dist = math.hypot(dx, dy)
            if dist < pull_range and dist > 1:
                pull = 580.0 * dt
                self.x += (dx / dist) * pull
                self.y += (dy / dist) * pull

    def draw(self, surf, font_small):
        cx, cy = int(self.x), int(self.y)
        pulse = int(3 * math.sin(self.anim_t))

        if self.kind == "coin":
            w = max(5, int(14 * abs(math.cos(self.anim_t * 0.85))))
            pygame.draw.circle(surf, (80, 65, 15), (cx, cy), 17)
            pygame.draw.ellipse(surf, (235, 155, 15), (cx - w - 2, cy - 15, (w + 2) * 2, 30))
            pygame.draw.ellipse(surf, YELLOW, (cx - w, cy - 13, w * 2, 26))
            if w > 8:
                pygame.draw.ellipse(surf, (255, 245, 180), (cx - w // 2, cy - 8, w, 16), 2)
        elif self.kind == "nitro":
            pygame.draw.circle(surf, (15, 70, 95), (cx, cy), 22 + pulse)
            pygame.draw.circle(surf, CYAN, (cx, cy), 18, 3)
            pygame.draw.circle(surf, WHITE, (cx, cy), 14, 1)
            txt = font_small.render("⚡", True, YELLOW)
            surf.blit(txt, txt.get_rect(center=(cx, cy)))
        elif self.kind == "shield":
            pygame.draw.circle(surf, (20, 48, 115), (cx, cy), 22 + pulse)
            pygame.draw.circle(surf, CYAN, (cx, cy), 18, 3)
            pygame.draw.circle(surf, BLUE, (cx, cy), 14, 2)
            txt = font_small.render("S", True, WHITE)
            surf.blit(txt, txt.get_rect(center=(cx, cy)))
        elif self.kind == "magnet":
            pygame.draw.circle(surf, (80, 22, 115), (cx, cy), 22 + pulse)
            pygame.draw.circle(surf, PURPLE, (cx, cy), 18, 3)
            pygame.draw.circle(surf, PINK, (cx, cy), 14, 1)
            txt = font_small.render("M", True, PINK)
            surf.blit(txt, txt.get_rect(center=(cx, cy)))
        elif self.kind == "repair":
            pygame.draw.circle(surf, (18, 88, 45), (cx, cy), 22 + pulse)
            pygame.draw.circle(surf, GREEN, (cx, cy), 18, 3)
            pygame.draw.circle(surf, WHITE, (cx, cy), 14, 1)
            txt = font_small.render("+", True, GREEN)
            surf.blit(txt, txt.get_rect(center=(cx, cy)))


# ============================================================================
# 메인 레이싱 게임 컨트롤러
# ============================================================================
class RacingGame:
    def __init__(self):
        pygame.init()
        pygame.display.set_caption("현대자동차 N 하이웨이 레이서 (HYUNDAI N : HMG DRIVING EXPERIENCE)")
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        self.clock = pygame.time.Clock()

        font_candidates = ["malgungothic", "맑은 고딕", "nanumgothic", "gulim", "arial"]
        self.font_xs = pygame.font.SysFont(font_candidates, 15, bold=True)
        self.font_sm = pygame.font.SysFont(font_candidates, 18, bold=True)
        self.font_md = pygame.font.SysFont(font_candidates, 24, bold=True)
        self.font_lg = pygame.font.SysFont(font_candidates, 36, bold=True)
        self.font_xl = pygame.font.SysFont(font_candidates, 52, bold=True)

        self.sound = SoundManager()
        self.save_data = load_save_data()

        self.state = "MENU"
        self.garage_tab = "CARS"
        self.preview_car_idx = self.save_data["selected_car"]
        self.selected_upgrade_idx = 0

        self.road_scroll = 0.0
        self.brand_scroll = 220.0
        self.scenery_items = []
        self._init_scenery()

        self.reset_race()
        self.sound.start_bgm()

    def _init_scenery(self):
        self.scenery_items.clear()
        for y in range(0, SCREEN_HEIGHT + 200, 140):
            # 현대자동차 네온 간판("neon") 등장 확률을 기존의 1/3 수준(1/9)으로 축소
            kind = random.choices(["lamp", "tree", "neon"], weights=[4, 4, 1])[0]
            self.scenery_items.append({"y": float(y), "type": kind})

    def reset_race(self):
        car_info = CAR_CATALOG[self.save_data["selected_car"]]
        self.player = PlayerCar(car_info, self.save_data["upgrades"])
        self.traffic = []
        self.collectibles = []
        self.particles = []
        self.shockwaves = []
        self.skid_marks = []
        self.floating_texts = []
        self.energy_arcs = []  # 기믹 충전 시 연결되는 번개 선 연출

        self.score = 0.0
        self.distance_km = 0.0
        self.run_coins = 0
        self.near_miss_count = 0
        self.smashed_cars_count = 0
        self.camera_shake = 0.0

        self.traffic_spawn_timer = 0.5
        self.item_spawn_timer = 1.5
        self.drift_sound_timer = 0.0

    # ------------------------------------------------------------------------
    # 스폰 로직
    # ------------------------------------------------------------------------
    def spawn_traffic(self):
        difficulty = 1.0 + (self.distance_km * 0.25)
        lanes = list(range(NUM_LANES))
        random.shuffle(lanes)

        count = 2 if (random.random() < min(0.60, 0.25 + self.distance_km * 0.05)) else 1
        spawned = 0
        for lane in lanes:
            if spawned >= count:
                break
            lane_x = ROAD_LEFT + (lane + 0.5) * LANE_WIDTH
            too_close = any(abs(t.x - lane_x) < 42 and t.y < 130 for t in self.traffic)
            if not too_close:
                self.traffic.append(TrafficCar(lane, random.uniform(-190, -100), difficulty))
                spawned += 1

    def spawn_collectibles(self):
        lane = random.randint(0, NUM_LANES - 1)
        x = ROAD_LEFT + (lane + 0.5) * LANE_WIDTH

        roll = random.random()
        if roll < 0.62:
            num_coins = random.randint(5, 7)
            for i in range(num_coins):
                self.collectibles.append(Collectible(x, -60 - i * 48, "coin"))
        else:
            kind = random.choices(
                ["nitro", "shield", "magnet", "repair"],
                weights=[45, 22, 21, 12],
            )[0]
            self.collectibles.append(Collectible(x, -80, kind))

    # ------------------------------------------------------------------------
    # 트래픽 차량끼리의 충돌 및 연쇄 추돌 물리 처리
    # ------------------------------------------------------------------------
    def handle_traffic_collisions(self):
        n = len(self.traffic)
        for i in range(n):
            a = self.traffic[i]
            rect_a = a.get_hitbox()
            for j in range(i + 1, n):
                b = self.traffic[j]
                rect_b = b.get_hitbox()
                if not rect_a.colliderect(rect_b):
                    continue

                dx = b.x - a.x
                dy = b.y - a.y
                if abs(dx) < 1 and abs(dy) < 1:
                    dx = random.choice([-10.0, 10.0])

                # 1) 플레이어의 부스터에 날아간 차(is_wrecked)가 다른 차를 들이받은 경우 -> 연쇄 폭발 파괴!
                if a.is_wrecked and not b.is_wrecked:
                    self._trigger_chain_smash(a, b)
                    continue
                elif b.is_wrecked and not a.is_wrecked:
                    self._trigger_chain_smash(b, a)
                    continue

                # 2) 일반 AI 차량끼리 차선 변경이나 속도 차이로 부딪힌 경우 -> 서로 튕겨나가고 스파크 발생!
                push_x = math.copysign(1.0, dx) if abs(dx) > 4 else random.choice([-1.0, 1.0])
                push_y = math.copysign(1.0, dy) if abs(dy) > 4 else 1.0

                # 겹침 즉시 분리
                overlap_x = (a.width + b.width) * 0.44 - abs(dx)
                if overlap_x > 0 and abs(dy) < (a.height + b.height) * 0.36:
                    a.x -= push_x * (overlap_x * 0.5 + 2)
                    b.x += push_x * (overlap_x * 0.5 + 2)

                # 탄성 반동 부여 (가벼운 차가 더 크게 튕겨나감)
                force_x = 240.0
                force_y = 140.0
                a.apply_impulse(-push_x * (force_x / a.mass), -push_y * (force_y / a.mass), -push_x * 165.0)
                b.apply_impulse(push_x * (force_x / b.mass), push_y * (force_y / b.mass), push_x * 165.0)

                # 뒤차가 앞차를 추돌한 경우 속도 교환
                if a.y > b.y and a.speed > b.speed:
                    a.speed, b.speed = b.speed * 0.9, a.speed * 1.08
                elif b.y > a.y and b.speed > a.speed:
                    b.speed, a.speed = a.speed * 0.9, b.speed * 1.08

                # 스파크 파티클 및 충돌음
                mid_x = (a.x + b.x) * 0.5
                mid_y = (a.y + b.y) * 0.5
                self._spawn_sparks(mid_x, mid_y, 12, YELLOW)
                if a.bump_cooldown <= 0 and b.bump_cooldown <= 0:
                    if 0 <= mid_y <= SCREEN_HEIGHT:
                        self.sound.play("bump")
                    a.bump_cooldown = 0.35
                    b.bump_cooldown = 0.35

    def _trigger_chain_smash(self, flying_car, victim_car):
        dx = victim_car.x - flying_car.x
        dir_x = math.copysign(1.0, dx) if abs(dx) > 2 else random.choice([-1.0, 1.0])
        victim_car.apply_impulse(
            dir_x * random.uniform(340, 520) + flying_car.vx * 0.4,
            random.uniform(-650, -450),
            dir_x * random.uniform(520, 820),
            wrecked=True,
        )
        self.smashed_cars_count += 1
        self.score += 450
        self.run_coins += 2
        self.camera_shake = max(self.camera_shake, 14.0)
        self.sound.play("smash")
        self._spawn_explosion(victim_car.x, victim_car.y, PURPLE)
        self.shockwaves.append(ShockwaveRing(victim_car.x, victim_car.y, YELLOW, 90))
        self.floating_texts.append(
            FloatingText(victim_car.x, victim_car.y - 30, "연쇄 격파! +450 (+2$)", YELLOW, 22)
        )

    # ------------------------------------------------------------------------
    # 메인 업데이트 (레이싱 진행 중)
    # ------------------------------------------------------------------------
    def update_playing(self, dt):
        keys = pygame.key.get_pressed()
        p = self.player

        if p.invincible_timer > 0:
            p.invincible_timer -= dt
        if p.shield_timer > 0:
            p.shield_timer = max(0.0, p.shield_timer - dt)
        if p.magnet_timer > 0:
            p.magnet_timer -= dt
        if self.camera_shake > 0:
            self.camera_shake = max(0.0, self.camera_shake - dt * 26.0)

        # 1. N 그린 부스트 (NGB / 파괴 부스터) 발동 및 유지:
        # 기믹으로 모은 게이지가 30% 이상일 때 SPACE/Z를 한 번만 눌러도 NGB 부스터 돌진이 시작되며,
        # 게이지가 모두 소진될 때까지 전방 플라즈마 범퍼로 차량들을 파괴하며 질주합니다!
        want_boost_key = keys[pygame.K_SPACE] or keys[pygame.K_z]
        if not p.is_boosting and want_boost_key and p.nitro >= 30.0:
            p.is_boosting = True
            p.smash_combo = 0
            self.sound.play("nitro")
            self.shockwaves.append(ShockwaveRing(p.x, p.y, N_RED, 120))
            self.floating_texts.append(
                FloatingText(p.x, p.y - 65, "[NGB] N 그린 부스트 발동! 차량 격파 돌진!", CYAN, 22)
            )

        if p.is_boosting:
            p.nitro = max(0.0, p.nitro - p.nitro_drain * dt)
            target_max = p.nitro_max_speed
            p.speed = min(target_max, p.speed + p.accel * 2.8 * dt)
            self.camera_shake = max(self.camera_shake, 3.5)

            # 트윈 애프터버너 플라즈마 화염 파티클
            for offset_x in (-12, 12):
                self.particles.append(
                    Particle(
                        p.x + offset_x + random.uniform(-2, 2),
                        p.y + p.height // 2 + 4,
                        random.uniform(-30, 30),
                        random.uniform(140, 260),
                        random.choice([CYAN, PINK, YELLOW, WHITE]),
                        random.randint(6, 11),
                        0.24,
                    )
                )
            if p.nitro <= 0.0:
                p.is_boosting = False
                p.smash_combo = 0
                p.invincible_timer = max(p.invincible_timer, 0.8)
        else:
            if keys[pygame.K_w] or keys[pygame.K_UP]:
                p.speed = min(p.base_max_speed, p.speed + p.accel * dt)
            elif keys[pygame.K_s] or keys[pygame.K_DOWN]:
                p.speed = max(p.min_speed, p.speed - p.accel * 1.8 * dt)
            else:
                cruise = p.base_max_speed * 0.74
                if p.speed < cruise:
                    p.speed = min(cruise, p.speed + p.accel * 0.55 * dt)
                elif p.speed > p.base_max_speed:
                    p.speed = max(p.base_max_speed, p.speed - p.accel * 1.2 * dt)

        # 2. 상하좌우 이동(WASD / 방향키) 및 기믹 1: [드리프트 부스터 차징]
        steer_dir = 0
        if keys[pygame.K_a] or keys[pygame.K_LEFT]:
            steer_dir -= 1
        if keys[pygame.K_d] or keys[pygame.K_RIGHT]:
            steer_dir += 1

        vert_dir = 0
        if keys[pygame.K_w] or keys[pygame.K_UP]:
            vert_dir -= 1
        if keys[pygame.K_s] or keys[pygame.K_DOWN]:
            vert_dir += 1

        target_vy = vert_dir * (p.steer_power * 0.85)
        p.vy += (target_vy - p.vy) * min(1.0, dt * 12.0)

        want_drift = (keys[pygame.K_LSHIFT] or keys[pygame.K_RSHIFT] or keys[pygame.K_x]) and steer_dir != 0 and p.speed > 310
        prev_x, prev_y = p.x, p.y

        if want_drift:
            p.is_drifting = True
            target_vx = steer_dir * p.steer_power * 1.34
            p.vx += (target_vx - p.vx) * min(1.0, dt * 8.0)
            target_angle = -steer_dir * 23.0
            p.angle += (target_angle - p.angle) * min(1.0, dt * 10.0)

            # 드리프트 기믹으로 부스터 급속 충전 (+24%/초)
            hit_full = p.add_booster_gauge(24.0 * dt)
            if hit_full:
                self.sound.play("powerup")
                self.floating_texts.append(FloatingText(p.x, p.y - 70, "MAX 부스터 완충! [SPACE]", YELLOW, 24))

            p.drift_score_accum += 95.0 * dt
            self.score += 95.0 * dt

            # 네온 컬러 스키드마크 & 마찰 스파크
            self.skid_marks.append(SkidMark(prev_x - 15, prev_y + 30, p.x - 15, p.y + 30, (35, 18, 45)))
            self.skid_marks.append(SkidMark(prev_x + 15, prev_y + 30, p.x + 15, p.y + 30, (35, 18, 45)))
            for side in (-15, 15):
                self.particles.append(
                    Particle(
                        p.x + side,
                        p.y + 34,
                        random.uniform(-55, 55),
                        random.uniform(40, 120),
                        random.choice([p.car_info["glow_color"], YELLOW, (220, 230, 240)]),
                        random.randint(4, 8),
                        0.28,
                    )
                )

            self.drift_sound_timer -= dt
            if self.drift_sound_timer <= 0:
                self.sound.play("drift")
                self.drift_sound_timer = 0.14
        else:
            if p.is_drifting and p.drift_score_accum >= 45:
                bonus = int(p.drift_score_accum)
                self.floating_texts.append(
                    FloatingText(p.x, p.y - 50, f"드리프트 차징 +{bonus}!", CYAN, 20)
                )
            p.is_drifting = False
            p.drift_score_accum = 0.0

            target_vx = steer_dir * p.steer_power
            p.vx += (target_vx - p.vx) * min(1.0, dt * 12.5)
            target_angle = -steer_dir * 8.5
            p.angle += (target_angle - p.angle) * min(1.0, dt * 12.0)

        p.x += p.vx * dt
        p.y += p.vy * dt

        min_x = ROAD_LEFT + p.width // 2 + 6
        max_x = ROAD_RIGHT - p.width // 2 - 6
        if p.x < min_x:
            p.x = min_x
            p.vx = 0
        elif p.x > max_x:
            p.x = max_x
            p.vx = 0

        min_y = 95
        max_y = SCREEN_HEIGHT - 80
        if p.y < min_y:
            p.y = min_y
            p.vy = 0
        elif p.y > max_y:
            p.y = max_y
            p.vy = 0

        # 고속/부스터/드리프트 중 슈퍼카 네온 잔상 기록
        if p.is_boosting or p.is_drifting:
            p.trail_history.append((p.x, p.y, p.angle))
            if len(p.trail_history) > 5:
                p.trail_history.pop(0)
        elif p.trail_history:
            p.trail_history.pop(0)

        # 3. 거리 및 배경 스크롤 (현대자동차 노면/전광판 등장 주기를 기존의 1/3 빈도인 2160px로 조정)
        self.road_scroll = (self.road_scroll + p.speed * dt) % 80
        self.brand_scroll = (self.brand_scroll + p.speed * dt) % 2160
        self.distance_km += (p.speed * dt) / 2800.0
        self.score += (p.speed * dt) * 0.08

        for item in self.scenery_items:
            item["y"] += p.speed * dt
            if item["y"] > SCREEN_HEIGHT + 80:
                item["y"] -= SCREEN_HEIGHT + 220
                item["type"] = random.choices(["lamp", "tree", "neon"], weights=[4, 4, 1])[0]

        # 4. 트래픽 스폰, AI 업데이트 & 차량끼리의 충돌 처리
        self.traffic_spawn_timer -= dt
        if self.traffic_spawn_timer <= 0:
            self.spawn_traffic()
            base_interval = max(0.35, 0.85 - self.distance_km * 0.05)
            self.traffic_spawn_timer = base_interval * (420.0 / max(300.0, p.speed))

        for t in self.traffic:
            t.update(dt, p.speed, self.traffic)

        # AI 차량들끼리 부딪혀서 튕겨나가는 물리 & 연쇄 파괴 처리
        self.handle_traffic_collisions()

        p_hitbox = p.get_hitbox()
        for t in self.traffic[:]:
            if t.y > SCREEN_HEIGHT + 220 or t.y < -420 or t.x < -120 or t.x > SCREEN_WIDTH + 120 or (t.is_wrecked and t.wreck_timer <= 0):
                self.traffic.remove(t)
                continue

            if t.is_wrecked:
                continue

            t_hitbox = t.get_hitbox()

            # 플레이어와 트래픽 차량 충돌 판정
            if p_hitbox.colliderect(t_hitbox):
                # [핵심 기능] 부스터 돌진 중이거나 1초 보호막이 유지 중일 때는 차량을 날려버리며 파괴!
                if p.is_boosting or p.shield_timer > 0:
                    if not p.is_boosting and p.shield_timer > 0:
                        p.shield_timer = 0.0

                    p.smash_combo += 1
                    self.smashed_cars_count += 1
                    smash_pts = 300 * p.smash_combo
                    self.score += smash_pts
                    self.run_coins += 1

                    # 부딪힌 차를 전방 대각선 위로 강하게 회전시키며 날려버림 (다른 차들과 연쇄 추돌 유발!)
                    dx = t.x - p.x
                    launch_dir = math.copysign(1.0, dx) if abs(dx) > 4 else random.choice([-1.0, 1.0])
                    t.apply_impulse(
                        launch_dir * random.uniform(360, 580) + p.vx * 0.5,
                        random.uniform(-820, -600),
                        launch_dir * random.uniform(580, 920),
                        wrecked=True,
                    )

                    self.sound.play("smash")
                    self.camera_shake = 15.0
                    self._spawn_explosion(t.x, t.y, ORANGE)
                    self.shockwaves.append(ShockwaveRing(t.x, t.y, CYAN, 105))
                    self.floating_texts.append(
                        FloatingText(
                            t.x,
                            t.y - 35,
                            f"SMASH x{p.smash_combo}! +{smash_pts}",
                            ORANGE if p.smash_combo == 1 else YELLOW,
                            23,
                        )
                    )
                    continue

                elif p.invincible_timer <= 0:
                    # 부스터 없이 부딪힌 경우에도 상대 차량이 옆으로 튕겨나감
                    dx = t.x - p.x
                    push_dir = math.copysign(1.0, dx) if abs(dx) > 4 else random.choice([-1.0, 1.0])
                    t.apply_impulse(push_dir * 380, -320, push_dir * 360)

                    self.sound.play("crash")
                    p.hp -= 1
                    p.invincible_timer = 1.6
                    p.speed = max(p.min_speed, p.speed * 0.60)
                    self.camera_shake = 16.0
                    self._spawn_explosion((p.x + t.x) * 0.5, (p.y + t.y) * 0.5, RED)
                    self.floating_texts.append(FloatingText(p.x, p.y - 45, "충돌! -1 HP", RED, 24))
                    if p.hp <= 0:
                        self.trigger_game_over()
                        return
                    continue

            # 기믹 2: [아슬아슬 회피 (슬립스트림 스치기) -> 부스터 비활성화 상태에서만 충전 (+18%)]
            if not p.is_boosting and not t.near_missed and abs(t.y - p.y) < 46:
                horiz_gap = abs(t.x - p.x) - (p.width + t.width) * 0.5
                if 0 < horiz_gap < 34 and p.speed > 350:
                    t.near_missed = True
                    self.near_miss_count += 1
                    self.score += 180
                    hit_full = p.add_booster_gauge(18.0)
                    self.sound.play("nearmiss")
                    if hit_full:
                        self.sound.play("powerup")
                    # 스쳐 지나간 차에서 내 차로 에너지가 흡수되는 번개 아크 연출
                    self.energy_arcs.append({"x1": t.x, "y1": t.y, "x2": p.x, "y2": p.y, "life": 0.25})
                    self.floating_texts.append(
                        FloatingText(p.x, p.y - 60, "슬립스트림 회피! 부스터 +18%", YELLOW, 20)
                    )

        # 5. 기믹 3: [에너지 코어 및 코인 수집으로 부스터 충전]
        self.item_spawn_timer -= dt
        if self.item_spawn_timer <= 0:
            self.spawn_collectibles()
            self.item_spawn_timer = random.uniform(1.9, 3.2)

        for c in self.collectibles[:]:
            c.update(dt, p.speed * 0.75, p)
            if math.hypot(c.x - p.x, c.y - p.y) < (c.radius + 30):
                if c.kind == "coin":
                    self.run_coins += 1
                    self.score += 50
                    p.add_booster_gauge(4.5)
                    self.sound.play("coin")
                elif c.kind == "nitro":
                    p.add_booster_gauge(45.0)
                    self.sound.play("powerup")
                    self.floating_texts.append(FloatingText(p.x, p.y - 45, "에너지 코어! 부스터 +45%", CYAN, 22))
                elif c.kind == "shield":
                    # 획득 시 딱 1.0초 동안만 유지되는 순간 방어막!
                    p.shield_timer = 1.0
                    self.sound.play("powerup")
                    self.floating_texts.append(FloatingText(p.x, p.y - 45, "순간 보호막 1.0초!", BLUE, 22))
                elif c.kind == "magnet":
                    p.magnet_timer = 8.0
                    self.sound.play("powerup")
                    self.floating_texts.append(FloatingText(p.x, p.y - 45, "코인 자석 8초!", PURPLE, 22))
                elif c.kind == "repair":
                    if p.hp < p.max_hp:
                        p.hp += 1
                        self.floating_texts.append(FloatingText(p.x, p.y - 45, "내구도 회복 +1!", GREEN, 22))
                    else:
                        self.score += 250
                        self.floating_texts.append(FloatingText(p.x, p.y - 45, "보너스 +250!", GREEN, 22))
                    self.sound.play("powerup")

                self.collectibles.remove(c)
            elif c.y > SCREEN_HEIGHT + 80:
                self.collectibles.remove(c)

        # 6. 이펙트 업데이트
        for sk in self.skid_marks[:]:
            sk.update(dt, p.speed)
            if sk.life <= 0:
                self.skid_marks.remove(sk)

        for pt in self.particles[:]:
            pt.update(dt, p.speed * 0.35)
            if pt.life <= 0:
                self.particles.remove(pt)

        for sw in self.shockwaves[:]:
            sw.update(dt)
            if sw.life <= 0:
                self.shockwaves.remove(sw)

        for arc in self.energy_arcs[:]:
            arc["life"] -= dt
            arc["x2"] = p.x
            arc["y2"] = p.y
            if arc["life"] <= 0:
                self.energy_arcs.remove(arc)

        for ft in self.floating_texts[:]:
            ft.update(dt)
            if ft.life <= 0:
                self.floating_texts.remove(ft)

    def _spawn_sparks(self, x, y, count, color):
        for _ in range(count):
            ang = random.uniform(0, math.pi * 2)
            spd = random.uniform(70, 220)
            self.particles.append(
                Particle(x, y, math.cos(ang) * spd, math.sin(ang) * spd, random.choice([color, WHITE, ORANGE]), random.randint(3, 6), 0.25)
            )

    def _spawn_explosion(self, x, y, base_color):
        for _ in range(32):
            ang = random.uniform(0, math.pi * 2)
            spd = random.uniform(80, 320)
            self.particles.append(
                Particle(
                    x,
                    y,
                    math.cos(ang) * spd,
                    math.sin(ang) * spd,
                    random.choice([base_color, YELLOW, WHITE, RED]),
                    random.randint(4, 11),
                    random.uniform(0.3, 0.65),
                )
            )

    def trigger_game_over(self):
        self.state = "GAMEOVER"
        final_score = int(self.score)
        if final_score > self.save_data["high_score"]:
            self.save_data["high_score"] = final_score
        self.save_data["coins"] += self.run_coins
        save_game_data(self.save_data)

    # ------------------------------------------------------------------------
    # 고품질 렌더링 (도로 질감, 조명 빛무리, 가드레일, 슈퍼카 잔상, HUD)
    # ------------------------------------------------------------------------
    def draw_world(self, surf):
        stage = int(self.distance_km // 3.0) % 3
        if stage == 0:
            side_color = (22, 30, 42)
            grid_color = (34, 48, 68)
        elif stage == 1:
            side_color = (44, 24, 38)
            grid_color = (72, 38, 62)
        else:
            side_color = (14, 12, 30)
            grid_color = (38, 24, 72)

        surf.fill(side_color)

        # 1. 도로 외곽 사이버 그리드 패턴 (속도감 향상)
        for gy in range(-80, SCREEN_HEIGHT + 80, 40):
            sy = int(gy + self.road_scroll)
            pygame.draw.line(surf, grid_color, (0, sy), (ROAD_LEFT - 20, sy), 1)
            pygame.draw.line(surf, grid_color, (ROAD_RIGHT + 20, sy), (SCREEN_WIDTH, sy), 1)
        for gx in (45, 95, 135, SCREEN_WIDTH - 135, SCREEN_WIDTH - 95, SCREEN_WIDTH - 45):
            pygame.draw.line(surf, grid_color, (gx, 0), (gx, SCREEN_HEIGHT), 1)

        # 2. 고속도로 아스팔트 베이스 및 차선 주행 트랙 질감
        pygame.draw.rect(surf, ASPHALT, (ROAD_LEFT, 0, ROAD_WIDTH, SCREEN_HEIGHT))
        # 도로 가장자리 숄더 음영
        pygame.draw.rect(surf, (30, 32, 40), (ROAD_LEFT, 0, 18, SCREEN_HEIGHT))
        pygame.draw.rect(surf, (30, 32, 40), (ROAD_RIGHT - 18, 0, 18, SCREEN_HEIGHT))

        # 각 차선 중앙의 타이어 마모 트랙 라인 (입체감 부여)
        for lane in range(NUM_LANES):
            cx = int(ROAD_LEFT + (lane + 0.5) * LANE_WIDTH)
            pygame.draw.rect(surf, (33, 35, 43), (cx - 18, 0, 10, SCREEN_HEIGHT))
            pygame.draw.rect(surf, (33, 35, 43), (cx + 8, 0, 10, SCREEN_HEIGHT))

        # 2-1. 현대자동차 HMG 드라이빙 익스피리언스 서킷 노면 로고 페인팅 (기존 대비 1/3 빈도인 2160px 주기로 등장)
        mark_y = int(self.brand_scroll) - 120
        if -80 <= mark_y <= SCREEN_HEIGHT + 80:
            road_cx = (ROAD_LEFT + ROAD_RIGHT) // 2
            pygame.draw.rect(surf, (34, 48, 72), (road_cx - 170, mark_y - 34, 340, 68), border_radius=10)
            pygame.draw.rect(surf, PERFORMANCE_BLUE, (road_cx - 170, mark_y - 34, 340, 68), width=2, border_radius=10)
            pygame.draw.rect(surf, N_RED, (road_cx - 170, mark_y + 26, 340, 8), border_bottom_left_radius=10, border_bottom_right_radius=10)
            draw_hyundai_emblem(surf, road_cx - 122, mark_y - 4, 24, 13, (170, 210, 245), thickness=2)
            mark_txt = self.font_md.render("HYUNDAI   N   PERFORMANCE", True, (175, 205, 238))
            surf.blit(mark_txt, mark_txt.get_rect(center=(road_cx + 22, mark_y - 5)))

        # 3. 금속 가드레일 및 현대 N 시그니처 연석 (Performance Blue / N Red / White)
        curb_w = 14
        pygame.draw.rect(surf, (75, 82, 95), (ROAD_LEFT - curb_w - 8, 0, 6, SCREEN_HEIGHT))
        pygame.draw.rect(surf, (75, 82, 95), (ROAD_RIGHT + curb_w + 2, 0, 6, SCREEN_HEIGHT))

        for y in range(-80, SCREEN_HEIGHT + 80, 40):
            cy = int(y + self.road_scroll)
            seg_mod = (y // 40) % 3
            if seg_mod == 0:
                c_col = N_RED
            elif seg_mod == 1:
                c_col = (235, 240, 245)
            else:
                c_col = PERFORMANCE_BLUE
            pygame.draw.rect(surf, c_col, (ROAD_LEFT - curb_w, cy, curb_w, 40))
            pygame.draw.rect(surf, c_col, (ROAD_RIGHT, cy, curb_w, 40))
            # 가드레일 지주 기둥
            pygame.draw.rect(surf, (120, 130, 145), (ROAD_LEFT - curb_w - 10, cy, 8, 6), border_radius=1)
            pygame.draw.rect(surf, (120, 130, 145), (ROAD_RIGHT + curb_w + 2, cy, 8, 6), border_radius=1)

        # 4. 차선 점선 및 고휘도 표지병 (Cat's-Eye 반사등)
        for lane in range(1, NUM_LANES):
            lx = int(ROAD_LEFT + lane * LANE_WIDTH)
            for y in range(-80, SCREEN_HEIGHT + 80, 80):
                ly = int(y + self.road_scroll)
                pygame.draw.rect(surf, (195, 202, 215), (lx - 3, ly, 6, 42), border_radius=2)
                pygame.draw.rect(surf, WHITE, (lx - 1, ly + 4, 2, 34))
                # 점선 사이 반사 표지병
                ref_y = ly + 58
                pygame.draw.circle(surf, PERFORMANCE_BLUE, (lx, ref_y), 3)
                pygame.draw.circle(surf, WHITE, (lx, ref_y), 1)

        # 5. 가로등 볼류메트릭 빛무리 & 도로변 HYUNDAI / N 전광판 오브젝트
        for item in self.scenery_items:
            iy = int(item["y"])
            for idx, side_x in enumerate((75, SCREEN_WIDTH - 75)):
                if item["type"] == "lamp":
                    # 가로등 기둥 & 암(Arm)
                    arm_end = ROAD_LEFT - 4 if idx == 0 else ROAD_RIGHT + 4
                    pygame.draw.line(surf, (110, 118, 135), (side_x, iy), (arm_end, iy), 4)
                    pygame.draw.circle(surf, (80, 85, 100), (side_x, iy), 9)
                    pygame.draw.circle(surf, (255, 245, 190), (arm_end, iy), 6)
                    # 도로 위에 드리워지는 따뜻한 가로등 빛무리
                    halo = pygame.Surface((110, 110), pygame.SRCALPHA)
                    pygame.draw.circle(halo, (255, 230, 150, 26), (55, 55), 52)
                    pygame.draw.circle(halo, (255, 245, 200, 42), (55, 55), 26)
                    surf.blit(halo, (arm_end - 55, iy - 55))
                elif item["type"] == "tree":
                    pygame.draw.circle(surf, (0, 0, 0, 90), (side_x + 5, iy + 6), 24)
                    pygame.draw.circle(surf, (24, 72, 48), (side_x, iy), 24)
                    pygame.draw.circle(surf, (38, 105, 68), (side_x - 3, iy - 3), 18)
                    pygame.draw.circle(surf, (62, 140, 88), (side_x - 6, iy - 6), 10)
                else:
                    # 현대자동차 / N 브랜드 네온 빌보드 사인
                    pygame.draw.rect(surf, HYUNDAI_BLUE, (side_x - 28, iy - 16, 56, 32), border_radius=5)
                    pygame.draw.rect(surf, PERFORMANCE_BLUE, (side_x - 28, iy - 16, 56, 32), width=2, border_radius=5)
                    pygame.draw.rect(surf, N_RED, (side_x - 28, iy + 11, 56, 5), border_bottom_left_radius=5, border_bottom_right_radius=5)
                    if idx == 0:
                        draw_hyundai_emblem(surf, side_x, iy - 2, 18, 10, WHITE, thickness=2)
                    else:
                        n_lbl = self.font_xs.render("HYUNDAI N", True, WHITE)
                        surf.blit(n_lbl, n_lbl.get_rect(center=(side_x, iy - 2)))

        for sk in self.skid_marks:
            sk.draw(surf)

        for c in self.collectibles:
            c.draw(surf, self.font_sm)

        # 6. 플레이어 슈퍼카 전용 전방 LED 헤드라이트 빔
        p = self.player
        beam_surf = pygame.Surface((170, 200), pygame.SRCALPHA)
        glow_c = p.car_info["glow_color"]
        pygame.draw.polygon(beam_surf, (*glow_c, 42), [(65, 195), (8, 0), (88, 0)])
        pygame.draw.polygon(beam_surf, (*glow_c, 42), [(105, 195), (82, 0), (162, 0)])
        pygame.draw.polygon(beam_surf, (255, 255, 240, 38), [(68, 195), (36, 15), (134, 15), (102, 195)])
        surf.blit(beam_surf, (int(p.x - 85), int(p.y - p.height // 2 - 182)))

        # 트래픽 차량 렌더링
        for t in self.traffic:
            t.draw(surf)

        for pt in self.particles:
            pt.draw(surf)

        for sw in self.shockwaves:
            sw.draw(surf)

        # 슬립스트림 에너지 흡수 번개 선
        for arc in self.energy_arcs:
            mid_x = (arc["x1"] + arc["x2"]) * 0.5 + random.uniform(-14, 14)
            mid_y = (arc["y1"] + arc["y2"]) * 0.5 + random.uniform(-14, 14)
            pygame.draw.lines(surf, CYAN, False, [(arc["x1"], arc["y1"]), (mid_x, mid_y), (arc["x2"], arc["y2"])], 3)
            pygame.draw.lines(surf, WHITE, False, [(arc["x1"], arc["y1"]), (mid_x, mid_y), (arc["x2"], arc["y2"])], 1)

        # 7. 플레이어 슈퍼카 네온 잔상 (부스터/드리프트 시)
        for idx, (tx, ty, tang) in enumerate(p.trail_history):
            ghost = pygame.transform.rotate(p.base_surf, tang).copy()
            ghost.set_alpha(30 + idx * 18)
            surf.blit(ghost, ghost.get_rect(center=(int(tx), int(ty))))

        # 플레이어 슈퍼카 바닥 펄스 링
        pulse_r = 46 + int(5 * math.sin(pygame.time.get_ticks() * 0.012))
        pygame.draw.circle(surf, p.car_info["glow_color"], (int(p.x), int(p.y)), pulse_r, 2)

        # 플레이어 슈퍼카 본체
        if p.invincible_timer <= 0 or int(p.invincible_timer * 15) % 2 == 0:
            rot_surf = pygame.transform.rotate(p.base_surf, p.angle)
            rect = rot_surf.get_rect(center=(int(p.x), int(p.y)))
            surf.blit(rot_surf, rect)

        # 파괴 부스터 활성화 시 전방 V자 플라즈마 람(Ram) 충격파 보호막 표시
        if p.is_boosting:
            ram_pts = [
                (int(p.x), int(p.y - p.height // 2 - 28)),
                (int(p.x - 46), int(p.y - 4)),
                (int(p.x - 32), int(p.y + 18)),
                (int(p.x), int(p.y - p.height // 2 - 10)),
                (int(p.x + 32), int(p.y + 18)),
                (int(p.x + 46), int(p.y - 4)),
            ]
            pygame.draw.polygon(surf, CYAN, ram_pts, 0)
            pygame.draw.polygon(surf, WHITE, ram_pts, 2)

            for _ in range(10):
                sx = random.choice([random.randint(15, ROAD_LEFT - 25), random.randint(ROAD_RIGHT + 25, SCREEN_WIDTH - 15)])
                sy = random.randint(0, SCREEN_HEIGHT)
                pygame.draw.line(surf, CYAN, (sx, sy), (sx, sy + 75), 2)

        # 8. 1초 순간 방어막: 회전하는 육각형 에너지 필드 & 남은 시간 표시
        if p.shield_timer > 0:
            rot_t = pygame.time.get_ticks() * 0.008
            hex_pts = [
                (int(p.x + 56 * math.cos(rot_t + i * math.pi / 3)), int(p.y + 56 * math.sin(rot_t + i * math.pi / 3)))
                for i in range(6)
            ]
            pygame.draw.polygon(surf, CYAN, hex_pts, 3)
            pygame.draw.circle(surf, BLUE, (int(p.x), int(p.y)), int(58 * min(1.0, p.shield_timer)), 2)

        if p.magnet_timer > 0:
            r = 48 + int(6 * math.sin(pygame.time.get_ticks() * 0.01))
            pygame.draw.circle(surf, PURPLE, (int(p.x), int(p.y)), r, 2)

        # 9. 고속도로 상부 현대자동차 HMG 드라이빙 익스피리언스 아치형 전광판 (기존 대비 1/3 빈도인 2160px 주기로 등장)
        gantry_y = int((self.brand_scroll + 1080) % 2160) - 90
        if -70 <= gantry_y <= SCREEN_HEIGHT + 40:
            pygame.draw.rect(surf, (65, 72, 88), (ROAD_LEFT - 18, gantry_y - 16, 12, 34), border_radius=3)
            pygame.draw.rect(surf, (65, 72, 88), (ROAD_RIGHT + 6, gantry_y - 16, 12, 34), border_radius=3)
            pygame.draw.line(surf, (95, 105, 125), (ROAD_LEFT - 12, gantry_y), (ROAD_RIGHT + 12, gantry_y), 6)
            sign_w = 430
            sign_rect = pygame.Rect(SCREEN_WIDTH // 2 - sign_w // 2, gantry_y - 18, sign_w, 34)
            pygame.draw.rect(surf, (10, 26, 56), sign_rect, border_radius=6)
            pygame.draw.rect(surf, PERFORMANCE_BLUE, sign_rect, width=2, border_radius=6)
            pygame.draw.rect(surf, N_RED, (sign_rect.left, sign_rect.bottom - 5, sign_w, 5), border_bottom_left_radius=6, border_bottom_right_radius=6)
            draw_hyundai_emblem(surf, sign_rect.left + 28, gantry_y - 2, 16, 9, WHITE, thickness=2)
            g_txt = self.font_xs.render("HYUNDAI MOTOR GROUP  |  HMG DRIVING EXPERIENCE", True, WHITE)
            surf.blit(g_txt, g_txt.get_rect(center=(SCREEN_WIDTH // 2 + 14, gantry_y - 2)))

        for ft in self.floating_texts:
            ft.draw(surf, self.font_sm)

    def draw_hud(self, surf):
        p = self.player

        # 좌측 상단 정보 패널 (현대 블루 & 퍼포먼스 블루 헤더)
        panel = pygame.Surface((156, 276), pygame.SRCALPHA)
        pygame.draw.rect(panel, (10, 18, 34, 232), (0, 0, 156, 276), border_radius=12)
        pygame.draw.rect(panel, PERFORMANCE_BLUE, (0, 0, 156, 24), border_top_left_radius=12, border_top_right_radius=12)
        pygame.draw.rect(panel, N_RED, (0, 22, 156, 3))
        pygame.draw.rect(panel, (90, 125, 165, 255), (0, 0, 156, 276), width=2, border_radius=12)
        surf.blit(panel, (8, 12))

        draw_hyundai_emblem(surf, 28, 24, 11, 6, WHITE, thickness=2)
        surf.blit(self.font_xs.render("HYUNDAI N", True, WHITE), (44, 15))

        surf.blit(self.font_xs.render("점수 (SCORE)", True, GRAY), (20, 40))
        surf.blit(self.font_md.render(f"{int(self.score):,}", True, WHITE), (20, 56))

        surf.blit(self.font_xs.render("최고 기록 (BEST)", True, GRAY), (20, 88))
        best_val = max(int(self.score), self.save_data["high_score"])
        surf.blit(self.font_sm.render(f"{best_val:,}", True, YELLOW), (20, 105))

        surf.blit(self.font_xs.render("격파한 차량 (SMASH)", True, GRAY), (20, 134))
        surf.blit(self.font_sm.render(f"{self.smashed_cars_count} 대", True, ORANGE), (20, 151))

        surf.blit(self.font_xs.render("주행 거리", True, GRAY), (20, 180))
        surf.blit(self.font_sm.render(f"{self.distance_km:.2f} km", True, CYAN), (20, 197))

        surf.blit(self.font_xs.render("획득 코인", True, GRAY), (20, 226))
        surf.blit(self.font_sm.render(f"$ {self.run_coins} (총 {self.save_data['coins'] + self.run_coins})", True, YELLOW), (20, 244))

        # 우측 상단 디지털 클러스터 & N 그린 부스트 (NGB) 게이지 패널
        rpanel = pygame.Surface((156, 304), pygame.SRCALPHA)
        pygame.draw.rect(rpanel, (10, 18, 34, 232), (0, 0, 156, 304), border_radius=12)
        pygame.draw.rect(rpanel, p.car_info["glow_color"], (0, 0, 156, 6), border_top_left_radius=12, border_top_right_radius=12)
        pygame.draw.rect(rpanel, (90, 125, 165, 255), (0, 0, 156, 304), width=2, border_radius=12)
        rx = SCREEN_WIDTH - 164
        surf.blit(rpanel, (rx, 12))

        kmh = int(p.speed * 0.42)
        surf.blit(self.font_xs.render("속도 (SPEED)", True, GRAY), (rx + 14, 22))
        spd_col = CYAN if p.is_boosting else (ORANGE if kmh > 230 else WHITE)
        surf.blit(self.font_lg.render(f"{kmh}", True, spd_col), (rx + 14, 40))
        surf.blit(self.font_xs.render("km/h", True, GRAY), (rx + 96, 56))

        # 현대 N 시그니처 붉은색 원형 NGB 버튼 아이콘 & N 그린 부스트 게이지 바
        ready = p.nitro >= 30.0 or p.is_boosting
        ngb_btn_col = N_RED if ready else (90, 40, 45)
        pygame.draw.circle(surf, ngb_btn_col, (rx + 28, 100), 14)
        pygame.draw.circle(surf, WHITE if ready else GRAY, (rx + 28, 100), 14, 2)
        ngb_t = self.font_xs.render("N", True, WHITE)
        surf.blit(ngb_t, ngb_t.get_rect(center=(rx + 28, 100)))

        label_col = YELLOW if p.nitro >= 100.0 else (CYAN if ready else GRAY)
        status_str = "NGB 오버부스트!" if p.is_boosting else ("발동 가능 [SPACE]" if ready else "기믹 충전 필요")
        surf.blit(self.font_xs.render("N 그린 부스트", True, label_col), (rx + 46, 84))
        surf.blit(self.font_xs.render(status_str, True, label_col), (rx + 46, 102))

        pygame.draw.rect(surf, DARK_GRAY, (rx + 14, 128, 126, 18), border_radius=6)
        nitro_w = int(126 * (p.nitro / 100.0))
        if nitro_w > 0:
            bar_col = N_RED if p.is_boosting else (YELLOW if p.nitro >= 100 else (PERFORMANCE_BLUE if ready else BLUE))
            pygame.draw.rect(surf, bar_col, (rx + 14, 128, nitro_w, 18), border_radius=6)
            pygame.draw.rect(surf, WHITE, (rx + 16, 130, max(2, nitro_w - 4), 4), border_radius=2)
        # 30% 최소 발동 기준선
        thresh_x = rx + 14 + int(126 * 0.30)
        pygame.draw.line(surf, RED, (thresh_x, 126), (thresh_x, 148), 2)
        pygame.draw.rect(surf, WHITE, (rx + 14, 128, 126, 18), width=1, border_radius=6)

        # 기믹 충전 가이드
        surf.blit(self.font_xs.render("• 드리프트: 급속충전", True, (170, 210, 230)), (rx + 14, 152))
        surf.blit(self.font_xs.render("• 슬립스트림: +18%", True, (170, 210, 230)), (rx + 14, 170))

        # 내구도 (HP) 표시
        surf.blit(self.font_xs.render("차체 내구도 (HP)", True, GRAY), (rx + 14, 198))
        for i in range(p.max_hp):
            col = N_RED if i < p.hp else DARK_GRAY
            pygame.draw.rect(surf, col, (rx + 14 + i * 26, 218, 22, 16), border_radius=4)
            if i < p.hp:
                pygame.draw.rect(surf, (255, 150, 150), (rx + 16 + i * 26, 220, 18, 4), border_radius=2)
            pygame.draw.rect(surf, WHITE, (rx + 14 + i * 26, 218, 22, 16), width=1, border_radius=4)

        buff_y = 244
        if p.shield_timer > 0:
            surf.blit(self.font_xs.render(f"● 보호막 ({p.shield_timer:.1f}초)", True, CYAN), (rx + 14, buff_y))
            buff_y += 20
        if p.magnet_timer > 0:
            surf.blit(self.font_xs.render(f"● 자석 ({p.magnet_timer:.1f}초)", True, PURPLE), (rx + 14, buff_y))

        # 상단 중앙 NGB 부스터 준비 알림 배너
        if p.is_boosting:
            banner = self.font_md.render("★ [NGB] N 그린 부스트 질주 중! 전방 차량을 격파하세요! ★", True, YELLOW)
            surf.blit(banner, banner.get_rect(center=(SCREEN_WIDTH // 2, 28)))
        elif p.nitro >= 30.0 and int(pygame.time.get_ticks() * 0.006) % 2 == 0:
            banner = self.font_sm.render("[SPACE] N 그린 부스트(NGB) 발동 가능! (앞차 격파 & 연쇄 추돌)", True, CYAN)
            surf.blit(banner, banner.get_rect(center=(SCREEN_WIDTH // 2, 26)))

        hint = self.font_xs.render(
            "드리프트(SHIFT) / 아슬아슬 회피로 게이지 충전 ➔ 부스터(SPACE)로 차량 파괴 돌진!",
            True,
            (205, 215, 235),
        )
        surf.blit(hint, hint.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT - 16)))

    # ------------------------------------------------------------------------
    # 타이틀 메뉴, 차고(상점), 게임오버 화면
    # ------------------------------------------------------------------------
    def draw_menu(self, surf):
        self.draw_world(surf)
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((8, 14, 28, 198))
        surf.blit(overlay, (0, 0))

        # 상단 현대자동차 공식 엠블럼 & N 브랜드 배너
        badge_rect = pygame.Rect(SCREEN_WIDTH // 2 - 190, 42, 380, 44)
        pygame.draw.rect(surf, HYUNDAI_BLUE, badge_rect, border_radius=22)
        pygame.draw.rect(surf, PERFORMANCE_BLUE, badge_rect, width=2, border_radius=22)
        draw_hyundai_emblem(surf, SCREEN_WIDTH // 2 - 135, 64, 22, 12, WHITE, thickness=2)
        b_lbl = self.font_sm.render("HYUNDAI MOTOR COMPANY  |  N", True, WHITE)
        surf.blit(b_lbl, b_lbl.get_rect(center=(SCREEN_WIDTH // 2 + 22, 64)))

        title1 = self.font_xl.render("HYUNDAI N : HIGHWAY RACER", True, PERFORMANCE_BLUE)
        title2 = self.font_lg.render("현대자동차 N 드리프트 & NGB 디스트로이어", True, WHITE)
        surf.blit(title1, title1.get_rect(center=(SCREEN_WIDTH // 2, 128)))
        surf.blit(title2, title2.get_rect(center=(SCREEN_WIDTH // 2, 182)))

        car_info = CAR_CATALOG[self.save_data["selected_car"]]
        card = pygame.Rect(SCREEN_WIDTH // 2 - 205, 224, 410, 216)
        pygame.draw.rect(surf, (18, 28, 48), card, border_radius=16)
        pygame.draw.rect(surf, car_info["glow_color"], card, width=3, border_radius=16)
        pygame.draw.rect(surf, N_RED, (card.left + 20, card.bottom - 6, card.width - 40, 6), border_radius=3)

        preview_surf = draw_player_supercar_surface(
            54, 98, car_info["body_color"], car_info["accent_color"], car_info["glow_color"]
        )
        surf.blit(preview_surf, preview_surf.get_rect(center=(SCREEN_WIDTH // 2, 300)))

        cname = self.font_md.render(f"출전 차량: {car_info['name']}", True, YELLOW)
        surf.blit(cname, cname.get_rect(center=(SCREEN_WIDTH // 2, 384)))
        csub = self.font_xs.render(car_info["subtitle"], True, (190, 205, 225))
        surf.blit(csub, csub.get_rect(center=(SCREEN_WIDTH // 2, 412)))

        btns = [
            ("[ ENTER / SPACE ]  HMG 드라이빙 주행 시작", GREEN),
            ("[ G ]  현대 N 연구소 차고 & 튜닝 (보유 코인: $ " + str(self.save_data["coins"]) + ")", YELLOW),
            ("[ M ]  배경음악 켜기/끄기 (" + ("ON" if self.sound.bgm_enabled else "OFF") + ")", CYAN),
            ("[ ESC ]  게임 종료", GRAY),
        ]
        for idx, (b_text, b_col) in enumerate(btns):
            by = 480 + idx * 52
            b_rect = pygame.Rect(SCREEN_WIDTH // 2 - 235, by - 20, 470, 42)
            pygame.draw.rect(surf, (20, 30, 50), b_rect, border_radius=10)
            pygame.draw.rect(surf, b_col, b_rect, width=2, border_radius=10)
            t_surf = self.font_sm.render(b_text, True, b_col)
            surf.blit(t_surf, t_surf.get_rect(center=b_rect.center))

    def draw_garage(self, surf):
        surf.fill((12, 20, 36))

        draw_hyundai_emblem(surf, 72, 52, 24, 13, WHITE, thickness=2)
        header = self.font_lg.render("현대자동차 남양연구소 N 차고 (HMG GARAGE)", True, PERFORMANCE_BLUE)
        surf.blit(header, (108, 32))

        coin_txt = self.font_md.render(f"보유 코인: $ {self.save_data['coins']:,}", True, YELLOW)
        surf.blit(coin_txt, (SCREEN_WIDTH - 280, 40))

        tab1_col = CYAN if self.garage_tab == "CARS" else GRAY
        tab2_col = CYAN if self.garage_tab == "UPGRADES" else GRAY
        pygame.draw.rect(surf, (24, 34, 54), (45, 92, 235, 42), border_radius=8)
        pygame.draw.rect(surf, tab1_col, (45, 92, 235, 42), width=2, border_radius=8)
        t1 = self.font_sm.render("[1] 현대 N 라인업 선택/구매", True, tab1_col)
        surf.blit(t1, t1.get_rect(center=(162, 113)))

        pygame.draw.rect(surf, (24, 34, 54), (295, 92, 265, 42), border_radius=8)
        pygame.draw.rect(surf, tab2_col, (295, 92, 265, 42), width=2, border_radius=8)
        t2 = self.font_sm.render("[2] N 퍼포먼스 연구소 튜닝 [TAB]", True, tab2_col)
        surf.blit(t2, t2.get_rect(center=(427, 113)))

        if self.garage_tab == "CARS":
            car = CAR_CATALOG[self.preview_car_idx]
            unlocked = car["id"] in self.save_data["unlocked_cars"]
            selected = car["id"] == self.save_data["selected_car"]

            box = pygame.Rect(60, 165, SCREEN_WIDTH - 120, 440)
            pygame.draw.rect(surf, (20, 28, 46), box, border_radius=16)
            pygame.draw.rect(surf, car["glow_color"], box, width=3, border_radius=16)

            car_surf = draw_player_supercar_surface(
                68, 126, car["body_color"], car["accent_color"], car["glow_color"]
            )
            surf.blit(car_surf, car_surf.get_rect(center=(230, 340)))

            nav_txt = self.font_md.render("◀ [좌/우 방향키] ▶", True, WHITE)
            surf.blit(nav_txt, nav_txt.get_rect(center=(230, 465)))

            info_x = 410
            surf.blit(self.font_lg.render(car["name"], True, WHITE), (info_x, 200))
            surf.blit(self.font_sm.render(car["subtitle"], True, (185, 205, 230)), (info_x, 248))

            stats = [
                ("최고 속도 (PE 출력)", car["base_speed"] / 1.3),
                ("가속력 (런치 컨트롤)", car["base_accel"] / 1.3),
                ("N 코너링/드리프트", car["base_handling"] / 1.3),
                ("N 그린 부스트(NGB)", car["base_nitro"] / 1.4),
            ]
            for i, (sname, ratio) in enumerate(stats):
                sy = 300 + i * 42
                surf.blit(self.font_sm.render(sname, True, WHITE), (info_x, sy))
                pygame.draw.rect(surf, DARK_GRAY, (info_x + 150, sy + 4, 210, 16), border_radius=6)
                pygame.draw.rect(surf, car["glow_color"], (info_x + 150, sy + 4, int(210 * min(1.0, ratio)), 16), border_radius=6)

            action_rect = pygame.Rect(info_x, 485, 360, 52)
            if selected:
                pygame.draw.rect(surf, GREEN, action_rect, width=2, border_radius=10)
                st = self.font_md.render("현재 장착됨", True, GREEN)
            elif unlocked:
                pygame.draw.rect(surf, CYAN, action_rect, width=2, border_radius=10)
                st = self.font_md.render("[ENTER] 이 차량 선택하기", True, CYAN)
            else:
                can_buy = self.save_data["coins"] >= car["price"]
                col = YELLOW if can_buy else RED
                pygame.draw.rect(surf, col, action_rect, width=2, border_radius=10)
                st = self.font_md.render(f"[ENTER] 구매하기 ($ {car['price']})", True, col)
            surf.blit(st, st.get_rect(center=action_rect.center))

        else:
            for idx, upg in enumerate(UPGRADE_INFO):
                uy = 175 + idx * 105
                is_sel = idx == self.selected_upgrade_idx
                lv = self.save_data["upgrades"].get(upg["key"], 1)
                cost = upg["base_cost"] * lv

                card = pygame.Rect(60, uy, SCREEN_WIDTH - 120, 90)
                pygame.draw.rect(surf, (30, 36, 54) if is_sel else (24, 28, 40), card, border_radius=12)
                pygame.draw.rect(surf, CYAN if is_sel else DARK_GRAY, card, width=2, border_radius=12)

                surf.blit(self.font_md.render(f"{upg['name']}  (Lv.{lv}/5)", True, WHITE), (85, uy + 16))
                surf.blit(self.font_xs.render(upg["desc"], True, GRAY), (85, uy + 52))

                for step in range(5):
                    col = GREEN if step < lv else DARK_GRAY
                    pygame.draw.rect(surf, col, (450 + step * 34, uy + 32, 26, 22), border_radius=4)

                if lv >= 5:
                    btxt = self.font_sm.render("MAX 완료", True, GREEN)
                else:
                    can_afford = self.save_data["coins"] >= cost
                    btxt = self.font_sm.render(f"[ENTER] 강화 ($ {cost})", True, YELLOW if can_afford else RED)
                surf.blit(btxt, (660, uy + 32))

        footer = self.font_sm.render("[ESC] 메인 메뉴로 돌아가기   |   [TAB] 차량/업그레이드 탭 전환", True, GRAY)
        surf.blit(footer, footer.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT - 35)))

    def draw_gameover(self, surf):
        self.draw_world(surf)
        self.draw_hud(surf)

        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((12, 10, 18, 210))
        surf.blit(overlay, (0, 0))

        box = pygame.Rect(SCREEN_WIDTH // 2 - 235, 130, 470, 475)
        pygame.draw.rect(surf, (25, 28, 42), box, border_radius=18)
        pygame.draw.rect(surf, RED, box, width=3, border_radius=18)

        t = self.font_xl.render("RACE OVER", True, RED)
        surf.blit(t, t.get_rect(center=(SCREEN_WIDTH // 2, 190)))

        rows = [
            ("최종 점수", f"{int(self.score):,}", WHITE),
            ("최고 점수", f"{self.save_data['high_score']:,}", YELLOW),
            ("주행 거리", f"{self.distance_km:.2f} km", CYAN),
            ("파괴한 차량 수", f"{self.smashed_cars_count} 대", ORANGE),
            ("슬립스트림 회피", f"{self.near_miss_count} 회", CYAN),
            ("획득 코인", f"+ $ {self.run_coins} (보유: $ {self.save_data['coins']})", GREEN),
        ]
        for i, (label, val, col) in enumerate(rows):
            ry = 250 + i * 40
            surf.blit(self.font_sm.render(label, True, GRAY), (SCREEN_WIDTH // 2 - 185, ry))
            v_surf = self.font_md.render(val, True, col)
            surf.blit(v_surf, (SCREEN_WIDTH // 2 + 185 - v_surf.get_width(), ry - 3))

        restart_txt = self.font_md.render("[ ENTER / R ] 다시 달리기", True, GREEN)
        garage_txt = self.font_sm.render("[ G ] 차고/상점 가기    |    [ ESC ] 메인 메뉴", True, CYAN)
        surf.blit(restart_txt, restart_txt.get_rect(center=(SCREEN_WIDTH // 2, 520)))
        surf.blit(garage_txt, garage_txt.get_rect(center=(SCREEN_WIDTH // 2, 562)))

    # ------------------------------------------------------------------------
    # 이벤트 처리 및 메인 루프
    # ------------------------------------------------------------------------
    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False

            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_m:
                    self.sound.toggle_bgm()

                if self.state == "MENU":
                    if event.key in (pygame.K_RETURN, pygame.K_SPACE):
                        self.sound.play("click")
                        self.reset_race()
                        self.state = "PLAYING"
                    elif event.key == pygame.K_g:
                        self.sound.play("click")
                        self.preview_car_idx = self.save_data["selected_car"]
                        self.state = "GARAGE"
                    elif event.key == pygame.K_ESCAPE:
                        return False

                elif self.state == "GARAGE":
                    if event.key == pygame.K_ESCAPE:
                        self.sound.play("click")
                        self.state = "MENU"
                    elif event.key == pygame.K_TAB:
                        self.sound.play("click")
                        self.garage_tab = "UPGRADES" if self.garage_tab == "CARS" else "CARS"
                    elif event.key == pygame.K_1:
                        self.garage_tab = "CARS"
                    elif event.key == pygame.K_2:
                        self.garage_tab = "UPGRADES"
                    elif self.garage_tab == "CARS":
                        if event.key in (pygame.K_LEFT, pygame.K_a):
                            self.sound.play("click")
                            self.preview_car_idx = (self.preview_car_idx - 1) % len(CAR_CATALOG)
                        elif event.key in (pygame.K_RIGHT, pygame.K_d):
                            self.sound.play("click")
                            self.preview_car_idx = (self.preview_car_idx + 1) % len(CAR_CATALOG)
                        elif event.key in (pygame.K_RETURN, pygame.K_SPACE):
                            car = CAR_CATALOG[self.preview_car_idx]
                            if car["id"] in self.save_data["unlocked_cars"]:
                                self.save_data["selected_car"] = car["id"]
                                save_game_data(self.save_data)
                                self.sound.play("powerup")
                            elif self.save_data["coins"] >= car["price"]:
                                self.save_data["coins"] -= car["price"]
                                self.save_data["unlocked_cars"].append(car["id"])
                                self.save_data["selected_car"] = car["id"]
                                save_game_data(self.save_data)
                                self.sound.play("powerup")
                    elif self.garage_tab == "UPGRADES":
                        if event.key in (pygame.K_UP, pygame.K_w):
                            self.sound.play("click")
                            self.selected_upgrade_idx = (self.selected_upgrade_idx - 1) % len(UPGRADE_INFO)
                        elif event.key in (pygame.K_DOWN, pygame.K_s):
                            self.sound.play("click")
                            self.selected_upgrade_idx = (self.selected_upgrade_idx + 1) % len(UPGRADE_INFO)
                        elif event.key in (pygame.K_RETURN, pygame.K_SPACE):
                            upg = UPGRADE_INFO[self.selected_upgrade_idx]
                            lv = self.save_data["upgrades"].get(upg["key"], 1)
                            cost = upg["base_cost"] * lv
                            if lv < 5 and self.save_data["coins"] >= cost:
                                self.save_data["coins"] -= cost
                                self.save_data["upgrades"][upg["key"]] = lv + 1
                                save_game_data(self.save_data)
                                self.sound.play("powerup")

                elif self.state == "PLAYING":
                    if event.key in (pygame.K_p, pygame.K_ESCAPE):
                        self.sound.play("click")
                        self.state = "PAUSED"

                elif self.state == "PAUSED":
                    if event.key in (pygame.K_p, pygame.K_RETURN, pygame.K_SPACE):
                        self.sound.play("click")
                        self.state = "PLAYING"
                    elif event.key == pygame.K_ESCAPE:
                        self.sound.play("click")
                        self.state = "MENU"

                elif self.state == "GAMEOVER":
                    if event.key in (pygame.K_RETURN, pygame.K_SPACE, pygame.K_r):
                        self.sound.play("click")
                        self.reset_race()
                        self.state = "PLAYING"
                    elif event.key == pygame.K_g:
                        self.sound.play("click")
                        self.state = "GARAGE"
                    elif event.key == pygame.K_ESCAPE:
                        self.sound.play("click")
                        self.state = "MENU"

        return True

    async def run(self):
        canvas = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
        running = True
        while running:
            dt = min(0.05, self.clock.tick(FPS) / 1000.0)
            running = self.handle_events()

            if self.state == "MENU":
                self.road_scroll = (self.road_scroll + 260 * dt) % 80
                self.brand_scroll = (self.brand_scroll + 260 * dt) % 2160
                self.draw_menu(canvas)
            elif self.state == "GARAGE":
                self.draw_garage(canvas)
            elif self.state == "PLAYING":
                self.update_playing(dt)
                self.draw_world(canvas)
                self.draw_hud(canvas)
            elif self.state == "PAUSED":
                self.draw_world(canvas)
                self.draw_hud(canvas)
                ov = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
                ov.fill((0, 0, 0, 160))
                canvas.blit(ov, (0, 0))
                pt = self.font_xl.render("PAUSED (일시정지)", True, WHITE)
                ps = self.font_sm.render("[P / ENTER] 계속하기   |   [ESC] 메인 메뉴", True, CYAN)
                canvas.blit(pt, pt.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 20)))
                canvas.blit(ps, ps.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 35)))
            elif self.state == "GAMEOVER":
                self.draw_gameover(canvas)

            if self.camera_shake > 0 and self.state == "PLAYING":
                ox = random.randint(-int(self.camera_shake), int(self.camera_shake))
                oy = random.randint(-int(self.camera_shake), int(self.camera_shake))
                self.screen.blit(canvas, (ox, oy))
            else:
                self.screen.blit(canvas, (0, 0))

            pygame.display.flip()
            await asyncio.sleep(0)

        pygame.quit()
        sys.exit()


async def main():
    game = RacingGame()
    await game.run()

if __name__ == "__main__":
    asyncio.run(main())
