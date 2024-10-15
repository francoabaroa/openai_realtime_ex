defmodule OpenaiRealtimeExWeb.UserSocket do
  use Phoenix.Socket
  require Logger
  # Channels
  channel "realtime:*", OpenaiRealtimeExWeb.RealtimeChannel

  @impl true
  def connect(_params, socket, _connect_info) do
    Logger.info("UserSocket: Connecting")
    {:ok, socket}
  end

  @impl true
  def id(_socket), do: nil
end
