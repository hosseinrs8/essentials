# essentials

A mono-repo structured Node development framework consisting of the following packages

- Auth
  - HTTP authentication middlewares
  - Token verification logic
    
- Common
  - Service bootstrap management
  - Configuration loader
  - Logging utilities
  - Metric collector
  - Sentry connection

- Errors
  - Various centralized error instances

- HTTP
  - HTTP server factory
  - Body reading & parsing utilities
  - Decorator based controller initialization
  - Various helping middlewares
  - Websocket factory
  - URL utilities

- Infras
  - BeeQueue factory
  - GRPC client & server builders: handling decorator-based listeners and various publishers, providing events, requests & responses, single & duplex streams.
  - NATS management: A decorator-based event management and various publishers, consisting of simple NATS, JetStream, acknowledgment solution, JSONCodec & MSGPack encode/decode.
  - Postgres factory with migration service
  - Redis service with monitoring and centralized manager instance
  - AWS S3 storage alongside a file validator class
