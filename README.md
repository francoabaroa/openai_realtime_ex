# OpenAI Realtime Elixir Demo

This project demonstrates the integration of OpenAI's Realtime API with an Elixir/Phoenix application.

## Getting Started

To start your Phoenix server:

  * Run `mix setup` to install and setup dependencies
  * Start Phoenix endpoint with `mix phx.server` or inside IEx with `iex -S mix phx.server`

Now you can visit [`localhost:4000`](http://localhost:4000) from your browser to see the demo page.

## Features

* Demonstrates real-time interaction with OpenAI's API
* Built with Elixir and Phoenix for robust, scalable performance
* Simple, user-friendly interface for testing API capabilities
* Client-side API key management for easy testing and demonstration
* Option to easily remove stored API key for security

## Configuration

This demo allows you to set your OpenAI API key directly in the browser. Here's what you need to know:

* The API key is stored locally in your browser using localStorage.
* The API key is stored in plain text and is not encrypted.
* The API key never leaves your browser or gets sent to our server.
* You can review the open-source code to verify the handling of the API key.

### Important Security Note

Storing API keys in localStorage is not secure and is only intended for demonstration purposes. In a production environment, you should implement proper security measures to protect sensitive information.

Please note:

1. We make no guarantees about the security of this method. Use it at your own risk and implement appropriate security measures for any non-demonstration use.
2. Never share your API key or leave it exposed in public computers.
3. You can remove the stored API key in two ways:
   a. Using the application interface: Click the "Remove API Key" button on the demo page.
   b. Manually through browser developer tools:
      - Open your browser's developer tools (usually F12 or right-click and select "Inspect")
      - Go to the "Application" or "Storage" tab
      - Under "Local Storage", find and select the entry for this application's domain
      - Look for the item named "ex_openai_api_key" and delete it

For production use or handling sensitive data, we recommend implementing more robust security measures, such as server-side API key management.

## Learn more

  * OpenAI API: https://openai.com/blog/openai-api/
  * Elixir: https://elixir-lang.org/
  * Phoenix Framework: https://www.phoenixframework.org/
  * Guides: https://hexdocs.pm/phoenix/overview.html
  * Docs: https://hexdocs.pm/phoenix

## Contributing

While this project is primarily a demonstration, you are welcome to fork the repository or submit pull requests if you'd like to contribute. Feel free to use and modify the code as you see fit under the terms of the license. If you see something that can be improved, please don't hesitate to open an issue or submit a pull request. We appreciate your feedback and contributions!

## License

This project is licensed under the [MIT License](LICENSE).
