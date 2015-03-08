function transform_file(path::String)
    io = open(path,"r")
    path_write = string(path, ".dat")
    
    I = (Int64,Int64)[]
    values = Dict()

    max_n = 0
    
    value = 0
    last = -1

    aument = 0
    
    for line in EachLine(io)
        h = split(line)
        if h == SubString{ASCIIString}[]
            values[last] = 1/value
            value = 0
            last = -1
            break
        end
        i,j = map(int64, h[1:2])
        if i == 0 || j == 0
            aument = 1
        end
        if aument == 1
            i = i+1
            j = j+1
        end

        if i > max_n
            max_n = i
        elseif j > max_n
            max_n = j
        end

        push!(I,(i,j))
        
        value += 1
        if i != last
            values[last] = 1/(value-1)
            value = 1
            last = i
        elseif last == -1
            last = i
        end
        
    end
    close(io)

    sort!(I, by=x -> x[1])
    
    default = 1/max_n
    iow = open(path_write,"w")
    for n in 1:length(I)
        i = I[n][1]
        j = I[n][2]
        v = get(values, i, -1)
        if v > 0 
            line = string(i, " ", j, " ", v)
            println(iow,line)
            #v = default
        end
    end
    close(iow)
end
