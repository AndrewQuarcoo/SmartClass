import chromadb
from chromadb.utils import embedding_functions

# Configuration (should match what you used for ingestion)
CHROMA_DB_PATH = "./syllabusvectordb"
COLLECTION_NAME = "syllabus_collection"
EMBEDDING_MODEL_NAME = 'all-MiniLM-L6-v2' # Ensure this matches

# Initialize embedding function
sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name=EMBEDDING_MODEL_NAME
)

# Initialize ChromaDB client
client = chromadb.PersistentClient(path=CHROMA_DB_PATH)

# Get the collection
try:
    collection = client.get_collection(
        name=COLLECTION_NAME,
        embedding_function=sentence_transformer_ef # Important for querying if not set at creation
    )
    print(f"Successfully connected to collection '{COLLECTION_NAME}'.")
    print(f"Total documents in collection: {collection.count()}")

    # Example: Get a few documents from the collection
    # Note: .get() retrieves by ID or with a where clause, not just "first N" easily without more info.
    # For a peek, you can query for something very generic or retrieve by known IDs if you have them.
    # A more common use case is querying with actual text:
    results = collection.query(
        query_texts=["sports"], # Example query
        n_results=2 # Number of results to fetch
    ) 
    print("\nExample query results:")
    if results and results.get('documents'):
        for i, doc in enumerate(results['documents'][0]):
            print(f"\nDocument {i+1}:")
            print(doc)
            if results['metadatas'] and results['metadatas'][0] and len(results['metadatas'][0]) > i:
                print(f"Metadata: {results['metadatas'][0][i]}")
    else:
        print("No results found for the example query, or collection is empty.")

except Exception as e:
    print(f"Error connecting to or querying collection: {e}")
    print("Ensure the CHROMA_DB_PATH and COLLECTION_NAME are correct and the database exists.")

