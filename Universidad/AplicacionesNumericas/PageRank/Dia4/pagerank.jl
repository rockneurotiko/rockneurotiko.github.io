using Compose, Gadfly

function spy_draw(sp::SparseMatrixCSC)
    draw(SVG("spy.svg", 5inch, 5inch), spy(sp))
end

function spconvert(path::String)
    io = open(path,"r")

    max = 0
    I,J,V = Int64[], Int64[], Float64[]
    ## l = readline(io)
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
    M::SparseMatrixCSC = sparse(I,J,V)
    ## M::SparseMatrixCSC = sparse(I,J,V,max,max)
    return M
end


l = spconvert("stanford-web.dat")
spy_draw(l)
#spy_draw(sprand(100,100,0.2))
