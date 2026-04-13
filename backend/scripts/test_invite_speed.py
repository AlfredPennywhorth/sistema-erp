import requests
import time
import uuid

BASE_URL = "http://localhost:8000/api/v1"
INVITE_URL = f"{BASE_URL}/team/invite"

# Dados simulados (Precisa de um token de admin ou bypass se o middleware estiver ativo)
# Como estamos testando o código localmente, vamos assumir que o servidor está rodando.
# Vou apenas simular o comportamento lógico se o servidor não estiver visível.

def test_invite_speed():
    print("Iniciando teste de velocidade do convite...")
    start_time = time.time()
    
    # Simulação de payload
    payload = {
        "email": f"test-{uuid.uuid4().hex[:6]}@example.com",
        "role": "OPERATOR"
    }
    
    # Nota: Em um ambiente real, precisaríamos do header X-Tenant-ID e Authorization
    # Este script serve apenas como template de validação.
    
    print(f"Payload: {payload}")
    # try:
    #     response = requests.post(INVITE_URL, json=payload, timeout=2) # Timeout agressivo de 2s
    #     duration = time.time() - start_time
    #     print(f"Resposta recebida em {duration:.2f}s")
    #     print(f"Status: {response.status_code}")
    #     print(f"Body: {response.json()}")
    # except Exception as e:
    #     print(f"Erro no teste: {e}")

if __name__ == "__main__":
    test_invite_speed()
