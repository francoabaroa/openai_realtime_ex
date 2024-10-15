defmodule OpenaiRealtimeEx.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      OpenaiRealtimeExWeb.Telemetry,
      {DNSCluster, query: Application.get_env(:openai_realtime_ex, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: OpenaiRealtimeEx.PubSub},
      # Start the Finch HTTP client for sending emails
      {Finch, name: OpenaiRealtimeEx.Finch},
      # Start a worker by calling: OpenaiRealtimeEx.Worker.start_link(arg)
      # {OpenaiRealtimeEx.Worker, arg},
      # Start to serve requests, typically the last entry
      OpenaiRealtimeExWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: OpenaiRealtimeEx.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    OpenaiRealtimeExWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
