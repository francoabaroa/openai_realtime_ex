export class WavStreamPlayer {
  constructor({ sampleRate = 24000 } = {}) {
    this.sampleRate = sampleRate;
    this.audioContext = null;
    this.streamNode = null;
    this.isConnected = false;
    this.scriptLoaded = false;
  }

  async connect() {
    this.isConnected = true;

    // Recreate AudioContext if it's closed or not initialized
    if (!this.audioContext || this.audioContext.state === 'closed') {
      // Create AudioContext with the specified sample rate
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: this.sampleRate,
      });
    }

    // Resume the AudioContext if it's suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Load the audio worklet module if not loaded
    if (!this.scriptLoaded) {
      // Inline the worklet code as a string
      const workletCode = `
        class StreamProcessor extends AudioWorkletProcessor {
          constructor() {
            super();
            this.bufferQueue = [];
            this.port.onmessage = (event) => {
              if (event.data) {
                const { event: eventType, buffer } = event.data;
                if (eventType === 'write') {
                  const int16Array = buffer;
                  const float32Array = new Float32Array(int16Array.length);
                  for (let i = 0; i < int16Array.length; i++) {
                    float32Array[i] = int16Array[i] / 32768; // Convert Int16 to Float32
                  }
                  this.bufferQueue.push(float32Array);
                } else if (eventType === 'stop') {
                  this.bufferQueue = [];
                }
              }
            };
          }

          process(inputs, outputs) {
            const output = outputs[0];
            const channel = output[0];

            if (this.bufferQueue.length > 0) {
              const buffer = this.bufferQueue.shift();
              for (let i = 0; i < channel.length; i++) {
                channel[i] = buffer[i] || 0;
              }
            } else {
              // Fill with silence if no buffer
              for (let i = 0; i < channel.length; i++) {
                channel[i] = 0;
              }
            }
            return true;
          }
        }

        registerProcessor('stream_processor', StreamProcessor);
      `;

      // Create a Blob from the code, and generate a URL
      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const blobURL = URL.createObjectURL(blob);

      // Load the module from the Blob URL
      await this.audioContext.audioWorklet.addModule(blobURL);
      this.scriptLoaded = true;
    }

    // Create the AudioWorkletNode
    this.streamNode = new AudioWorkletNode(this.audioContext, 'stream_processor');

    // Connect the node to the destination
    this.streamNode.connect(this.audioContext.destination);
  }

  disconnect() {
    this.isConnected = false;
    if (this.streamNode) {
      this.streamNode.disconnect();
      this.streamNode.port.postMessage({ event: 'stop' });
      this.streamNode = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null; // Set to null after closing
    }
  }

  add16BitPCM(audioData) {
    if (!this.isConnected) return;

    let int16Array;
    if (audioData instanceof Int16Array) {
      int16Array = audioData;
    } else if (audioData instanceof ArrayBuffer) {
      int16Array = new Int16Array(audioData);
    } else {
      throw new Error('audioData must be an Int16Array or ArrayBuffer');
    }

    if (this.streamNode) {
      this.streamNode.port.postMessage({ event: 'write', buffer: int16Array });
    }
  }
}
