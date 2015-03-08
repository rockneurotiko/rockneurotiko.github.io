# Proyecto TODO
(derivado del readme del Proyecto-TODO de Álvaro J. Aragoneses
y copiado vilmente der README.md de Guillermo del SIG-Lisp <3)

El objetivo de este proyecto es crear un gestor de tareas pendientes en
terminal, en el cual podremos anotar muestras citas, tareas, reuniones y
cualquier cosa que pensemos que debemos recordar.

Los programas deben ajustarse al menos a los parámetros de funcionamiento
mínimos y ser compatibles con el tipo de fichero que almacenará la lista,
para que una misma lista sea portable a varios clientes.

## Formato de la lista
- La lista de tareas pendientes se almacenará en un fichero de texto plano con
  codificación UTF-8 o ISO-Latin, compatible con acentos y caracteres especiales
  como la "ñ".
- Cada tarea en la lista ocupará una linea del archivo de texto, en la que
  estarán contenidas la tarea en sí, el hilo al que pertenece dicha tarea y su
  prioridad.
- En cada línea, se seguirá el formato "PRIORIDAD:HILO:TAREA" donde PRIORIDAD es
  uno de los siguientes identificadores: "ALTA", "MEDIA", "BAJA"; HILO será una
  cadena de caracteres alfanuméricos (sin puntuación, tabulación, espacios en
  blanco ni otros caracteres) que identifique unívocamente el hilo; TAREA
  será una cadena de caracteres que contendrá una descripción sobre la tarea a
  realizar.

## Formato de salida del texto
- Por cada vez que el programa se ejecute y muestre una tarea, cada una de las
  tareas seguirá el patrón "NUM -> #HILO TAREA", donde NUM es el número de la
  tarea, que se corresponde con el número de la linea que ocupa en el archivo de
  texto (indexando de 0 a n-1), HILO será el hilo al que pertenece la tarea y
  TAREA será el texto que describe la tarea a realizar.
- Dependiendo de la prioridad de la tarea, se mostrará toda la cadena
  anteriormente dada con el color ROJO en caso de prioridad ALTA, AMARILLO en el
  caso de prioridad MEDIA y SIN COLOR en el caso de prioridad BAJA.( Ver anexo A
  para más datos acerca de los colores).
- El resto de mensajes, incluida la ayuda, quedan a gusto del programador,
  siempre que sean los suficientemente informativos.

## Parámetros de entrada
El programa podrá ejecutarse bajo las siguientes condiciones:
- Sin flags ni parámetros: deberá mostrar la lista completa de tareas,
  respetando el formato de salida y sus colores correspondientes.
- Con flags: se admitirán los siguientes flags:
  - -a TAREA : añade una tarea a la lista. La tarea debe escribirse entre
    comillas.
  - -p PRIORIDAD : añade una prioridad a la tarea.
  - -t HILO : añade un hilo a la tarea.
  - -l : lista todos los hilos disponibles.
  - -w HILO : lista todas las tareas asociadas a ese hilo.
  - -r NUM : elimina la tarea situada en la posición NUM de la lista.
  - -s NUM TAREA: modifica una tarea existente en la posición NUM de la
    lista. La tarea debe escribirse entre comillas.
  - -h : muestra la ayuda.
- Para los flags "-p" y "-t" se definen unos parámetros por omisión que serán,
  respectivamente, BAJA y TODO; Esto se explica por el hecho de que el usuario
  puede añadir una tarea sin asignarle una prioridad o un hilo concreto.
- Por otro lado, los flags "-p", "-t" no deben usarse sin acompañar a "-a" ó
  "-s".
- El flag "-s" puede reasignar una prioridad y un hilo a la tarea, utilizando,
  opcionalmente, los flags "-t" y "-p" de la misma forma que se utilizarán con
  el flag "-a".

## Funcionalidades adicionales
Las siguientes funcionalidades no entraráan dentro del comportamiento básico del
programa (y por tanto, no definiremos un uso estándar para ellas); sin embargo,
su implementación puede ser añadida para profundizar más en la investigación del
problema. Algunas ideas:
- Flag "-i": la llamada al programa con este flag producirá que el programa se
  comportara de forma interactiva con el usuario, mostrando los cambios que
  realice por cada comando en algún tipo de prompt.
- Ubicación de la lista: por comodidad, se supondrá que el archivo de la lista
  se encuentra en el mismo directorio que el programa; No obstante, podemos
  contemplar el caso de que la lista se encuentre en otra carpeta, una
  funcionalidad muy útil para realizar tareas de sincronización con programas
  como rsync o Dropbox.
- Archivo de Configuración: Puede que el usuario considere que el color amarillo
  no refleja adecuadamente una tarea de prioridad media o que queira dotar a las
  prioridades bajas de otro color distinto del que por defecto usa su prompt;
  Para este tipo de casos, un archivo de configuración que almacenara las
  constantes de color sería lo idóneo. Nótese que, además, podrá usarse este
  fichero para definir la ruta en la que está ubicada la lista.
- Flag "-c": como consecuencia de modificar la ubicación de la lista, podemos
  encontrarnos con que el usuario demanda utilizar varios archivos, con
  nombres distintos o con el mismo nombre pero situados en carpetas distintas,
  para ordenar todas sus tareas. El flag "-c" cargará una lista distinta de la
  asignada por defecto en el archivo de configuración, de forma que pueda
  utilizarse directamente desde la linea de comandos sin tener que variar cada
  vez la ruta de la lista a cargar.

# ANEXO: Colores en el terminal

A lo largo de este documento se ha hablado de aplicar colores a la salida de
texto en el terminal; ésto puede conseguirse gracias a las secuencias de escape
ANSI.

Las secuencias de escape ANSI, basadas en el estándar ANSI X3.64 (también
conocido como ECMA-48) consisten en una serie de cadenas de caracteres que no
son impresas por pantalla, sino que son interpretadas directamente, aplicando
determinados cambios en el terminal. Concretamente, en este anexo veremos las
secuencias de escape relacionadas con la coloración de caracteres, pero existen
multitud de secuencias que permiten amplias modificaciones. Consultad en
internet para más datos.

En concreto, todas las secuencias de escape ANSI parten de la utilización del
caracter ESC, codificado como el carácter 27 en la tabla ASCII, y expresado como
1B en hexadecimal o 033 en octal, codificación que usaremos en este anexo.

Una vez definido el carácter de escape, se añadirá un corchete abierto a la
cadena ("[") seguido de una combinación de dígitos que nos dará el color y
terminando la cadena con una "m" minúscula. Las combinaciones de colores
disponibles son:

- 0;30 - negro
- 1;30 - gris oscuro
- 0;31 - rojo
- 1;31 - rojo claro
- 0;32 - verde
- 1;32 - verde claro
- 0;33 - marron
- 1;33 - marron claro
- 0;34 - azul
- 1;34 - azul claro
- 0;35 - purpura
- 1;35 - purpura claro
- 0;36 - cyan
- 1;36 - cyan claro
- 0;37 - gris claro
- 1;37 - blanco

Por ejemplo, para codificar la cadena de texto que, desde ese momento en
adelante, nos coloreará todas las letras en rojo, debemos imprimir la cadena
"\033[0;31m" (el caracter ESC se ha escrito como \033 para indicar que es un
carácter escapado en octal; podríamos haberlo codificado también como \x1B).

Añadir, por último, que la cadena especial "\033[0;0m" desactiva todos los
cambios realizados en el terminal, retornándolo a sus valores originales.