import random
import rsa
import os
import json
import string
import time
import codecs
import binascii
from mycrypto import Cryptor
from base64 import b64encode, b64decode
from functools import wraps
from flask import Flask, request, current_app, safe_join, make_response, url_for
from flask.ext.jsonpify import jsonify

import getpass
user = getpass.getuser()

is_raspberry = os.uname()[-1] == 'armv6l'

# set the project root directory as the static folder, you can set others.
app = Flask(__name__, static_url_path='')
host = '0.0.0.0' if is_raspberry else 'localhost'
files_path = '/home/pi/codefiles' if is_raspberry else '.'
domain = 'http://codefiles.neurotiko.com'
# ip = None
global privkey, pubkey
privkey = pubkey = None


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


class BaseRemoteException(Exception):
    def __init__(self, message, status_code, payload=None):
        Exception.__init__(self)
        self.message = message
        self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv['msg'] = self.message
        return rv


class Exception400(BaseRemoteException):
    def __init__(self, message):
        super().__init__(message, 400, {'status': 'error'})


class Exception404(BaseRemoteException):
    def __init__(self, message):
        super().__init__(message, 404, {'status': 'error'})


class Exception410(BaseRemoteException):
    def __init__(self, message):
        super().__init__(message, 410, {'status': 'error'})


@app.errorhandler(BaseRemoteException)
def handl_remote_exception(error):
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response


@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify({'status': 'error', 'msg': 'Not found'}), 404)


def build_path(path, did):
    filep = safe_join(path, '{}.json'.format(did))
    fullpath = safe_join(files_path, filep)
    return filep, fullpath


def valid_path(path, did, full=False):
    filep, fullpath = build_path(path, did)
    errorstr = "%s don't exist." % safe_join(path, did)
    if not os.path.exists(fullpath):
        raise Exception404(errorstr)
    content = ''
    try:
        with codecs.open(fullpath, 'r', 'utf-8-sig') as f:
            content = json.loads(f.read())
        if not content.get('forever') and\
           (time.time() - (content.get('time') or 0) > 86400):  # More than one day old
            raise Exception410(errorstr)
        if full:
            return content
        return minimize_content(content)
    except BaseRemoteException as e:
        raise e
    except:
        raise Exception404(errorstr)


def minimize_content(content):
    fields = ('code', 'lang', 'theme')
    return {x: content.get(x) for x in fields if x in content}


def extract_request(request):
    petition_params = {}
    jsond = request.get_json(force=True, silent=True)
    if jsond is not None:
        petition_params = jsond
    elif len(request.form) > 0:
        petition_params = request.form
    else:
        raise Exception400('No params supplied')
    return petition_params


def id_generator(size=8, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for _ in range(size))


def handle_encryption(request, message, cypherkey=None, plainkey=None):
    def encryptWithKey(key, message):
        iv, encrypted = Cryptor.encrypt(message, key)
        return iv, binascii.b2a_base64(encrypted).rstrip().decode('utf8')
    cypherkey = request.args.get('cypherkey', False) if cypherkey is None else cypherkey
    plainkey = request.args.get('plainkey', False) if plainkey is None else plainkey
    key = None
    if cypherkey:
        global privkey
        key = rsa.decrypt(binascii.unhexlify(cypherkey), privkey).decode('utf8')
    elif plainkey:
        key = plainkey
    if key is not None and len(key) == 64:
        iv, encrypted = encryptWithKey(key, message)
        result = {'encrypted': True, 'algorithm': 'AES', 'iv': iv.decode('utf8'), 'msg': encrypted}
        return result
    return message


def jsonp(func):
    """Wraps JSONified output for JSONP requests."""
    @wraps(func)
    def decorated_function(*args, **kwargs):
        callback = request.args.get('callback', False)
        if callback:
            try:
                content = str(callback) + '(' + func(*args, **kwargs) + ')'
            except Exception as e:
                content = str(callback) + '(' + json.dumps({'status': 'error', 'msg': '%s' % e}) + ')'
            mimetype = 'application/javascript'
            return current_app.response_class(content, mimetype=mimetype)
        else:
            try:
                content = func(*args, **kwargs)
            except Exception as e:
                content = json.dumps({'status': 'error', 'msg': '%s' % e})
            mimetype = 'application/json'
            return current_app.response_class(content, mimetype=mimetype)
    return decorated_function


# AUTH
def put_codefile(content, path, petition_params):
    code = petition_params.get('code')
    lang = petition_params.get('lang')
    theme = petition_params.get('theme')
    allp = (code, lang, theme)
    if not any(map(lambda x: x is not None, allp)):
        raise Exception400("You have to specify at least one valid field")
    for n, v in filter(lambda x: x[1] is not None, zip(('code', 'lang', 'theme'), allp)):
        content[n] = v
    content['time'] = time.time()  # Update the time
    with open(path, 'w') as f:
        f.write(json.dumps(content))
    return {'status': 'ok', 'result': True, 'content': minimize_content(content)}


def generate_uri(path, did):
    return url_for('get_codefile', path='tmp', did='TESTDID', _external=True)


@app.route('/getsshpub', methods=['GET'])
def get_sshpub():
    try:
        if pubkey is not None:
            n = '%x' % pubkey.n
            e = '%x' % pubkey.e
            return jsonify({'status': 'ok', 'n': n, 'e': e, 'result': True})
        else:
            return jsonify({'status': 'error'})
    except:
        return jsonify({'status': 'error'})


@app.route('/<path:path>/<string:did>', methods=['GET'])
def get_codefile(path, did):
    content = valid_path(path, did)
    return jsonify(handle_encryption(request, content))


@app.route('/<path:path>/<string:did>', methods=['PUT'])
def put_req_codefile(path, did):
    _, fpath = build_path(path, did)
    content = valid_path(path, did, full=True)
    petition_params = extract_request(request)
    return jsonify(put_codefile(content, fpath, petition_params))


@app.route('/<path:path>/<string:did>', methods=['DELETE'])
def del_req_codefile(path, did):
    _, fpath = build_path(path, did)
    fname = safe_join(path, did)
    try:
        os.remove(path)
        return jsonify({'status': 'ok', 'result': True})
    except IOError:
        raise Exception404("I can't remove %s" % fname)
    except:
        raise Exception400("An error happened")


@app.route('/', methods=['POST'])
def post_codefile():
    relat_path = 'tmp'
    petition_params = extract_request(request)
    code = petition_params.get('code')
    if not code:
        raise Exception400('No code parameter supplied')
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
    uri = generate_uri(relat_path, did)
    resp = {'status': 'ok',
            'result': True,
            'msg': '',
            'id': did,
            'uri': uri,
            'content': minimize_content(newf)}
    return jsonify(resp), 201
    # Some AUTH?


load_rsa_keys()
if __name__ == "__main__":
    app.run(host=host, debug=True)
