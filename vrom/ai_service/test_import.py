try:
    from langchain_huggingface import HuggingFaceEmbeddings
    print("langchain_huggingface success")
except ImportError as e:
    print(f"langchain_huggingface failed: {e}")
    try:
        from langchain_community.embeddings import HuggingFaceEmbeddings
        print("langchain_community success")
    except ImportError as e2:
        print(f"langchain_community failed: {e2}")
