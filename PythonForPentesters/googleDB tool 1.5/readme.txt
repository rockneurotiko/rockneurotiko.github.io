SecPoint.com Google Penetration Testing Hack Database v 1.5

Database of Google Hacks and a tool for manipulating it. 
Database is separated to files by categories. You could use DB alone, or 
make some manipulations using our tool like generating URLs for Google 
search engine or generating pretty HTML output with links. The tool 
could also help in analysing your own site by adding site search option
to all queries. 

This tool will take source file (file with a list of queries) and generate 
website-specific queries (-s option) by adding site:sitename.com to each
query. Not only queries, but full Google URLs could be generated for each
query (-q). Output could be saved to file in text format (-o) or in HTML with
links format (-t) which will automatically create URLs list.

run as
./googleDB-tool.py <source file> <options>

   <source file>        queries source file from GoogleDB (files in db directory)

Options are:
    -o output.txt       save output to file
    -s sitename.com     generate queries for this site only
    -q                  generate google query urls for each line
    -t                  generate output in HTML format (implies -q)
    -m LISTFILE		generate queries for multiple sites listed in LISTFILE


Command line examples:
    1-generate list of search strings for finding login pages
    ./googleDB-tool.py "login_pages.txt"  

    2-generate list of Google queries for finding login pages
    ./googleDB-tool.py "login_pages.txt" -q

    3-same as 2, but in HTML format
    ./googleDB-tool.py "login_pages.txt" -q -t

    4-same as 3, but save to "OUT.html"
    ./googleDB-tool.py "login_pages.txt" -q -t -o "OUT.html"

    5-generate queries as in 4, but only for site.com
    ./googleDB-tool.py "login_pages.txt" -q -t -o "OUT.html" -s site.com

    6-all of the above, for multiple sites from "sites.txt" list
    ./googleDB-tool.py "login_pages.txt" -q -t -o OUT.html -s site.com -m sites.txt



History: 
# ## 1.0 initial release
# ## 1.1 google query generating option (-q)
# ## 1.2 generating HTML output (-t)
# ## 1.3 added support for multiple sites generation (-m option), database update - 7824 records
# ## 1.5 friendly output and examples, database update