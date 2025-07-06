#!/usr/bin/env python3
"""
Test script for SmartClass AI Model Service
"""

import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_health_check():
    """Test the health check endpoint"""
    print("Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print("✅ Health check passed!")
            print(f"   Status: {data['status']}")
            print(f"   Model loaded: {data['model_loaded']}")
            print(f"   CUDA available: {data['cuda_available']}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_content_generation():
    """Test content generation endpoint"""
    print("\nTesting content generation...")
    
    test_request = {
        "topic_id": "math-numbers",
        "subtopic_id": "counting",
        "subject_id": "mathematics",
        "grade_id": "b1",
        "user_level": 1,
        "num_cards": 3
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/generate-content",
            json=test_request,
            timeout=300  # Give it time to generate content
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Content generation successful!")
            print(f"   Generated {len(data['content'])} content cards")
            print(f"   First card title: {data['content'][0]['title']}")
            return True
        else:
            print(f"❌ Content generation failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Content generation failed: {e}")
        return False

def test_quiz_generation():
    """Test quiz generation endpoint"""
    print("\nTesting quiz generation...")
    
    test_request = {
        "topic_id": "math-numbers",
        "subtopic_id": "counting",
        "subject_id": "mathematics",
        "grade_id": "b1",
        "quiz_type": "mid",
        "difficulty": 1
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/generate-quiz",
            json=test_request,
            timeout=60  # Give it time to generate quiz
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Quiz generation successful!")
            print(f"   Generated {len(data['questions'])} questions")
            print(f"   Quiz type: {data['quiz_type']}")
            print(f"   First question: {data['questions'][0]['question']}")
            return True
        else:
            print(f"❌ Quiz generation failed: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Quiz generation failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing SmartClass AI Model Service")
    print("=" * 50)
    
    # Wait a moment for the service to be ready
    print("Waiting for service to be ready...")
    time.sleep(2)
    
    tests = [
        test_health_check,
        test_content_generation,
        test_quiz_generation
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        time.sleep(1)  # Brief pause between tests
    
    print("\n" + "=" * 50)
    print(f"Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The API service is working correctly.")
    else:
        print("⚠️  Some tests failed. Please check the service logs.")

if __name__ == "__main__":
    main() 