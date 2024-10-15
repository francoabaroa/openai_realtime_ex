defmodule OpenaiRealtimeExWeb.RealtimeChannel do
  use Phoenix.Channel
  require Logger

  @impl true
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
  end

  def join("realtime:lobby", _params, _socket) do
    Logger.info("Realtime Channel: Received join without API key")
    {:error, %{reason: "API key is required"}}
  end

  @impl true
  def terminate(_reason, socket) do
    Logger.info("Realtime Channel: Terminating")

    if api_client = socket.assigns[:api_client] do
      # Properly stop the API client process
      Process.exit(api_client, :normal)
    end

    :ok
  end

  # Handle messages from the RealtimeApiClient
  @impl true
  def handle_info({:api_message, message}, socket) do
    Logger.info("Realtime Channel: Received message from OpenAI: #{message}")
    push(socket, "api_message", %{message: message})
    {:noreply, socket}
  end
end
