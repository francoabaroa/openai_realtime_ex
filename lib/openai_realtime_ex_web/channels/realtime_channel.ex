defmodule OpenaiRealtimeExWeb.RealtimeChannel do
  use Phoenix.Channel
  require Logger

  @impl true
  def join("realtime:lobby", %{"api_key" => api_key}, socket)
      when is_binary(api_key) and api_key != "" do
    Logger.info("Realtime Channel Received join with API key")

    case OpenaiRealtimeEx.RealtimeApiClient.start_link(channel_pid: self(), api_key: api_key) do
      {:ok, pid} ->
        {:ok, assign(socket, :api_client, pid)}

      {:error, reason} ->
        Logger.error("Failed to start RealtimeApiClient: #{inspect(reason)}")
        {:error, %{reason: "Failed to initialize API client"}}
    end
  end

  def join("realtime:lobby", _params, _socket) do
    {:error, %{reason: "API key is required"}}
  end

  @impl true
  def terminate(_reason, socket) do
    if api_client = socket.assigns[:api_client] do
      WebSockex.cast(api_client, :close)
    end

    :ok
  end

  @impl true
  def handle_in("new_msg", %{"body" => body}, socket) do
    broadcast!(socket, "new_msg", %{body: body})
    {:noreply, socket}
  end

  # Add more handle_in clauses for other message types as needed

  # Handle messages from the RealtimeApiClient
  @impl true
  def handle_info({:api_message, message}, socket) do
    broadcast!(socket, "api_message", %{message: message})
    {:noreply, socket}
  end
end
