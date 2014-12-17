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
    p = randi(N,1,R*N)
    q = randi(N,1,R*N)
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
    p = randi(N,1,R*N)
    q = randi(N,1,R*N)
    C = sparse(p,q,1.0,N,N)
    Nj = sum(C,1)
    dj = [x == 0 ? 1:0 for x=Nj]
    if ! (1 in dj)
        return mdis(N,R)
    else
        return C
    end
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
    return (pagerank(r), norm(r-last,1))
end

function test(N::Int64)
    @time a = mdis_A(N);
    @time calculo_PR(a);
end

function sort_with_index(V)
    sort([(i,x) for (i,x) in enumerate(V)], by=x -> x[2],rev=true)
end

function test2()
    q=[1, 1, 1, 2, 2, 3, 3, 4, 4, 6, 6, 7, 7]
    p=[2, 4, 5, 3, 7, 4, 6, 2, 7, 7, 5, 4, 2]
    N = 7
    A = sparse(p,q,1.0,N,N)
    Nj = sum(A,1)
    for (k,idx) in enumerate(Nj)
        if idx == 0
            A[:,k] = 0
        else
            A[:,k] = A[:,k] ./ idx
        end
    end
    calculo_PR(A)    
end
