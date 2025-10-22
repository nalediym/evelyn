# 🛠️ Evelyn Monorepo - Practical Examples

## 🎯 Real-World Scenarios

### Scenario 1: Adding a New Feature

**Situation**: You want to add a new API endpoint for user authentication.

**Steps:**
```bash
# 1. Navigate to the Python submodule
cd evelyn-python

# 2. Create a new branch
git checkout -b feature/user-auth

# 3. Add your changes
# Edit app/main.py to add auth endpoints
# Add new files like app/auth.py, app/models/user.py

# 4. Update dependencies if needed
pip install python-jose[cryptography] passlib[bcrypt]
pip freeze > requirements.txt

# 5. Commit changes in submodule
git add .
git commit -m "Add user authentication endpoints"

# 6. Push submodule changes
git push origin feature/user-auth

# 7. Go back to main repo
cd ..

# 8. Update submodule reference
git add evelyn-python
git commit -m "Update Python submodule with user auth"

# 9. Push main repo changes
git push origin main
```

### Scenario 2: Updating API Specifications

**Situation**: You need to update the OpenAPI specification.

**Steps:**
```bash
# 1. Navigate to specs submodule
cd evelyn-specs

# 2. Edit the specification
# Update openapi.yaml with new endpoints

# 3. Commit changes
git add openapi.yaml
git commit -m "Add user authentication endpoints to API spec"

# 4. Push changes
git push origin main

# 5. Update main repo
cd ..
git add evelyn-specs
git commit -m "Update API specifications"
git push origin main
```

### Scenario 3: Setting Up Development Environment

**Situation**: A new developer joins the team.

**Complete Setup:**
```bash
# 1. Clone everything
git clone --recursive https://github.com/nalediym/evelyn.git
cd evelyn

# 2. Set up Python environment
cd evelyn-python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Run the application
python app/main.py

# 4. Verify everything works
curl http://localhost:8000/api/health
# Should return: {"status":"healthy","message":"Evelyn is running correctly"}

# 5. Open in browser
open http://localhost:8000
```

## 🔧 Troubleshooting Common Issues

### Issue 1: Submodules Show as Empty Folders

**Problem**: After cloning, submodule folders are empty.

**Solution:**
```bash
# Initialize and update submodules
git submodule init
git submodule update --recursive

# Or clone with submodules from the start
git clone --recursive <repo-url>
```

### Issue 2: Submodule Changes Not Reflected

**Problem**: You made changes in a submodule but they don't show up in the main repo.

**Solution:**
```bash
# 1. Commit changes in submodule first
cd evelyn-python
git add .
git commit -m "Your changes"
git push origin main

# 2. Update main repo to reference new submodule commit
cd ..
git add evelyn-python
git commit -m "Update Python submodule"
git push origin main
```

### Issue 3: Port Already in Use

**Problem**: `ERROR: [Errno 48] error while attempting to bind on address ('0.0.0.0', 8000): address already in use`

**Solution:**
```bash
# Find and kill the process using port 8000
lsof -ti:8000 | xargs kill -9

# Or use a different port
cd evelyn-python
python app/main.py --port 8001
```

### Issue 4: Dependencies Not Installing

**Problem**: `pip install` fails with errors.

**Solution:**
```bash
# Create a fresh virtual environment
cd evelyn-python
rm -rf venv
python3 -m venv venv
source venv/bin/activate

# Upgrade pip first
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

## 📊 Understanding the File Structure

### What Each File Does

```
evelyn/
├── .gitmodules              # Tells Git about submodules
├── README.md                # This documentation
├── evelyn-python/           # Python web application
│   ├── app/
│   │   ├── main.py          # 🚀 Application entry point
│   │   ├── templates/
│   │   │   └── index.html   # 🌐 Web page template
│   │   └── static/          # 📁 CSS, JS, images
│   ├── requirements.txt     # 📦 Python dependencies
│   └── README.md            # 📖 Python-specific docs
├── evelyn-elixir/           # Future Elixir backend
└── evelyn-specs/            # API specifications
    ├── openapi.yaml         # 📋 REST API spec
    └── asyncapi.yaml        # ⚡ Real-time API spec
```

### Key Files Explained

**`.gitmodules`**: The configuration file that tells Git about your submodules.
```ini
[submodule "evelyn-python"]
    path = evelyn-python                    # Where it lives
    url = git@github.com:nalediym/evelyn-python.git  # Where to find it
```

**`app/main.py`**: The heart of the Python application.
```python
from fastapi import FastAPI

app = FastAPI(title="Evelyn Multiverse Storytelling")

@app.get("/")
async def read_root():
    return {"message": "Welcome to Evelyn!"}
```

**`requirements.txt`**: Lists all Python packages needed.
```
fastapi
uvicorn[standard]
jinja2
aiofiles
```

## 🎓 Learning Path for Junior Developers

### Week 1: Understanding the Basics
1. **Read the main README.md** (this file)
2. **Clone the repository** and get it running locally
3. **Explore the code** in `evelyn-python/app/main.py`
4. **Make a small change** (like changing the welcome message)

### Week 2: Git Submodules
1. **Understand what submodules are** and why we use them
2. **Practice submodule commands** (init, update, status)
3. **Make changes in a submodule** and update the main repo
4. **Read about monorepo patterns** online

### Week 3: FastAPI Development
1. **Learn FastAPI basics** (routes, request/response models)
2. **Add a new API endpoint** to the application
3. **Update the HTML template** to use the new endpoint
4. **Test your changes** with curl or Postman

### Week 4: Advanced Topics
1. **Learn about API specifications** (OpenAPI/Swagger)
2. **Understand the project's architecture** decisions
3. **Contribute to documentation** or add new features
4. **Learn about deployment** and production considerations

## 🚀 Next Steps

### Immediate Actions
1. **Set up your development environment**
2. **Run the application locally**
3. **Explore the codebase**
4. **Make your first contribution**

### Future Learning
1. **Study FastAPI documentation**
2. **Learn about Git submodules in depth**
3. **Understand API design principles**
4. **Explore deployment strategies**

### Contributing Ideas
1. **Add new storytelling worlds**
2. **Improve the web interface**
3. **Add user authentication**
4. **Create mobile app submodule**
5. **Add comprehensive testing**

---

*Remember: The best way to learn is by doing! Start small, make changes, and don't be afraid to break things. You can always revert your changes with Git.* 🎯
