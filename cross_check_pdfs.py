import os
import chromadb
import logging

# --- Configuration ---
# Ensure these match your ingestion script (process_syllabi_to_vectordb.py)
# This is the directory where your original PDF files are stored.
PDF_DIRECTORY = "./syllabus/"

# Ensure these match your ingestion script and checksourcepdf.py
CHROMA_DB_PATH = "./syllabusvectordb"
COLLECTION_NAME = "syllabus_collection"

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_pdfs_from_directory(directory_path: str) -> set[str]:
    """Lists all PDF files in the specified directory."""
    if not os.path.exists(directory_path):
        logging.error(f"Error: PDF directory not found at {directory_path}")
        return set()

    pdf_files = set()
    try:
        for f in os.listdir(directory_path):
            if f.lower().endswith(".pdf"):
                pdf_files.add(f)
        logging.info(f"Found {len(pdf_files)} PDF files in directory: {directory_path}")
    except Exception as e:
        logging.error(f"Error listing files in {directory_path}: {e}")
        # Ensure a set is returned even if an error occurs during listing
        return set() 
    return pdf_files

def get_source_pdfs_from_chromadb() -> set[str]:
    """
    Connects to ChromaDB, retrieves all metadata, and returns unique source_pdf values.
    """
    source_pdfs_in_db = set()
    try:
        # 1. Initialize ChromaDB Client
        client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        logging.info(f"ChromaDB client initialized. Accessing data from {CHROMA_DB_PATH}")

        # 2. Get the Collection
        collection = client.get_collection(name=COLLECTION_NAME)
        logging.info(f"Successfully connected to collection: '{COLLECTION_NAME}'")

        total_documents = collection.count()
        if total_documents == 0:
            logging.warning("The collection is empty. No source PDFs found in DB metadata.")
            return set()

        logging.info(f"Total documents in collection: {total_documents}. Fetching metadata...")

        # 3. Retrieve all metadata
        results = collection.get(
            include=['metadatas']
        )

        if not results or not results.get('metadatas'):
            logging.warning("No metadata found in the collection.")
            return set()

        # 4. Extract unique source_pdf values
        for metadata_item in results['metadatas']:
            if metadata_item and 'source_pdf' in metadata_item:
                source_pdfs_in_db.add(metadata_item['source_pdf'])

        logging.info(f"Found {len(source_pdfs_in_db)} unique source_pdf entries in ChromaDB metadata.")
        return source_pdfs_in_db

    except Exception as e:
        logging.error(f"An error occurred while accessing ChromaDB: {e}")
        logging.error("Please ensure the CHROMA_DB_PATH and COLLECTION_NAME are correct.")
        return set()

def main():
    """Main function to perform the cross-check."""
    # Get PDFs from the directory
    pdfs_in_directory = get_pdfs_from_directory(PDF_DIRECTORY)

    # Get source_pdfs from ChromaDB metadata
    source_pdfs_in_db = get_source_pdfs_from_chromadb()

    # Perform the comparison
    missing_in_db = pdfs_in_directory - source_pdfs_in_db
    missing_in_directory = source_pdfs_in_db - pdfs_in_directory # Less likely, but possible if files were moved/deleted

    print("\n--- Cross-Check Results ---")

    if not pdfs_in_directory and not source_pdfs_in_db:
        print("No PDFs found in the directory and no source_pdfs found in the database.")
    elif not pdfs_in_directory:
         print("No PDFs found in the specified directory.")
         if source_pdfs_in_db:
             print("However, the database contains metadata for the following PDFs (which are not in the directory):")
             for pdf_name in sorted(list(source_pdfs_in_db)):
                 print(f"- {pdf_name}")
    elif not source_pdfs_in_db:
        print("No source_pdfs found in the database metadata.")
        print("The following PDFs were found in the directory but not in the database:")
        for pdf_name in sorted(list(pdfs_in_directory)):
             print(f"- {pdf_name}")
    else: # Both lists have content, perform detailed comparison
        if not missing_in_db and not missing_in_directory:
            print("✅ All PDF files in the directory match the source_pdf entries in the database metadata.")
            print(f"Total files matched: {len(pdfs_in_directory)}")
        else:
            if missing_in_db:
                print("\n❌ The following PDF files were found in the directory but ARE MISSING from the database metadata:")
                for pdf_name in sorted(list(missing_in_db)):
                    print(f"- {pdf_name}")
                print(f"({len(missing_in_db)} files missing from DB)")

            if missing_in_directory:
                print("\n⚠️ The following source_pdf entries were found in the database metadata but ARE MISSING from the directory:")
                for pdf_name in sorted(list(missing_in_directory)):
                    print(f"- {pdf_name}")
                print(f"({len(missing_in_directory)} entries missing from directory)")

    print("---------------------------")

if __name__ == "__main__":
    main()