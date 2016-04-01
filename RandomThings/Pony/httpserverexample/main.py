import http.server
import socketserver

class SimpleHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type','text/html')
        self.end_headers()
        self.wfile.write(bytes(self.path, 'utf8'))
        return


httpd = socketserver.TCPServer(("", 9711), SimpleHandler)
print("serving at port", 9711)
httpd.serve_forever()