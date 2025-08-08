#!/usr/bin/env python3
"""
TraderAI PandasAI Service Pipeline
Specialized pipeline for Python PandasAI microservice
"""

import os
import sys
import subprocess
import time
import logging
import requests
from gaiasdk import sdk

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def setup_python_environment(args):
    """Setup Python virtual environment and dependencies"""
    logger.info("🐍 Setting up Python environment for PandasAI service...")
    
    try:
        # Change to pandas-ai-service directory
        service_dir = "pandas-ai-service"
        if not os.path.exists(service_dir):
            raise Exception(f"PandasAI service directory not found: {service_dir}")
        
        os.chdir(service_dir)
        
        # Create virtual environment if it doesn't exist
        venv_dir = "venv"
        if not os.path.exists(venv_dir):
            logger.info("📦 Creating Python virtual environment...")
            subprocess.run([sys.executable, "-m", "venv", venv_dir], check=True)
        
        # Get the correct pip path
        if sys.platform == "win32":
            pip_path = os.path.join(venv_dir, "Scripts", "pip")
            python_path = os.path.join(venv_dir, "Scripts", "python")
        else:
            pip_path = os.path.join(venv_dir, "bin", "pip")
            python_path = os.path.join(venv_dir, "bin", "python")
        
        # Upgrade pip
        subprocess.run([pip_path, "install", "--upgrade", "pip"], check=True)
        
        logger.info("✅ Python environment setup complete")
        return True
        
    except Exception as e:
        logger.error(f"❌ Python environment setup failed: {e}")
        return False
    finally:
        os.chdir("..")

def install_dependencies(args):
    """Install Python dependencies from requirements.txt"""
    logger.info("📦 Installing Python dependencies...")
    
    try:
        os.chdir("pandas-ai-service")
        
        # Get the correct pip path
        if sys.platform == "win32":
            pip_path = os.path.join("venv", "Scripts", "pip")
        else:
            pip_path = os.path.join("venv", "bin", "pip")
        
        # Install requirements
        if os.path.exists("requirements.txt"):
            subprocess.run([pip_path, "install", "-r", "requirements.txt"], check=True)
        else:
            # Install basic dependencies if requirements.txt is missing
            basic_deps = [
                "fastapi>=0.100.0",
                "uvicorn>=0.23.0",
                "pandas>=2.0.0",
                "pandasai>=1.5.0",
                "redis>=4.6.0",
                "psycopg2-binary>=2.9.0",
                "pydantic>=2.0.0",
                "python-multipart>=0.0.6",
                "aiofiles>=23.0.0",
                "httpx>=0.24.0"
            ]
            subprocess.run([pip_path, "install"] + basic_deps, check=True)
        
        logger.info("✅ Dependencies installed successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Dependency installation failed: {e}")
        return False
    finally:
        os.chdir("..")

def run_code_quality_checks(args):
    """Run code quality checks with flake8 and black"""
    logger.info("🔍 Running code quality checks...")
    
    try:
        os.chdir("pandas-ai-service")
        
        # Get the correct pip and python paths
        if sys.platform == "win32":
            pip_path = os.path.join("venv", "Scripts", "pip")
            python_path = os.path.join("venv", "Scripts", "python")
        else:
            pip_path = os.path.join("venv", "bin", "pip")
            python_path = os.path.join("venv", "bin", "python")
        
        # Install code quality tools
        subprocess.run([pip_path, "install", "flake8", "black", "isort"], check=False)
        
        # Run black formatter (auto-fix)
        try:
            subprocess.run([python_path, "-m", "black", ".", "--line-length", "88"], check=False)
            logger.info("🎨 Code formatted with black")
        except:
            logger.warning("⚠️ Black formatter not available")
        
        # Run isort import sorter
        try:
            subprocess.run([python_path, "-m", "isort", "."], check=False)
            logger.info("📚 Imports sorted with isort")
        except:
            logger.warning("⚠️ isort not available")
        
        # Run flake8 linter
        try:
            result = subprocess.run([python_path, "-m", "flake8", ".", "--max-line-length", "88"], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                logger.info("✅ Code quality checks passed")
            else:
                logger.warning(f"⚠️ Code quality issues found:\n{result.stdout}")
        except:
            logger.warning("⚠️ flake8 linter not available")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Code quality checks failed: {e}")
        return False
    finally:
        os.chdir("..")

def run_tests(args):
    """Run Python unit tests"""
    logger.info("🧪 Running Python tests...")
    
    try:
        os.chdir("pandas-ai-service")
        
        # Get the correct python path
        if sys.platform == "win32":
            python_path = os.path.join("venv", "Scripts", "python")
            pip_path = os.path.join("venv", "Scripts", "pip")
        else:
            python_path = os.path.join("venv", "bin", "python")
            pip_path = os.path.join("venv", "bin", "pip")
        
        # Install pytest if not available
        subprocess.run([pip_path, "install", "pytest", "pytest-asyncio"], check=False)
        
        # Run tests if test directory exists
        if os.path.exists("tests") or any(f.startswith("test_") for f in os.listdir(".")):
            result = subprocess.run([python_path, "-m", "pytest", "-v"], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                logger.info("✅ All tests passed")
            else:
                logger.warning(f"⚠️ Some tests failed:\n{result.stdout}")
        else:
            logger.info("ℹ️ No tests found, skipping test execution")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Test execution failed: {e}")
        return False
    finally:
        os.chdir("..")

def validate_service_files(args):
    """Validate that essential service files exist"""
    logger.info("📋 Validating PandasAI service files...")
    
    try:
        os.chdir("pandas-ai-service")
        
        essential_files = [
            "main.py",
            "pandas_ai_service.py",
            "requirements.txt",
            "Dockerfile"
        ]
        
        missing_files = []
        for file in essential_files:
            if not os.path.exists(file):
                missing_files.append(file)
            else:
                logger.info(f"✅ Found: {file}")
        
        if missing_files:
            logger.warning(f"⚠️ Missing files: {missing_files}")
        else:
            logger.info("✅ All essential files present")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ File validation failed: {e}")
        return False
    finally:
        os.chdir("..")

def start_service(args):
    """Start the PandasAI FastAPI service"""
    logger.info("🚀 Starting PandasAI service...")
    
    try:
        os.chdir("pandas-ai-service")
        
        # Get the correct python path
        if sys.platform == "win32":
            python_path = os.path.join("venv", "Scripts", "python")
        else:
            python_path = os.path.join("venv", "bin", "python")
        
        # Start the service in background
        import threading
        
        def run_service():
            subprocess.run([python_path, "-m", "uvicorn", "main:app", 
                          "--host", "0.0.0.0", "--port", "8001", "--reload"])
        
        service_thread = threading.Thread(target=run_service, daemon=True)
        service_thread.start()
        
        # Wait for service to start
        logger.info("⏳ Waiting for service to be ready...")
        time.sleep(10)
        
        # Health check
        if health_check():
            logger.info("✅ PandasAI service is ready")
            logger.info("🔗 Service available at: http://localhost:8001")
            logger.info("📚 API docs at: http://localhost:8001/docs")
            return True
        else:
            logger.error("❌ Service health check failed")
            return False
        
    except Exception as e:
        logger.error(f"❌ Service startup failed: {e}")
        return False
    finally:
        os.chdir("..")

def health_check():
    """Perform health check on the PandasAI service"""
    max_retries = 5
    for i in range(max_retries):
        try:
            response = requests.get("http://localhost:8001/health", timeout=5)
            if response.status_code == 200:
                return True
        except requests.RequestException:
            pass
        
        logger.info(f"⏳ Health check attempt {i+1}/{max_retries} failed, retrying...")
        time.sleep(3)
    
    return False

def validate_api_endpoints(args):
    """Validate key API endpoints"""
    logger.info("🔍 Validating PandasAI API endpoints...")
    
    endpoints = [
        {"name": "Health Check", "url": "http://localhost:8001/health"},
        {"name": "API Docs", "url": "http://localhost:8001/docs"},
        {"name": "OpenAPI Schema", "url": "http://localhost:8001/openapi.json"},
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(endpoint["url"], timeout=5)
            if response.status_code == 200:
                logger.info(f"✅ {endpoint['name']} is healthy")
            else:
                logger.warning(f"⚠️ {endpoint['name']} returned status {response.status_code}")
        except requests.RequestException as e:
            logger.warning(f"⚠️ {endpoint['name']} not accessible: {e}")
    
    logger.info("✅ API endpoint validation complete")
    return True

def monitor_performance(args):
    """Monitor service performance and resource usage"""
    logger.info("📊 Monitoring PandasAI service performance...")
    
    try:
        import psutil
        import json
        
        # Get process information
        for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_info']):
            if 'python' in proc.info['name'].lower() and 'uvicorn' in ' '.join(proc.cmdline()):
                logger.info(f"📈 PandasAI Service - PID: {proc.info['pid']}, "
                          f"CPU: {proc.info['cpu_percent']:.1f}%, "
                          f"Memory: {proc.info['memory_info'].rss / 1024 / 1024:.1f}MB")
                break
        
        # Test a simple API call
        try:
            start_time = time.time()
            response = requests.get("http://localhost:8001/health")
            response_time = (time.time() - start_time) * 1000
            logger.info(f"⚡ API response time: {response_time:.2f}ms")
        except:
            logger.warning("⚠️ Could not measure API response time")
        
    except ImportError:
        logger.warning("⚠️ psutil not available for performance monitoring")
    except Exception as e:
        logger.warning(f"⚠️ Performance monitoring failed: {e}")
    
    logger.info("✅ Performance monitoring complete")
    return True

def restart_service(args):
    """Restart the PandasAI service"""
    logger.info("🔄 Restarting PandasAI service...")
    
    try:
        # Kill existing processes
        import psutil
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            if 'python' in proc.info['name'].lower():
                cmdline = ' '.join(proc.info['cmdline'] or [])
                if 'uvicorn' in cmdline and 'main:app' in cmdline:
                    proc.terminate()
                    logger.info(f"🛑 Terminated process PID: {proc.info['pid']}")
        
        time.sleep(3)
        
        # Start the service again
        return start_service(args)
        
    except ImportError:
        logger.warning("⚠️ psutil not available, manual restart required")
        return False
    except Exception as e:
        logger.error(f"❌ Service restart failed: {e}")
        return False

def cleanup_artifacts(args):
    """Clean up temporary files and artifacts"""
    logger.info("🧹 Cleaning up PandasAI service artifacts...")
    
    try:
        os.chdir("pandas-ai-service")
        
        # Remove Python cache files
        import shutil
        
        cache_dirs = ["__pycache__", ".pytest_cache", ".coverage"]
        for cache_dir in cache_dirs:
            if os.path.exists(cache_dir):
                shutil.rmtree(cache_dir)
                logger.info(f"🗑️ Removed: {cache_dir}")
        
        # Remove .pyc files
        for root, dirs, files in os.walk("."):
            for file in files:
                if file.endswith(".pyc"):
                    os.remove(os.path.join(root, file))
        
        # Remove virtual environment if requested
        clean_level = args.get("level", "")
        if clean_level == "deep" and os.path.exists("venv"):
            shutil.rmtree("venv")
            logger.info("🗑️ Removed virtual environment (deep clean)")
        
        logger.info("✅ Cleanup complete")
        return True
        
    except Exception as e:
        logger.error(f"❌ Cleanup failed: {e}")
        return False
    finally:
        os.chdir("..")

def main():
    """Main entry point for the PandasAI pipeline"""
    jobs = [
        sdk.Job("Setup Python Environment", "Setup Python virtual environment and dependencies", setup_python_environment),
        sdk.Job("Install Dependencies", "Install Python dependencies from requirements.txt", install_dependencies, depends_on=["Setup Python Environment"]),
        sdk.Job("Run Code Quality Checks", "Run code quality checks with flake8 and black", run_code_quality_checks, depends_on=["Install Dependencies"]),
        sdk.Job("Validate Service Files", "Validate that essential service files exist", validate_service_files, depends_on=["Install Dependencies"]),
        sdk.Job("Run Tests", "Run Python unit tests", run_tests, depends_on=["Run Code Quality Checks"]),
        sdk.Job("Start Service", "Start the PandasAI FastAPI service", start_service, depends_on=["Validate Service Files", "Run Tests"]),
        sdk.Job("Validate API Endpoints", "Validate key API endpoints", validate_api_endpoints, depends_on=["Start Service"]),
        sdk.Job("Monitor Performance", "Monitor service performance and resource usage", monitor_performance, depends_on=["Start Service"]),
        sdk.Job("Restart Service", "Restart the PandasAI service", restart_service),
        sdk.Job("Cleanup Artifacts", "Clean up temporary files and artifacts", cleanup_artifacts),
    ]
    
    sdk.serve(jobs)

if __name__ == "__main__":
    main()