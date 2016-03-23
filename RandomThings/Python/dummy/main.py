from __future__ import print_function
from flask import Flask, request


app = Flask(__name__, static_url_path='')


@app.route('/', defaults={'path': ''}, methods=["GET", "POST"])
@app.route('/<path:path>', methods=["GET", "POST"])
def test(*args, **kargs):
    print(args)
    print(kargs)
    print(request.headers)
    print(request.json)
    print(request.form)
    return "", 200


app.run(host="localhost", port=9999)
