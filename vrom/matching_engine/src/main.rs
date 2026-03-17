use tonic::{transport::Server, Request, Response, Status};
use h3o::{LatLng, Resolution};

pub mod vrom {
    tonic::include_proto!("vrom");
}

use vrom::matching_engine_server::{MatchingEngine, MatchingEngineServer};
use vrom::{RouteRequest, RouteResponse, NearbyRequest, NearbyResponse, NearbyEntity};

#[derive(Debug, Default)]
pub struct MyEngine {}

#[tonic::async_trait]
impl MatchingEngine for MyEngine {
    async fn solve_tsp(&self, request: Request<RouteRequest>) -> Result<Response<RouteResponse>, Status> {
        let req = request.into_inner();
        println!("🧠 Matching Engine: Calculating best route for Rider {}", req.rider_id);

        let reply = RouteResponse {
            optimized_ids: vec!["stop_1".into(), "stop_2".into()],
            total_distance: 5.2,
        };

        Ok(Response::new(reply))
    }

    async fn get_nearby(&self, request: Request<NearbyRequest>) -> Result<Response<NearbyResponse>, Status> {
        let req = request.into_inner();
        
        // 1. Validate Coordinates
        let latlng = LatLng::new(req.lat, req.lng)
            .map_err(|_| Status::invalid_argument("Invalid latitude or longitude coordinates. Please refresh your location."))?;

        // 2. Convert to H3 Index (Resolution 7 is ~1.2km across)
        let center_cell = latlng.to_cell(Resolution::Seven);
        let center_h3 = center_cell.to_string();

        println!("📍 Spatial Search: Finding entities near H3 cell {}", center_h3);

        // 3. Grid Disk Search (Radius in H3 steps - approximating from km)
        // let k = (req.radius_km as f64 / 1.5).ceil() as u32;
        // let _neighboring_cells = center_cell.grid_disk::<Vec<CellIndex>>(k);

        // 4. Mock results (In production, this would query a spatial DB or in-memory index)
        let mut entities = Vec::new();
        
        // Example: Add a few mock riders/sellers in the area
        entities.push(NearbyEntity {
            id: "rider_77".to_string(),
            h3_index: center_h3.clone(),
            distance_km: 0.2,
        });

        let reply = NearbyResponse {
            entities,
            h3_index: center_h3,
        };

        Ok(Response::new(reply))
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = "0.0.0.0:50051".parse()?; // Use 0.0.0.0 to allow cross-container/host access
    println!("🚀 Rust Spatial Engine running on {}", addr);

    Server::builder()
        .add_service(MatchingEngineServer::new(MyEngine::default()))
        .serve(addr)
        .await?;

    Ok(())
}
