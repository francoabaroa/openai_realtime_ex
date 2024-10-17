export class WavRecorder {
  constructor(options = {}) {
    this.sampleRate = options.sampleRate || 44100;
    this.bitDepth = options.bitDepth || 16;
    this.channels = options.channels || 1;
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: this.sampleRate,
    });
    this.isRecording = false;
    this.onDataCallback = null;
    this.recordedChunks = [];
    this.processor = null;
    this.source = null;
  }

  async record(onData) {
    this.onDataCallback = onData;
    this.recordedChunks = [];

    // Ensure AudioContext is resumed
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    try {
      // Define the worklet processor code as a string
      const recorderWorkletCode = `
        class RecorderWorkletProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.port.onmessage = this.receive.bind(this);
            this.initialize();
          }

          initialize() {
            this.isRecording = false;
            this.chunks = [];
          }

          float32ToInt16(float32Array) {
            const len = float32Array.length;
            const int16Array = new Int16Array(len);
            for (let i = 0; i < len; i++) {
              let s = Math.max(-1, Math.min(1, float32Array[i]));
              int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            return int16Array;
          }

          receive(event) {
            const { command } = event.data;
            switch (command) {
              case 'start':
                this.isRecording = true;
                break;
              case 'stop':
                this.isRecording = false;
                break;
              case 'clear':
                this.initialize();
                break;
              default:
                // Unknown command
                break;
            }
          }

          process(inputs) {
            const input = inputs[0];
            if (input && input.length > 0 && this.isRecording) {
              const channelData = input[0]; // Assuming mono
              const int16Data = this.float32ToInt16(channelData);

              // Send the Int16Array back to the main thread
              this.port.postMessage({ audioData: int16Data });
            }
            // Keep processor alive
            return true;
          }
        }

        registerProcessor('recorder-worklet', RecorderWorkletProcessor);
      `;

      // Create a Blob and URL
      const blob = new Blob([recorderWorkletCode], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);

      // Load the audio worklet module
      await this.audioContext.audioWorklet.addModule(url);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.stream = stream;
      this.source = this.audioContext.createMediaStreamSource(stream);

      this.processor = new AudioWorkletNode(this.audioContext, 'recorder-worklet');

      // Handle messages from the processor
      this.processor.port.onmessage = (event) => {
        if (event.data.audioData && this.isRecording) {
          const inputData16 = event.data.audioData;
          this.recordedChunks.push(inputData16);
          this.onDataCallback({ mono: inputData16 });
        }
      };

      this.source.connect(this.processor);
      // Do not connect the processor to the destination to avoid feedback

      if (this.processor) {
        // Restart recording if already initialized
        this.isRecording = true;
        this.processor.port.postMessage({ command: 'start' });
        return;
      }

      // Start recording
      this.isRecording = true;
      this.processor.port.postMessage({ command: 'start' });
    } catch (err) {
      console.error('WavRecorder: Failed to start recording:', err);
    }
  }

  pause() {
    this.isRecording = false;
    if (this.processor) {
      // Stop recording on the processor
      this.processor.port.postMessage({ command: 'stop' });
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
    }
    if (this.source) {
      this.source.disconnect();
    }
  }

  getWavBlob() {
    const dataLength = this.recordedChunks.reduce((acc, chunk) => acc + chunk.length, 0) * 2; // 2 bytes per sample
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // Write WAV header
    const writeString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, this.channels, true);
    view.setUint32(24, this.sampleRate, true);
    view.setUint32(28, this.sampleRate * this.channels * 2, true);
    view.setUint16(32, this.channels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write audio data
    let offset = 44;
    for (const chunk of this.recordedChunks) {
      for (let i = 0; i < chunk.length; i++) {
        view.setInt16(offset, chunk[i], true);
        offset += 2;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  }
}
