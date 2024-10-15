defmodule OpenaiRealtimeExWeb.DemoLive do
  use OpenaiRealtimeExWeb, :live_view
  require Logger

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     assign(socket,
       page_title: "OpenAI Realtime Elixir Demo",
       connected_to_realtime: false,
       api_key_set: false,
       connection_error: nil
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
    {:noreply, assign(socket, api_key_set: true)}
  end

  def handle_event("api_key_removed", _, socket) do
    {:noreply, assign(socket, api_key_set: false, connected_to_realtime: false)}
  end

  def handle_event("connect_to_realtime", _, socket) do
    {:noreply, push_event(socket, "connect_to_realtime", %{})}
  end

  def handle_event("disconnect_from_realtime", _, socket) do
    {:noreply, push_event(socket, "disconnect_from_realtime", %{})}
  end

  def handle_event("realtime_connected", _, socket) do
    {:noreply, assign(socket, connected_to_realtime: true, connection_error: nil)}
  end

  def handle_event("realtime_disconnected", _, socket) do
    {:noreply, assign(socket, connected_to_realtime: false, connection_error: nil)}
  end

  def handle_event("realtime_connection_error", %{"reason" => reason}, socket) do
    {:noreply, assign(socket, connection_error: reason, connected_to_realtime: false)}
  end

  def handle_event("api_key_retrieved", %{"api_key" => api_key}, socket) do
    # Use a placeholder URL for now. Replace with the actual OpenAI WebSocket URL.
    {:ok, pid} =
      OpenaiRealtimeExWeb.OpenAIWebSocket.start_link("wss://example.com/openai-websocket", %{
        api_key: api_key
      })

    {:noreply, assign(socket, websocket: pid)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="container mx-auto" id="api-key-container" phx-hook="ApiKey">
      <h1 class="text-3xl font-bold mb-4">OpenAI Realtime Elixir Demo</h1>
      <div class="mb-4">
        <%= if @api_key_set do %>
          <p>API Key is set</p>
          <button phx-click="remove_api_key" class="bg-red-500 text-white px-4 py-2 rounded">
            Remove API Key
          </button>
        <% else %>
          <form phx-submit="set_api_key">
            <input
              type="password"
              name="api_key"
              placeholder="Enter your OpenAI API Key"
              class="border p-2 mr-2"
            />
            <button type="submit" class="bg-green-500 text-white px-4 py-2 rounded">
              Set API Key
            </button>
          </form>
        <% end %>
      </div>
      <div>
        <button
          phx-click={
            if @connected_to_realtime, do: "disconnect_from_realtime", else: "connect_to_realtime"
          }
          class="bg-blue-500 text-white px-4 py-2 rounded"
          disabled={!@api_key_set}
        >
          <%= if @connected_to_realtime, do: "Disconnect", else: "Connect" %>
        </button>
      </div>
      <%= if @connection_error do %>
        <div class="mt-4 text-red-500">
          Connection error: <%= @connection_error %>
        </div>
      <% end %>
    </div>
    """
  end
end
