fn main() -> Result<(), Box<dyn std::error::Error>> {
    // This points to the proto file you have in your 'proto' folder
    tonic_build::compile_protos("../proto/vrom_engine.proto")?;
    Ok(())
}