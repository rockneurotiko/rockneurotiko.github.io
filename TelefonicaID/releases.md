
[Link Releases](https://wiki.openstack.org/wiki/Releases)

# Release 1 (Austin)


- Listas de control de acceso y Containers publicos para Object Storage.
- Soporte Redis
- Modo de rescate
- Grupos de seguridad.
- Panel de control.


# Release 2 (Bexar)

- Archivos de mas de 5GB (swift)
- DirectAPI (nova)
- RestAPI mejorada para subida de archivos (glance)
- Twisted ya no es una dependencia, solo Eventlet. (glance)

# Release 3 (Cactus)

- Servir una web estatica con un Objet Storage usando listados en un index.html (swift)
- Soporte IPv6 (nova)
- CLI tool (glance) 


# Release 4 (Diablo)

- Sincronizacion entre containers (swift)
- Soporte de IP flotante (nova)
- Crear snapshots, clonar y bootear volumenes.
- Sistema de notificaciones
- Integracion con Keystone para autenticacion (glance)


# Release 5 (Essex)

- Objetos con tiempo de expiracion (swift)
- Control de acceso basado en roles (nova y glance)
- Integracion con keystone para autenticacion (nova)
- Pools de ips flotantes. (nova)


# Release 6 (Folsom)

- nova-api puede ejecutar mas de un proceso. (nova)
- Validacion de certificados SSL en glance-api (glance)
- Replicacion de imagenes (glance)
- Soporte para autenticacion a traves de PKI
- Aparecen por primera vez "quantum" (lo que sera neutron) y "cinder"
- Quantum:
    + Superposicion de IPs en L2 distintas
    + Servicio DHCP con superposicion de IPs
    + Soporte para notificaciones y cuotas
-   Cinder:
    +   Servicio de almacenamiento de bloques
    +   Crear una imagen a traves de un volumen.


# Release 7 (Grizzly)

- Soporte para objetos grandes con archivo manifest (swift)
- Cuotas de usuario y cuenta (swift)
- Funcionalidad "Celdas" para tener varios clusters (celdas) en distintas zonas geograficas sobra la misma API (nova) (experimental)
- Computo sin base de datos (nova)
- 
