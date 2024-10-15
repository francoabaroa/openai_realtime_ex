defmodule OpenaiRealtimeEx.RealtimeApiClient do
  use WebSockex
  require Logger

  @openai_api_url "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"

  def start_link(opts \\ []) do
    state = %{channel_pid: Keyword.get(opts, :channel_pid)}
    url = @openai_api_url

    api_key = Keyword.get(opts, :api_key) || raise "API key is required"

    headers = [
      {"Authorization", "Bearer #{api_key}"},
      {"OpenAI-Beta", "realtime=v1"}
    ]

    WebSockex.start_link(url, __MODULE__, state, extra_headers: headers)
  end

  # Handle the WebSocket connection being established
  def handle_connect(%WebSockex.Conn{} = _conn, state) do
    Logger.info("Realtime API Client: Connected to OpenAI Realtime API")
    {:ok, state}
  end

  def handle_disconnect(%{reason: reason}, state) do
    Logger.error("Realtime API Client: Disconnected from OpenAI Realtime API: #{inspect(reason)}")
    {:ok, state}
  end

  def handle_frame({:text, msg}, state) do
    Logger.info("Realtime API Client: Received message from OpenAI: #{msg}")
    send(state.channel_pid, {:api_message, msg})
    {:ok, state}
  end

  def terminate(_reason, _state) do
    Logger.info("Realtime API Client: Terminating")
    :ok
  end
end
