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
    send(self(), :send_session_create)
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

  def terminate(reason, _state) do
    Logger.info("Realtime API Client: Terminating due to reason: #{inspect(reason)}")
    :ok
  end

  # Replace handle_cast with handle_info
  def handle_info({:send_audio_chunk, base64_audio}, state) do
    Logger.info("Realtime API Client: Sending audio chunk to OpenAI")

    event = %{
      "type" => "input_audio_buffer.append",
      "audio" => base64_audio
    }

    frame = {:text, Jason.encode!(event)}

    {:reply, frame, state}
  end

  def handle_info(:commit_audio, state) do
    Logger.info("Realtime API Client: Committing audio")
    commit_event = %{"type" => "input_audio_buffer.commit"}
    response_event = %{"type" => "response.create"}

    commit_frame = {:text, Jason.encode!(commit_event)}
    response_frame = {:text, Jason.encode!(response_event)}

    # Send the commit_frame first
    {:reply, commit_frame, state}

    # Schedule sending the response_frame
    send(self(), {:send_frame, response_frame})

    {:ok, state}
  end

  def handle_info(:send_session_create, state) do
    response_create_event = %{
      type: "response.create",
      response: %{
        modalities: ["text", "audio"],
        instructions:
          "Instructions: - You are an artificial intelligence agent responsible for helping test realtime voice capabilities - Please make sure to respond with a helpful voice via audio - Be kind, helpful, and curteous - It is okay to ask the user questions - Use tools and functions you have available liberally, it is part of the training apparatus - Be open to exploration and conversation - Remember: this is just for fun and testing! Personality: - Be upbeat and genuine - Try speaking quickly as if excited",
        voice: "alloy",
        output_audio_format: "pcm16",
        temperature: 1,
        max_output_tokens: "inf"
      }
    }

    session_update_event = %{
      type: "session.update",
      session: %{
        input_audio_transcription: %{
          model: "whisper-1"
        },
        instructions:
          "Instructions: - You are an artificial intelligence agent responsible for helping test realtime voice capabilities - Please make sure to respond with a helpful voice via audio - Be kind, helpful, and curteous - It is okay to ask the user questions - Use tools and functions you have available liberally, it is part of the training apparatus - Be open to exploration and conversation - Remember: this is just for fun and testing! Personality: - Be upbeat and genuine - Try speaking quickly as if excited",
        turn_detection: nil
      }
    }

    response_create_frame = {:text, Jason.encode!(response_create_event)}
    session_update_frame = {:text, Jason.encode!(session_update_event)}

    # Send frames separately
    {:reply, response_create_frame, state}
    send(self(), {:send_frame, session_update_frame})

    {:ok, state}
  end

  def handle_info({:send_frame, frame}, state) do
    {:reply, frame, state}
  end

  # Handle other event types from OpenAI as needed
  # defp handle_api_event(%{"type" => "response.audio.delta", "delta" => delta}, state) do
  #   Logger.info("Received audio delta")
  #   send(state.channel_pid, {:realtime_event, :audio_delta, %{"delta" => delta}})
  #   {:ok, state}
  # end

  # Remove or comment out the generic handle_info to prevent interference
  # def handle_info(msg, state) do
  #   Logger.warn("Realtime API Client: Received unexpected message: #{inspect(msg)}")
  #   {:ok, state}
  # end
end
