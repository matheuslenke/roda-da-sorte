type Cue = "tick" | "reveal" | "win";

/** Synthesized cues complement the two local music tracks. */
export class ShowAudio {
  private context: AudioContext | null = null;
  enabled = true;

  async prepare() {
    if (!this.context || this.context.state === "closed")
      this.context = new AudioContext();
    await this.context.resume();
  }

  cue(kind: Cue) {
    if (!this.enabled || !this.context || this.context.state !== "running")
      return;
    const context = this.context;
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
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.7);
    });
  }

  dispose() {
    void this.context?.close();
  }
}
