import numpy as np

vector_to_1 = lambda V: V/sum(V)

def metodo_potencia(M, error = 0):
    """
    Calcula el autovalor y autovector de una matriz.
    Si se da el error, para cuando el calculo sea aproximado con ese error.
    Si no se da, se buscara el perfecto.
    """
    M = np.matrix(M)  # Convertimos a matriz
    size = np.size(M,0)     #Cogemos numero de columnas

    x = np.matrix([1/size for _ in range(size)])  # Creamos el vector x0
    x = x.transpose()  # Y le hacemos la transpuesta


    last_mu = 0  # Ultimo mu calculado
    mu = 1       # mu actual
    p = x.argmax()  # Indice del valor mas alto del vector
    
    while abs(mu-last_mu) > error: # Mientras la diferencia sea mayor al error dado
        y = M * x   # Multiplicamos la matriz por el anterior x
        last_mu, mu = mu, y[p]  # Intercambiamos
        p = y.argmax()  # Cogemos el valor dominante
        x = y/y[p]      # Calculamos el nuevo x

    # Devolvemos el valor de mu y el autovector que sume 1
    return mu.item(0), vector_to_1(x)




MT = [[1,2/3,2,1/2],[3/2,1,3,3/4],[1/2,1/3,1,1/4],[2,4/3,4,1]]
A,V = metodo_potencia(MT)
print("Autovalor: {}".format(A))
print("Autovector: \n{}".format(V))
