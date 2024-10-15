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

    // Add these event listeners
    window.addEventListener('realtime-connected', () => {
      this.pushEvent("realtime_connected", {});
    });

    window.addEventListener('realtime-disconnected', () => {
      this.pushEvent("realtime_disconnected", {});
    });

    window.addEventListener('realtime-connection-error', (event) => {
      this.pushEvent("realtime_connection_error", event.detail);
    });
  }
}

let csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content")
let liveSocket = new LiveSocket("/live", Socket, {
  params: { _csrf_token: csrfToken },
  hooks: Hooks,
  longPollFallbackMs: null // This disables long-polling
})

// Show progress bar on live navigation and form submits
topbar.config({ barColors: { 0: "#29d" }, shadowColor: "rgba(0, 0, 0, .3)" })
window.addEventListener("phx:page-loading-start", _info => topbar.show(300))
window.addEventListener("phx:page-loading-stop", _info => topbar.hide())

// connect if there are any LiveViews on the page
liveSocket.connect()

// expose liveSocket on window for web console debug logs and latency simulation:
// >> liveSocket.enableDebug()
// >> liveSocket.enableLatencySim(1000)  // enabled for duration of browser session
// >> liveSocket.disableLatencySim()
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
  socket: new Socket("/socket", { params: { token: window.userToken } }),
  channel: null,

  // Connect to the realtime channel
  connectToRealtimeChannel() {
    const apiKey = this.getApiKey();
    if (apiKey) {
      if (this.channel) {
        this.channel.leave();
      }
      this.socket.connect();
      this.channel = this.socket.channel("realtime:lobby", { api_key: apiKey });
      this.channel.join()
        .receive("ok", () => {
          console.log("Joined successfully");
          // Dispatch a custom event that the LiveView hook can listen for
          window.dispatchEvent(new CustomEvent('realtime-connected'));
        })
        .receive("error", resp => {
          console.error("Unable to join", resp);
          window.dispatchEvent(new CustomEvent('realtime-connection-error', { detail: resp }));
        });

      this.channel.on("api_message", msg => {
        console.log("Received message from OpenAI:", msg);
        // Handle the message as needed
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
