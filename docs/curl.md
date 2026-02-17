# Curl recipes

Coleccion completa de comandos curl para testear la API de Gestiora.
Ejecutar en orden logico para flujo de testing completo.

**Variables a reemplazar:**
- `<ACCESS_TOKEN>` - Token JWT de acceso
- `<REFRESH_TOKEN>` - Token de refresco
- `<USER_ID>` - ID de usuario
- `<PROVIDER_ID>` - ID de proveedor
- `<INVOICE_ID>` - ID de factura
- `<MOVEMENT_ID>` - ID de movimiento
- `<QUERY_ID>` - ID de consulta de busqueda

---

## 1. Auth

### 1.1 Login (admin)

**Bash:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"AdminPass1!a"}'
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@example.com","password":"AdminPass1!a"}'
```

### 1.2 Login (user)

**Bash:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"UserPass1!a"}'
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"user@example.com","password":"UserPass1!a"}'
```

### 1.3 Refresh token

**Bash:**
```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"refreshToken":"<REFRESH_TOKEN>"}'
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/auth/refresh" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer <ACCESS_TOKEN>"} -Body '{"refreshToken":"<REFRESH_TOKEN>"}'
```

### 1.4 Logout

**Bash:**
```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"refreshToken":"<REFRESH_TOKEN>"}'
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/auth/logout" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer <ACCESS_TOKEN>"} -Body '{"refreshToken":"<REFRESH_TOKEN>"}'
```

---

## 2. Admin

### 2.1 Admin ping

**Bash:**
```bash
curl -X GET http://localhost:3000/admin/ping \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/ping" -Method GET -Headers @{Authorization="Bearer <ACCESS_TOKEN>"}
```

---

## 3. Admin Users

### 3.1 List users

**Bash:**
```bash
curl -X GET "http://localhost:3000/admin/users?page=1&pageSize=10" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/users?page=1&pageSize=10" -Method GET -Headers @{Authorization="Bearer <ACCESS_TOKEN>"}
```

### 3.2 Get user detail

**Bash:**
```bash
curl -X GET http://localhost:3000/admin/users/<USER_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/users/<USER_ID>" -Method GET -Headers @{Authorization="Bearer <ACCESS_TOKEN>"}
```

### 3.3 Create user

**Bash:**
```bash
curl -X POST http://localhost:3000/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"email":"new.user@example.com","password":"StrongPass1!a","roles":["Usuario"],"status":"ACTIVE","name":"user.new","avatar":"avatar-de-usernew"}'
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/users" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer <ACCESS_TOKEN>"} -Body '{"email":"new.user@example.com","password":"StrongPass1!a","roles":["Usuario"],"status":"ACTIVE","name":"user.new","avatar":"avatar-de-usernew"}'
```

### 3.4 Update user

**Bash:**
```bash
curl -X PUT http://localhost:3000/admin/users/<USER_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"roles":["Usuario"],"status":"ACTIVE","name":"new.user","avatar":"NO-AVATAR"}'
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/users/<USER_ID>" -Method PUT -ContentType "application/json" -Headers @{Authorization="Bearer <ACCESS_TOKEN>"} -Body '{"roles":["Usuario"],"status":"ACTIVE","name":"new.user","avatar":"NO-AVATAR"}'
```

### 3.5 Update user status

**Bash:**
```bash
curl -X PATCH http://localhost:3000/admin/users/<USER_ID>/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"status":"ACTIVE"}'
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/users/<USER_ID>/status" -Method PATCH -ContentType "application/json" -Headers @{Authorization="Bearer <ACCESS_TOKEN>"} -Body '{"status":"ACTIVE"}'
```

### 3.6 Delete user (soft delete)

**Bash:**
```bash
curl -X DELETE http://localhost:3000/admin/users/<USER_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/users/<USER_ID>" -Method DELETE -Headers @{Authorization="Bearer <ACCESS_TOKEN>"}
```

### 3.7 Revoke user sessions

**Bash:**
```bash
curl -X POST http://localhost:3000/admin/users/<USER_ID>/sessions/revoke \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/users/<USER_ID>/sessions/revoke" -Method POST -Headers @{Authorization="Bearer <ACCESS_TOKEN>"}
```

### 3.8 Change user password (admin)

**Bash:**
```bash
curl -X POST http://localhost:3000/admin/users/<USER_ID>/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"newPassword":"nuevaContrasenaSuperSegura1#"}'
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/admin/users/<USER_ID>/password" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer <ACCESS_TOKEN>"} -Body '{"newPassword":"nuevaContrasenaSuperSegura1#"}'
```

---

## 4. Users (self)

### 4.1 Update own profile

**Bash:**
```bash
curl -X PATCH http://localhost:3000/users/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"name":"molomucho","avatar":"Oliver Aton"}'
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/users/me" -Method PATCH -ContentType "application/json" -Headers @{Authorization="Bearer <ACCESS_TOKEN>"} -Body '{"name":"molomucho","avatar":"Oliver Aton"}'
```

### 4.2 Change own password

**Bash:**
```bash
curl -X POST http://localhost:3000/users/me/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"currentPassword":"UserPass1!a","newPassword":"UserPass1!aNew"}'
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/users/me/password" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer <ACCESS_TOKEN>"} -Body '{"currentPassword":"UserPass1!a","newPassword":"UserPass1!aNew"}'
```

---

## 5. Providers

### 5.1 List providers

**Bash:**
```bash
curl -X GET "http://localhost:3000/providers?page=1&pageSize=10" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/providers?page=1&pageSize=10" -Method GET -Headers @{Authorization="Bearer <ACCESS_TOKEN>"}
```

### 5.2 Get provider detail

**Bash:**
```bash
curl -X GET http://localhost:3000/providers/<PROVIDER_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/providers/<PROVIDER_ID>" -Method GET -Headers @{Authorization="Bearer <ACCESS_TOKEN>"}
```

### 5.3 Create provider

**Bash:**
```bash
curl -X POST http://localhost:3000/providers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"razonSocial":"Proveedor 01","cif":"A01201201","direccion":"Direccion provider 01","poblacion":"Provider city","provincia":"Provider Provincia","pais":"Provider Country","status":"ACTIVE"}'
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/providers" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer <ACCESS_TOKEN>"} -Body '{"razonSocial":"Proveedor 01","cif":"A01201201","direccion":"Direccion provider 01","poblacion":"Provider city","provincia":"Provider Provincia","pais":"Provider Country","status":"ACTIVE"}'
```

### 5.4 Update provider

**Bash:**
```bash
curl -X PUT http://localhost:3000/providers/<PROVIDER_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"razonSocial":"string","cif":"A12345679","direccion":"string","poblacion":"string","provincia":"string","pais":"string","status":"INACTIVE"}'
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/providers/<PROVIDER_ID>" -Method PUT -ContentType "application/json" -Headers @{Authorization="Bearer <ACCESS_TOKEN>"} -Body '{"razonSocial":"string","cif":"A12345679","direccion":"string","poblacion":"string","provincia":"string","pais":"string","status":"INACTIVE"}'
```

### 5.5 Update provider status

**Bash:**
```bash
curl -X PATCH http://localhost:3000/providers/<PROVIDER_ID>/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"status":"INACTIVE"}'
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/providers/<PROVIDER_ID>/status" -Method PATCH -ContentType "application/json" -Headers @{Authorization="Bearer <ACCESS_TOKEN>"} -Body '{"status":"INACTIVE"}'
```

### 5.6 Delete provider (soft delete)

**Bash:**
```bash
curl -X DELETE http://localhost:3000/providers/<PROVIDER_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/providers/<PROVIDER_ID>" -Method DELETE -Headers @{Authorization="Bearer <ACCESS_TOKEN>"}
```

---

## 6. Documents

### 6.1 Create manual invoice

**Bash:**
```bash
curl -X POST http://localhost:3000/documents/manual \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"providerId":"<PROVIDER_ID>","providerCif":"B12345678","invoice":{"numeroFactura":"FAC-2026-0001","fechaOperacion":"2026-02-10","fechaVencimiento":"2026-03-10","baseImponible":300,"iva":63,"total":363,"movements":[{"concepto":"Servicio","cantidad":1,"precio":300,"baseImponible":300,"iva":63,"total":363}]}}'
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/documents/manual" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer <ACCESS_TOKEN>"} -Body '{"providerId":"<PROVIDER_ID>","providerCif":"B12345678","invoice":{"numeroFactura":"FAC-2026-0001","fechaOperacion":"2026-02-10","fechaVencimiento":"2026-03-10","baseImponible":300,"iva":63,"total":363,"movements":[{"concepto":"Servicio","cantidad":1,"precio":300,"baseImponible":300,"iva":63,"total":363}]}}'
```

### 6.2 Attach file to invoice

**Bash:**
```bash
curl -X PUT http://localhost:3000/documents/<INVOICE_ID>/file \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "file=@/path/to/invoice.pdf"
```

**PowerShell:**
```powershell
$filePath = "C:\path\to\invoice.pdf"
$uri = "http://localhost:3000/documents/<INVOICE_ID>/file"
$headers = @{Authorization="Bearer <ACCESS_TOKEN>"}
$form = @{file = Get-Item -Path $filePath}
Invoke-RestMethod -Uri $uri -Method PUT -Headers $headers -Form $form
```

### 6.3 Update invoice metadata and movements

**Bash:**
```bash
curl -X PUT http://localhost:3000/documents/<INVOICE_ID>/invoice \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"numeroFactura":"FAC-2026-0001","fechaOperacion":"2026-02-10","fechaVencimiento":"2026-03-10","baseImponible":300,"iva":63,"total":363,"movements":[{"concepto":"Servicio","cantidad":1,"precio":300,"total":363,"baseImponible":300,"iva":63}]}'
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/documents/<INVOICE_ID>/invoice" -Method PUT -ContentType "application/json" -Headers @{Authorization="Bearer <ACCESS_TOKEN>"} -Body '{"numeroFactura":"FAC-2026-0001","fechaOperacion":"2026-02-10","fechaVencimiento":"2026-03-10","baseImponible":300,"iva":63,"total":363,"movements":[{"concepto":"Servicio","cantidad":1,"precio":300,"total":363,"baseImponible":300,"iva":63}]}'
```

### 6.4 List invoices

**Bash:**
```bash
curl -X GET "http://localhost:3000/documents?page=1&pageSize=10" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/documents?page=1&pageSize=10" -Method GET -Headers @{Authorization="Bearer <ACCESS_TOKEN>"}
```

### 6.5 Get invoice detail

**Bash:**
```bash
curl -X GET http://localhost:3000/documents/<INVOICE_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/documents/<INVOICE_ID>" -Method GET -Headers @{Authorization="Bearer <ACCESS_TOKEN>"}
```

### 6.6 Download invoice file (PDF)

**Bash:**
```bash
curl -X GET http://localhost:3000/documents/<INVOICE_ID>/file \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -o invoice.pdf
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/documents/<INVOICE_ID>/file" -Method GET -Headers @{Authorization="Bearer <ACCESS_TOKEN>"} -OutFile "invoice.pdf"
```

### 6.7 Delete invoice (soft delete)

**Bash:**
```bash
curl -X DELETE http://localhost:3000/documents/<INVOICE_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/documents/<INVOICE_ID>" -Method DELETE -Headers @{Authorization="Bearer <ACCESS_TOKEN>"}
```

### 6.8 Confirm invoice header

**Bash:**
```bash
curl -X PUT http://localhost:3000/documents/<INVOICE_ID>/header/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"fields":{"numeroFactura":{"action":"CONFIRM"},"fechaOperacion":{"action":"CONFIRM"},"fechaVencimiento":{"action":"CONFIRM"},"baseImponible":{"action":"CONFIRM"},"iva":{"action":"CONFIRM"},"total":{"action":"CONFIRM"}}}'
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/documents/<INVOICE_ID>/header/confirm" -Method PUT -ContentType "application/json" -Headers @{Authorization="Bearer <ACCESS_TOKEN>"} -Body '{"fields":{"numeroFactura":{"action":"CONFIRM"},"fechaOperacion":{"action":"CONFIRM"},"fechaVencimiento":{"action":"CONFIRM"},"baseImponible":{"action":"CONFIRM"},"iva":{"action":"CONFIRM"},"total":{"action":"CONFIRM"}}}'
```

### 6.9 Confirm invoice movements

**Bash:**
```bash
curl -X PUT http://localhost:3000/documents/<INVOICE_ID>/movements/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"movements":[{"id":"<MOVEMENT_ID>","action":"CONFIRM"}]}'
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/documents/<INVOICE_ID>/movements/confirm" -Method PUT -ContentType "application/json" -Headers @{Authorization="Bearer <ACCESS_TOKEN>"} -Body '{"movements":[{"id":"<MOVEMENT_ID>","action":"CONFIRM"}]}'
```

### 6.10 Reprocess invoice extraction

**Bash:**
```bash
curl -X POST http://localhost:3000/documents/<INVOICE_ID>/reprocess \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/documents/<INVOICE_ID>/reprocess" -Method POST -Headers @{Authorization="Bearer <ACCESS_TOKEN>"}
```

### 6.11 Upload invoice (PDF - auto extraction)

**Bash:**
```bash
curl -X POST http://localhost:3000/documents \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "file=@/path/to/invoice.pdf"
```

**PowerShell:**
```powershell
$filePath = "C:\path\to\invoice.pdf"
$uri = "http://localhost:3000/documents"
$headers = @{Authorization="Bearer <ACCESS_TOKEN>"}
$form = @{file = Get-Item -Path $filePath}
Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Form $form
```

---

## 7. Search (RAG)

### 7.1 Search documents (natural language)

**Bash:**
```bash
curl -X POST http://localhost:3000/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"query":"quiero saber el importe total de las facturas"}'
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/search" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer <ACCESS_TOKEN>"} -Body '{"query":"quiero saber el importe total de las facturas"}'
```

### 7.2 Get search result by query ID

**Bash:**
```bash
curl -X GET http://localhost:3000/search/<QUERY_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/search/<QUERY_ID>" -Method GET -Headers @{Authorization="Bearer <ACCESS_TOKEN>"}
```

---

## Resumen

| Seccion | Peticiones |
|---------|------------|
| Auth | 4 |
| Admin | 1 |
| Admin Users | 8 |
| Users (self) | 2 |
| Providers | 6 |
| Documents | 11 |
| Search | 2 |
| **Total** | **34** |

---

## Flujo de testing recomendado

1. **Login admin** (1.1) - Obtener tokens
2. **Admin ping** (2.1) - Verificar acceso admin
3. **Create provider** (5.3) - Crear proveedor de prueba
4. **List providers** (5.1) - Verificar creacion
5. **Create manual invoice** (6.1) - Crear factura manual
6. **List invoices** (6.4) - Verificar creacion
7. **Get invoice detail** (6.5) - Ver detalle con movements
8. **Confirm header** (6.8) - Confirmar cabecera
9. **Confirm movements** (6.9) - Confirmar movimientos
10. **Search** (7.1) - Buscar con lenguaje natural
11. **Logout** (1.4) - Cerrar sesion
