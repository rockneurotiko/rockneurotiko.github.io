
# [Link Releases](https://wiki.openstack.org/wiki/Releases)

<!-- # **420 Blaze it faggot** -->
-------

# Release 1 (Austin)


- Listas de control de acceso y Containers publicos para Object Storage. (pre-swift)
- Soporte Redis. (pre-nova)
- Modo de rescate. (pre-nova)
- Grupos de seguridad de control de acceso. (pre-nova)
- Panel de control web.


# Release 2 (Bexar)

- Archivos de mas de 5GB (swift)
- Middleware experimental que transforma peticiones de Amazon S3 a swift. (swift)
- Glance es añadido.

# Release 3 (Cactus)

- Introduccion de checksum para deteccion de errores (swift)
- Servir una web estatica con un Object Storage usando listados en un index.html (swift)
- Soporte IPv6 (Nova)
- Migrar maquinas virtuales de un nodo a otro sin tener que pararlos. \[HotSwap] (Nova)
- CLI tool (glance)


# Release 4 (Diablo)

- Sincronizacion entre containers (swift)
- Modulo de autenticacion se separa a un proyecto distinto \[swauth] (swift) 
- Soporte de IP flotante (nova)
- Crear snapshots, clonar y bootear volumenes. (Nova)
- Sistema de notificaciones (Nova)
- Integracion con Keystone para autenticacion \[Keystone es el sistema de control de identidades: Usuarios, proyectos y roles](glance)


# Release 5 (Essex)

- Objetos con tiempo de expiracion (swift)
- Control de acceso basado en roles (nova y glance)
- Integracion con keystone para autenticacion (nova)
- Pools de ips flotantes. (nova)
- El Dashboard se denomina Horizon ahora \[No se dice expresamente, pero se intuye]


# Release 6 (Folsom)

- Se introducen los workflows (pre-orquestador)
- nova-api puede ejecutar mas de un proceso, debido a que en el modulo anterior las solicitudes se iban apilando en el core una tras otra. (nova)
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

- Soporte para objetos grandes con archivo manifest \[Descripcion del objeto] (swift)
- Cuotas de usuario y cuenta con niveles (swift)
- Funcionalidad "Celdas" para tener varios clusters (celdas) en distintas zonas geograficas sobra la misma API (nova) (experimental)
- Computo sin base de datos (nova)
- Soporte para redes multiples en nodos con agentes L3 y agentes DHCP (quantum)
- Balanceo de carga como servicio \[experimental\] (quantum)


# Release 8 (Havana)

- Soporte para hacer "pooling" de conexiones a memcache (swift)
- Los volumenes de cinder asociados pueden ser cifrados (nova) 
- Quantum pasa a llamarse Neutron!
- VPN as a Service y Firewall as a Service. (neutron)
- El balanceo de carga que era experimental ya es estable (neutron)
- Se puede extender el tamaño de un volumen existente y transferir un volumen de un tenant a otro (cinder)
- Introduccion de Ceilometer (mide los consumos y estadisticas)
- Es la primera vez que aparece Heat en unas notas de version.
- Operaciones de crear, modificar y borrar son independientes y se hacen en paralelo (Heat)


# Release 9 (Icehouse)

- Replicacion de objetos con ssync como alternativa a rsync (swift)
- Actualizaciones en caliente y gradual (nova)
- Drivers para Cinder(IBMS SONAS), LBaaS (Embrane, NetScaler y Radware), VPNaaS (Cisco CSR) (neutron)
- Se puede cambiar el tipo de un volumen existente \[por ejemplo, de small a medium] (cinder)
- Se pueden borrar cuotas (cinder)
- HOT templates (En Havana era experimental) (Heat)
- Los usuarios no admins pueden ejecutar HOT's (Heat)
- Nota para nosotros: Mirar los recursos añadidos a Heat, ya que no estan en Havana (como por ejemplo, IPsflotantes)
- Trove es un modulo nuevo de bases de datos relacionales.

