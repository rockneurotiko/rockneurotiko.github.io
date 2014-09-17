from pyDatalog import pyDatalog

pyDatalog.create_terms('A','B','C','V','trans')

# facts
trans[1,1] = 1
trans[1,2] = 2/3
trans[1,3] = 2
trans[1,4] = 1/2

# rules
trans[A,B] = 1 / trans[B,A]  # inverse
trans[A,B] = trans[A,C] * trans[C,B]  # transitive

print(trans[3,2] == V)  # posicion M(3,2)

print(trans[2,3] == V)  # posicion M(2,3)


# Calculemos los autovalores y autovectores

import numpy as NM

# Generar la matriz con la primera fila (al ser consistente se puede hacer)
# Si no fuese consistente habria que ponerla a mano
A = []
for i in range(1,5):
    A.append([])
    for j in range(1,5):
        data = (trans[i,j] == V).data[0][0]
        A[i-1].append(data)

print(A)



D,V = NM.linalg.eig(A)  # D = autovalores, V = autovectores

autovalor_dominante = max(D)

# Comprobar que es consistente
assert (autovalor_dominante == len(A)  and min(D) == 0)


def get_autovector(M):
    def check_vector(M, i):  # Comprueba que todos
        first, check = 0, 0
        for n, x in enumerate(M):
            if n == 0:
                first = -1 if x[i] < 0 else 1
                continue
            else:
                check = -1 if x[i] < 0 else 1
            if check != first:
                return False
        return True

    for i, m in enumerate(V):
        if check_vector(V,i):
            return [abs(x[i]) for x in V]
    return []

def norma_1(v):
    s = sum(v)
    return [x/s for x in v]


autovector = get_autovector(V)
autovector = norma_1(autovector)

print(autovalor_dominante)
print(autovector)