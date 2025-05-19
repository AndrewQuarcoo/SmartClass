import chromadb
import json
import logging
import os

# --- Configuration ---
# Ensure these match your existing ChromaDB setup
CHROMA_DB_PATH = "./syllabusvectordb" # Path to your ChromaDB directory
COLLECTION_NAME = "syllabus_collection" # Name of your collection in ChromaDB

# Output file for the fine-tuning dataset
OUTPUT_FINETUNE_DATA_FILE = "./syllabus_finetune_data.jsonl"

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def format_for_llama3_finetuning(chunk_text: str, source_pdf: str, chunk_num: int) -> str:
    """
    Formats a single chunk of text into the Llama 3 chat template.
    Each entry will be a single turn where the user asks about the syllabus section,
    and the assistant provides the content of that section.
    """
    # You can customize this prompt. A more diverse set of prompts can be beneficial.
    user_prompt = f"What information is contained in the syllabus document '{os.path.basename(source_pdf)}', specifically around chunk {chunk_num}?"
    assistant_response = chunk_text

    return f"<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\n{user_prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n{assistant_response}<|eot_id|>"

def main():
    logging.info("Starting data preparation for fine-tuning...")
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    logging.info(f"Attempting to connect to ChromaDB collection: '{COLLECTION_NAME}' at path '{CHROMA_DB_PATH}'")
    collection = client.get_collection(name=COLLECTION_NAME)
    logging.info(f"Successfully connected to collection. Total documents: {collection.count()}")

    results = collection.get(include=['documents', 'metadatas'])
    documents = results.get('documents', [])
    metadatas = results.get('metadatas', [])

    finetuning_data_entries = []
    for doc_text, meta in zip(documents, metadatas):
        if doc_text and meta: # Ensure both document text and metadata exist
            source_pdf = meta.get('source_pdf', 'Unknown_PDF_Source')
            chunk_num = meta.get('chunk_number', 0)
            formatted_entry_text = format_for_llama3_finetuning(doc_text, source_pdf, chunk_num)
            finetuning_data_entries.append({"text": formatted_entry_text})

    with open(OUTPUT_FINETUNE_DATA_FILE, 'w', encoding='utf-8') as f:
        for entry in finetuning_data_entries:
            f.write(json.dumps(entry) + '\n')
    logging.info(f"Successfully wrote {len(finetuning_data_entries)} formatted entries to {OUTPUT_FINETUNE_DATA_FILE}")

if __name__ == "__main__":
    main()