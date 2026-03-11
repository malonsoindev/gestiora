classDiagram
direction LR

%% ======================
%% AGREGADOS PRINCIPALES
%% ======================

class Empresa {
  +UUID uuid
  +String cif
  +String razonSocial
  +String direccion
}

class Proveedor {
  +UUID uuid
  +String razonSocial
  +String cif
  +String direccion
  +String poblacion
  +String provincia
  +String pais
}

class Factura {
  +UUID uuid
  +String status
  +String numero
  +Date fechaOperacion
  +Date fechaVencimiento
  +Decimal baseImponible
  +Decimal iva
  +Decimal total
}

class Movimiento {
  +UUID uuid
  +String concepto
  +Decimal cantidad
  +Decimal precio
  +Decimal baseImponible
  +Decimal iva
  +Decimal importeIVA
  +Decimal total
}

class FileRef {
  +String storageKey
  +String filename
  +String mimeType
  +Long sizeBytes
  +String checksum
}

%% ======================
%% IAM
%% ======================

class Usuario {
  +UUID uuid
  +String nombre
  +String avatar
  +String mail
  +String password
}

class Rol {
  +Int id
  +String nombre
}

%% ======================
%% RELACIONES
%% ======================

Empresa "1" --> "0..*" Proveedor
Empresa "1" --> "0..*" Factura
Empresa "1" --> "0..*" Usuario

Factura "1" --> "1" Proveedor : supplierId
Factura "1" *-- "1..*" Movimiento : movimientos
Factura "1" --> "0..1" FileRef : file

Usuario "0..*" -- "0..*" Rol : roles
