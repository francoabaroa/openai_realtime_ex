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
    this.handleEvent("get_api_key", () => {
      const apiKey = window.openAIDemo.getApiKey();
      this.pushEvent("api_key_retrieved", { api_key: apiKey });
    });
    this.handleEvent("connect_to_realtime", () => {
      const apiKey = window.openAIDemo.getApiKey();
      if (apiKey) {
        window.openAIDemo.connectToRealtimeChannel();
      } else {
        this.pushEvent("api_key_not_set", {});
      }
    });

    // Check if API key is set on mount
    const apiKey = window.openAIDemo.getApiKey();
    if (apiKey) {
      this.pushEvent("api_key_stored", {});
    }
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

// Function to store the API key
function storeApiKey(apiKey) {
  localStorage.setItem('ex_openai_api_key', apiKey);
}

// Function to retrieve the API key
function getApiKey() {
  return localStorage.getItem('ex_openai_api_key');
}

// Function to remove the API key
function removeApiKey() {
  localStorage.removeItem('ex_openai_api_key');
}

// Add these functions to the window object so they can be called from LiveView
window.openAIDemo = {
  storeApiKey,
  getApiKey,
  removeApiKey
};

// Initialize the socket
let socket = new Socket("/socket", { params: { token: window.userToken } })
socket.connect()

// Join the RealtimeChannel
let channel = null;

function connectToRealtimeChannel() {
  const apiKey = window.openAIDemo.getApiKey();
  if (apiKey) {
    if (channel) {
      channel.leave();  // Leave the previous channel if it exists
    }
    channel = socket.channel("realtime:lobby", { api_key: apiKey });
    channel.join()
      .receive("ok", resp => {
        console.log("Joined successfully", resp);
        window.dispatchEvent(new CustomEvent('phx:realtime-connected'));
      })
      .receive("error", resp => {
        console.log("Unable to join", resp);
        window.dispatchEvent(new CustomEvent('phx:realtime-connection-error', { detail: resp }));
      });
  } else {
    console.error("API key not set");
    window.dispatchEvent(new CustomEvent('phx:realtime-connection-error', { detail: { reason: "API key not set" } }));
  }
}

function disconnectFromRealtimeChannel() {
  if (channel) {
    channel.leave()
      .receive("ok", () => {
        console.log("Left successfully");
        channel = null;
        window.dispatchEvent(new CustomEvent('phx:realtime-disconnected'));
      })
      .receive("error", (reason) => {
        console.log("Error leaving", reason);
        window.dispatchEvent(new CustomEvent('phx:realtime-connection-error', { detail: { reason: "Error disconnecting" } }));
      });
  }
}

window.openAIDemo.connectToRealtimeChannel = connectToRealtimeChannel;
window.openAIDemo.disconnectFromRealtimeChannel = disconnectFromRealtimeChannel;

// Add event listeners for connect and disconnect events
window.addEventListener('phx:connect-to-realtime', connectToRealtimeChannel);
window.addEventListener('phx:disconnect-from-realtime', disconnectFromRealtimeChannel);

// Now you can push and handle events via the channel
// For example:
// channel.push("new_msg", {body: "Hello!"})
// channel.on("new_msg", msg => console.log("Got message", msg))

// Expose channel on window for debugging
window.channel = channel
