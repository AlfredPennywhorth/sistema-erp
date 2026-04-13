import uvicorn
import os
from dotenv import load_dotenv

if __name__ == "__main__":
    load_dotenv()
    # Pega porta do ambiente ou usa 8000
    port = int(os.getenv("PORT", 8000))
    print(f"\n🚀 Iniciando Servidor ERP Modular em http://localhost:{port}")
    print("Preciona Ctrl+C para parar.\n")
    
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=port, 
        reload=True,
        log_level="info"
    )
