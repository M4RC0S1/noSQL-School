/* Motor de execução: emula um subconjunto do mongosh sobre os datasets,
 * usando "mingo" para filtros, projeção, sort e aggregate.
 * Expõe window.Engine = { run, evaluate, checkFill, display, clone, canon }.
 */
(function (global) {
  'use strict';
  const { Query, Aggregator } = global.mingo;

  const clone = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
  const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

  /* ---------- caminhos com ponto ---------- */
  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  }
  function setPath(obj, path, val) {
    const parts = path.split('.');
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (o[parts[i]] == null || typeof o[parts[i]] !== 'object') o[parts[i]] = {};
      o = o[parts[i]];
    }
    o[parts[parts.length - 1]] = val;
  }
  function unsetPath(obj, path) {
    const parts = path.split('.');
    let o = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      o = o == null ? undefined : o[parts[i]];
      if (o == null || typeof o !== 'object') return;
    }
    delete o[parts[parts.length - 1]];
  }

  /* ---------- forma canônica (comparação independente da ordem das chaves) ---------- */
  function canon(v) {
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (v instanceof RegExp) return 'R' + v.toString();
    if (v && typeof v === 'object') {
      return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
    }
    if (typeof v === 'number') return String(Math.round(v * 1e6) / 1e6);
    return JSON.stringify(v);
  }

  /* ---------- operadores de atualização ---------- */
  function matchesCond(el, cond) {
    if (isObj(cond)) {
      const hasOps = Object.keys(cond).some((k) => k[0] === '$');
      if (isObj(el)) return new Query(cond).test(el);
      if (hasOps) return new Query({ v: cond }).test({ v: el });
    }
    return canon(el) === canon(cond);
  }

  function applyUpdate(doc, upd) {
    const ops = Object.keys(upd);
    if (!ops.length || !ops.every((k) => k[0] === '$')) {
      throw new Error('O documento de atualização precisa usar operadores, como $set, $inc ou $unset.');
    }
    const before = canon(doc);
    for (const op of ops) {
      const spec = upd[op];
      for (const path of Object.keys(spec)) {
        const val = spec[path];
        const cur = getPath(doc, path);
        switch (op) {
          case '$set': setPath(doc, path, clone(val)); break;
          case '$unset': unsetPath(doc, path); break;
          case '$inc':
            if (cur !== undefined && typeof cur !== 'number') throw new Error(`$inc só funciona em números ("${path}" não é número).`);
            setPath(doc, path, (cur || 0) + val); break;
          case '$mul':
            setPath(doc, path, (cur || 0) * val); break;
          case '$min': if (cur === undefined || val < cur) setPath(doc, path, val); break;
          case '$max': if (cur === undefined || val > cur) setPath(doc, path, val); break;
          case '$rename':
            if (cur !== undefined) { setPath(doc, val, cur); unsetPath(doc, path); } break;
          case '$push':
          case '$addToSet': {
            let arr = cur;
            if (arr === undefined) { arr = []; setPath(doc, path, arr); }
            if (!Array.isArray(arr)) throw new Error(`${op} exige que "${path}" seja um array.`);
            const items = isObj(val) && '$each' in val ? val.$each : [val];
            for (const it of items) {
              if (op === '$push' || !arr.some((x) => canon(x) === canon(it))) arr.push(clone(it));
            }
            break;
          }
          case '$pull':
            if (Array.isArray(cur)) setPath(doc, path, cur.filter((el) => !matchesCond(el, val)));
            break;
          case '$pop':
            if (Array.isArray(cur)) { val === -1 ? cur.shift() : cur.pop(); }
            break;
          default:
            throw new Error(`Operador de atualização não suportado pelo simulador: ${op}`);
        }
      }
    }
    return canon(doc) !== before;
  }

  /* ---------- cursores ---------- */
  class Cursor {
    constructor(docs, filter, proj) {
      this._docs = docs; this._filter = filter || {}; this._proj = proj;
      this._sort = null; this._skip = 0; this._limit = 0;
    }
    sort(s) { this._sort = s; return this; }
    skip(n) { this._skip = n; return this; }
    limit(n) { this._limit = n; return this; }
    pretty() { return this; }
    _compute() {
      let r = new Query(this._filter).find(this._docs).all();
      if (this._sort) r = new Aggregator([{ $sort: this._sort }]).run(r);
      if (this._skip) r = r.slice(this._skip);
      if (this._limit) r = r.slice(0, this._limit);
      if (this._proj && Object.keys(this._proj).length) r = new Query({}).find(r, this._proj).all();
      return r;
    }
    toArray() { return this._compute(); }
    forEach(fn) { this._compute().forEach(fn); }
    map(fn) { return this._compute().map(fn); }
    count() { return this._compute().length; }
    itcount() { return this._compute().length; }
  }
  class ArrCursor extends Cursor {
    constructor(arr) { super([], {}); this._arr = arr; }
    _compute() { return this._arr; }
  }

  /* ---------- coleção ---------- */
  class Collection {
    constructor(name, rt) { this.name = name; this.rt = rt; }
    get docs() { return this.rt.data[this.name]; }
    _read(v) { this.rt.last = v; return v; }
    _write(v) { this.rt.wrote = true; this.rt.last = v; return v; }
    _test(filter) { const q = new Query(filter || {}); return (d) => q.test(d); }

    find(filter, proj) { return this._read(new Cursor(this.docs, filter, proj)); }
    findOne(filter, proj) {
      const r = new Cursor(this.docs, filter, proj).limit(1).toArray();
      return this._read(r.length ? r[0] : null);
    }
    countDocuments(filter) { return this._read(new Query(filter || {}).find(this.docs).all().length); }
    estimatedDocumentCount() { return this._read(this.docs.length); }
    distinct(field, filter) {
      const seen = new Map();
      for (const d of new Query(filter || {}).find(this.docs).all()) {
        const v = getPath(d, field);
        (Array.isArray(v) ? v : [v]).forEach((x) => { if (x !== undefined) seen.set(canon(x), x); });
      }
      return this._read([...seen.values()]);
    }
    aggregate(pipeline) {
      if (!Array.isArray(pipeline)) throw new Error('aggregate() espera um array de estágios.');
      const rt = this.rt;
      const agg = new Aggregator(pipeline, {
        collectionResolver: (n) => {
          if (!rt.data[n]) throw new Error(`A coleção "${n}" não existe neste dataset.`);
          return rt.data[n];
        }
      });
      return this._read(new ArrCursor(agg.run(this.docs)));
    }

    _prepare(doc) {
      if (!isObj(doc)) throw new Error('O documento a inserir deve ser um objeto.');
      const d = clone(doc);
      if (d._id === undefined) d._id = this.rt.autoId();
      if (this.docs.some((x) => canon(x._id) === canon(d._id))) {
        throw new Error(`E11000 chave duplicada: já existe um documento com _id ${JSON.stringify(d._id)}.`);
      }
      return d;
    }
    insertOne(doc) {
      const d = this._prepare(doc);
      this.docs.push(d);
      return this._write({ acknowledged: true, insertedId: d._id });
    }
    insertMany(arr) {
      if (!Array.isArray(arr)) throw new Error('insertMany() espera um array de documentos.');
      const ids = arr.map((doc) => { const d = this._prepare(doc); this.docs.push(d); return d._id; });
      return this._write({ acknowledged: true, insertedIds: ids });
    }
    _update(filter, upd, opts, many) {
      const test = this._test(filter);
      let matched = 0, modified = 0;
      for (const d of this.docs) {
        if (!test(d)) continue;
        matched++;
        if (applyUpdate(d, upd)) modified++;
        if (!many) break;
      }
      const res = { acknowledged: true, matchedCount: matched, modifiedCount: modified };
      if (!matched && opts && opts.upsert) {
        const base = {};
        Object.keys(filter || {}).forEach((k) => { if (k[0] !== '$' && !isObj(filter[k])) base[k] = filter[k]; });
        applyUpdate(base, upd);
        const d = this._prepare(base);
        this.docs.push(d);
        res.upsertedId = d._id;
      }
      return this._write(res);
    }
    updateOne(f, u, o) { return this._update(f, u, o, false); }
    updateMany(f, u, o) { return this._update(f, u, o, true); }
    _delete(filter, many) {
      const test = this._test(filter);
      let n = 0;
      for (let i = 0; i < this.docs.length; i++) {
        if (test(this.docs[i])) { this.docs.splice(i, 1); i--; n++; if (!many) break; }
      }
      return this._write({ acknowledged: true, deletedCount: n });
    }
    deleteOne(f) { return this._delete(f, false); }
    deleteMany(f) { return this._delete(f, true); }

    createIndex() { throw unsupported('createIndex'); }
    explain() { throw unsupported('explain'); }
  }

  const unsupported = (n) => new Error(
    `"${n}" não é executado pelo simulador (mingo não tem índices nem esquema). Essa etapa é por texto/múltipla escolha.`);

  /* ---------- db ---------- */
  function makeDb(rt) {
    const cache = {};
    const coll = (name) => {
      if (!rt.data[name]) {
        throw new Error(`A coleção "${name}" não existe neste dataset (disponíveis: ${Object.keys(rt.data).join(', ')}).`);
      }
      return cache[name] || (cache[name] = new Collection(name, rt));
    };
    const blocked = ['createCollection', 'runCommand', 'dropDatabase', 'createView'];
    return new Proxy({}, {
      get(_, name) {
        if (typeof name !== 'string') return undefined;
        if (name === 'getCollection') return coll;
        if (name === 'getCollectionNames') return () => Object.keys(rt.data);
        if (blocked.includes(name)) return () => { throw unsupported('db.' + name); };
        return coll(name);
      }
    });
  }

  /* ---------- execução ---------- */
  function run(code, datasets) {
    const rt = {
      data: clone(datasets || global.DATASETS), last: undefined, wrote: false, seq: 0,
      autoId() { return '64f0' + (++this.seq).toString(16).padStart(20, '0'); }
    };
    let error = null, result = null;
    try {
      const fn = new Function('db', 'ObjectId', 'ISODate', 'print', '"use strict";\n' + code);
      fn(makeDb(rt), (s) => (s == null ? rt.autoId() : String(s)), (s) => (s ? new Date(s).toISOString() : new Date().toISOString()), () => {});
      if (rt.last === undefined) error = 'Nenhuma operação do db foi executada. Comece com db.nomeDaColecao...';
      else result = clone(rt.last instanceof Cursor ? rt.last.toArray() : rt.last);
    } catch (e) {
      error = (e instanceof SyntaxError ? 'Erro de sintaxe: ' : '') + (e && e.message ? e.message : String(e));
    }
    return { error, result: result === undefined ? null : result, state: rt.data, wrote: rt.wrote };
  }

  /* Representação exibida nos painéis de resultado. */
  function display(r, ex) {
    if (r.error) return 'Erro: ' + r.error;
    let v = r.result;
    if (r.wrote) {
      const col = (ex && ex.collection) || 'canteiros';
      v = { retorno: r.result };
      v['colecao_' + col] = r.state[col];
    }
    return JSON.stringify(v, null, 2);
  }

  /* ---------- correção de queries ---------- */
  function evaluate(ex, code) {
    const user = run(code), expected = run(ex.solution);
    const out = { user, expected, ok: false, message: '' };
    if (user.error) { out.message = user.error; return out; }

    const missing = (ex.requires || []).filter((r) => !code.includes(r));
    if (missing.length) { out.message = `Use ${missing.join(' e ')} na sua resposta.`; return out; }

    if (expected.wrote) {
      const bad = Object.keys(expected.state).filter((k) => canon(user.state[k]) !== canon(expected.state[k]));
      if (!bad.length) { out.ok = true; return out; }
      out.message = 'O estado final dos dados não é o esperado — ' + bad.map(
        (k) => `${k}: ${user.state[k].length} docs (esperado ${expected.state[k].length})`).join('; ') + '.';
      return out;
    }
    if (user.wrote) { out.message = 'Esta atividade pede só uma consulta; sua query alterou dados.'; return out; }

    const u = user.result, e = expected.result;
    if (Array.isArray(u) && Array.isArray(e)) {
      if (u.length !== e.length) { out.message = `Seu resultado tem ${u.length} documento(s); o esperado tem ${e.length}.`; return out; }
      const cu = u.map(canon), ce = e.map(canon);
      if (cu.join('|') === ce.join('|')) { out.ok = true; return out; }
      const same = cu.slice().sort().join('|') === ce.slice().sort().join('|');
      if (same && !ex.ordered) { out.ok = true; return out; }
      out.message = same ? 'Os documentos estão certos, mas a ordem é diferente da esperada.'
                         : 'Mesmo número de documentos, mas o conteúdo (campos/valores) é diferente do esperado.';
      return out;
    }
    out.ok = canon(u) === canon(e);
    if (!out.ok) out.message = 'O resultado é diferente do esperado.';
    return out;
  }

  /* ---------- correção de "complete o comando" ---------- */
  const norm = (s) => String(s).trim().replace(/^["'`]|["'`]$/g, '').replace(/\s+/g, '').toLowerCase();
  function checkFill(ex, values) {
    const flags = ex.blanks.map((acc, i) => acc.some((a) => norm(a) === norm(values[i] || '')));
    return { ok: flags.every(Boolean), flags };
  }

  global.Engine = { run, evaluate, checkFill, display, clone, canon };
})(window);
