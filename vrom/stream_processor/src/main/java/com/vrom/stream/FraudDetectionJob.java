package com.vrom.stream;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.api.common.state.ValueState;
import org.apache.flink.api.common.state.ValueStateDescriptor;
import org.apache.flink.configuration.Configuration;
import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.flink.connector.kafka.sink.KafkaSink;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.functions.KeyedProcessFunction;
import org.apache.flink.util.Collector;

import com.google.common.geometry.S2LatLng;
import com.google.common.geometry.S2CellId;

public class FraudDetectionJob {

    private static final ObjectMapper mapper = new ObjectMapper();

    public static void main(String[] args) throws Exception {
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        String brokers = "localhost:9092";

        KafkaSource<String> transactionSource = KafkaSource.<String>builder()
                .setBootstrapServers(brokers)
                .setTopics("vrom.transactions.fraud_check")
                .setGroupId("fraud-detection-group")
                .setStartingOffsets(OffsetsInitializer.latest())
                .setValueOnlyDeserializer(new SimpleStringSchema())
                // Fix for Docker networking: tells the Kafka client to only use
                // the bootstrap server address and not follow broker redirects
                .setProperty("request.timeout.ms", "60000")
                .setProperty("metadata.max.age.ms", "30000")
                .setProperty("socket.connection.setup.timeout.ms", "30000")
                .setProperty("reconnect.backoff.ms", "1000")
                .setProperty("reconnect.backoff.max.ms", "10000")
                .build();

        DataStream<String> transactions = env.fromSource(
                transactionSource,
                WatermarkStrategy.noWatermarks(),
                "Transaction Source");

        // Key by user_id
        DataStream<String> fraudAlerts = transactions
                .keyBy(value -> {
                    try {
                        JsonNode node = mapper.readTree(value);
                        return node.get("user_id").asText();
                    } catch (Exception e) {
                        return "unknown";
                    }
                })
                .process(new FraudDetector());

        fraudAlerts.print();

        // Sink alerts back to Kafka
        KafkaSink<String> sink = KafkaSink.<String>builder()
                .setBootstrapServers(brokers)
                .setRecordSerializer(KafkaRecordSerializationSchema.builder()
                        .setTopic("vrom.transactions.fraud_alerts")
                        .setValueSerializationSchema(new SimpleStringSchema())
                        .build())
                .build();

        fraudAlerts.sinkTo(sink);

        env.execute("Fraud Detection Engine");
    }

    public static class FraudDetector extends KeyedProcessFunction<String, String, String> {

        private transient ValueState<Integer> transactionCountState;
        private transient ValueState<Long> timerState;

        // S2 states for GPS Spoofing check
        private transient ValueState<String> prevS2TokenState;
        private transient ValueState<Long> prevTimestampState;

        @Override
        public void open(Configuration parameters) {
            transactionCountState = getRuntimeContext()
                    .getState(new ValueStateDescriptor<>("transaction-count", Integer.class));
            timerState = getRuntimeContext().getState(new ValueStateDescriptor<>("timer-state", Long.class));

            prevS2TokenState = getRuntimeContext().getState(new ValueStateDescriptor<>("prev-s2-token", String.class));
            prevTimestampState = getRuntimeContext().getState(new ValueStateDescriptor<>("prev-timestamp", Long.class));
        }

        @Override
        public void processElement(String value, Context ctx, Collector<String> out) throws Exception {
            JsonNode node = mapper.readTree(value);
            String userId = ctx.getCurrentKey();
            String metadata = node.has("metadata") ? node.get("metadata").asText() : "";
            // 1. Unified Velocity Check (more strict for payments)
            Integer currentCount = transactionCountState.value();
            if (currentCount == null) currentCount = 0;
            currentCount++;
            transactionCountState.update(currentCount);

            long currentProcessingTime = ctx.timerService().currentProcessingTime();
            if (timerState.value() == null) {
                // Payments have a 5-minute window for velocity check
                long windowMillis = metadata.equals("online_payment") ? (5 * 60 * 1000) : (60 * 1000);
                long timer = currentProcessingTime + windowMillis;
                ctx.timerService().registerProcessingTimeTimer(timer);
                timerState.update(timer);
            }

            if (currentCount > 3) {
                String alertType = metadata.equals("online_payment") ? "PAYMENT_VELOCITY_EXCEEDED" : "TX_VELOCITY_EXCEEDED";
                out.collect(String.format(
                        "{\"user_id\":\"%s\", \"alert\":\"%s\", \"message\": \"Suspicious frequency: %d transactions detected in window\"}",
                        userId, alertType, currentCount));
            }

            // 2. Location & GPS Checks (S2 token for spoofing check)
            if (metadata != null && metadata.length() >= 8 && !metadata.equals("online_payment")) {
                try {
                    S2CellId currentCell = S2CellId.fromToken(metadata);
                    String prevToken = prevS2TokenState.value();
                    Long prevTs = prevTimestampState.value();
                    long timestamp = node.has("timestamp") ? node.get("timestamp").asLong() : currentProcessingTime;

                    if (prevToken != null && prevTs != null) {
                        S2CellId prevCell = S2CellId.fromToken(prevToken);
                        S2LatLng p1 = prevCell.toLatLng();
                        S2LatLng p2 = currentCell.toLatLng();
                        
                        // Distance in Km: S1Angle.radians * EarthRadius
                        double distanceKm = p1.getDistance(p2).radians() * 6371.01;
                        long timeDeltaSec = (timestamp - prevTs) / 1000;

                        if (timeDeltaSec > 0) {
                            double speedKph = (distanceKm / timeDeltaSec) * 3600;
                            if (speedKph > 300) {
                                out.collect(String.format(
                                        "{\"user_id\":\"%s\", \"alert\":\"GPS_SPOOFING\", \"message\": \"Impossible movement: %.2f km in %d sec (%.2f kph)\"}",
                                        userId, distanceKm, timeDeltaSec, speedKph));
                            }
                        }
                    }
                    prevS2TokenState.update(metadata);
                    prevTimestampState.update(timestamp);
                } catch (Exception e) {
                    // Not a valid S2 token, skip spoofing check
                }
            }
        }

        @Override
        public void onTimer(long timestamp, OnTimerContext ctx, Collector<String> out) throws Exception {
            timerState.clear();
            transactionCountState.clear();
        }
    }
}
