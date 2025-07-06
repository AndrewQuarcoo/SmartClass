#!/usr/bin/env python3
"""
Startup script for SmartClass AI Model Service
"""

import subprocess
import sys
import os

def main():
    """Start the FastAPI model service"""
    print("Starting SmartClass AI Model Service...")
    print("This will load your fine-tuned Llama model and start the API server.")
    print("The service will be available at: http://127.0.0.1:8000")
    print("API documentation will be available at: http://127.0.0.1:8000/docs")
    print("\nPress Ctrl+C to stop the service.\n")
    
    # Check if model directory exists
    if not os.path.exists("./llama3.2-1b-syllabus-finetuned"):
        print("ERROR: Fine-tuned model directory not found!")
        print("Expected: ./llama3.2-1b-syllabus-finetuned")
        print("Please ensure your fine-tuned model is in the correct location.")
        sys.exit(1)
    
    try:
        # Start the FastAPI service
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "api_model_service:app",
            "--host", "127.0.0.1",
            "--port", "8000",
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\nShutting down SmartClass AI Model Service...")
    except Exception as e:
        print(f"Error starting service: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 