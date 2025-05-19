import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Configuration
BASE_MODEL = "meta-llama/Llama-3.2-1B"
FINETUNED_MODEL_PATH = "./llama3.2-1b-syllabus-finetuned"

def load_model_and_tokenizer():
    """Load the base model, fine-tuned adapter, and tokenizer."""
    logging.info("Loading tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    
    logging.info("Loading base model...")
    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype=torch.float16,
        device_map="auto"
    )
    
    logging.info("Loading fine-tuned adapter...")
    model = PeftModel.from_pretrained(base_model, FINETUNED_MODEL_PATH)
    model = model.merge_and_unload()  # Merge adapter with base model
    
    return model, tokenizer

def generate_response(model, tokenizer, prompt, max_length=512):
    """Generate a response from the model."""
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
    
    outputs = model.generate(
        **inputs,
        max_length=max_length,
        num_return_sequences=1,
        temperature=0.7,
        top_p=0.9,
        do_sample=True,
        pad_token_id=tokenizer.eos_token_id
    )
    
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return response

def main():
    # Load model and tokenizer
    model, tokenizer = load_model_and_tokenizer()
    
    # Test questions
    test_questions = [
        "What are the main topics covered in each syllabus?",
        "Can you explain the assessment criteria?",
        "What are the learning objectives in introduction to science?",
        "What is the social studies?",
    ]
    
    print("\n=== Testing Fine-tuned Model ===\n")
    
    for question in test_questions:
        print(f"\nQuestion: {question}")
        print("-" * 50)
        response = generate_response(model, tokenizer, question)
        print(f"Response: {response}")
        print("-" * 50)

if __name__ == "__main__":
    main() 