import requests
import uuid

# Configurações do teste
BASE_URL = "http://localhost:8000/api/v1/team"
# Precisamos de um tenant_id válido para o teste. Vou tentar capturar um do banco ou usar um dummy se o middleware permitir bypass.
# Como o middleware get_current_tenant_id exige o header X-Tenant-ID, vamos passar um.

def test_invite():
    print("--- Iniciando Teste de Convite ---")
    
    # Mock de dados
    payload = {
        "email": f"tester_{uuid.uuid4().hex[:6]}@example.com",
        "role": "OPERADOR"
    }
    
    # Headers (Tenant ID dummy para teste, assumindo que o banco aceita ou que o erro será capturado)
    # Nota: Em um teste real, buscaríamos um ID de empresa existente.
    headers = {
        "X-Tenant-ID": "00000000-0000-0000-0000-000000000000", # Dummy UUID
        "X-User-ID": "00000000-0000-0000-0000-000000000000"
    }

    try:
        response = requests.post(f"{BASE_URL}/invite", json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print("Resposta JSON:")
        print(response.json())
        
        if response.status_code == 201:
            print("\nSUCESSO: Convite gerado!")
        else:
            print("\nFALHA: Erro ao gerar convite.")
            
    except Exception as e:
        print(f"ERRO de conexão: {str(e)}")

if __name__ == "__main__":
    test_invite()
