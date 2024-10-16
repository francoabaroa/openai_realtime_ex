export class WavStreamPlayer {
  constructor(options) {
    this.sampleRate = options.sampleRate || 44100;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.audioQueue = [];
    this.isPlaying = false;
    this.isConnected = false;
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
  }

  connect() {
    this.isConnected = true;
    this._playFromQueue();
  }

  disconnect() {
    this.isConnected = false;
    this.audioQueue = [];
  }

  add16BitPCM(audioData) {
    if (!this.isConnected) return;

    const audioBuffer = this.audioContext.createBuffer(1, audioData.length, this.sampleRate);
    const buffer = audioBuffer.getChannelData(0);

    for (let i = 0; i < audioData.length; i++) {
      buffer[i] = audioData[i] / 0x7FFF;
    }

    this.audioQueue.push(audioBuffer);
    if (!this.isPlaying) {
      this._playFromQueue();
    }
  }

  _playFromQueue() {
    if (!this.isConnected || this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift();
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);
    source.onended = () => {
      this._playFromQueue();
    };
    source.start();
  }
}
