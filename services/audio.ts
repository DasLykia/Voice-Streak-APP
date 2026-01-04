export class AudioService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  async initialize(deviceId?: string): Promise<void> {
    if (this.audioContext) await this.close();

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const constraints: MediaStreamConstraints = {
      audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      video: false
    };

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.gainNode = this.audioContext.createGain();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048; // Increased for better pitch resolution
      
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);
      
      // We don't connect to destination to avoid feedback loop unless we want monitoring
      // this.gainNode.connect(this.audioContext.destination); 
    } catch (err) {
      console.error("Error initializing audio:", err);
      throw err;
    }
  }

  setGain(value: number) {
    if (this.gainNode && this.audioContext) {
      this.gainNode.gain.setValueAtTime(value, this.audioContext.currentTime);
    }
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  // Basic Pitch Detection using Autocorrelation
  getPitch(): number {
    if (!this.analyserNode || !this.audioContext) return -1;

    const bufferLength = this.analyserNode.fftSize;
    const buffer = new Float32Array(bufferLength);
    this.analyserNode.getFloatTimeDomainData(buffer);
    const sampleRate = this.audioContext.sampleRate;

    // Calculate RMS to detect silence
    let rms = 0;
    for (let i = 0; i < bufferLength; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / bufferLength);
    if (rms < 0.01) return -1; // Signal too weak/silence

    // Autocorrelation
    // Trim signal to significant part
    let r1 = 0, r2 = bufferLength - 1, thres = 0.2;
    for (let i = 0; i < bufferLength / 2; i++)
      if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
    for (let i = 1; i < bufferLength / 2; i++)
      if (Math.abs(buffer[bufferLength - i]) < thres) { r2 = bufferLength - i; break; }

    const buf = buffer.slice(r1, r2);
    const size = buf.length;
    const c = new Array(size).fill(0);
    
    // Auto-correlate
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size - i; j++) {
        c[i] = c[i] + buf[j] * buf[j + i];
      }
    }

    // Find first peak
    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < size; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;

    // Parabolic interpolation for better precision
    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  }

  startRecording() {
    if (!this.mediaStream || !this.audioContext || !this.gainNode) return;

    // Create a destination for the recorder
    const destination = this.audioContext.createMediaStreamDestination();
    this.gainNode.connect(destination);

    this.mediaRecorder = new MediaRecorder(destination.stream);
    this.chunks = [];

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.chunks.push(e.data);
      }
    };

    this.mediaRecorder.start();
  }

  pauseRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  resumeRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(new Blob([]));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        this.chunks = [];
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  async close() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext) {
      await this.audioContext.close();
    }
    this.audioContext = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.analyserNode = null;
    this.mediaRecorder = null;
  }

  static async getDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'audioinput');
  }
}

export const audioService = new AudioService();