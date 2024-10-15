defmodule OpenaiRealtimeExWeb.DemoLive do
  use OpenaiRealtimeExWeb, :live_view

  def mount(_params, _session, socket) do
    {:ok, assign(socket, page_title: "Demo Page", count: 0)}
  end

  def handle_event("increment", _, socket) do
    {:noreply, update(socket, :count, &(&1 + 1))}
  end

  def handle_event("decrement", _, socket) do
    {:noreply, update(socket, :count, &(&1 - 1))}
  end

  def render(assigns) do
    ~H"""
    <div class="container mx-auto">
      <h1 class="text-3xl font-bold mb-4">Welcome to the Demo Page</h1>
      <p class="mb-4">This is a LiveView demo page with some interactivity.</p>
      <div class="flex items-center space-x-4">
        <button phx-click="decrement" class="bg-red-500 text-white px-4 py-2 rounded">-</button>
        <span class="text-2xl font-bold"><%= @count %></span>
        <button phx-click="increment" class="bg-green-500 text-white px-4 py-2 rounded">+</button>
      </div>
    </div>
    """
  end
end
