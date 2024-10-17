defmodule OpenaiRealtimeExWeb.DemoLive do
  use OpenaiRealtimeExWeb, :live_view
  require Logger

  @impl true
  def mount(_params, _session, socket) do
    if connected?(socket) do
      :ok = Phoenix.PubSub.subscribe(OpenaiRealtimeEx.PubSub, "realtime:lobby")
    end

    {:ok,
     assign(socket,
       page_title: "OpenAI Realtime Elixir Demo",
       connected_to_realtime: false,
       api_key_set: false,
       connection_error: nil,
       show_api_key_message: false
     )}
  end

  @impl true
  def handle_event("set_api_key", %{"api_key" => api_key}, socket) do
    {:noreply, push_event(socket, "store_api_key", %{api_key: api_key})}
  end

  def handle_event("remove_api_key", _, socket) do
    {:noreply, push_event(socket, "remove_api_key", %{})}
  end

  def handle_event("api_key_stored", _, socket) do
    {:noreply, assign(socket, api_key_set: true, show_api_key_message: false)}
  end

  def handle_event("api_key_removed", _, socket) do
    {:noreply,
     assign(socket,
       api_key_set: false,
       connected_to_realtime: false,
       show_api_key_message: false
     )}
  end

  def handle_event("connect_to_realtime", _, socket) do
    {:noreply, push_event(socket, "connect_to_realtime", %{})}
  end

  def handle_event("disconnect_from_realtime", _, socket) do
    {:noreply, push_event(socket, "disconnect_from_realtime", %{})}
  end

  @impl true
  def handle_event("realtime_connected", _, socket) do
    {:noreply, assign(socket, connected_to_realtime: true, connection_error: nil)}
  end

  @impl true
  def handle_event("realtime_disconnected", _, socket) do
    {:noreply, assign(socket, connected_to_realtime: false)}
  end

  @impl true
  def handle_event("realtime_connection_error", %{"reason" => reason}, socket) do
    {:noreply, assign(socket, connection_error: reason)}
  end

  def handle_event("voice_chat_started", _params, socket) do
    {:noreply, push_event(socket, "voice_chat_started", %{})}
  end

  def handle_event("voice_chat_stopped", _params, socket) do
    {:noreply, push_event(socket, "voice_chat_stopped", %{})}
  end

  @impl true
  def handle_info(
        %Phoenix.Socket.Broadcast{event: "api_message", payload: %{message: message}},
        socket
      ) do
    case Jason.decode(message) do
      {:ok, %{"type" => "error", "error" => %{"message" => error_message}}} ->
        {:noreply,
         socket
         |> put_flash(:error, "API Error: #{error_message}")
         |> assign(connected_to_realtime: false)}

      _ ->
        {:noreply, socket}
    end
  end

  # Catch-all handle_info to avoid crashing on unexpected messages
  @impl true
  def handle_info(_msg, socket) do
    {:noreply, socket}
  end

  @impl true
  def terminate(_reason, _socket) do
    :ok
  end
end
