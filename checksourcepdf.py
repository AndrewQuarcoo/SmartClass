import chromadb
import logging

# --- Configuration ---
# Ensure these match your ingestion script (pdftovector.py)
CHROMA_DB_PATH = "./syllabusvectordb"
COLLECTION_NAME = "syllabus_collection"

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_all_source_pdfs():
    """
    Connects to ChromaDB, retrieves all metadata, and prints unique source_pdf values.
    """
    try:
        # 1. Initialize ChromaDB Client
        client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        logging.info(f"ChromaDB client initialized. Accessing data from {CHROMA_DB_PATH}")

        # 2. Get the Collection
        # We don't need the embedding function here as we are not adding or querying by similarity.
        collection = client.get_collection(name=COLLECTION_NAME)
        logging.info(f"Successfully connected to collection: '{COLLECTION_NAME}'")

        total_documents = collection.count()
        if total_documents == 0:
            logging.warning("The collection is empty. No source PDFs to list.")
            return

        logging.info(f"Total documents in collection: {total_documents}. Fetching metadata...")

        # 3. Retrieve all metadata
        # We can fetch all entries by not providing IDs.
        # We only need the 'metadatas' field.
        # Note: For very large collections, fetching all at once might be memory intensive.
        # ChromaDB's .get() can take `limit` and `offset` for pagination if needed,
        # but for listing unique sources, fetching all metadata is usually fine.
        results = collection.get(
            include=['metadatas'] # Only fetch metadatas to save memory and time
        )

        if not results or not results.get('metadatas'):
            logging.warning("No metadata found in the collection.")
            return

        # 4. Extract unique source_pdf values
        source_pdfs = set()
        for metadata_item in results['metadatas']:
            if metadata_item and 'source_pdf' in metadata_item:
                source_pdfs.add(metadata_item['source_pdf'])
            else:
                logging.debug(f"Found an item with missing or malformed metadata: {metadata_item}")


        if not source_pdfs:
            logging.info("No 'source_pdf' keys found in the metadata of the documents.")
            return

        # 5. Print the unique source_pdf values
        logging.info("\n--- Unique Source PDFs Found in the Collection ---")
        for pdf_name in sorted(list(source_pdfs)): # Sort for consistent output
            print(pdf_name)
        logging.info("-------------------------------------------------")

    except Exception as e:
        logging.error(f"An error occurred: {e}")
        logging.error("Please ensure the CHROMA_DB_PATH and COLLECTION_NAME are correct, "
                      "and the database was created successfully by 'pdftovector.py'.")

if __name__ == "__main__":
    get_all_source_pdfs()
