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
  }
}

let csrfToken = document.querySelector("meta[name='csrf-token']").getAttribute("content")
let liveSocket = new LiveSocket("/live", Socket, {
  longPollFallbackMs: 2500,
  params: { _csrf_token: csrfToken },
  hooks: Hooks
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
