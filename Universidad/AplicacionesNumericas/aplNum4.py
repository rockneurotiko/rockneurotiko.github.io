import numpy as np
import matplotlib.pylab as plt
import math
from functools import reduce
import operator

# Funcion lambda para hacer la norma 1 a una matriz
norma_1 = lambda V, sum: np.matrix([x.item(0)/sum for x in V]).transpose()

def plot(X, name="ColorBar"):
    fig = plt.figure(figsize=(6, 6))
    ax = fig.add_subplot(111)
    ax.set_title(name)
    ax.imshow(X, interpolation='nearest', cmap=plt.cm.ocean,
        extent=(0.5,np.shape(X)[0]+0.5,0.5,np.shape(X)[1]+0.5))
    ax.set_aspect('equal')

def create_Bs(M, size):
    """
    Coge una matriz y su tamaño en columnas
    y crea la matriz B y el vector b.
    """
    new = []
    n_m = 0
    b = []
    for i in range(size):
        for j in range(i+1, size):
            new.append([0 for _ in range(size)])
            new[n_m][i] = -1
            new[n_m][j] = 1 
            n_m += 1

            b.append((-1) * M[i][j])
    new.append([1 for _ in range(size)])
    b.append(0)
    return np.matrix(new), np.matrix(b).transpose()

def create_W(V):
    """
    Coge un vector y crea la matriz W a partir de ese vector.
    """
    new = []
    size = np.size(V,0)
    for i in range(size):
        new.append([0 for _ in range(size)])
        for j in range(size):
            new[i][j] = V.item(i) / V.item(j)
    return np.matrix(new)

def res_min_cuad_logaritmica(M):
    """
    aplica los minimos cruadrados a una matriz.
    """
    # M = np.matrix(M, np.float)
    lfunc = np.vectorize(math.log)  # Aplicar el logaritmo a todos los elementos
    L = lfunc(M)

    size = np.size(L,0)
    B, b = create_Bs(L, size)
    print("Matriz Aplicado el logaritmo a los elementos:")
    print(L)
    print("-"*20)
    print("Sistema de ecuaciones lineal B:")
    print(B)
    print("-"*20)
    print("b:")
    print(b)
    print("-"*20)

    V,residuals_auto,A,_ = np.linalg.lstsq(B,b)

    des_lfunc = np.vectorize(math.exp)  # Funcion que aplicara math.exp
    V = des_lfunc(V)  # Quitamos logaritmos
    V = norma_1(V,V.sum())  # Normalizamos

    residuals_auto = residuals_auto.item(0)

    print("Vector de pesos normalizado V:")
    print(V)
    print("-"*20)

    return V

def comprobacion_matrices(M,V):
    M = np.matrix(M, np.float)
    print("Matriz Original:")
    print(M)
    print("-"*20)
    W = create_W(V)
    print("Matriz W creada a partir de V:")
    print(W)
    print("-"*20)

    diff = M - W
    plot(M, "M")
    plot(W, "W")

    print("Matriz diferencia (M-W)")
    print(diff)
    print("-"*20)
    suma = sum([abs(x) for y in diff.tolist() for x in y])
    print("Suma de los valores de la matriz diferencia")
    print(suma)
    print("-"*20)


# Funcion para hacer la media geometrica de una matriz y normalizar.
def media_geometrica(M):
    geometric = lambda v: reduce(operator.mul, v, 1) ** (1 / len(v))
    return norma_1(np.array(list(map(geometric, M))))


M0 = [[1,2,1/4,1,1,2],[1/2,1,1/4,1/2,1/2,1],[4,3,1,3,3,4],[1/2,1,1/4,1,1/2,2],[1,2,1/3,2,1,2],[1/2,1,1/4,1/2,1/2,1]]
print("DATOS PARA M0")
V0 = res_min_cuad_logaritmica(M0)
comprobacion_matrices(M0,V0)

MG0 = media_geometrica(M0)
print("Vector hayado por la media geometrica:")
print(MG0)
print("-"*20)



M1 = [[1,2,4],[1/2,1,1/3],[1/4,3,1]]
print("DATOS PARA M1")
V1 = res_min_cuad_logaritmica(M1)
comprobacion_matrices(M1,V1)

MG1 = media_geometrica(M1)
print("Vector hayado por la media geometrica:")
print(MG1)
print("-"*20)



M2 = [[1,2/3,2,1/2],[3/2,1,3,3/4],[1/2,1/3,1,1/4],[2,4/3,4,1]]
print("DATOS PARA M2")
V2 = res_min_cuad_logaritmica(M2)
comprobacion_matrices(M2,V2)

MG2 = media_geometrica(M2)
print("Vector hayado por la media geometrica:")
print(MG2)
print("-"*20)




# plt.show()
