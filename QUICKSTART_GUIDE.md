# 🚀 SmartClass Platform - Quick Start Guide

Complete setup guide for the AI-powered educational platform with local model integration and ChromaDB vector database.

## 📋 Prerequisites

### Required Software
- **Python 3.10+** (for AI model service)
- **Node.js 18+** (for Next.js frontend)
- **Docker** (optional, for ChromaDB container)
- **Git** (for repository management)

### Hardware Requirements
- **8GB+ RAM** (16GB recommended for model)
- **GPU support** (optional, CUDA-compatible for faster inference)
- **5GB+ free disk space** (for model and dependencies)

## 🏗️ Project Architecture

```
suguruai/
├── smartclass/                    # Next.js Frontend Application
├── syllabusvectordb/             # Local ChromaDB Database
├── api_model_service.py          # FastAPI AI Model Service
├── pdftovector.py               # ChromaDB Data Ingestion
└── ./llama3.2-1b-syllabus-finetuned/  # Fine-tuned Model (download separately)
```

## 🔧 Installation & Setup

### Step 1: Clone and Navigate
```bash
git clone <your-repository-url> suguruai
cd suguruai
```

### Step 2: Install Python Dependencies
```bash
# Install Python requirements
pip install -r requirements.txt
```

### Step 3: Install Frontend Dependencies
```bash
cd smartclass
npm install
cd ..
```

### Step 4: Download Fine-tuned Model
```bash
# Download your fine-tuned Llama 3.2-1B model to:
./llama3.2-1b-syllabus-finetuned/
```

## 🗄️ ChromaDB Database Setup

### Current Setup (Local File-based)
Your ChromaDB is already configured with curriculum data:

**Configuration:**
- **Database Path**: `./syllabusvectordb/`
- **Collection Name**: `syllabus_collection` 
- **Documents**: Processed from `./syllabus/*.pdf` files
- **Embedding Model**: `all-MiniLM-L6-v2`

**Verify ChromaDB Status:**
```bash
python query.py
```

### Alternative: Docker ChromaDB
If you prefer running ChromaDB as a service:
```bash
# Start ChromaDB with CORS enabled
docker run -e CHROMA_SERVER_CORS_ALLOW_ORIGINS='["http://localhost:3000"]' \
  --rm -v ./chroma-data:/chroma/chroma -p 8000:8000 chromadb/chroma:latest
```

## 🤖 AI Model Service Setup

### Configure Environment
Create `.env` file in project root:
```bash
# Model Configuration
MODEL_PATH=./llama3.2-1b-syllabus-finetuned
CHROMADB_PATH=./syllabusvectordb
COLLECTION_NAME=syllabus_collection
```

### Start AI Model Service
```bash
# Start the FastAPI service
python start_api.py
```

**Service Endpoints:**
- **Health Check**: `http://127.0.0.1:8000/health`
- **Generate Content**: `http://127.0.0.1:8000/generate-content`
- **Generate Quiz**: `http://127.0.0.1:8000/generate-quiz`
- **Search ChromaDB**: `http://127.0.0.1:8000/search-curriculum`
- **ChromaDB Status**: `http://127.0.0.1:8000/chromadb-status`
- **System Status**: `http://127.0.0.1:8000/system-status`

## 🎯 Frontend Application Setup

### Configure Environment Variables
Create `smartclass/.env.local`:
```bash
# AI Model Service
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000

# ChromaDB Configuration
NEXT_PUBLIC_CHROMADB_COLLECTION=syllabus_collection

# Optional Settings
NEXT_PUBLIC_AI_DEBUG=false

# NOTES:
# - No CHROMADB_URL needed (accessed through AI service)
# - ChromaDB is file-based at ./syllabusvectordb/
# - Admin panel gets data via AI service endpoints
```

### Start Development Server
```bash
cd smartclass
npm run dev
```

**Access Points:**
- **Main App**: `http://localhost:3000`
- **Admin Panel**: `http://localhost:3000/admin/chromadb`

## 🔐 Authentication & Security

### ChromaDB Authentication
**Default Configuration**: No authentication required

ChromaDB runs **without authentication by default**. Your local setup uses file-based storage which doesn't require authentication.

For production deployments with ChromaDB server, you can enable authentication:

#### Basic Authentication (Production Only)
```bash
# Generate password file
docker run --rm --entrypoint htpasswd httpd:2 -Bbn admin password123 > server.htpasswd

# Set environment variables
export CHROMA_SERVER_AUTHN_CREDENTIALS_FILE="server.htpasswd"
export CHROMA_SERVER_AUTHN_PROVIDER="chromadb.auth.basic_authn.BasicAuthenticationServerProvider"
```

#### Token Authentication (Production Only)
```bash
export CHROMA_SERVER_AUTHN_CREDENTIALS="your-secure-token"
export CHROMA_SERVER_AUTHN_PROVIDER="chromadb.auth.token_authn.TokenAuthenticationServerProvider"
```

### Admin Panel Access
**Built-in Admin Interface** - No login required

Access: `http://localhost:3000/admin/chromadb`

**Available Features:**
- ✅ **Document Search & Exploration**
- ✅ **System Health Monitoring** 
- ✅ **Cache Management Tools**
- ✅ **Connection Status Monitoring**
- ✅ **Performance Metrics**

## 🚀 Starting the Complete System

### Quick Start Commands
```bash
# Terminal 1: Start AI Model Service
python start_api.py

# Terminal 2: Start Frontend (new terminal)
cd smartclass && npm run dev
```

### Verification Steps

1. **Check AI Service**: Visit `http://127.0.0.1:8000/health`
   ```json
   {"status": "healthy", "model_loaded": true}
   ```

2. **Check ChromaDB**: Run query test
   ```bash
   python query.py
   ```

3. **Test Frontend**: Visit `http://localhost:3000`
   - Navigate to any content page
   - Verify AI-generated content loads

4. **Access Admin Panel**: Visit `http://localhost:3000/admin/chromadb`
   - Check system status indicators
   - Verify ChromaDB connection (green status)

## 📊 System Monitoring & Admin Panel

### Built-in Admin Dashboard
Access comprehensive monitoring at: `http://localhost:3000/admin/chromadb`

**Dashboard Features:**
- **🔍 Document Search**: Query ChromaDB collections with filters
- **📊 System Health**: Real-time status of AI/ChromaDB/Cache
- **💾 Cache Management**: View hit rates, clear cache, manage storage
- **🔗 Connection Monitor**: Track service connectivity
- **📈 Performance Metrics**: Response times and usage statistics

**Admin Panel Credentials**: No authentication required for local development

### Manual Health Checks
```bash
# Test AI Model Service
curl http://127.0.0.1:8000/health

# Check ChromaDB collection
python -c "
import chromadb
client = chromadb.PersistentClient('./syllabusvectordb')
collections = [c.name for c in client.list_collections()]
print(f'Collections: {collections}')
"
```

## 🛠️ Configuration Reference

### Key Configuration Files
- **`requirements.txt`**: Python dependencies
- **`smartclass/package.json`**: Frontend dependencies  
- **`api_model_service.py`**: AI service configuration
- **`smartclass/.env.local`**: Frontend environment variables

### Important Ports
- **3000**: Next.js Frontend Application
- **8000**: FastAPI AI Model Service

**Note**: Your local ChromaDB uses file-based storage and doesn't require a port

### ChromaDB Collection Details
- **Collection Name**: `syllabus_collection` (Backend) 
- **Frontend Reference**: `syllabus_content` (configurable)
- **Embedding Model**: `all-MiniLM-L6-v2`  
- **Distance Metric**: Cosine similarity
- **Chunk Size**: 1000 characters with 150 character overlap

## 🔧 Troubleshooting

### Common Issues

#### 1. Model Not Found Error
```
Error: Fine-tuned model directory not found!
```
**Solution**: Ensure your fine-tuned model is downloaded to `./llama3.2-1b-syllabus-finetuned/`

#### 2. ChromaDB Connection Failed
```
ChromaDB connection failed
```
**Solutions**:
- Verify `./syllabusvectordb/` directory exists
- Check collection name: `syllabus_collection`
- Run `python query.py` to test connection

#### 3. Frontend API Connection Error
```
AI service unavailable, using fallback content
```
**Solutions**:
- Verify AI service is running: `python start_api.py`
- Check `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` in `.env.local`
- Test health endpoint: `curl http://127.0.0.1:8000/health`

#### 4. Memory Issues
```
CUDA out of memory / RAM insufficient
```
**Solutions**:
- Use CPU-only mode in `api_model_service.py`
- Reduce model batch size
- Close other applications

#### 5. Collection Name Mismatch
If getting empty results, check collection name consistency:
```bash
# Check actual collection name
python -c "
import chromadb
client = chromadb.PersistentClient('./syllabusvectordb')
print([c.name for c in client.list_collections()])
"
```

### External ChromaDB Admin Tools
For advanced administration, you can also use external tools:

- **[ChromaDB Admin UI](https://github.com/flanker/chromadb-admin)**: External Next.js admin interface
- **[Chroma UI](https://github.com/thakkaryash94/chroma-ui)**: Alternative web-based interface
- **[Ruby ChromaDB UI](https://github.com/flanker/chroma-db-ui)**: Simple Ruby-based interface

## 📚 Additional Documentation

- **[AI Integration Guide](smartclass/README-AI-INTEGRATION.md)**: Detailed AI service integration
- **[Advanced Features](smartclass/ADVANCED_FEATURES.md)**: RAG, caching, and monitoring
- **[ChromaDB Documentation](https://docs.trychroma.com)**: Official ChromaDB documentation

## 🎉 Success Indicators

When everything is working correctly, you should see:

✅ **AI Model Service**: `http://127.0.0.1:8000/health` returns success  
✅ **ChromaDB**: `python query.py` shows curriculum documents  
✅ **Frontend**: `http://localhost:3000` loads with AI content  
✅ **Admin Panel**: `http://localhost:3000/admin/chromadb` shows green status  
✅ **Content Generation**: Dynamic content cards load properly  
✅ **Caching**: Performance metrics show cache efficiency  

**You're all set!** 🚀 Your SmartClass platform is fully operational with local AI and vector database integration.

---

**Quick Links:**
- **Main Application**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin/chromadb  
- **AI Health Check**: http://127.0.0.1:8000/health
- **API Documentation**: http://127.0.0.1:8000/docs 


**Environment**
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_CHROMADB_COLLECTION=syllabus_collection
NEXT_PUBLIC_AI_DEBUG=false
MODEL_PATH=./llama3.2-1b-syllabus-finetuned
CHROMADB_PATH=./syllabusvectordb
COLLECTION_NAME=syllabus_collection