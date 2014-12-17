function potencia_sp(M::SparseMatrixCSC{Float64,Int64})
    n = size(M)[1]
    potencia_sp(M,1e-12,500,ones(n,1))
end
function potencia_sp(M::SparseMatrixCSC{Float64,Int64},
    tolerancia::Float64,
    n_iter::Int64,
    r::Array{Float64,2})
    i = 0
    n = size(M)[1]
    last = zeros(n) ## Just to initialize
    # for i in 1:n
    #     if maximum(abs((r/norm(r)) - last)) > tolerancia
    #         break
    #     end
    #     last = r
    #     last = last / norm(last)
    #     r = M * last
    # end
    while i < n_iter && maximum(abs((r/norm(r)) - last)) > tolerancia
        i += 1
        last = r

        last = last ./ norm(last)
        r = M * last
    end
    return norm(r), last, i        # This to return the eigvalues
end

## Can't have
function create_S_normalizedx!(A :: SparseMatrixCSC, n::Int64)
    sums = sum(A,1)
    i,j = findn(A)
    I,J,V = findnz(A)
    for idx in 1:length(V)
        V[idx] /= sums[J[idx]]
    end
    sparse(i,j,V,n,n)
end

function S_sp(C,n)
    S = copy(C)
    for (col,s) in enumerate(sum(S,1))
        if s != 0
            S[:,col] = S[:,col]/s
        else
            S[:,col] = 1/n
        end
    end
    return S
end

function S_sp!(S,n)
    for (col,s) in enumerate(sum(S,1))
        if s != 0
            for (s2,item) in enumerate(S[:,col])
                S[s2,col] = item/s
            end
        else
            for (s2,item) in enumerate(S[:,col])
                S[s2,col] = 1/n
            end
        end
    end
end

function calcGNum(alfa:: Float64,n,i)
    return (alfa * i) + ((1-alfa) * 1/n)
end

function G_sp(alfa::Float64,C,n)
    # new_f = (x) -> calcGNum(alfa,n,x)
    G = copy(C)
    for col in 1:n
        # G[:,col] = map(new_f,C[:,col])  # Using partial application, now slow
        G[:,col] = (alfa * C[:,col]) + ((1-alfa) * 1/n) # Applying the formula
        # for (s2,item) in enumerate(C[:,col])
        #     G[s2,col] = calcGNum(alfa,n,item)
        # end
    end
    return G
end

function G_sp!(alfa::Float64,G,n)
    for col in 1:n
        for (s2,item) in enumerate(G[:,col])
            G[s2,col] = calcGNum(alfa,n,item)
        end
    end
end

function create_sp(i,j,n)
    C = sparse(j,i,1.0,n,n)
    C = normalize_sp(C,n)
    Nj = sum(C,1)
    dj = [x == 0 ? 1:0 for x=Nj]
    return C,Nj,dj'
end

function normalize_sp(Cs,n)
    j,i = findn(Cs)
    dj = [x == 0 ? 1:0 for x=sum(Cs,1)]
    I = findn(dj)[1]
    for idx in I
        append!(i,[idx for _ in range(1,n)])
        append!(j,range(1,n))
    end
    sparse(j,i,1.0,n,n)
end

function apply_sp(Cs, n, alpha=0.85)
    Cs = normalize_sp(Cs,n)
    Ss = S_sp(Cs,n)
    Gs = G_sp(alpha,Ss,n)
    potencia_sp(Gs)
end

function apply_sp!(Cs,n,alpha=0.85)
    Cs = normalize_sp(Cs,n)
    S_sp!(Cs,n)
    G_sp!(alpha,Cs,n)
    potencia_sp(Cs)
end

function simple_test()
    i=[1, 1, 1, 2, 2, 3, 3, 4, 4, 6, 6, 7, 7]
    j=[2, 4, 5, 3, 7, 4, 6, 2, 7, 7, 5, 4, 2]
    n = 7
    Cs,Nj,dj = create_sp(i,j,n)
    apply_sp(Cs, n)
end
function simple_test!()
    i=[1, 1, 1, 2, 2, 3, 3, 4, 4, 6, 6, 7, 7]
    j=[2, 4, 5, 3, 7, 4, 6, 2, 7, 7, 5, 4, 2]
    n = 7
    Cs,Nj,dj = create_sp(i,j,n)
    apply_sp!(Cs, n)
end

function readadj(path::String)
    io = open(path,"r")
    header = readline(io)
    n_nodes, n = map(int64,split(header))
    readline(io)
    I, J = Int64[], Int64[]
    for line in EachLine(io)
        i,j = map(int64,split(line))
        push!(I,i)
        push!(J,j)
    end
    close(io)
    M::SparseMatrixCSC = sparse(J,I,1.0, n, n)
    return M, n
end

function test_file(path::String)
    M, n = readadj(path)
    apply_sp(M, n)
end




## EPIC SHIT!!!
function calculate_absorving(M::SparseMatrixCSC{Float32,Int32})
    absorving = Int32[]
    s,sj = findn(M)
    for i in keys(setdiff(Set(range(1,n)), Set(s)).dict)
        push!(absorving, i)
    end
    return absorving
end

function stationary_distribution(M::SparseMatrixCSC{Float32,Int32}, n::Int32=size(M)[1],
    alfa::Float64=0.85, tolerancia::Float64=1e-12, n_iter::Int64=500,
    order::Int32=convert(Int32,size(M)[1]),
    r::Vector{Float64} = zeros(n), last::Vector{Float64} = zeros(n))
    #Start
    r[1] = last[1]+1 # to ensure the first iterationon

    absorving = calculate_absorving(M)
    i = 0
    while i < n_iter && maximum(abs(r - last)) > tolerancia
        i += 1
        last = r

        reabsorption = sum(r[absorving]) * alfa / order
        r = r * M # M * r
        r += ((1 - alfa) / order) + reabsorption
    end
    return r
    # return norm(r,1), r, i
end

function new_readadj(path::String, alfa::Float64=0.85)
    io = open(path,"r")
    header = readline(io)
    n_nodes, n = map(int64,split(header))
    readline(io)
    I, J, V = Int32[], Int32[], Float32[]
    m = Dict{Int32,Int32}()
    for line in EachLine(io)
        i,j = map(int64,split(line))
        get!(m,i,0)
        m[i] += 1
        push!(I,i)
        push!(J,j)
    end

    for k in sort(collect(keys(m)))
        km = m[k]
        for _ in range(1,km)
            push!(V,alfa/km)
        end
    end
    close(io)
    M::SparseMatrixCSC = sparse(I,J,V, n_nodes, n_nodes)
    return M, convert(Int32,n_nodes)
end