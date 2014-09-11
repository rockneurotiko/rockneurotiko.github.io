
# [Link Releases](https://wiki.openstack.org/wiki/Releases)

-------

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
- Soporte para redes multiples en nodos con agentes L3 y agentes DHCP (quantum)
- Balanceo de carga como servicio \[experimental\] (quantum)


# Release 8 (Havana)

- Soporte para hacer "pooling" de conexiones a memcache (swift)
- Los volumenes de cinder asociados pueden ser cifrados (nova) 
- Quantum pasa a llamarse Neutron!
- VPN as a Service f Firewall as a Service. (neutron)
- El balanceo de carga que era experimental ya es estable (neutron)
- Se puede extender el tamaño de un volumen existente y transferir un volumen de un tenant a otro (cinder)
- Es la primera vez que aparece Heat en unas notas de version.
- Operaciones de crear, modificar y borrar son independientes y se hacen en paralelo (Heat)


# Release 9 (Icehouse)

- Ahora un servidor proxy swift responde a peticiones a "/info" (swift)
- Replicacion de objetos con ssync como alternativa a rsync (swift)
- Reintento automatico en intentos de lectura (swift)
- Actualizaciones en caliente y gradual (nova)
- Mas estabilidad y testing (neutron)
- Drivers para LBaaS (Embrane, NetScaler y Radware), VPNaaS (Cisco CSR) (neutron)
- Se puede cambiar el tipo de un volumen existente \[retype] (cinder)
- Se pueden borrar cuotas (cinder)
- Importar y exportar backups (cinder)
- HOT templates (En Havana era experimental) (Heat)
- Usuarios no admins (Heat)
- Mirar los recursos añadidos, ya que no estan en Havana (como por ejemplo, IPsflotantes)
