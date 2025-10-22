# 🌟 Evelyn Multiverse Monorepo Guide

## 📚 Table of Contents
1. [What is a Monorepo?](#what-is-a-monorepo)
2. [Why Use a Monorepo?](#why-use-a-monorepo)
3. [Evelyn's Architecture](#evelyns-architecture)
4. [Understanding Git Submodules](#understanding-git-submodules)
5. [Project Structure Explained](#project-structure-explained)
6. [How to Work with Evelyn](#how-to-work-with-evelyn)
7. [Common Commands](#common-commands)
8. [Best Practices](#best-practices)

---

## 🤔 What is a Monorepo?

**Monorepo** = **Mono** (single) + **Repo** (repository)

A **monorepo** is a single Git repository that contains multiple related projects or applications. Think of it like a big apartment building where each apartment (project) is separate, but they all share the same building (repository).

### Traditional Approach vs Monorepo

**Traditional Multi-Repo Approach:**
```
evelyn-frontend/     (separate repo)
evelyn-backend/      (separate repo)  
evelyn-mobile/       (separate repo)
evelyn-docs/         (separate repo)
```

**Monorepo Approach:**
```
evelyn/              (single repo)
├── frontend/
├── backend/
├── mobile/
└── docs/
```

### Key Terms Explained

- **Repository (Repo)**: A storage location for your code, managed by Git
- **Submodule**: A Git repository inside another Git repository (like a nested repo)
- **Meta-repository**: The main repository that contains and manages submodules
- **Workspace**: The entire collection of projects in a monorepo
- **Package**: An individual project or component within the monorepo

---

## 🎯 Why Use a Monorepo?

### ✅ Advantages

1. **Unified Versioning**: All projects share the same version history
2. **Atomic Changes**: Make changes across multiple projects in a single commit
3. **Shared Dependencies**: Manage common libraries in one place
4. **Simplified CI/CD**: One pipeline for all projects
5. **Code Sharing**: Easy to share code between projects
6. **Consistent Tooling**: Same linting, testing, and build tools across projects

### ❌ Disadvantages

1. **Large Repository Size**: Can become very large over time
2. **Complex Permissions**: Harder to manage who can access what
3. **Build Times**: May take longer to build everything
4. **Learning Curve**: More complex for new team members

---

## 🏗️ Evelyn's Architecture

Evelyn uses a **hybrid monorepo approach** with Git submodules. Here's why this is special:

### The Evelyn Structure
```
evelyn/                          # Meta-repository (main repo)
├── .gitmodules                  # Submodule configuration
├── evelyn-python/               # Python submodule (FastAPI app)
│   ├── app/
│   │   ├── main.py             # Web application
│   │   ├── templates/          # HTML templates
│   │   └── static/             # CSS, JS, images
│   ├── requirements.txt        # Python dependencies
│   └── README.md
├── evelyn-elixir/              # Elixir submodule (future backend)
│   └── README.md
└── evelyn-specs/               # Specifications submodule
    ├── openapi.yaml            # API specification
    ├── asyncapi.yaml           # Real-time API spec
    └── README.md
```

### Why This Structure?

1. **Language Separation**: Each submodule can use different technologies
2. **Independent Development**: Teams can work on different parts independently
3. **Shared Specifications**: API specs are shared across all implementations
4. **Flexible Deployment**: Deploy only what you need

---

## 🔧 Understanding Git Submodules

### What are Git Submodules?

A **Git submodule** is like a bookmark to another Git repository. It's not a copy of the code, but a reference to a specific commit in another repo.

Think of it like this:
- **Main repo**: Your house
- **Submodule**: A door that leads to your neighbor's house
- **The door**: Points to a specific room (commit) in your neighbor's house

### How Submodules Work

```bash
# When you clone the main repo
git clone https://github.com/nalediym/evelyn.git
cd evelyn

# Submodules are empty folders by default
ls evelyn-python/  # Might be empty or have just a .git file

# You need to initialize and update submodules
git submodule init
git submodule update --recursive
```

### The .gitmodules File

This file tells Git about your submodules:

```ini
[submodule "evelyn-python"]
    path = evelyn-python
    url = git@github.com:nalediym/evelyn-python.git

[submodule "evelyn-elixir"]
    path = evelyn-elixir
    url = git@github.com/nalediym/evelyn-elixir.git
```

**Explanation:**
- `[submodule "name"]`: Name of the submodule
- `path`: Where the submodule lives in your repo
- `url`: Where to find the submodule's code

---

## 📁 Project Structure Explained

### Meta-Repository (`evelyn/`)
**Purpose**: The main container that holds everything together

**Contains:**
- `.gitmodules`: Configuration for submodules
- `README.md`: Main project documentation
- `LICENSE`: Project license
- `Makefile`: Build and deployment scripts (future)

**Responsibilities:**
- Coordinate between submodules
- Manage overall project versioning
- Handle CI/CD for the entire project

### Python Submodule (`evelyn-python/`)
**Purpose**: The web application and API backend

**Technology Stack:**
- **FastAPI**: Modern Python web framework
- **Uvicorn**: ASGI server for running FastAPI
- **Jinja2**: Template engine for HTML
- **Pydantic**: Data validation and serialization

**Structure:**
```
evelyn-python/
├── app/
│   ├── main.py              # Application entry point
│   ├── api/                 # API route handlers
│   ├── core/                # Core functionality (config, database)
│   ├── models/              # Data models
│   ├── services/            # Business logic
│   ├── static/              # Static files (CSS, JS, images)
│   └── templates/           # HTML templates
├── tests/                   # Unit and integration tests
├── requirements.txt         # Python dependencies
└── README.md               # Python-specific documentation
```

### Elixir Submodule (`evelyn-elixir/`)
**Purpose**: Future real-time backend (WebSockets, live updates)

**Why Elixir?**
- **Concurrency**: Handle thousands of simultaneous connections
- **Fault Tolerance**: Built-in error recovery
- **Real-time**: Perfect for live storytelling features

### Specifications Submodule (`evelyn-specs/`)
**Purpose**: API documentation and contracts

**Contains:**
- `openapi.yaml`: REST API specification
- `asyncapi.yaml`: Real-time API specification
- `README.md`: API documentation

**Why Separate?**
- **Single Source of Truth**: One place for all API docs
- **Code Generation**: Generate client libraries from specs
- **Testing**: Validate implementations against specs

---

## 🚀 How to Work with Evelyn

### For New Developers

#### 1. Initial Setup
```bash
# Clone the main repository
git clone https://github.com/nalediym/evelyn.git
cd evelyn

# Initialize and update all submodules
git submodule init
git submodule update --recursive

# Or do it all at once
git clone --recursive https://github.com/nalediym/evelyn.git
```

#### 2. Working on Python Backend
```bash
# Navigate to Python submodule
cd evelyn-python

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the application
python app/main.py

# The app will be available at http://localhost:8000
```

#### 3. Making Changes
```bash
# Work in the submodule
cd evelyn-python
# Make your changes...
git add .
git commit -m "Add new feature"

# Push changes to submodule
git push origin main

# Go back to main repo and update submodule reference
cd ..
git add evelyn-python
git commit -m "Update Python submodule"
git push origin main
```

### For Team Leads

#### Managing Submodules
```bash
# Update all submodules to latest
git submodule update --remote --recursive

# Update specific submodule
git submodule update --remote evelyn-python

# Add new submodule
git submodule add https://github.com/user/new-submodule.git path/to/submodule
```

---

## 📋 Common Commands

### Main Repository Commands
```bash
# Clone with submodules
git clone --recursive <repo-url>

# Initialize submodules (if already cloned)
git submodule init
git submodule update --recursive

# Update all submodules
git submodule update --remote --recursive

# Check submodule status
git submodule status
```

### Submodule Commands
```bash
# Navigate to submodule
cd evelyn-python

# Work normally (it's a regular Git repo)
git add .
git commit -m "Changes"
git push origin main

# Update submodule reference in main repo
cd ..
git add evelyn-python
git commit -m "Update Python submodule"
```

### Development Commands
```bash
# Start Python development server
cd evelyn-python
source venv/bin/activate
python app/main.py

# Run tests
cd evelyn-python
python -m pytest

# Install new Python package
cd evelyn-python
pip install new-package
pip freeze > requirements.txt
```

---

## 🎯 Best Practices

### 1. Commit Strategy
- **Submodule First**: Always commit changes in submodules first
- **Main Repo Second**: Then update the main repo to reference new submodule commits
- **Atomic Commits**: Make related changes across submodules in coordinated commits

### 2. Branching Strategy
- **Feature Branches**: Create branches in both main repo and relevant submodules
- **Consistent Naming**: Use same branch names across repos
- **Merge Strategy**: Merge submodule branches first, then main repo

### 3. Documentation
- **README Files**: Each submodule should have its own README
- **Main README**: Should explain the overall architecture
- **API Docs**: Keep specifications up to date

### 4. CI/CD Considerations
- **Submodule Updates**: CI should handle submodule initialization
- **Dependency Management**: Each submodule manages its own dependencies
- **Deployment**: Deploy submodules independently or together

---

## 🔮 Future Enhancements

### Planned Additions
1. **Frontend Submodule**: React/Vue.js frontend
2. **Mobile Submodule**: React Native mobile app
3. **Infrastructure Submodule**: Docker, Kubernetes configs
4. **Documentation Submodule**: Comprehensive docs site

### Advanced Features
1. **Shared Libraries**: Common code across submodules
2. **Monorepo Tools**: Lerna, Nx, or Rush for advanced management
3. **Automated Testing**: Cross-submodule integration tests
4. **Deployment Pipeline**: Automated deployment of all components

---

## 🎓 Learning Resources

### Git Submodules
- [Git Submodules Tutorial](https://git-scm.com/book/en/v2/Git-Tools-Submodules)
- [Atlassian Git Submodules Guide](https://www.atlassian.com/git/tutorials/git-submodule)

### Monorepo Patterns
- [Monorepo vs Multi-repo](https://www.atlassian.com/git/tutorials/monorepos)
- [Google's Monorepo Paper](https://research.google/pubs/pub45424/)

### FastAPI
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/)

---

## 🤝 Contributing to Evelyn

### Getting Started
1. Fork the repository
2. Clone your fork with submodules
3. Create a feature branch
4. Make your changes
5. Test thoroughly
6. Submit a pull request

### Code Standards
- **Python**: Follow PEP 8 style guide
- **Documentation**: Write clear docstrings and comments
- **Testing**: Add tests for new features
- **Commits**: Write clear, descriptive commit messages

---

*This guide will be updated as Evelyn grows and evolves. Feel free to contribute improvements!* 🚀
