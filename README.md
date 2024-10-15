# OpenAI Realtime Elixir Demo

This project demonstrates the integration of OpenAI's Realtime API with an Elixir/Phoenix application.

## Getting Started

To start your Phoenix server:

  * Run `mix setup` to install and setup dependencies
  * Start Phoenix endpoint with `mix phx.server` or inside IEx with `iex -S mix phx.server`

Now you can visit [`localhost:4000`](http://localhost:4000) from your browser to see the demo page.

## Features

* Demonstrates real-time interaction with OpenAI's API
* Built with Elixir and Phoenix for robust, scalable performance
* Simple, user-friendly interface for testing API capabilities
* Client-side API key management for easy testing and demonstration
* Option to easily remove stored API key for security

## How It Works

This application demonstrates real-time interaction between a user and the OpenAI Realtime API using Elixir and Phoenix. Below is a breakdown of how the frontend and backend components work together:

### 1. User Interaction with LiveView

- **Demo Page**: When the user visits the demo page, they can enter their OpenAI API key and connect or disconnect from the realtime service.
- **LiveView Interface**: The interface is built using Phoenix LiveView, allowing real-time, interactive user experiences without full page reloads.

### 2. Setting the API Key

- **API Key Form**: The user enters their OpenAI API key into a form on the page.
- **LiveView Event**: Submitting the form triggers a LiveView event (`"set_api_key"`).
- **Client-Side Storage**: The API key is stored in the browser's `localStorage` via JavaScript for later use.

### 3. Connecting to the Realtime Service

- **Connect Button**: The user clicks the **Connect** button to initiate a connection.
- **LiveView Event**: This action triggers a LiveView event (`"connect_to_realtime"`).
- **JavaScript Hook**: The `app.js` file contains hooks that listen for this event and handle the connection process.

### 4. Establishing WebSocket Connection

- **Phoenix Socket**: The JavaScript code establishes a WebSocket connection to the Phoenix server using `Phoenix.Socket`.
- **Joining the Channel**: It joins the `"realtime:lobby"` channel, passing the stored API key as a parameter.
  ```javascript:assets/js/app.js
  // In assets/js/app.js
  connectToRealtimeChannel() {
    const apiKey = this.getApiKey();
    if (apiKey) {
      // Initialize socket and channel
      this.socket = new Socket("/socket", { params: { token: window.userToken } });
      this.socket.connect();
      this.channel = this.socket.channel("realtime:lobby", { api_key: apiKey });

      this.channel.join()
        .receive("ok", () => {
          console.log("Joined successfully");
          // Dispatch event for LiveView hook
          window.dispatchEvent(new CustomEvent('realtime-connected'));
        })
        .receive("error", resp => {
          console.error("Unable to join", resp);
          window.dispatchEvent(new CustomEvent('realtime-connection-error', { detail: resp }));
        });
    }
  }  ```

### 5. Server-Side Channel Handling

- **RealtimeChannel**: On the server, the `RealtimeChannel` handles incoming socket connections.
- **API Client Initialization**: Upon a successful join with a valid API key, it starts a `RealtimeApiClient` process.
- **Process Assignment**: The API client process is assigned to the socket for communication.
  ```elixir:lib/openai_realtime_ex_web/channels/realtime_channel.ex
  # In RealtimeChannel
  def join("realtime:lobby", %{"api_key" => api_key}, socket)
      when is_binary(api_key) and api_key != "" do
    Logger.info("Realtime Channel: Received join with API key")

    case OpenaiRealtimeEx.RealtimeApiClient.start_link(channel_pid: self(), api_key: api_key) do
      {:ok, pid} ->
        {:ok, assign(socket, :api_client, pid)}

      {:error, reason} ->
        Logger.error("Failed to start RealtimeApiClient: #{inspect(reason)}")
        {:error, %{reason: "Failed to initialize API client"}}
    end
  end  ```

### 6. Communication with OpenAI Realtime API

- **RealtimeApiClient**: This module connects to the OpenAI Realtime API via WebSockets.
- **Message Handling**: It listens for messages from OpenAI and forwards them to the associated channel.
- **Message Forwarding**: Received messages are sent to the channel process using Elixir message passing.
  ```elixir:lib/openai_realtime_ex/realtime_api_client.ex
  # In RealtimeApiClient
  def handle_frame({:text, msg}, state) do
    Logger.info("Realtime API Client: Received message from OpenAI: #{msg}")
    send(state.channel_pid, {:api_message, msg})
    {:ok, state}
  end  ```

### 7. Pushing Messages to the Client

- **Channel to Client**: The `RealtimeChannel` receives messages from the `RealtimeApiClient` and pushes them to the client over the WebSocket connection.
  ```elixir:lib/openai_realtime_ex_web/channels/realtime_channel.ex
  # In RealtimeChannel
  def handle_info({:api_message, message}, socket) do
    Logger.info("Realtime Channel: Received message from OpenAI: #{message}")
    push(socket, "api_message", %{message: message})
    {:noreply, socket}
  end  ```

### 8. Client-Side Handling of API Messages

- **Event Listener**: On the client side, the JavaScript code listens for `"api_message"` events from the channel.
- **Message Processing**: Received messages can be logged to the console or displayed in the UI.
  ```javascript:assets/js/app.js
  // In assets/js/app.js
  this.channel.on("api_message", msg => {
    console.log("Received message from OpenAI:", msg);
    // Handle the message as needed
  });  ```

### 9. Disconnecting from the Realtime Service

- **Disconnect Button**: The user can click the **Disconnect** button to terminate the connection.
- **LiveView Event**: This triggers a LiveView event (`"disconnect_from_realtime"`).
- **Channel Leave**: The JavaScript code handles the event by leaving the channel and disconnecting the WebSocket.
  ```javascript:assets/js/app.js
  // In assets/js/app.js
  disconnectFromRealtimeChannel() {
    if (this.channel) {
      this.channel.leave()
        .receive("ok", () => {
          console.log("Left the realtime channel");
          this.channel = null;
          window.dispatchEvent(new CustomEvent('realtime-disconnected'));
        })
        .receive("error", reason => {
          console.error("Error leaving channel", reason);
          window.dispatchEvent(new CustomEvent('realtime-connection-error', { detail: { reason: "Error disconnecting" } }));
        });
    }
  }  ```

### 10. Cleanup and Error Handling

- **Server Cleanup**: The server terminates the `RealtimeApiClient` process when the channel is closed to free resources.
  ```elixir:lib/openai_realtime_ex_web/channels/realtime_channel.ex
  # In RealtimeChannel
  def terminate(_reason, socket) do
    Logger.info("Realtime Channel: Terminating")

    if api_client = socket.assigns[:api_client] do
      Process.exit(api_client, :normal)
    end

    :ok
  end  ```

- **Error Feedback**: Errors are captured and displayed to the user, allowing for graceful handling of issues like invalid API keys or connection problems.
- **LiveView Updates**: The LiveView process updates the UI in response to events like successful connections or errors.

---

## Configuration

This demo allows you to set your OpenAI API key directly in the browser. Here's what you need to know:

* The API key is stored locally in your browser using localStorage.
* The API key is stored in plain text and is not encrypted.
* The API key never leaves your browser or gets sent to our server.
* You can review the open-source code to verify the handling of the API key.

### Important Security Note

Storing API keys in localStorage is not secure and is only intended for demonstration purposes. In a production environment, you should implement proper security measures to protect sensitive information.

Please note:

1. We make no guarantees about the security of this method. Use it at your own risk and implement appropriate security measures for any non-demonstration use.
2. Never share your API key or leave it exposed in public computers.
3. You can remove the stored API key in two ways:
   a. Using the application interface: Click the "Remove API Key" button on the demo page.
   b. Manually through browser developer tools:
      - Open your browser's developer tools (usually F12 or right-click and select "Inspect")
      - Go to the "Application" or "Storage" tab
      - Under "Local Storage", find and select the entry for this application's domain
      - Look for the item named "ex_openai_api_key" and delete it

For production use or handling sensitive data, we recommend implementing more robust security measures, such as server-side API key management.

## Learn more

  * OpenAI API: https://openai.com/blog/openai-api/
  * Elixir: https://elixir-lang.org/
  * Phoenix Framework: https://www.phoenixframework.org/
  * Guides: https://hexdocs.pm/phoenix/overview.html
  * Docs: https://hexdocs.pm/phoenix

## Contributing

While this project is primarily a demonstration, you are welcome to fork the repository or submit pull requests if you'd like to contribute. Feel free to use and modify the code as you see fit under the terms of the license. If you see something that can be improved, please don't hesitate to open an issue or submit a pull request. We appreciate your feedback and contributions!

## License

This project is licensed under the [MIT License](LICENSE).
