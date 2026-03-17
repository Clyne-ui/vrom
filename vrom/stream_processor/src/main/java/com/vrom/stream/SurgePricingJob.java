package com.vrom.stream;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.flink.api.common.eventtime.WatermarkStrategy;
import org.apache.flink.api.common.functions.MapFunction;
import org.apache.flink.api.common.serialization.SimpleStringSchema;
import org.apache.flink.api.java.tuple.Tuple2;
import org.apache.flink.connector.kafka.source.KafkaSource;
import org.apache.flink.connector.kafka.source.enumerator.initializer.OffsetsInitializer;
import org.apache.flink.connector.kafka.sink.KafkaSink;
import org.apache.flink.connector.kafka.sink.KafkaRecordSerializationSchema;
import org.apache.flink.streaming.api.datastream.DataStream;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.streaming.api.windowing.assigners.TumblingProcessingTimeWindows;
import org.apache.flink.streaming.api.windowing.time.Time;
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;
//import org.apache.flink.streaming.api.functions.windowing.WindowFunction;
//import org.apache.flink.streaming.api.windowing.windows.TimeWindow;
//import org.apache.flink.util.Collector;

import com.google.common.geometry.S2LatLng;
import com.google.common.geometry.S2CellId;

public class SurgePricingJob {

    private static final ObjectMapper mapper = new ObjectMapper();

    public static void main(String[] args) throws Exception {
        final StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();

        String brokers = "localhost:9092";

        // 1. Source: Driver Supply Topic
        KafkaSource<String> supplySource = KafkaSource.<String>builder()
                .setBootstrapServers(brokers)
                .setTopics("vrom.driver.locations")
                .setGroupId("surge-pricing-group")
                .setStartingOffsets(OffsetsInitializer.latest())
                .setValueOnlyDeserializer(new SimpleStringSchema())
                .build();

        // 2. Source: Customer Demand Topic
        KafkaSource<String> demandSource = KafkaSource.<String>builder()
                .setBootstrapServers(brokers)
                .setTopics("vrom.rides.requested")
                .setGroupId("surge-pricing-group")
                .setStartingOffsets(OffsetsInitializer.latest())
                .setValueOnlyDeserializer(new SimpleStringSchema())
                .build();

        DataStream<String> supplyEvents = env.fromSource(supplySource, WatermarkStrategy.noWatermarks(),
                "Driver Supply Source");
        DataStream<String> demandEvents = env.fromSource(demandSource, WatermarkStrategy.noWatermarks(),
                "Customer Demand Source");

        // Parse JSON and convert Lat/Lng to S2 Cell (Level 13)
        DataStream<Tuple2<String, Integer>> parsedSupply = supplyEvents
                .map(new MapFunction<String, Tuple2<String, Integer>>() {
                    @Override
                    public Tuple2<String, Integer> map(String value) throws Exception {
                        JsonNode node = mapper.readTree(value);
                        double lat = node.get("lat").asDouble();
                        double lng = node.get("lng").asDouble();
                        String s2Cell = S2CellId.fromLatLng(S2LatLng.fromDegrees(lat, lng)).parent(13).toToken();
                        return new Tuple2<>(s2Cell, 1);
                    }
                });

        DataStream<Tuple2<String, Integer>> parsedDemand = demandEvents
                .map(new MapFunction<String, Tuple2<String, Integer>>() {
                    @Override
                    public Tuple2<String, Integer> map(String value) throws Exception {
                        JsonNode node = mapper.readTree(value);
                        double lat = node.get("lat").asDouble();
                        double lng = node.get("lng").asDouble();
                        String s2Cell = S2CellId.fromLatLng(S2LatLng.fromDegrees(lat, lng)).parent(13).toToken();
                        return new Tuple2<>(s2Cell, 1);
                    }
                });

        // Windowed Supply Count (per 10 seconds for demo)
        DataStream<Tuple2<String, Integer>> supplyCount = parsedSupply
                .keyBy(value -> value.f0)
                .window(TumblingProcessingTimeWindows.of(Time.seconds(10)))
                .sum(1);

        // Windowed Demand Count
        DataStream<Tuple2<String, Integer>> demandCount = parsedDemand
                .keyBy(value -> value.f0)
                .window(TumblingProcessingTimeWindows.of(Time.seconds(10)))
                .sum(1);

        // Calculate Surge (Wait, a better way is CoGroup, but for simplicity we dump
        // both to a state or simply output counts)
        // For a true MVP, let's output the demand multiplier. By mapping demand counts
        // to a JSON output.
        // In a real system, you'd store these into Redis. Here we print and pipe to a
        // new Kafka topic.

        DataStream<String> demandOutput = demandCount
                .map(new MapFunction<Tuple2<String, Integer>, String>() {
                    private static final JedisPool pool = new JedisPool(new JedisPoolConfig(), "localhost", 6379);

                    @Override
                    public String map(Tuple2<String, Integer> value) throws Exception {
                        // Very basic surge logic: 1.0 + (requests * 0.1)
                        double surgeMultiplier = 1.0 + (value.f1 * 0.1);
                        
                        // Push to Redis for the Go API to read
                        try (Jedis jedis = pool.getResource()) {
                            // Key: "surge:s2:<cell_id>", Value: 1.25, Expiry: 60s
                            String redisKey = "surge:s2:" + value.f0;
                            jedis.setex(redisKey, 60, String.format("%.2f", surgeMultiplier));
                        }

                        return String.format("{\"s2_cell\":\"%s\", \"requests\":%d, \"surge_multiplier\":%.2f}",
                                value.f0, value.f1, surgeMultiplier);
                    }
                });

        demandOutput.print();

        // Optional: Sink to another Kafka topic "vrom.pricing.surge_updates"
        KafkaSink<String> sink = KafkaSink.<String>builder()
                .setBootstrapServers(brokers)
                .setRecordSerializer(KafkaRecordSerializationSchema.builder()
                        .setTopic("vrom.pricing.surge_updates")
                        .setValueSerializationSchema(new SimpleStringSchema())
                        .build())
                .build();

        demandOutput.sinkTo(sink);

        env.execute("Surge Pricing Engine");
    }
}
