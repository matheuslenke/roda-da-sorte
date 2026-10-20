type Cue = "tick" | "reveal" | "win";

/** Synthesized cues complement the local music tracks. */
export class ShowAudio {
  private context: AudioContext | null = null;
  private output: GainNode | null = null;
  private level = 1;
  private active = true;

  set enabled(enabled: boolean) {
    this.active = enabled;
    this.updateGain();
  }

  set volume(volume: number) {
    this.level = Math.max(0, Math.min(1, volume));
    this.updateGain();
  }

  private updateGain() {
    if (this.context && this.output)
      this.output.gain.setTargetAtTime(
        this.active ? this.level : 0,
        this.context.currentTime,
        0.015,
      );
  }

  async prepare() {
    if (!this.context || this.context.state === "closed") {
      this.context = new AudioContext();
      this.output = this.context.createGain();
      this.output.gain.value = this.active ? this.level : 0;
      this.output.connect(this.context.destination);
    }
    await this.context.resume();
  }

  cue(kind: Cue) {
    if (
      !this.active ||
      !this.context ||
      !this.output ||
      this.context.state !== "running"
    )
      return;
    const context = this.context;
    const output = this.output;
    const notes =
      kind === "win"
        ? [523.25, 659.25, 783.99, 1046.5]
        : kind === "reveal"
          ? [659.25, 783.99]
          : [160];
    notes.forEach((frequency, index) => {
      const start = context.currentTime + index * 0.13;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = kind === "tick" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(
        kind === "tick" ? 0.055 : 0.1,
        start + 0.008,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        start + (kind === "win" ? 0.65 : 0.12),
      );
      oscillator.connect(gain);
      gain.connect(output);
      oscillator.start(start);
      oscillator.stop(start + 0.7);
    });
  }

  dispose() {
    void this.context?.close();
  }
}
