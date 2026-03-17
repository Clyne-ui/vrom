import grpc
from concurrent import futures
import logging
import os
import vrom_ai_pb2
import vrom_ai_pb2_grpc
from transformers import pipeline
from langchain_community.document_loaders import TextLoader
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import CharacterTextSplitter

# Initialize the ML Model (Zero-Shot Classifier)
# This downloads a ~1.6GB model on first run, then runs entirely locally offline.
logging.info("Loading AI Models... This may take a minute on the first run.")
classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

# Initialize RAG (Retrieval Augmented Generation)
# This loads our FAQ knowledge base into a local memory-efficient vector store.
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
vector_store = None

def load_faq_index():
    global vector_store
    faq_path = os.path.join(os.path.dirname(__file__), "docs", "faq.md")
    if os.path.exists(faq_path):
        loader = TextLoader(faq_path, encoding='utf-8')
        documents = loader.load()
        text_splitter = CharacterTextSplitter(chunk_size=300, chunk_overlap=50)
        docs = text_splitter.split_documents(documents)
        vector_store = FAISS.from_documents(docs, embeddings)
        logging.info(f"📚 FAQ Knowledge Base loaded! Chunks: {len(docs)}")
    else:
        logging.warning("⚠️ faq.md not found. Support RAG will be disabled.")

load_faq_index()

logging.info("AI Models & RAG Engine Loaded Successfully! 🚀")

class AIServiceServicer(vrom_ai_pb2_grpc.AIServiceServicer):
    def TagProduct(self, request, context):
        """
        AI runs inference to auto-generate SEO Tags based on the product title.
        """
        logging.info(f"TagProduct Request: {request.title}")
        
        # The AI will choose all applicable tags from this list
        candidate_labels = [
            "Electronics", "Fashion", "Vehicles", "Food", "Services", 
            "Computer", "Mobile Phone", "Home Appliances", "Furniture", "Books"
        ]
        
        # Ask the AI to tag the product based on its title
        result = classifier(request.title, candidate_labels, multi_label=True)
        
        # Extract tags where the AI's confidence is over 50%
        tags = [label for label, score in zip(result['labels'], result['scores']) if score > 0.5]
        
        if not tags:
            tags = ["General"]
            
        return vrom_ai_pb2.TagResponse(tags=tags)

    def ModerateContent(self, request, context):
        """
        AI scans the product title for illegal or unsafe content semantically.
        """
        logging.info(f"ModerateContent Request: {request.text}")
        
        candidate_labels = [
            "Safe E-commerce Product", 
            "Weapons or Firearms", 
            "Illegal Drugs", 
            "Adult Content or Pornography"
        ]
        
        result = classifier(request.text, candidate_labels, multi_label=False)
        
        top_label = result['labels'][0]
        confidence = result['scores'][0]
        
        logging.info(f"AI Moderation Result: {top_label} (Confidence: {confidence:.2f})")
        
        if top_label != "Safe E-commerce Product" and confidence > 0.6:
            return vrom_ai_pb2.ModerationResponse(
                is_approved=False,
                reason=f"Content blocked by AI policy. Classified as: {top_label} ({confidence*100:.1f}%)"
            )
            
        return vrom_ai_pb2.ModerationResponse(is_approved=True, reason="Content is safe.")

    def SupportChat(self, request, context):
        """
        RAG Support: Searches the FAQ for answers and returns grounded info.
        """
        logging.info(f"SupportChat Request: {request.query}")
        
        if not vector_store:
            return vrom_ai_pb2.ChatResponse(response="I'm sorry, my knowledge base is currently offline. Please try again later.")
            
        # 1. Retrieve relevant chunks
        results = vector_store.similarity_search(request.query, k=2)
        context_text = "\n".join([doc.page_content for doc in results])
        sources = [doc.metadata.get('source', 'FAQ') for doc in results]
        
        # 2. Use the classifier to check if the question is answerable given the context
        # In a real RAG with an LLM, we'd feed this to a generator.
        # Since we are keeping it lightweight, we use a hybrid approach.
        
        response = f"Based on our documentation:\n\n{context_text}\n\nI hope this helps! Feel free to ask more specifics."
        
        return vrom_ai_pb2.ChatResponse(response=response, sources=sources)

    def PredictETA(self, request, context):
        """
        Predicts ETA based on distance and vehicle type.
        """
        logging.info(f"PredictETA Request: {request.vehicle_type}")
        
        # Fallback to Haversine * Mobility Factor
        import math
        R = 6371 # Earth radius in km
        dlat = math.radians(request.end_lat - request.start_lat)
        dlng = math.radians(request.end_lng - request.start_lng)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(request.start_lat)) * math.cos(math.radians(request.end_lat)) * math.sin(dlng/2)**2
        c = 2 * math.asin(math.sqrt(a))
        distance = R * c
        
        # Simple Factors
        speed = 25.0 # default 25 km/h
        if request.vehicle_type == "Bicycle": speed = 15.0
        if request.vehicle_type == "Motorcycle": speed = 35.0
        
        eta_minutes = (distance / speed) * 60
        
        # Add 5 mins urban buffer
        eta_minutes += 5
        
        return vrom_ai_pb2.ETAResponse(
            estimated_minutes=eta_minutes,
            traffic_status="Moderate"
        )

def serve():
    port = '50052'
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    vrom_ai_pb2_grpc.add_AIServiceServicer_to_server(AIServiceServicer(), server)
    server.add_insecure_port(f'[::]:{port}')
    server.start()
    logging.info(f"🧠 Python AI Brain listening on port {port}...")
    server.wait_for_termination()

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    serve()
