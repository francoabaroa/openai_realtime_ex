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
     assign(socket, api_key_set: false, connected_to_realtime: false, show_api_key_message: false)}
  end

  def handle_event("api_key_not_set", _, socket) do
    {:noreply, assign(socket, show_api_key_message: true)}
  end

  def handle_event("connect_to_realtime", _, socket) do
    {:noreply, push_event(socket, "connect_to_realtime", %{})}
  end

  def handle_event("disconnect_from_realtime", _, socket) do
    {:noreply, push_event(socket, "disconnect_from_realtime", %{})}
  end

  @impl true
  def handle_info(%{event: "realtime_connected"}, socket) do
    {:noreply, assign(socket, connected_to_realtime: true, connection_error: nil)}
  end

  @impl true
  def handle_info(%{event: "realtime_disconnected"}, socket) do
    {:noreply, assign(socket, connected_to_realtime: false, connection_error: nil)}
  end

  @impl true
  def handle_info(%{event: "realtime_connection_error", payload: %{reason: reason}}, socket) do
    {:noreply, assign(socket, connection_error: reason, connected_to_realtime: false)}
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
         |> assign(connected_to_realtime: false, api_key_set: false)}

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
  def render(assigns) do
    ~H"""
    <div class="container mx-auto" id="api-key-container" phx-hook="ApiKey">
      <h1 class="text-3xl font-bold mb-4">OpenAI Realtime Elixir Demo</h1>

      <%= if Phoenix.Flash.get(@flash, :error) do %>
        <div
          class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
          role="alert"
        >
          <span class="block sm:inline"><%= Phoenix.Flash.get(@flash, :error) %></span>
        </div>
      <% end %>

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
      <%= if @api_key_set do %>
        <div>
          <%= if @connected_to_realtime do %>
            <button
              phx-click="disconnect_from_realtime"
              class="bg-red-500 text-white px-4 py-2 rounded"
            >
              Disconnect
            </button>
          <% else %>
            <button phx-click="connect_to_realtime" class="bg-blue-500 text-white px-4 py-2 rounded">
              Connect
            </button>
          <% end %>
        </div>
      <% end %>
      <%= if @connection_error do %>
        <div class="mt-4 text-red-500">
          Connection error: <%= @connection_error %>
        </div>
      <% end %>
    </div>
    """
  end
end
