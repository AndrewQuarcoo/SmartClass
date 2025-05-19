import json
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def fix_jsonl_format(input_file: str, output_file: str):
    """
    Fix the format of the JSONL file by ensuring each line is a valid JSON object
    with a 'text' field.
    """
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Split content into chunks (assuming each chunk is separated by newlines)
        chunks = content.split('\n\n')
        
        # Write properly formatted JSONL
        with open(output_file, 'w', encoding='utf-8') as f:
            for chunk in chunks:
                if chunk.strip():  # Skip empty chunks
                    # Create a properly formatted JSON object
                    json_obj = {
                        "text": chunk.strip()
                    }
                    # Write as a single line of JSON
                    f.write(json.dumps(json_obj) + '\n')
        
        logging.info(f"Successfully reformatted data from {input_file} to {output_file}")
        
    except Exception as e:
        logging.error(f"Error processing file: {e}")
        raise

if __name__ == "__main__":
    input_file = "syllabus_finetune_data.jsonl"
    output_file = "syllabus_finetune_data_fixed.jsonl"
    fix_jsonl_format(input_file, output_file) 