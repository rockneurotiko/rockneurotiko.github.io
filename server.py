import random
import rsa
import os
import json
import string
import time
import codecs
# import requests
import binascii
from mycrypto import Cryptor
from base64 import b64encode, b64decode
from functools import wraps
from flask import Flask, request, current_app, safe_join, jsonify

is_raspberry = os.uname()[-1] == 'armv6l'

# set the project root directory as the static folder, you can set others.
app = Flask(__name__, static_url_path='')
host = '0.0.0.0' if is_raspberry else 'localhost'
files_path = '/home/pi/codefiles' if is_raspberry else '.'
domain = 'http://codefiles.neurotiko.com'
# ip = None
global privkey, pubkey
privkey = pubkey = remotepub = None


def load_rsa_keys():
    try:
        privatepath = safe_join(files_path, 'ssh_keys/private2.pem')
        with open(privatepath, 'rb') as f:
            content = f.read()
        _privkey = rsa.PrivateKey.load_pkcs1(content)
        pubpath = safe_join(files_path, 'ssh_keys/pubkey2')
        with open(pubpath, 'rb') as f:
            content = f.read()
        _pubkey = rsa.PublicKey.load_pkcs1(content)
        # with open('ssh_keys/pubkey_remote.pem', 'r') as f:
        #     content = f.read()
        global privkey, pubkey
        (privkey, pubkey) = (_privkey, _pubkey)
    except Exception as e:
        print(e)
        return


# def get_ip():
#     global ip  # Check every 24 hours
#     if ip is not None:
#         return ip
#     r = requests.get("http://ipecho.net/plain")
#     if r.ok:
#         ip = r.text
#         return r.text
#     return None


def build_path(path, did):
    filep = safe_join(path, '{}.json'.format(did))
    fullpath = safe_join(files_path, filep)
    return filep, fullpath


def valid_path(path, did, full=False):
    fields = ('code', 'lang', 'theme')
    filep, fullpath = build_path(path, did)
    errormsg = {"status": "error", "msg": "%s don't exist" % safe_join(path, did)}
    if not os.path.exists(fullpath):
        return False, errormsg
    content = ''
    try:
        with codecs.open(fullpath, 'r', 'utf-8-sig') as f:
            content = json.loads(f.read())
        if not content.get('forever') and\
           (time.time() - (content.get('time') or 0) > 86400):  # More than one day old
            return False, errormsg
        if full:
            return True, content
        newcontent = {x: content.get(x) for x in fields}
        return True, newcontent
    except:
        return False, errormsg


def extract_request(request):
    petition_params = {}
    if request.json is not None:
        petition_params = request.json
    elif len(request.form) > 0:
        petition_params = request.form
    else:
        return False, {'status': 'error', 'msg': 'No params supplied'}
    return True, petition_params


def id_generator(size=8, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for _ in range(size))


def jsonp(func):
    """Wraps JSONified output for JSONP requests."""
    @wraps(func)
    def decorated_function(*args, **kwargs):
        callback = request.args.get('callback', False)
        if callback:
            content = str(callback) + '(' + func(*args, **kwargs) + ')'
            mimetype = 'application/javascript'
            return current_app.response_class(content, mimetype=mimetype)
        else:
            content = func(*args, **kwargs)
            mimetype = 'application/json'
            return current_app.response_class(content, mimetype=mimetype)
    return decorated_function


def put_codefile(content, path, form):
    code = request.form.get('code')
    lang = request.form.get('lang')
    theme = request.form.get('theme')
    allp = (code, lang, theme)
    if not any(map(lambda x: x is not None, allp)):
        return jsonify({'status': 'error', 'msg': 'You have to specify at least one field'})
    for n, v in filter(lambda x: x[1] is not None, zip(('code', 'lang', 'theme'), allp)):
        content[n] = v
    content['time'] = time.time()  # Update the time
    with open(path, 'w') as f:
        f.write(json.dumps(content))
    return json.dumps({'status': 'ok'})


def del_codefile(path):
    try:
        os.remove(path)
        return json.dumps({'status': 'ok'})
    except:
        return json.dumps({"status": "error", "msg": "I can't remove it"})


@app.route('/getsshpub', methods=['GET'])
@jsonp
def get_sshpub():
    try:
        # if remotepub is not None:
        #     return json.dumps({'status': 'ok', 'key': remotepub})
        # elif pubkey is not None:
        #     return json.dumps({'status': 'ok', 'key': pubkey.save_pkcs1().decode('utf8')})
        if pubkey is not None:
            n = '%x' % pubkey.n
            e = '%x' % pubkey.e
            return json.dumps({'status': 'ok', 'n': n, 'e': e})
        else:
            return json.dumps({'status': 'error'})
    except:
        return json.dumps({'status': 'error'})


class IO:
    def __init__(self, msg="", b64=False):
        self.msg = msg if not b64 else b64decode(msg)
        self.outm = b''
        self.b64 = b64

    def read(self, n):
        m = self.msg[:n]
        self.msg = self.msg[n:]
        return m.encode('utf8') if not self.b64 else m

    def write(self, m):
        self.outm = self.outm + m

    def getmsg(self):
        return b64encode(self.outm).decode('utf8')


def handle_encryption(request, message):
    def encryptWithKey(key, message):
        iv, encrypted = Cryptor.encrypt(message, key)
        return iv, binascii.b2a_base64(encrypted).rstrip().decode('utf8')
    plainkey = request.args.get('plainkey', False)
    cypherkey = request.args.get('cypherkey', False)
    key = None
    if cypherkey:
        global privkey
        key = rsa.decrypt(binascii.unhexlify(cypherkey), privkey).decode('utf8')
    elif plainkey:
        key = plainkey
    if key is not None and len(key) == 64:
        iv, encrypted = encryptWithKey(key, message)
        result = {'encrypted': True, 'algorithm': 'AES', 'iv': iv.decode('utf8'), 'msg': encrypted}
        return json.dumps(result)
    return message


@app.route('/<path:path>/<string:did>', methods=['GET'])
@jsonp
def get_codefile(path, did):
    ok, content = valid_path(path, did)
    return handle_encryption(request, json.dumps(content))


@app.route('/<path:path>/<string:did>', methods=['PUT'])
@jsonp
def put_req_codefile(path, did):
    _, fpath = build_path(path, did)
    ok, content = valid_path(path, did, full=True)
    if not ok:
        return json.dumps(content)
    ok, petition_params = extract_request(request)
    if not ok:
        return json.dumps(petition_params)  # This is an error message
    return put_codefile(content, fpath, petition_params)


@app.route('/<path:path>/<string:did>', methods=['DELETE'])
@jsonp
def del_req_codefile(path, did):
    _, fpath = build_path(path, did)
    return del_codefile(fpath)


@app.route('/', methods=['POST'])
@jsonp
def post_codefile():
    relat_path = 'tmp'
    ok, petition_params = extract_request(request)
    if not ok:
        return json.dumps(petition_params)  # This is an error message
    code = petition_params.get('code')
    if not code:
        return json.dumps({'status': 'error', 'msg': 'No code supplied'})
    lang = petition_params.get('lang') or ''
    theme = petition_params.get('theme') or ''
    newf = {"lang": lang,
            "theme": theme,
            "code": code,
            "time": time.time()}
    did = id_generator()
    _, fpath = build_path(relat_path, did)
    with open(fpath, 'w') as f:
        f.write(json.dumps(newf))
    uri = '{}/{}/{}'.format(domain, relat_path, did)
    resp = {'status': 'ok', 'msg': '', 'id': did, 'uri': uri}
    return json.dumps(resp)
    # Some AUTH?


load_rsa_keys()
if __name__ == "__main__":
    app.run(host=host, debug=False)
