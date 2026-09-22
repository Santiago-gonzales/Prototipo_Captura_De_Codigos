export interface ZebraKeyboardScannerOptions {
  onCode: (code: string) => void | Promise<void>;
  terminators?: string[];
  maxInterKeyDelayMs?: number;
  fallbackTimeoutMs?: number;
  minLength?: number;
}

export class ZebraKeyboardScanner {
  private readonly onCode: ZebraKeyboardScannerOptions["onCode"];
  private readonly terminators: Set<string>;
  private readonly maxInterKeyDelayMs: number;
  private readonly fallbackTimeoutMs: number;
  private readonly minLength: number;
  private buffer = "";
  private lastKeyAt = 0;
  private fallbackTimer: number | undefined;
  private listening = false;

  constructor(options: ZebraKeyboardScannerOptions) {
    this.onCode = options.onCode;
    this.terminators = new Set(options.terminators ?? ["Enter", "Tab"]);
    this.maxInterKeyDelayMs = options.maxInterKeyDelayMs ?? 80;
    this.fallbackTimeoutMs = options.fallbackTimeoutMs ?? 120;
    this.minLength = options.minLength ?? 4;
  }

  start() {
    if (this.listening) return;
    this.listening = true;
    window.addEventListener("keydown", this.handleKeyDown);
  }

  stop() {
    if (!this.listening) return;
    this.listening = false;
    window.removeEventListener("keydown", this.handleKeyDown);
    this.clearBuffer();
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    if (this.terminators.has(event.key)) {
      if (this.isCandidate()) {
        event.preventDefault();
        this.emitCode();
      } else {
        this.clearBuffer();
      }
      return;
    }

    if (event.key.length !== 1) return;

    const now = performance.now();
    const interval = this.lastKeyAt === 0 ? 0 : now - this.lastKeyAt;
    if (interval > this.maxInterKeyDelayMs) {
      this.clearBuffer();
    }

    this.buffer += event.key;
    this.lastKeyAt = now;
    window.clearTimeout(this.fallbackTimer);
    this.fallbackTimer = window.setTimeout(() => {
      if (this.isCandidate()) this.emitCode();
      else this.clearBuffer();
    }, this.fallbackTimeoutMs);
  };

  private isCandidate() {
    return this.buffer.length >= this.minLength;
  }

  private emitCode() {
    const code = this.buffer.trim();
    this.clearBuffer();
    if (code) void this.onCode(code);
  }

  private clearBuffer() {
    this.buffer = "";
    this.lastKeyAt = 0;
    window.clearTimeout(this.fallbackTimer);
    this.fallbackTimer = undefined;
  }
}