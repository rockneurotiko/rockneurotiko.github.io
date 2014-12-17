## Author: Miguel Garcia Lafuente.
##

## If you want to plot, uncomment and wait the long load XD =#
##
##using Gadfly
##


function bar(V)
    n = length(V)
    try
        plot(x=range(1,n), y=V,Geom.bar)
    catch y
        if isa(y,UndefVarError)
            println("You don't have any plot library, maybe use \"using Gadfly\"")
        end
    end
end

include("sparse_potencia.jl")

function pagerank(V::Array{Float64})
    return V./norm(V,1)  # Aplicando la norma 1
    # return V./sum(V,1) # Sumando la columna
end
function potencia(M::Array{Float64,2})
    n = size(M)[1]
    potencia(M,1e-12,500,ones(n,1))
end
function potencia(M::Union(Array{Float64,2},
                           SparseMatrixCSC{Float64,Int64}),
                  tolerancia::Float64=1e-12,
                  n_iter::Int64=500,
                  r::Array{Float64,2}=ones(size(M,1),1))
    i = 0
    n = size(M)[1]
    last = zeros(n) ## Just to initialize
    while i < n_iter && maximum(abs((r/norm(r)) - last)) > tolerancia
        i += 1
        last = r

        last = last ./ norm(last)
        r = M * last
    end
    return norm(r), last, i        # This to return the eigvalues
    # return norm(r),pagerank(last),i # This to return the pagerank
end

function create_inital_values(i,j,n)
    Cs = sparse(j,i,1.0,n,n)
    C = full(Cs)
    Nj = sum(C,1)
    dj = [x == 0 ? 1:0 for x=Nj]
    return Cs,C,Nj,dj'
end

function create_S(C,n::Int64=size(C,1))
    S = zeros(Float64,n,n) # Inicializar para asignar y reservar
    for (col,s) in enumerate(sum(C,1))
        if s != 0
            S[:,col] = C[:,col]/s
        else
            S[:,col] = 1/n
        end
    end
    return S
end

function create_S!(C,n::Int64=size(C,1))
    for (col,s) in enumerate(sum(C,1))
        if s != 0
            C[:,col] = C[:,col]/s
        else
            C[:,col] = 1/n
        end
    end
end


function calcGNum(alfa:: Float64,n,i)
    return (alfa * i) + ((1-alfa) * 1/n)
end

function create_G(alfa::Float64,C,n)
    # new_f = (x) -> calcGNum(alfa,n,x)
    G = zeros(Float64,n,n)
    for col in 1:n
        G[:,col] = (alfa * C[:,col]) + ((1-alfa) * 1/n) # Applying the formula
    end
    return G
end


function randi(a,b,c)
    vec(rand(1:a,b,c))
end

function mcden(N::Int64)
    A = rand(N,N)
    return A./sum(A,1)
end

function mcdis(N::Int64, R::Int64=5)
    p = randi(N,1,5*N)
    q = randi(N,1,5*N)
    Cs = sparse(p,q,1.0,N,N)
    C = full(Cs)
    Nj = sum(C,1)
    dj = [x == 0 ? 1:0 for x=Nj]
    if ! (1 in dj)
        return mcdis(N,R)
    else
        return C
    end
end

function mdis(N::Int64, R::Int64=5)
    p = randi(N,1,5*N)
    q = randi(N,1,5*N)
    C = sparse(p,q,1.0,N,N)
    Nj = sum(C,1)
    dj = [x == 0 ? 1:0 for x=Nj]
    if ! (1 in dj)
        return mdis(N,R)
    else
        return C
    end
end

function calc_precision(A,x,lambda)
    maximum((A * x) - (lambda * x))
end

function prec1(A,x)
    norm(abs(A*x-x))
end

function prec2(lambda)
    abs(lambda-1.0)
end

function sizesp(a::SparseMatrixCSC{Float64,Int64})
    sizeof(a) +  # Tamaño base de SparseMatrix
     (sizeof(Float64) * size(a,1)) + # Tamaño de los "n" elementos
    (sizeof(Int64) * size(a,1) * 2)  # Tamaño de los dos indices 
end

function calc_alpha(t, N)
    t / (N ^ 2)
end

function estimate_t(N,a)
    a*(N^2)
end

function test(N::Int64,
              create::Function=mcden)
    S = @time create(N)
    @time create_S!(S,N)
    tol=1e-13
    @time lambda, x, iter = potencia(S,tol)
    p1 = prec1(S,x)
    p2 = prec2(lambda)
    return p1, p2, sizeof(S), iter
end

function test_sp(N::Int64)
    S = @time mdis(N)
    @time S = normalize_sp(S,N)
    @time S = create_S_normalized(S,N)
    tol=1e-13
    @time lambda, x, iter = potencia(S,tol)
    p1 = prec1(S,x)
    p2 = prec2(lambda)
    return p1, p2, sizesp(S), iter
end
