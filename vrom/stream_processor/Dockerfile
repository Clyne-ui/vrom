# Build stage
FROM maven:3.9-eclipse-temurin-17-alpine AS builder

WORKDIR /app

# Copy pom.xml and download dependencies
COPY pom.xml .

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM flink:1.18.1-java17

WORKDIR /opt/flink

# Copy the shaded jar from the builder
COPY --from=builder /app/target/stream_processor-1.0-SNAPSHOT.jar /opt/flink/usrlib/stream_processor.jar

# Environment variables with defaults
ENV KAFKA_BROKERS=vrom-kafka:29092
ENV REDIS_HOST=vrom-redis

# Flink setup is handled by the base image, but we can override the entrypoint
# to run our specific job if needed, or just let users submit it.
# For a standalone containerized job:
# CMD ["flink", "run-application", "-p", "1", "/opt/flink/usrlib/stream_processor.jar"]

# Actually, we'll start with a standard Flink setup and the user can submit jobs,
# OR we can use the 'run-application' mode for a job-cluster style.
# Let's use the standard Flink entrypoint but provide the JAR.
