<<<<<<< HEAD
## Author: Miguel Garcia Lafuente.
##

## If you want to plot, uncomment and wait the long load XD =#

## using Gadfly

function bar(V)
    n = length(V)
    try
        plot(x=range(1,n), y=V,Geom.bar)
    catch y
        if isa(y,UndefVarError)
            println("You don't have any plot library, maybe use \"using Gadfly\"")
        end
    end
=======
using Compose, Gadfly

function spy_draw(sp::SparseMatrixCSC)
    draw(SVG("spy.svg", 5inch, 5inch), spy(sp))
>>>>>>> 7b844076cfaaee5ec7f84d52fbed8df5a3bf4bf1
end

function spconvert(path::String)
    io = open(path,"r")

    max = 0
    I,J,V = Int64[], Int64[], Float64[]
<<<<<<< HEAD
    
=======
    ## l = readline(io)
>>>>>>> 7b844076cfaaee5ec7f84d52fbed8df5a3bf4bf1
    for line in EachLine(io)
        h = split(line)
        i,j = map(int64, h[1:2])
        v = float64(h[3])
        push!(I,i)
        push!(J,j)
        push!(V,v)
        ## max = (i > max) ? i : max
        ## max = (j > max) ? j : max
    end
    close(io)
<<<<<<< HEAD
    M::SparseMatrixCSC = sparse(J,I,V)
=======
    M::SparseMatrixCSC = sparse(I,J,V)
>>>>>>> 7b844076cfaaee5ec7f84d52fbed8df5a3bf4bf1
    ## M::SparseMatrixCSC = sparse(I,J,V,max,max)
    return M
end


<<<<<<< HEAD
function randi(a,b,c)
    vec(rand(1:a,b,c))
end

function mdis_A(N::Int64, R::Int64=5)
    p = randi(N,1,R*N)
    q = randi(N,1,R*N)
    A = sparse(p,q,1.0,N,N)
    Nj = sum(A,1)
    i,j = findn(A)
    I,J,V = findnz(A)
    for idx in 1:length(V)
        V[idx] /= Nj[J[idx]]
    end
    return sparse(i,j,V,N,N)
end





function pagerank(V::Array{Float64})
    return V./norm(V,1)  # Aplicando la norma 1
end

function calculate_v(dj::Array{Int64,2},
                     e::Array{Float64,2}=ones(1,size(dj,2)),
                     alpha::Float64=0.85)
    return (alpha * dj) + ((1-alpha) * e)
end

function calculo_PR(A::SparseMatrixCSC{Float64,Int64},
                    tolerancia::Float64=1e-12,
                    n_iter::Int64=500,
                    r::Array{Float64,2}=ones(size(A,1),1),
                    alpha::Float64=0.85,
                    Nj::Array{Float64,2}=sum(A,1))
    n = size(A,1)
    last = zeros(n)
    dj::Array{Int64,2} = [x == 0 ? 1:0 for x=Nj]'
    v = calculate_v(dj)
    e1 = ones(size(A,1),1)
    i = 0
    while i < n_iter && maximum(abs(r-last)) > tolerancia
        i += 1
        last = r
        last = last ./ norm(last)
        esc = v*r
        r = alpha*A*last + (1/n * e1 * esc)
    end
    println("Iteraciones del algoritmo: ", i)
    return (pagerank(r), norm(r-last,1))
end


function sizesp(a::SparseMatrixCSC{Float64,Int64})
    sizeof(a) +  # Tamaño base de SparseMatrix
    (sizeof(Float64) * size(a,1)) + # Tamaño de los "n" elementos
    (sizeof(Int64) * size(a,1) * 2)  # Tamaño de los dos indices 
end

function sort_with_index(V)
    sort([(i,x) for (i,x) in enumerate(V)], by=x -> x[2],rev=true)
end

function test(path)
    println("Estadisticas cargar datos: ")
    l = @time spconvert(path)

    println()
    max_e = size(l,1)
    println("Nodos: ", max_e)

    println()
    n_elem = max_e*max_e
    tam = sizesp(l)
    println("Tamaño (B): ", tam)

    _,J,_ = findnz(l)

    println()
    n_no_nulos = length(J)
    n_nulos = n_elem - n_no_nulos
    println("Elementos no nulos: ", n_no_nulos)

    println()
    println("La relacion no_nulos / nulos es: ", n_no_nulos / n_nulos,
            " por lo que es dispersa.")

    println()
    suma = sum(l,1)
    println("Con Suma: ", length(suma))
    println("Todas las sumas dan 1?: ", any(map(x->x==1.0, suma)))
    println("Todos tienen suma, todo da 1, la matriz es S")

    println()
    dispers = n_no_nulos / max_e
    println("Dispersion: ", dispers)

    println()
    n_medio_out = length(J) / max_e
    println("Numero medio outlinks: ", n_medio_out)
    
    println()
    Is = Set(J)  # Quitamos repetidos. Nodos con salida
    nsalida = length(Is)
    println("Nodos con salida: ", nsalida)
    nsinsalida = max_e - nsalida
    println("Nodos sin salida: ", nsinsalida)

    println()
    relacion = n_elem / max_e ==  nsalida + nsinsalida
    println("Se cumple la relacion?: ", relacion)

    return l
end

function test2(l::SparseMatrixCSC)
    println("5.\n")
    println("Estadisticas calcular PR")
    x, precision = @time calculo_PR(l, 1e-13)
    println(precision)
    println(sizeof(x))
    return x
end

function test3(x::Array{Float64,2})
    println("6.\n")
    sorted_x = @time sort_with_index(x)
    first_20 = sorted_x[1:20]
    last_20 = sorted_x[length(sorted_x)-19:length(sorted_x)]
    
    println("First 20: ")
    map(println,first_20)
    
    println("\nLast 20: ")
    map(println,last_20)
end

calculo_PR(mdis_A(10), 1e-1)  # The JIT load this :-)

function full_test(path)
    mtrx = test(path)
    x = test2(mtrx)
    test3(x)
end
# full_test("stanford-web.dat")
full_test("web-Google.txt.dat")
# full_test("web-BerkStan.txt.dat")
# full_test("web-Stanford.txt.dat")
=======
l = spconvert("stanford-web.dat")
spy_draw(l)
#spy_draw(sprand(100,100,0.2))
>>>>>>> 7b844076cfaaee5ec7f84d52fbed8df5a3bf4bf1
