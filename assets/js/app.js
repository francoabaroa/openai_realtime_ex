// If you want to use Phoenix channels, run `mix help phx.gen.channel`
// to get started and then uncomment the line below.
// import "./user_socket.js"

// You can include dependencies in two ways.
//
// The simplest option is to put them in assets/vendor and
// import them using relative paths:
//
//     import "../vendor/some-package.js"
//
// Alternatively, you can `npm install some-package --prefix assets` and import
// them using a path starting with the package name:
//
//     import "some-package"
//

// Include phoenix_html to handle method=PUT/DELETE in forms and buttons.
import "phoenix_html"
// Establish Phoenix Socket and LiveView configuration.
import { Socket } from "phoenix"
import { LiveSocket } from "phoenix_live_view"
import topbar from "../vendor/topbar"
import { WavRecorder } from '../vendor/wav_recorder.js';

let Hooks = {}
Hooks.ApiKey = {
  mounted() {
    this.handleEvent("store_api_key", ({ api_key }) => {
      window.openAIDemo.storeApiKey(api_key);
      this.pushEvent("api_key_stored", {});
    });
    this.handleEvent("remove_api_key", () => {
      window.openAIDemo.removeApiKey();
      this.pushEvent("api_key_removed", {});
    });
    this.handleEvent("connect_to_realtime", () => {
      window.openAIDemo.connectToRealtimeChannel();
    });
    this.handleEvent("disconnect_from_realtime", () => {
      window.openAIDemo.disconnectFromRealtimeChannel();
    });

    // Check if API key is set on mount
    if (window.openAIDemo.getApiKey()) {
      this.pushEvent("api_key_stored", {});
    }

    // Store event handlers as properties to allow for removal
    this.onRealtimeConnected = () => {
      this.pushEvent("realtime_connected", {});
    };
    window.addEventListener('realtime-connected', this.onRealtimeConnected);

    this.onRealtimeDisconnected = () => {
      this.pushEvent("realtime_disconnected", {});
    };
    window.addEventListener('realtime-disconnected', this.onRealtimeDisconnected);

    this.onRealtimeConnectionError = (event) => {
      this.pushEvent("realtime_connection_error", event.detail);
    };
    window.addEventListener('realtime-connection-error', this.onRealtimeConnectionError);
  },
  destroyed() {
    // Remove event listeners to prevent memory leaks
    window.removeEventListener('realtime-connected', this.onRealtimeConnected);
    window.removeEventListener('realtime-disconnected', this.onRealtimeDisconnected);
    window.removeEventListener('realtime-connection-error', this.onRealtimeConnectionError);
  }
}

Hooks.VoiceChat = {
  async mounted() {
    console.log("VoiceChat hook mounted");
    this.recorder = new WavRecorder({ sampleRate: 24000 });
    this.isRecording = false;
    this.audioChunks = [];
    this.receivedAudioChunks = [];
    this.voiceChatStopped = false;

    // Initialize audio contexts and playback variables
    this.initializePlaybackAudioContext();
    this.audioQueue = [];
    this.isPlaying = false;
    this.currentSource = null;

    // Store event handlers as properties
    this.onAudioDelta = (event) => {
      const audioData = event.detail.audioData;
      this.enqueueAudio(audioData);
    };
    window.addEventListener('openai-audio-delta', this.onAudioDelta);

    this.onTranscriptDelta = (event) => {
      const deltaText = event.detail.deltaText;
      this.transcript = (this.transcript || '') + deltaText;
      const transcriptElement = document.querySelector('#transcript');
      if (transcriptElement) {
        transcriptElement.textContent = this.transcript;
      }
    };
    window.addEventListener('openai-transcript-delta', this.onTranscriptDelta);

    this.onTranscriptDone = (event) => {
      const transcriptText = event.detail.transcriptText;
      this.transcript = transcriptText;
      const transcriptElement = document.querySelector('#transcript');
      if (transcriptElement) {
        transcriptElement.textContent = this.transcript;
      }
    };
    window.addEventListener('openai-transcript-done', this.onTranscriptDone);

    const pushToTalkBtn = this.el.querySelector('#push-to-talk-btn');
    const startRecording = async () => {
      pushToTalkBtn.classList.remove('bg-green-500', 'hover:bg-green-600');
      pushToTalkBtn.classList.add('bg-red-600', 'hover:bg-red-700');
      pushToTalkBtn.textContent = 'Recording...';
      await this.startVoiceChat();
    };

    const stopRecording = async () => {
      pushToTalkBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
      pushToTalkBtn.classList.add('bg-green-500', 'hover:bg-green-600');
      pushToTalkBtn.textContent = 'Push to Talk';
      await this.stopVoiceChat();
    };

    pushToTalkBtn.addEventListener('mousedown', startRecording);
    pushToTalkBtn.addEventListener('mouseup', stopRecording);
    pushToTalkBtn.addEventListener('mouseleave', stopRecording);

    // Add touch events for mobile devices
    pushToTalkBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startRecording();
    });

    pushToTalkBtn.addEventListener('touchend', stopRecording);
  },

  initializePlaybackAudioContext() {
    if (!this.playbackAudioContext || this.playbackAudioContext.state === 'closed') {
      // Initialize playbackAudioContext
      this.playbackAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      // Create the gain node for volume control
      this.gainNode = this.playbackAudioContext.createGain();
      this.gainNode.connect(this.playbackAudioContext.destination);
      console.log("Playback AudioContext initialized");
    }
  },

  async startVoiceChat() {
    console.log("Starting voice chat");
    try {
      this.voiceChatStopped = false;
      await this.startRecording();
    } catch (error) {
      console.error("Error starting voice chat:", error);
      this.pushEvent("voice_chat_error", { message: "Failed to start voice chat" });
    }
  },

  async stopVoiceChat() {
    if (this.isRecording) {
      await this.stopRecording();
    }
    // Set a flag to indicate that voice chat is stopped
    this.voiceChatStopped = true;
    // Check if audio is still playing
    if (!this.isPlaying && this.audioQueue.length === 0) {
      // No audio is playing and queue is empty, safe to close
      this.closePlaybackAudioContext();
    }
    // Else, playbackAudioContext will be closed after playback finishes
  },

  async startRecording() {
    if (!this.isRecording) {
      await this.recorder.record(({ mono }) => {
        const base64Audio = btoa(
          String.fromCharCode.apply(null, new Uint8Array(mono))
        );
        window.openAIDemo.channel.push("send_audio_chunk", { audio: base64Audio });
      });
      this.isRecording = true;
    }
  },

  async stopRecording() {
    if (this.isRecording) {
      await this.recorder.pause();
      window.openAIDemo.channel.push("commit_audio", {});
      this.isRecording = false;
    }
  },

  enqueueAudio(int16Array) {
    if (!this.playbackAudioContext || this.playbackAudioContext.state === 'closed') {
      console.warn("Playback AudioContext is not available. Initializing it now.");
      this.initializePlaybackAudioContext();
    }

    // Convert Int16Array to Float32Array
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }

    // Create AudioBuffer
    const audioBuffer = this.playbackAudioContext.createBuffer(
      1,
      float32Array.length,
      24000
    );
    audioBuffer.copyToChannel(float32Array, 0);

    // Enqueue the audio buffer
    this.audioQueue.push(audioBuffer);

    // Start playback if not already playing
    if (!this.isPlaying) {
      this.playAudioQueue();
    }
  },

  playAudioQueue() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      if (this.voiceChatStopped) {
        // Voice chat has been stopped and no more audio to play
        this.closePlaybackAudioContext();
      }
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift();

    const source = this.playbackAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);

    source.onended = () => {
      this.isPlaying = false;
      this.playAudioQueue();
    };

    source.start(0);
  },

  closePlaybackAudioContext() {
    if (this.playbackAudioContext && this.playbackAudioContext.state !== 'closed') {
      this.playbackAudioContext.close();
      this.playbackAudioContext = null;
      console.log("Playback AudioContext closed");
    }
  },

  destroyed() {
    if (this.recorder) {
      // Check if the recorder has a stop method
      if (typeof this.recorder.stop === 'function') {
        this.recorder.stop();
      }
      // If there's any other cleanup needed, do it here
    }
    this.closePlaybackAudioContext();
    // Remove event listeners to prevent memory leaks
    window.removeEventListener('openai-audio-delta', this.onAudioDelta);
    window.removeEventListener('openai-transcript-delta', this.onTranscriptDelta);
    window.removeEventListener('openai-transcript-done', this.onTranscriptDone);
  },
}

let csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content")
let liveSocket = new LiveSocket("/live", Socket, {
  params: { _csrf_token: csrfToken },
  hooks: Hooks,
  longPollFallbackMs: null
})

// Show progress bar on live navigation and form submits
topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" })
window.addEventListener("phx:page-loading-start", _info => topbar.show(300))
window.addEventListener("phx:page-loading-stop", _info => topbar.hide())

// connect if there are any LiveViews on the page
liveSocket.connect()

// expose liveSocket on window for web console debug logs and latency simulation:
window.liveSocket = liveSocket

// Consolidate API key management and websocket functions under window.openAIDemo
window.openAIDemo = {
  // API key management functions
  storeApiKey(apiKey) {
    localStorage.setItem('ex_openai_api_key', apiKey);
  },
  getApiKey() {
    return localStorage.getItem('ex_openai_api_key');
  },
  removeApiKey() {
    localStorage.removeItem('ex_openai_api_key');
  },

  // Initialize socket and channel
  socket: null,
  channel: null,

  // Connect to the realtime channel
  connectToRealtimeChannel() {
    const apiKey = this.getApiKey();
    if (apiKey) {
      if (this.channel) {
        this.channel.leave();
      }
      if (!this.socket) {
        this.socket = new Socket("/socket", { params: { token: window.userToken } });
        this.socket.connect();
      }
      this.channel = this.socket.channel("realtime:lobby", { api_key: apiKey });
      this.channel.join()
        .receive("ok", () => {
          console.log("Joined successfully");
          window.dispatchEvent(new CustomEvent('realtime-connected'));
        })
        .receive("error", resp => {
          console.error("Unable to join", resp);
          window.dispatchEvent(new CustomEvent('realtime-connection-error', { detail: resp }));
        });

      // Handle events from the server
      this.channel.on("audio_delta", msg => {
        console.log("Received audio delta:", msg);
        // This event is now handled in the VoiceChat hook
      });

      // Handle API errors
      this.channel.on("api_error", msg => {
        console.error("API Error:", msg.error);
        // Display error to the user if needed
      });

      this.channel.on("api_message", msg => {
        console.log("Received message from OpenAI:", msg);
        const messageData = JSON.parse(msg.message);
        const eventType = messageData.type;

        if (eventType === 'response.audio.delta') {
          console.log("Received audio delta:", messageData);
          // Handle audio delta
          const deltaBase64 = messageData.delta;
          const audioData = new Int16Array(
            Uint8Array.from(atob(deltaBase64), c => c.charCodeAt(0)).buffer
          );
          window.dispatchEvent(new CustomEvent('openai-audio-delta', { detail: { audioData } }));
        } else if (eventType === 'response.audio_transcript.delta') {
          console.log("Received transcript delta:", messageData);
          // Handle transcript delta
          const deltaText = messageData.delta;
          window.dispatchEvent(new CustomEvent('openai-transcript-delta', { detail: { deltaText } }));
        } else if (eventType === 'response.audio_transcript.done') {
          console.log("Received transcript done:", messageData);
          // Handle transcript completion
          const transcriptText = messageData.transcript;
          window.dispatchEvent(new CustomEvent('openai-transcript-done', { detail: { transcriptText } }));
        } else if (eventType === 'response.audio.done') {
          console.log("Received audio done:", messageData);
          window.dispatchEvent(new CustomEvent('openai-audio-done'));
        }
        // ... handle other message types as needed ...
      });
    } else {
      console.error("API key not set");
      window.dispatchEvent(new CustomEvent('realtime-connection-error', { detail: { reason: "API key not set" } }));
    }
  },

  // Disconnect from the realtime channel
  disconnectFromRealtimeChannel() {
    if (this.channel) {
      this.channel.leave()
        .receive("ok", () => {
          console.log("Left the realtime channel");
          this.channel = null;
          // Dispatch a custom event that the LiveView hook can listen for
          window.dispatchEvent(new CustomEvent('realtime-disconnected'));
        })
        .receive("error", reason => {
          console.error("Error leaving channel", reason);
          window.dispatchEvent(new CustomEvent('realtime-connection-error', { detail: { reason: "Error disconnecting" } }));
        });
    }
  }
};

// Expose channel on window for debugging
window.channel = window.openAIDemo.channel;
