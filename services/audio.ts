import { PitchDetector } from "pitchy";

export class AudioService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  
  // Pitchy specific properties
  private pitchDetector: PitchDetector<Float32Array> | null = null;
  private inputBuffer: Float32Array | null = null;

  async initialize(deviceId?: string): Promise<void> {
    if (this.audioContext) await this.close();

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const constraints: MediaStreamConstraints = {
      audio: deviceId ? { 
        deviceId: { exact: deviceId },
        // CRITICAL FIX: Disable all processing.
        // This prevents the browser from treating sustained notes as "background noise"
        // and cutting them off.
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false 
      } : true,
      video: false
    };

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.gainNode = this.audioContext.createGain();
      this.analyserNode = this.audioContext.createAnalyser();
      
      // CRITICAL FIX: Increased to 4096. 
      // Larger buffer = More stability for sustained notes.
      this.analyserNode.fftSize = 4096; 
      
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);
      
      // Initialize Pitchy Detector
      this.inputBuffer = new Float32Array(this.analyserNode.fftSize);
      this.pitchDetector = PitchDetector.forFloat32Array(this.analyserNode.fftSize);
      
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

  // Improved Pitch Detection using Pitchy (MPM Algorithm)
  getPitch(): number {
    // 1. Create local references to satisfy TypeScript null checks
    const analyser = this.analyserNode;
    const ctx = this.audioContext;
    const detector = this.pitchDetector;
    const buffer = this.inputBuffer;

    // 2. Check if everything is ready
    if (!analyser || !ctx || !detector || !buffer) return -1;

    // 3. Get audio data using the local buffer reference
    // FIXED: Added 'as any' to bypass TypeScript's ArrayBuffer vs ArrayBufferLike mismatch
    analyser.getFloatTimeDomainData(buffer as any);
    
    // 4. Calculate Volume (RMS) to ignore silence
    let rms = 0;
    for (let i = 0; i < buffer.length; i++) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / buffer.length);
    
    // TWEAK: Very low threshold to catch soft singing/speaking
    if (rms < 0.005) return -1; 

    // 5. Find Pitch using Pitchy
    const [pitch, clarity] = detector.findPitch(buffer, ctx.sampleRate);

    // 6. Clarity Filter
    // "S" and "T" sounds are noise and usually represent < 0.3 clarity.
    // TWEAK: Lowered to 0.5. This allows "breathier" or "jittery" sustained notes 
    // to pass through, but still blocks pure noise.
    if (clarity < 0.5) return -1;

    // 7. Sanity Check
    if (pitch < 50 || pitch > 3000) return -1;

    return pitch;
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
    this.pitchDetector = null;
    this.inputBuffer = null;
  }

  static async getDevices(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'audioinput');
  }
}

export const audioService = new AudioService();