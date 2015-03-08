## Proyecto Enigma

El objetivo de este proyecto es crear una simulacion de la maquina Enigma de la segunda guerra mundial usada por los alemanes.

Aunque ha habido muchas modificaciones al algoritmo Enigma, nosotros vamos a usar el que se usaba la maquina que se uso en la guerra, de 1939 (Enigma I + rotores de M3 Army & Naval).

El estilo y modo de programacion es libre, se puede hacer con clases, con funciones, totalmente procedural, como te sientas comodo, y la interfaz tambien libre, que sea un modulo importable, que tenga "cli" (se invoca el programa desde comandos), que tenga interfaz de terminal, que tenga GUI, ... No hay ninguna limitacion en este aspecto.

La maquina solo cifrara/descifrara las letras (la Ñ no incluida).

Al final de este documento hay enlaces de ayuda, por si no esta bien explicado el proyecto.

## Descripcion.

La maquina Enigma contaba con varios componentes basicos:
- Los rotores y su orden.
- El reflector usado.
- La posicion de inicio de los rotores.
- Rotacion de rotores.
- La configuracion de los anillos.
- La configuracion de "plug board" (no se como traducirlo)

## Rotores

Enigma I tenia solo tres rotores, comunmente denominados como I, II y III.
M3 Army incluyo dos rotores mas, IV y V.
M3 & M4 Naval incluyo tres rotores mas: VI, VII y VIII 
Estos son los ocho rotores que vamos a usar nosotros.

Aunque tengamos ocho rotores, en la maquina solo se pondran 3, lo que pasa que la persona que cifra tedra que decir que rotores va a usar, y su orden.

Por ejemplo, la seleccion de rotores (I, II, III) no es la misma que (III, II, I), de hecho, es exactamente la contraria, ya que el orden en la seleccion IMPORTA.

El orden se pasa de rotor izquierdo a rotor derecho.
```
Rotor -  ABCDEFGHIJKLMNOPQRSTUVWXYZ
-----------------------------------
I     -  EKMFLGDQVZNTOWYHXUSPAIBRCJ
II    -  AJDKSIRUXBLHWTMCQGZNPYFVOE
III   -  BDFHJLCPRTXVZNYEIWGAKMUSQO
IV    -  ESOVPZJAYQUIRHXLNFTGKDCMWB
V     -  VZBRGITYUPSDNHLXAWMJQOFECK
VI    -  JPGVOUMFYQBENHZRDKASXLICTW
VII   -  NZJHGRCXMYSWBOUFAIVLPEKQDT
VIII  -  FKQHTLXOCBJSPDZRAMEWNIUYGV 
```

## Reflector

El reflector es una substitucion mas que se va a hacer a la mitad del cifrado/descifrado.

Hay tres reflectores, llamados 'A', 'B' y 'C':

```
Reflector   - ABCDEFGHIJKLMNOPQRSTUVWXYZ 
------------------------------------------
        A   - EJMZALYXVBWFCRQUONTSPIKHGD      
        B   - YRUHQSLDPXNGOKMIEBFZCWVJAT      
        C   - FVPJIAOYEDRZXWGCTKUQSBNMHL
```

Es notable destacar que esta clave no se va a ver afectada por ningun tipo de rotacion, por lo que siempre va a ser esta substitucion.

## Posicion de inicio.

Los rotores no empiezan desde "cero", sino que se pueden configurar para que empiecen distinto.

La posicion "de cero" seria que los tres rotores empezasen en "A" ("A","A","A")
Pero se puede dar una posicion cualquiera, p.e: ("B","H","Z")

## Rotacion.

Los rotores SIEMPRE antes de cifrar/descifrar un caracter debe rotar sus rotores una posicion.

Pero no se rotan todos a la vez, sino que en principio se rota solo el de la derecha e.j: ('A','A','A') antes de cifrar un caracter rotaria a ('A','A','B').

Aun asi, hay posicion prefijadas, que si un rotor esta en esa posicion, rotara el y el rotor de su izquierda.

Las posiciones prefijadas son:

```
Rotor           - Posicion
I               -  Q   
II              -  E   
III             -  V   
IV              -  J   
V               -  Z   
VI, VII, VIII   - Z,M 
```

Notese que los rotores VI, VII y VIII tienen dos posiciones especiales.

Ejemplo.

Nuestro rotores son: (I,II,III)

Y estamos en la posicion (A,A,V)

Vamos a cifrar un caracter, asi que rotamos antes.
Como el rotor de la derecha esta en "V" y es su posicion, la posicion pasaria a ser: (A,B,W). Ya que rota el, y rota el de su izquierda.

Mas ejemplos (con (I,II,III)) tal que (Pos1,Pos2,Pos3) -> (PosRot1,PosRot2,PosRot3)

- (A,E,A) -> (B,F,B)  (I rota por II, II rota por el mismo al estar en "especial")
- (A,E,V) -> (B,G,W)  (II rota 2, una por el, y otra por III)


Las letras de la posicion indica una rotacion, de tal modo que si hay una "A" significa que la clave no se rota, pero si hay una "B", significa que la CLAVE se rota uno hacia la izquierda. e.j: "ABC...YZ" pasaria a ser "BC..YZA"

## Configuracion de los anillos.

Aparte de una posicion inicial de los rotores, tambien va a haber una posicion inicial del circulo de la clave para cada rotor.

Esta configuracion sera una rotacion hacia la DERECHA fija (no va cambiando, como la posicion de los rotores)

Esta configuracion seran tres letras, por ejemplo (B,G,H)

Hay una rotacion neutra, es decir, que no rota la clave, que es la letra A.

Por ejemplo, para los rotores (I,II,III) con configuracion inicial (A,A,A), si se da una configuracion de (M,M,M), el proceso antes de cifrar seria:

Se rotan los rotores (A,A,A) -> (A,A,B)
El par de sustitucion del rotor III base es ("ABCDEFGHIJKLMNOPQRSTUVWXYZ", "BDFHJLCPRTXVZNYEIWGAKMUSQO"), pero como tenemos una rotacion hacia la izquierda porque esta en "B" y 12 rotaciones hacia la derecha porque la configuracion inicial es "M", pasaria a ser asi la sustitucion: ("ABCDEFGHIJKLMNOPQRSTUVWXYZ", "EIWGAKMUSQOBDFHJLCPRTXVZNY"), que como la rotacion era ((-1)+12), se ha rotado 11 hacia la derecha, y ya se haria una substitucion normal, tal que si la letra a cifrar en ese rotor era la A, saldria una E.


## "Plug board"

El Plug Board no es mas que una substitucion preconstruida, tal que al inicio del cifrado del caracter, o al final del proceso del cifrado de un caracter, este esta en nuestro Plug board, se va a substituir por su otro par.

Esta configuracion se da como pares (A,B), (C,D), que, evidentemente, no se pueden repetir en ninguno de los pares, y las substituciones son bi-direccionales.

Por ejemplo, digamos que con esos dos pares, queremos cifrar la letra A.

Antes de nada, como encuentra A en la substitucion, la cambia por una B, asi que ahora todo el proceso se va a aplicar a la letra B.

Imaginemos que despues de todo el cifrado, sale la letra D, como tambien esta en una substitucion, la letra a devolver no es la D, sino que seria la C.

Los pares van desde cero, hasta 13, ya que hay 26 letras, y no se puede repetir en ninguna de las posiciones, asi que con 13 pares, habria una substitucion para cada letra.


## Proceso de cifrado.

Letra a letra:

1. Se avanzan los rotores.
2. Se busca la letra en substituciones y se aplica si procede.
3. Empezando por el rotor de la DERECHA, se cifra con las claves que les toquen, acorde con el tipo de rotor, la posicion de este, y la configuracion del anillo. Es decir, si los rotores son (I,II,III) se cifrara con III, luego la salida de este con II, y la salida de este con I.
4. La salida del rotor de la izquierda del todo, se le aplica el reflector (substitucion base)
5. Despues del reflector, se aplicaran de nuevo los tres rotores de izquierda a derecha. Si los rotores son (I,II,III), se cifrara con I, luego II y al final III.
6. Se busca la letra un substituciones y se aplica si procede.


Una imagen para que se vea un poco mas grafico el orden: 
![Grafico](http://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Enigma-action.svg/400px-Enigma-action.svg.png)

## Proceso de descifrado.

Se hace lo mismo que con el cifrado, siempre que la configuracion sea la que estaba al principio del cifrado.

Por ejemplo, si tu configuracion antes de cifrar era:

- Rotores: (I,II,III)
- Posicion inicial: (A,A,A)
- Configuracion de anillo: (G,C,H)
- Reflector: B
- Substituciones: ()

Y cifras el texto "PYTHON", el resultado cifrado sera:
"WXDGPM", y los rotores estaran en la posicion (A,A,G)

Para descifrar, tendras que volver a la configuracion inicial, es decir, poner los rotores en la posicion (A,A,A), y aplicar el mismo algoritmo que usaste para cifrar al texto "WXDGPM" y te saldra "PYTHON" de vuelta.


## Ejemplo completo.

Cifrar el texto "Cuando la noche cae, las serpientes toman cafe."
Configuracion:

- Rotores: (III, VII, VIII)
- Posicion inicial: ('M','G','L')
- Configuracion del anillo: ('C','C','L')
- Reflector: C
- Substituciones: (('P','O'),('M','L'),
                 ('I','U'),('K','J'),
                 ('N','H'),('Y','T'),
                 ('G','B'),('V','F'),
                 ('R','E'),('D','C'))

 Texto cifrado: 'LDFDWKPSYNNCLJCQXHZHNOSMFKSNEUSBTZDUUA'
 
 Posicion final: ('M','J','X')


## Para comprobar.

Descifrar este texto: 'XNJLBZMNPUKJFHXFVMVTPRUQJYAQHXYMBGWBHIYHZOUCS'
Configuracion:

- Rotores: (VI, IV, V)
- Posicion inicial: ('C','C','L')
- Configuracion del anillo: ('M','G','L')
- Reflector: A
- Substituciones: ('C','R')

Nota: El texto tiene sentido en español, pero, evidentemente, no hay signos de puntuacion.


## Funcionalidades extra.

- Permitir todas las maquinas con sus respectivos rotores: (http://en.wikipedia.org/wiki/Enigma_rotor_details#Rotor_wiring_tables)  [ Nosotros usamos el 4 que aparece, que es el usado en la segunda guerra mundial por los alemanes ]
- Hacer que tambien se pueda romper un cifrado.



## Links de ayuda
- Descripcion del cifrado: http://en.wikipedia.org/wiki/Enigma_cipher
- Detalles de los rotores: http://en.wikipedia.org/wiki/Enigma_rotor_details
- Descripcion basica de la maquina: http://practicalcryptography.com/ciphers/enigma-cipher/  
- Gif animado del proceso: http://swimmingthestyx.com/wp-content/uploads/2014/01/ExcelEnigma_05.gif
- Cripto analisis: http://practicalcryptography.com/cryptanalysis/breaking-machine-ciphers/cryptanalysis-enigma/
- Mas links de cripto analisis: http://practicalcryptography.com/ciphers/enigma-cipher/#cryptanalysis


