import Phaser from 'phaser';
import { COLORS, VIEWPORT, VS, type GameMode } from '@/config/GameConfig';
import { RankingService } from '@/services/RankingService';
import {
  VsApiError,
  VsService,
  sanitizeRoomCode,
  type CreateRoomResult,
  type JoinRoomResult,
} from '@/services/VsService';

const FONT = 'Fredoka, system-ui, sans-serif';

export class VsMenuScene extends Phaser.Scene {
  private overlay: HTMLDivElement | null = null;

  constructor() {
    super({ key: 'VsMenuScene' });
  }

  create(): void {
    const cx = VIEWPORT.width / 2;

    this.drawBackground();
    this.add
      .text(cx, 240, 'VS PLAY', {
        fontFamily: FONT,
        fontSize: '100px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#ffd54f', 18, false, true);

    this.add
      .text(cx, 340, '最大10人のフレンド対戦', {
        fontFamily: FONT,
        fontSize: '30px',
        color: '#f5f5f5',
      })
      .setOrigin(0.5)
      .setAlpha(0.85);

    this.makeButton(cx, 540, 'ルームを作る', COLORS.lane[1], () => this.openCreate());
    this.makeButton(cx, 660, 'コードで参加', COLORS.lane[2], () => this.openJoin());
    this.makeButton(cx, VIEWPORT.height - 220, 'タイトルに戻る', 0x607d8b, () => this.goTitle());

    this.input.keyboard?.once('keydown-ESC', () => this.goTitle());
    this.events.on('shutdown', () => this.removeOverlay());
    this.cameras.main.fadeIn(220, 0, 0, 0);
  }

  private drawBackground(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(COLORS.jungleDark, COLORS.jungleDark, COLORS.background, COLORS.background);
    g.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    color: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const w = 480;
    const h = 84;
    const bg = this.add.graphics();
    const drawBg = (alpha: number) => {
      bg.clear();
      bg.fillStyle(color, alpha);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
      bg.lineStyle(2, 0xffffff, 0.25);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
      bg.fillStyle(0xffffff, 0.12);
      bg.fillRoundedRect(-w / 2 + 5, -h / 2 + 5, w - 10, 18, {
        tl: 12,
        tr: 12,
        bl: 0,
        br: 0,
      });
    };
    drawBg(0.9);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: FONT,
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    const container = this.add.container(x, y);
    const hit = this.add.rectangle(0, 0, w, h, 0, 0).setInteractive({ useHandCursor: true });
    container.add([bg, text, hit]);
    hit.on('pointerover', () => {
      drawBg(1);
      this.tweens.add({ targets: container, scale: 1.06, duration: 130, ease: 'Back.easeOut' });
    });
    hit.on('pointerout', () => {
      drawBg(0.9);
      this.tweens.add({ targets: container, scale: 1, duration: 130 });
    });
    hit.on('pointerdown', onClick);
    return container;
  }

  private goTitle(): void {
    this.removeOverlay();
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('TitleScene'));
  }

  private openCreate(): void {
    this.showOverlay(this.renderCreateForm());
  }

  private openJoin(): void {
    this.showOverlay(this.renderJoinForm());
  }

  private renderCreateForm(): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div style="font-size:30px;font-weight:700;margin-bottom:18px;color:#ffd54f;text-align:center">ルームを作る</div>
      <div style="margin-bottom:14px">
        <div style="font-size:20px;margin-bottom:6px">キーモード</div>
        <div id="vs-mode-row" style="display:flex;gap:10px">
          <button data-mode="2" class="vs-pill" style="flex:1">2KEY</button>
          <button data-mode="4" class="vs-pill" style="flex:1">4KEY</button>
        </div>
      </div>
      <div style="margin-bottom:14px">
        <div style="font-size:20px;margin-bottom:6px">定員 (最大10人)</div>
        <div id="vs-max-row" style="display:flex;flex-wrap:wrap;gap:6px">
          ${[2, 3, 4, 5, 6, 8, 10]
            .map(
              (n) =>
                `<button data-max="${n}" class="vs-pill" style="flex:1;min-width:60px">${n}人</button>`,
            )
            .join('')}
        </div>
      </div>
      <div style="margin-bottom:14px">
        <div style="font-size:20px;margin-bottom:6px">あなたの名前</div>
        <input id="vs-nickname" type="text" maxlength="12" placeholder="12文字以内"
          value="${RankingService.getLastNickname()}"
          style="width:100%;box-sizing:border-box;font-family:Fredoka,sans-serif;font-size:24px;
                 padding:10px 14px;border-radius:10px;border:2px solid #64b5f6;
                 background:#0d2a18;color:#f5f5f5;outline:none">
      </div>
      <div id="vs-error" style="color:#ff5252;font-size:20px;min-height:26px;margin-bottom:10px"></div>
      <div style="display:flex;gap:10px">
        <button id="vs-cancel" class="vs-btn-secondary" style="flex:1">キャンセル</button>
        <button id="vs-submit" class="vs-btn-primary" style="flex:1">作成</button>
      </div>
    `;

    let selectedMode: GameMode = 4;
    let selectedMax = 4;
    const refreshPills = () => {
      wrapper.querySelectorAll<HTMLButtonElement>('#vs-mode-row .vs-pill').forEach((b) => {
        const v = Number(b.dataset.mode);
        b.style.background = v === selectedMode ? '#ba68c8' : '#1f3527';
      });
      wrapper.querySelectorAll<HTMLButtonElement>('#vs-max-row .vs-pill').forEach((b) => {
        const v = Number(b.dataset.max);
        b.style.background = v === selectedMax ? '#ba68c8' : '#1f3527';
      });
    };
    refreshPills();

    wrapper.querySelectorAll<HTMLButtonElement>('#vs-mode-row .vs-pill').forEach((b) => {
      b.addEventListener('click', () => {
        selectedMode = Number(b.dataset.mode) as GameMode;
        refreshPills();
      });
    });
    wrapper.querySelectorAll<HTMLButtonElement>('#vs-max-row .vs-pill').forEach((b) => {
      b.addEventListener('click', () => {
        selectedMax = Number(b.dataset.max);
        refreshPills();
      });
    });

    const errEl = wrapper.querySelector<HTMLDivElement>('#vs-error')!;
    const input = wrapper.querySelector<HTMLInputElement>('#vs-nickname')!;

    wrapper.querySelector('#vs-cancel')!.addEventListener('click', () => this.removeOverlay());
    wrapper.querySelector('#vs-submit')!.addEventListener('click', async () => {
      const nickname = input.value.trim();
      if (!nickname) {
        errEl.textContent = '名前を入力してください';
        return;
      }
      errEl.textContent = '作成中...';
      try {
        const result = await VsService.createRoom(selectedMode, selectedMax, nickname);
        RankingService.saveNickname(nickname);
        this.goLobby('host', result, nickname);
      } catch (e) {
        errEl.textContent = this.errorMessage(e);
      }
    });

    setTimeout(() => input.focus(), 50);
    return wrapper;
  }

  private renderJoinForm(): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div style="font-size:30px;font-weight:700;margin-bottom:18px;color:#ffd54f;text-align:center">コードで参加</div>
      <div style="margin-bottom:14px">
        <div style="font-size:20px;margin-bottom:6px">ルームコード (${VS.codeLength}桁)</div>
        <input id="vs-code" type="text" maxlength="8" placeholder="例: ABC-XYZ"
          style="width:100%;box-sizing:border-box;font-family:Fredoka,sans-serif;font-size:32px;
                 letter-spacing:6px;text-align:center;text-transform:uppercase;
                 padding:14px;border-radius:10px;border:2px solid #64b5f6;
                 background:#0d2a18;color:#f5f5f5;outline:none">
      </div>
      <div style="margin-bottom:14px">
        <div style="font-size:20px;margin-bottom:6px">あなたの名前</div>
        <input id="vs-nickname" type="text" maxlength="12" placeholder="12文字以内"
          value="${RankingService.getLastNickname()}"
          style="width:100%;box-sizing:border-box;font-family:Fredoka,sans-serif;font-size:24px;
                 padding:10px 14px;border-radius:10px;border:2px solid #64b5f6;
                 background:#0d2a18;color:#f5f5f5;outline:none">
      </div>
      <div id="vs-error" style="color:#ff5252;font-size:20px;min-height:26px;margin-bottom:10px"></div>
      <div style="display:flex;gap:10px">
        <button id="vs-cancel" class="vs-btn-secondary" style="flex:1">キャンセル</button>
        <button id="vs-submit" class="vs-btn-primary" style="flex:1">参加</button>
      </div>
    `;

    const codeInput = wrapper.querySelector<HTMLInputElement>('#vs-code')!;
    const nameInput = wrapper.querySelector<HTMLInputElement>('#vs-nickname')!;
    const errEl = wrapper.querySelector<HTMLDivElement>('#vs-error')!;

    codeInput.addEventListener('input', () => {
      const raw = sanitizeRoomCode(codeInput.value);
      codeInput.value = raw.length > 3 ? `${raw.slice(0, 3)}-${raw.slice(3, 6)}` : raw;
    });

    wrapper.querySelector('#vs-cancel')!.addEventListener('click', () => this.removeOverlay());
    wrapper.querySelector('#vs-submit')!.addEventListener('click', async () => {
      const code = sanitizeRoomCode(codeInput.value);
      const nickname = nameInput.value.trim();
      if (code.length !== VS.codeLength) {
        errEl.textContent = `コードは${VS.codeLength}桁です`;
        return;
      }
      if (!nickname) {
        errEl.textContent = '名前を入力してください';
        return;
      }
      errEl.textContent = '参加中...';
      try {
        const result = await VsService.joinRoom(code, nickname);
        RankingService.saveNickname(nickname);
        this.goLobby('guest', { ...result, code }, nickname);
      } catch (e) {
        errEl.textContent = this.errorMessage(e);
      }
    });

    setTimeout(() => codeInput.focus(), 50);
    return wrapper;
  }

  private errorMessage(e: unknown): string {
    if (e instanceof VsApiError) {
      if (e.status === 404) return 'ルームが見つかりません';
      if (e.status === 410) return 'ルームの有効期限が切れています';
      if (e.status === 409) {
        if (e.message.includes('full')) return '満員です';
        if (e.message.includes('already started')) return 'すでに開始しています';
        if (e.message.includes('already joined')) return 'すでに参加済みです';
        return '参加できません';
      }
      if (e.status === 429) return '連続操作はできません。少し待ってください';
    }
    return '通信に失敗しました';
  }

  private goLobby(
    role: 'host' | 'guest',
    info: (CreateRoomResult | (JoinRoomResult & { code: string })) & { code: string },
    nickname: string,
  ): void {
    this.removeOverlay();
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (role === 'host') {
        const r = info as CreateRoomResult;
        this.scene.start('VsLobbyScene', {
          role: 'host',
          code: r.code,
          hostToken: r.hostToken,
          token: r.hostToken,
          slot: r.slot,
          seed: r.seed,
          mode: r.mode,
          maxPlayers: r.maxPlayers,
          myNickname: nickname,
        });
      } else {
        const r = info as JoinRoomResult & { code: string };
        this.scene.start('VsLobbyScene', {
          role: 'guest',
          code: r.code,
          token: r.token,
          slot: r.slot,
          seed: r.seed,
          mode: r.mode,
          maxPlayers: r.maxPlayers,
          myNickname: nickname,
          hostNickname: r.hostNickname,
        });
      }
    });
  }

  private showOverlay(content: HTMLDivElement): void {
    this.removeOverlay();
    if (!document.getElementById('vs-overlay-style')) {
      const style = document.createElement('style');
      style.id = 'vs-overlay-style';
      style.textContent = `
        .vs-pill { font-family: Fredoka, sans-serif; font-size: 22px; padding: 10px;
          border: 1px solid rgba(255,255,255,0.2); border-radius: 8px;
          background: #1f3527; color: #f5f5f5; cursor: pointer; }
        .vs-pill:hover { filter: brightness(1.2); }
        .vs-btn-primary { font-family: Fredoka, sans-serif; font-size: 26px; font-weight: 700;
          padding: 12px; border: none; border-radius: 12px;
          background: #ba68c8; color: #fff; cursor: pointer; }
        .vs-btn-secondary { font-family: Fredoka, sans-serif; font-size: 26px;
          padding: 12px; border: none; border-radius: 12px;
          background: #607d8b; color: #fff; cursor: pointer; }
      `;
      document.head.appendChild(style);
    }
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; left: 50%; top: 50%;
      transform: translate(-50%, -50%);
      background: rgba(10,30,18,0.97);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 20px;
      padding: 28px 32px;
      z-index: 9999;
      font-family: Fredoka, system-ui, sans-serif;
      color: #f5f5f5;
      min-width: 360px;
      max-width: 92vw;
    `;
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    this.overlay = overlay;
  }

  private removeOverlay(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}
