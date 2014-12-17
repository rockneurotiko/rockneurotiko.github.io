#=
Author: Miguel Garcia Lafuente.

=#

#= If you want to plot, uncomment and wait the long load XD =#
#=
using Gadfly
=#
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
function potencia(M::Array{Float64,2},
    tolerancia::Float64,
    n_iter::Int64,
    r::Array{Float64,2})

    i = 0
    n = size(M)[1]
    last = zeros(n) ## Just to initialize
    while i < n_iter && maximum(abs((r/norm(r)) - last)) > tolerancia
        i += 1
        last = r

        last = last ./ norm(last)
        r = M * last
    end
    # return norm(r), last, i        # This to return the eigvalues
    return norm(r),pagerank(last),i # This to return the pagerank
end

function create_inital_values(i,j,n)
    Cs = sparse(j,i,1.0,n,n)
    C = full(Cs)
    Nj = sum(C,1)
    dj = [x == 0 ? 1:0 for x=Nj]
    return Cs,C,Nj,dj'
end


function create_S(C,n)
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

function take_out_complex(V)
    map(real, filter(x -> imag(x) == 0, V))
end

function find_n_complex(n,V)
    compl = convert(Complex,n)
    for (i,item) in enumerate(V)
        if imag(item) == 0 && (abs(real(item) - real(compl)) < 10e-15)
            return i
        end
    end
    return -1
end

function from_eig(B)
    D,V = eig(B)
    lambda = maximum(take_out_complex(D))
    i = find_n_complex(lambda,D)
    x_compl = V[:,i]
    x = map(abs,take_out_complex(x_compl))
    return x, lambda
end

function random_test(n)
    A = rand(n,n)
    B = A./sum(A,1)
    lambda, x, iter = potencia(B)
    @show x
    @show lambda
    @show iter
    @show calc_precision(B,x,lambda)
    return lambda, x, iter
end

function sort_with_index(V)
    sort([(i,x) for (i,x) in enumerate(V)], by=x -> x[2],rev=true)
end
function get_orders_S_G(S,G)
    _,s_p,_ = potencia(S)
    _,g_p,_ = potencia(G)
    return sort_with_index(s_p), sort_with_index(g_p)
end

function calc_precision(A,x,lambda)
    maximum((A * x) - (lambda * x))
end

function test()
    i=[1, 1, 1, 2, 2, 3, 3, 4, 4, 6, 6, 7, 7]
    j=[2, 4, 5, 3, 7, 4, 6, 2, 7, 7, 5, 4, 2]
    n = 7
    Cs,C,Nj,dj = create_inital_values(i,j,n)
    S = create_S(C,n)
    alpha = 0.85
    G = create_G(alpha,S,n)
    l,x,i = potencia(G)
    prec = calc_precision(G,x,l)
    return l,x,i,prec
end
