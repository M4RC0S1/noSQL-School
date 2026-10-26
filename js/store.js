/* Progresso do aluno no localStorage. Expõe window.Store. */
(function (g) {
  'use strict';
  const KEY = 'nosqlschool.v1';
  const fresh = () => ({ theme: null, ex: {}, lessons: {}, wrong: {}, days: {}, sims: [] });

  let S;
  try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = fresh(); }

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* modo privado */ } };
  const dayKey = (d) => (d || new Date()).toLocaleDateString('sv-SE');

  const Store = {
    get state() { return S; },
    save,

    /* registro de um exercício (criado sob demanda) */
    ex(key) { return S.ex[key] || (S.ex[key] = { attempts: 0, ok: false, hints: 0, solution: false, code: null }); },
    markWrong(id, order) { S.wrong[id] = order; save(); },
    clearWrong(id) { delete S.wrong[id]; save(); },
    setLessonRead(id, v) { S.lessons[id] = !!v; save(); },

    /* tempo de estudo (segundos) */
    addSeconds(n) { const k = dayKey(); S.days[k] = (S.days[k] || 0) + n; },
    todaySeconds() { return S.days[dayKey()] || 0; },
    streak() {
      const d = new Date();
      if (!((S.days[dayKey(d)] || 0) >= 60)) d.setDate(d.getDate() - 1);
      let n = 0;
      while ((S.days[dayKey(d)] || 0) >= 60) { n++; d.setDate(d.getDate() - 1); }
      return n;
    },

    addSim(entry) { S.sims.push(entry); save(); },
    bestSim() { return S.sims.reduce((m, s) => Math.max(m, s.correct / s.total), 0); },

    setTheme(t) { S.theme = t; save(); },
    reset() { S = fresh(); save(); }
  };
  g.Store = Store;
})(window);
