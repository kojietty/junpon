import Phaser from 'phaser';
import { COLORS, VIEWPORT, VS, type GameMode } from '@/config/GameConfig';
import {
  VsApiError,
  VsService,
  formatRoomCode,
  type ParticipantInfo,
  type RoomState,
} from '@/services/VsService';

const FONT = 'Fredoka, system-ui, sans-serif';

interface VsLobbyData {
  role: 'host' | 'guest';
  code: string;
  token: string;
  hostToken?: string;
  slot: number;
  seed: number;
  mode: GameMode;
  maxPlayers: number;
  myNickname: string;
  hostNickname?: string;
}

export class VsLobbyScene extends Phaser.Scene {
  private params!: VsLobbyData;
  private participants: ParticipantInfo[] = [];
  private listContainer!: Phaser.GameObjects.Container;
  private startBtn?: Phaser.GameObjects.Container;
  private startBtnLabel?: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private expiresText!: Phaser.GameObjects.Text;
  private pollTimer?: Phaser.Time.TimerEvent;
  private expireTimer?: Phaser.Time.TimerEvent;
  private leaving = false;
  private starting = false;
  private serverOffset = 0;
  private expiresAt = 0;

  constructor() {
    super({ key: 'VsLobbyScene' });
  }

  create(data: VsLobbyData): void {
    this.params = data;
    // params に統一して以降は this.params を使う
    this.participants = [];
    this.leaving = false;
    this.starting = false;
    this.expiresAt = Date.now() + VS.roomTtlMs;

    const cx = VIEWPORT.width / 2;
    this.drawBackground();

    this.add
      .text(cx, 110, data.role === 'host' ? 'HOST LOBBY' : 'GUEST LOBBY', {
        fontFamily: FONT,
        fontSize: '40px',
        fontStyle: 'bold',
        color: COLORS.textAccent,
      })
      .setOrigin(0.5);

    // ルームコード表示
    this.add
      .text(cx, 200, 'ROOM CODE', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#aaa',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, 280, formatRoomCode(data.code), {
        fontFamily: FONT,
        fontSize: '92px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#ffd54f', 20, false, true);

    const modeLabel = data.mode === 2 ? '2KEY' : '4KEY';
    this.add
      .text(cx, 360, `${modeLabel}  ·  最大 ${data.maxPlayers} 人`, {
        fontFamily: FONT,
        fontSize: '28px',
        color: '#f5f5f5',
      })
      .setOrigin(0.5)
      .setAlpha(0.85);

    // 参加者リスト
    this.add
      .text(cx, 430, 'PLAYERS', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#aaa',
      })
      .setOrigin(0.5);

    this.listContainer = this.add.container(0, 470);

    // ステータス / 期限
    this.statusText = this.add
      .text(cx, VIEWPORT.height - 340, '', {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#f5f5f5',
      })
      .setOrigin(0.5)
      .setAlpha(0.85);

    this.expiresText = this.add
      .text(cx, VIEWPORT.height - 300, '', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#777',
      })
      .setOrigin(0.5);

    // ボタン
    if (data.role === 'host') {
      this.startBtn = this.makeButton(cx, VIEWPORT.height - 220, 'START', 0x4caf50, () =>
        this.onStart(),
      );
      const labels = this.startBtn.list.filter(
        (o): o is Phaser.GameObjects.Text => o instanceof Phaser.GameObjects.Text,
      );
      this.startBtnLabel = labels[0];
      this.setStartEnabled(false);
    }
    this.makeButton(
      cx,
      VIEWPORT.height - 120,
      data.role === 'host' ? 'ルームを閉じる' : 'ロビーを抜ける',
      0x607d8b,
      () => this.leaveLobby(),
    );

    this.cameras.main.fadeIn(220, 0, 0, 0);

    // 初回 poll → 周期 poll
    this.pollNow();
    this.pollTimer = this.time.addEvent({
      delay: VS.pollIntervalMs,
      loop: true,
      callback: () => this.pollNow(),
    });

    // TTL カウントダウン (1 秒毎更新)
    this.expireTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.refreshExpires(),
    });
    this.refreshExpires();

    this.events.on('shutdown', () => this.cleanup());
  }

  private drawBackground(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(COLORS.jungleDark, COLORS.jungleDark, COLORS.background, COLORS.background);
    g.fillRect(0, 0, VIEWPORT.width, VIEWPORT.height);
  }

  private async pollNow(): Promise<void> {
    if (this.leaving || this.starting) return;
    try {
      const state = await VsService.getRoom(this.params.code);
      this.applyState(state);
    } catch (e) {
      if (e instanceof VsApiError && (e.status === 404 || e.status === 410)) {
        this.statusText.setText('ルームが見つかりません / 期限切れ');
        this.scheduleReturnToMenu();
      }
      // 一時的ネットワークエラーは黙って次回 poll で復旧
    }
  }

  private applyState(state: RoomState): void {
    if (state.status === 'expired') {
      this.statusText.setText('ルームの有効期限が切れました');
      this.scheduleReturnToMenu();
      return;
    }
    this.serverOffset = state.serverNow - Date.now();
    this.participants = state.participants;
    this.renderParticipants();

    if (state.status === 'starting' && state.startAt !== null) {
      this.starting = true;
      this.goCountdown(state.startAt);
      return;
    }

    if (state.status === 'waiting') {
      this.statusText.setText(
        this.params.role === 'host'
          ? `${this.participants.length}/${this.params.maxPlayers} 人  ·  2 人以上で START`
          : `${this.participants.length}/${this.params.maxPlayers} 人  ·  ホストの開始を待っています`,
      );
      if (this.params.role === 'host') {
        this.setStartEnabled(this.participants.length >= VS.minPlayers);
      }
    }
  }

  private renderParticipants(): void {
    this.listContainer.removeAll(true);
    const cx = VIEWPORT.width / 2;
    const rowH = 50;
    const rowW = 540;
    const maxRows = this.params.maxPlayers;

    for (let i = 0; i < maxRows; i++) {
      const slot = i + 1;
      const p = this.participants.find((q) => q.slot === slot);
      const y = i * rowH;
      const bg = this.add.graphics();
      bg.fillStyle(p ? 0x1f3527 : 0x000000, p ? 0.6 : 0.3);
      bg.fillRoundedRect(cx - rowW / 2, y, rowW, rowH - 8, 8);

      const isMe = slot === this.params.slot;
      const text = p
        ? `${slot === 1 ? '👑 ' : ''}${p.nickname}${isMe ? '  (あなた)' : ''}`
        : `... 空き`;
      const t = this.add
        .text(cx - rowW / 2 + 20, y + (rowH - 8) / 2, text, {
          fontFamily: FONT,
          fontSize: '24px',
          color: p ? (isMe ? COLORS.textAccent : '#f5f5f5') : '#666',
        })
        .setOrigin(0, 0.5);
      this.listContainer.add([bg, t]);
    }
  }

  private setStartEnabled(enabled: boolean): void {
    if (!this.startBtn) return;
    this.startBtn.setAlpha(enabled ? 1 : 0.45);
    const hit = this.startBtn.list.find(
      (o): o is Phaser.GameObjects.Rectangle => o instanceof Phaser.GameObjects.Rectangle,
    );
    hit?.setInteractive({ useHandCursor: enabled });
    if (!enabled) hit?.disableInteractive();
  }

  private async onStart(): Promise<void> {
    if (!this.params.hostToken || this.participants.length < VS.minPlayers || this.starting) return;
    this.starting = true;
    this.setStartEnabled(false);
    this.startBtnLabel?.setText('開始中...');
    try {
      const res = await VsService.startRoom(this.params.code, this.params.hostToken);
      this.serverOffset = res.serverNow - Date.now();
      this.goCountdown(res.startAt);
    } catch (e) {
      this.starting = false;
      this.setStartEnabled(true);
      this.startBtnLabel?.setText('START');
      this.statusText.setText(
        e instanceof VsApiError ? `エラー: ${e.status}` : '開始に失敗しました',
      );
    }
  }

  private goCountdown(startAt: number): void {
    this.cleanup();
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('VsCountdownScene', {
        code: this.params.code,
        token: this.params.token,
        hostToken: this.params.hostToken,
        role: this.params.role,
        slot: this.params.slot,
        seed: this.params.seed,
        mode: this.params.mode,
        maxPlayers: this.params.maxPlayers,
        startAt,
        serverOffset: this.serverOffset,
        myNickname: this.params.myNickname,
        participants: this.participants,
      });
    });
  }

  private leaveLobby(): void {
    this.leaving = true;
    this.cleanup();
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('VsMenuScene'));
  }

  private scheduleReturnToMenu(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cleanup();
    this.time.delayedCall(1500, () => {
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('VsMenuScene'));
    });
  }

  private refreshExpires(): void {
    const remain = Math.max(0, this.expiresAt - Date.now());
    const mins = Math.floor(remain / 60000);
    const secs = Math.floor((remain % 60000) / 1000)
      .toString()
      .padStart(2, '0');
    this.expiresText.setText(`残り ${mins}:${secs}`);
  }

  private cleanup(): void {
    this.pollTimer?.remove();
    this.expireTimer?.remove();
    this.pollTimer = undefined;
    this.expireTimer = undefined;
  }

  private makeButton(
    x: number,
    y: number,
    label: string,
    color: number,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const w = 460;
    const h = 76;
    const bg = this.add.graphics();
    const drawBg = (alpha: number) => {
      bg.clear();
      bg.fillStyle(color, alpha);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
      bg.lineStyle(2, 0xffffff, 0.25);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
      bg.fillStyle(0xffffff, 0.12);
      bg.fillRoundedRect(-w / 2 + 5, -h / 2 + 5, w - 10, 16, {
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
        fontSize: '38px',
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
}
