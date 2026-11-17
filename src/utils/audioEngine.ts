// (2026-07-13) Add Web Audio engine & live mic recorder vs static mock buttons
class KeepsakeAudioEngine {
  private ctx: AudioContext | null = null;
  private activeAudio: HTMLAudioElement | null = null;
  private synthTimer: number | null = null;
  private progressTimer: number | null = null;
  private currentTrackId: string | null = null;
  private isPlayingState = false;
  private currentTimeSec = 0;
  private durationSec = 0;
  private volume = 0.78;
  private listeners: Set<() => void> = new Set();

  // Microphone recording state
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordStartTime = 0;

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  getState() {
    return {
      currentTrackId: this.currentTrackId,
      isPlaying: this.isPlayingState,
      currentTime: this.currentTimeSec,
      duration: this.durationSec,
      volume: this.volume,
    };
  }

  setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.activeAudio) {
      this.activeAudio.volume = this.volume;
    }
    this.notify();
  }

  toggleTrack(trackId: string, durationSeconds: number, audioUrl?: string, synthNotes?: number[]) {
    if (this.currentTrackId === trackId && this.isPlayingState) {
      this.stop();
      return;
    }
    this.stop();
    this.currentTrackId = trackId;
    this.durationSec = durationSeconds || 45;
    this.currentTimeSec = 0;
    this.isPlayingState = true;
    this.notify();

    if (audioUrl && audioUrl.startsWith('data:audio')) {
      const audio = new Audio(audioUrl);
      audio.volume = this.volume;
      this.activeAudio = audio;
      audio.ontimeupdate = () => {
        this.currentTimeSec = audio.currentTime;
        this.notify();
      };
      audio.onended = () => {
        this.stop();
      };
      audio.play().catch(() => {
        this.startWarmMusicBoxSynth(synthNotes);
      });
    } else {
      this.startWarmMusicBoxSynth(synthNotes);
    }
  }

  private startWarmMusicBoxSynth(customNotes?: number[]) {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const notes = customNotes && customNotes.length > 0
        ? customNotes
        : [261.63, 329.63, 392.0, 493.88, 523.25, 392.0, 329.63, 293.66, 349.23, 440.0, 523.25, 493.88];
      let noteIdx = 0;

      const playChime = () => {
        if (!this.ctx || !this.isPlayingState) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const freq = notes[noteIdx % notes.length];
        noteIdx++;
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.09 * this.volume, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.95);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.0);
      };

      playChime();
      this.synthTimer = window.setInterval(playChime, 680);
      this.progressTimer = window.setInterval(() => {
        this.currentTimeSec += 0.25;
        if (this.currentTimeSec >= this.durationSec) {
          this.stop();
        } else {
          this.notify();
        }
      }, 250);
    } catch {
      this.progressTimer = window.setInterval(() => {
        this.currentTimeSec += 0.25;
        if (this.currentTimeSec >= this.durationSec) {
          this.stop();
        } else {
          this.notify();
        }
      }, 250);
    }
  }

  seek(seconds: number) {
    this.currentTimeSec = Math.max(0, Math.min(this.durationSec, seconds));
    if (this.activeAudio) {
      this.activeAudio.currentTime = this.currentTimeSec;
    }
    this.notify();
  }

  stop() {
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio = null;
    }
    if (this.synthTimer !== null) {
      clearInterval(this.synthTimer);
      this.synthTimer = null;
    }
    if (this.progressTimer !== null) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    this.isPlayingState = false;
    this.currentTrackId = null;
    this.currentTimeSec = 0;
    this.notify();
  }

  async startRecording(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recordedChunks = [];
      this.recordStartTime = Date.now();
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };
      this.mediaRecorder.start();
      return true;
    } catch {
      return false;
    }
  }

  async stopRecording(): Promise<{ dataUrl?: string; durationSeconds: number }> {
    const elapsed = Math.max(3, Math.round((Date.now() - this.recordStartTime) / 1000));
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      return { durationSeconds: elapsed };
    }
    return new Promise((resolve) => {
      const recorder = this.mediaRecorder!;
      recorder.onstop = () => {
        const tracks = recorder.stream.getTracks();
        tracks.forEach((t) => t.stop());
        if (this.recordedChunks.length === 0) {
          resolve({ durationSeconds: elapsed });
          return;
        }
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
            durationSeconds: elapsed,
          });
        };
        reader.readAsDataURL(blob);
      };
      recorder.stop();
    });
  }
}

export const audioEngine = new KeepsakeAudioEngine();
