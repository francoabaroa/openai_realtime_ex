defmodule OpenaiRealtimeExWeb.OpenAIWebSocket do
  use WebSockex

  def start_link(url, state) do
    WebSockex.start_link(url, __MODULE__, state)
  end

  def handle_frame({:text, msg}, state) do
    IO.puts("Received message: #{msg}")
    {:ok, state}
  end

  def handle_cast({:send, {type, msg}}, state) do
    {:reply, {type, msg}, state}
  end
end
