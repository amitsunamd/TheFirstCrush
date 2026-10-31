"""Optional starter API for The First Crush. Demo frontend works without this server."""
import os, sqlite3, secrets, hashlib, hmac
from datetime import datetime, timezone
from functools import wraps
from flask import Flask, request, jsonify, g
from flask_cors import CORS

BASE_DIR=os.path.dirname(os.path.abspath(__file__))
DB_PATH=os.environ.get('TFC_DB',os.path.join(BASE_DIR,'the_first_crush.db'))
app=Flask(__name__)
app.config['SECRET_KEY']=os.environ.get('TFC_SECRET_KEY','dev-only-change-me')
CORS(app, resources={r'/api/*': {'origins': os.environ.get('TFC_ALLOWED_ORIGINS','*').split(',')}})

def db():
    if 'db' not in g:
        g.db=sqlite3.connect(DB_PATH);g.db.row_factory=sqlite3.Row
    return g.db
@app.teardown_appcontext
def close_db(exc):
    conn=g.pop('db',None)
    if conn: conn.close()
def init_db():
    with app.app_context():
        d=db();d.executescript('''
        CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS posts(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), text TEXT NOT NULL CHECK(length(text)<=280), category TEXT NOT NULL, language TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, hidden INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY, post_id INTEGER NOT NULL REFERENCES posts(id), reporter_id INTEGER REFERENCES users(id), reason TEXT NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS favorites(user_id INTEGER NOT NULL REFERENCES users(id), post_id INTEGER NOT NULL REFERENCES posts(id), created_at TEXT NOT NULL, PRIMARY KEY(user_id,post_id));
        CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), expires_at TEXT NOT NULL);
        ''');d.commit()
def now():return datetime.now(timezone.utc).isoformat()
def response_error(message,status=400):return jsonify({'error':message}),status
def current_user():
    token=request.headers.get('Authorization','').removeprefix('Bearer ').strip()
    if not token:return None
    row=db().execute('SELECT users.id,users.username,users.email FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?',(hashlib.sha256(token.encode()).hexdigest(),now())).fetchone()
    return dict(row) if row else None
def login_required(fn):
    @wraps(fn)
    def wrapper(*a,**kw):
        user=current_user()
        if not user:return response_error('Sign in required',401)
        g.user=user
        return fn(*a,**kw)
    return wrapper
@app.get('/api/health')
def health():return jsonify({'ok':True,'app':'The First Crush API'})
@app.post('/api/register')
def register():
    data=request.get_json(silent=True) or {};username=str(data.get('username','')).strip();email=str(data.get('email','')).strip().lower();password=str(data.get('password',''))
    if len(username)<2 or len(username)>32:return response_error('Username must be 2–32 characters')
    if '@' not in email or len(email)>254:return response_error('Enter a valid email')
    if len(password)<8:return response_error('Password must be at least 8 characters')
    salt=secrets.token_bytes(16);hashed=salt+hashlib.pbkdf2_hmac('sha256',password.encode(),salt,240000)
    try:
        d=db();d.execute('INSERT INTO users(username,email,password_hash,created_at) VALUES(?,?,?,?)',(username,email,hashed.hex(),now()));d.commit()
    except sqlite3.IntegrityError:return response_error('Username or email is already registered',409)
    return jsonify({'ok':True,'message':'Account created. Please sign in.'}),201
@app.post('/api/login')
def login():
    data=request.get_json(silent=True) or {};identity=str(data.get('identity','')).strip().lower();password=str(data.get('password',''))
    user=db().execute('SELECT * FROM users WHERE lower(username)=? OR email=?',(identity,identity)).fetchone()
    if not user:return response_error('Invalid login details',401)
    try:raw=bytes.fromhex(user['password_hash']);salt,expected=raw[:16],raw[16:]
    except ValueError:return response_error('Account password record is invalid',500)
    actual=hashlib.pbkdf2_hmac('sha256',password.encode(),salt,240000)
    if not hmac.compare_digest(actual,expected):return response_error('Invalid login details',401)
    token=secrets.token_urlsafe(36);expiry=(datetime.now(timezone.utc).replace(microsecond=0)).timestamp()+60*60*24*14
    expires=datetime.fromtimestamp(expiry,timezone.utc).isoformat();db().execute('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),user['id'],expires));db().commit()
    return jsonify({'token':token,'user':{'id':user['id'],'username':user['username'],'email':user['email']}})
@app.post('/api/logout')
@login_required
def logout():
    token=request.headers.get('Authorization','').removeprefix('Bearer ').strip();db().execute('DELETE FROM sessions WHERE token_hash=?',(hashlib.sha256(token.encode()).hexdigest(),));db().commit();return jsonify({'ok':True})
@app.get('/api/posts')
def list_posts():
    rows=db().execute('SELECT posts.id,posts.text,posts.category,posts.language,posts.created_at,users.username AS author FROM posts JOIN users ON users.id=posts.user_id WHERE posts.hidden=0 ORDER BY posts.id DESC LIMIT 100').fetchall();return jsonify([dict(r) for r in rows])
@app.post('/api/posts')
@login_required
def create_post():
    data=request.get_json(silent=True) or {};text=str(data.get('text','')).strip();category=str(data.get('category','Cute')).strip();language=str(data.get('language','English')).strip()
    if not text or len(text)>280:return response_error('Post must contain 1–280 characters')
    if category not in {'Romantic','Flirty','Funny','Sad','Cute','Nepali','Hindi','English'}:return response_error('Unknown category')
    if language not in {'English','Nepali','Hindi'}:return response_error('Unknown language')
    stamp=now();cur=db().execute('INSERT INTO posts(user_id,text,category,language,created_at,updated_at) VALUES(?,?,?,?,?,?)',(g.user['id'],text,category,language,stamp,stamp));db().commit();return jsonify({'id':cur.lastrowid,'text':text,'category':category,'language':language,'author':g.user['username'],'created_at':stamp}),201
@app.patch('/api/posts/<int:post_id>')
@login_required
def edit_post(post_id):
    data=request.get_json(silent=True) or {};text=str(data.get('text','')).strip()
    if not text or len(text)>280:return response_error('Post must contain 1–280 characters')
    cur=db().execute('UPDATE posts SET text=?,updated_at=? WHERE id=? AND user_id=? AND hidden=0',(text,now(),post_id,g.user['id']));db().commit()
    if not cur.rowcount:return response_error('Post not found or not yours',404)
    return jsonify({'ok':True})
@app.delete('/api/posts/<int:post_id>')
@login_required
def delete_post(post_id):
    cur=db().execute('DELETE FROM posts WHERE id=? AND user_id=?',(post_id,g.user['id']));db().commit()
    if not cur.rowcount:return response_error('Post not found or not yours',404)
    return jsonify({'ok':True})
@app.post('/api/posts/<int:post_id>/report')
@login_required
def report_post(post_id):
    if not db().execute('SELECT id FROM posts WHERE id=? AND hidden=0',(post_id,)).fetchone():return response_error('Post not found',404)
    data=request.get_json(silent=True) or {};reason=str(data.get('reason','Inappropriate content')).strip()[:300] or 'Inappropriate content';db().execute('INSERT INTO reports(post_id,reporter_id,reason,created_at) VALUES(?,?,?,?)',(post_id,g.user['id'],reason,now()));db().commit();return jsonify({'ok':True}),201
@app.get('/api/favorites')
@login_required
def get_favorites():
    rows=db().execute('SELECT posts.id,posts.text,posts.category,posts.language,users.username AS author FROM favorites JOIN posts ON posts.id=favorites.post_id JOIN users ON users.id=posts.user_id WHERE favorites.user_id=? AND posts.hidden=0 ORDER BY favorites.created_at DESC',(g.user['id'],)).fetchall();return jsonify([dict(r) for r in rows])
@app.post('/api/favorites/<int:post_id>')
@login_required
def toggle_favorite(post_id):
    d=db()
    if not d.execute('SELECT id FROM posts WHERE id=? AND hidden=0',(post_id,)).fetchone():return response_error('Post not found',404)
    existing=d.execute('SELECT 1 FROM favorites WHERE user_id=? AND post_id=?',(g.user['id'],post_id)).fetchone()
    if existing:d.execute('DELETE FROM favorites WHERE user_id=? AND post_id=?',(g.user['id'],post_id));saved=False
    else:d.execute('INSERT INTO favorites(user_id,post_id,created_at) VALUES(?,?,?)',(g.user['id'],post_id,now()));saved=True
    d.commit();return jsonify({'saved':saved})
if __name__=='__main__':
    init_db();app.run(host='127.0.0.1',port=int(os.environ.get('PORT','5000')),debug=False)
