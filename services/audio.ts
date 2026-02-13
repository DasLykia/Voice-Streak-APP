
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
    // Force close previous context to ensure clean state for device switch
    if (this.audioContext) {
       await this.close();
    }

    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const constraints: MediaStreamConstraints = {
      audio: deviceId ? { 
        deviceId: { exact: deviceId },
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
      
      this.analyserNode.fftSize = 4096; 
      // Smoothing for visualizer
      this.analyserNode.smoothingTimeConstant = 0.8;
      
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);
      
      // Initialize Pitchy Detector
      this.inputBuffer = new Float32Array(this.analyserNode.fftSize);
      this.pitchDetector = PitchDetector.forFloat32Array(this.analyserNode.fftSize);

      // Always try to resume context immediately after user interaction led here
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
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

  getVolume(): number {
    if (!this.analyserNode || !this.inputBuffer) return 0;
    
    this.analyserNode.getFloatTimeDomainData(this.inputBuffer);

    let sum = 0;
    // Check more samples for accuracy
    for (let i = 0; i < this.inputBuffer.length; i++) {
        sum += this.inputBuffer[i] * this.inputBuffer[i];
    }
    const rms = Math.sqrt(sum / this.inputBuffer.length);
    return rms;
  }

  // Improved Pitch Detection using Pitchy (MPM Algorithm)
  getPitch(): number {
    const analyser = this.analyserNode;
    const ctx = this.audioContext;
    const detector = this.pitchDetector;
    const buffer = this.inputBuffer;

    if (!analyser || !ctx || !detector || !buffer) return -1;

    analyser.getFloatTimeDomainData(buffer);
    
    // Calculate Volume (RMS) to ignore silence
    let rms = 0;
    for (let i = 0; i < buffer.length; i += 4) {
      rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / (buffer.length / 4));
    
    if (rms < 0.005) return -1; 

    const [pitch, clarity] = detector.findPitch(buffer, ctx.sampleRate);

    // Clarity Filter
    if (clarity < 0.6) return -1;

    // Sanity Check
    if (pitch < 50 || pitch > 3000) return -1;

    return pitch;
  }

  startRecording() {
    if (!this.mediaStream || !this.audioContext || !this.gainNode) return;

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

  async resume(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
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
  
  isReady(): boolean {
      return this.audioContext !== null && this.audioContext.state !== 'closed';
  }
}

export const audioService = new AudioService();
