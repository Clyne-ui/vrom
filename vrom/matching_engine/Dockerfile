# Build stage
FROM rust:1.85-slim-bookworm AS builder

# Install protobuf compiler
RUN apt-get update && apt-get install -y protobuf-compiler && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Cargo.toml from matching_engine folder
COPY matching_engine/Cargo.toml ./matching_engine/

# Build dependencies separately for caching (optional but good)
# We'll just build the whole project here because of the complex proto path
COPY proto ./proto
COPY matching_engine/src ./matching_engine/src
COPY matching_engine/build.rs ./matching_engine/

WORKDIR /app/matching_engine
# Update build.rs path if necessary, but it's already looking at ../proto/
RUN cargo build --release

# Run stage
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /root/

# Copy the binary from the builder
COPY --from=builder /app/matching_engine/target/release/matching_engine .

# Port for gRPC
EXPOSE 50051

CMD ["./matching_engine"]
