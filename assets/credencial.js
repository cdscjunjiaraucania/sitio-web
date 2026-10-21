/* Credencial digital del socio — se arma con los datos reales del sistema del club (Google Sheets + Apps Script).
 * El enlace personal (…/credencial.html#TOKEN) identifica al socio. La última credencial verificada queda guardada
 * en el celular para poder mostrarla sin conexión. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var CFG = window.CDSC_CONFIG || {};
  var API_RESPALDO = 'https://script.google.com/macros/s/AKfycbz-yW-vBhn3dmulxr57b6ATrCYFwamZXlxDA-1Y2QbErhnZTZAF98Hh5_XS-UYQV31fTA/exec';
  var API = /^https:\/\/script\.google(usercontent)?\.com\//.test(CFG.API_URL || '') ? CFG.API_URL : API_RESPALDO;
  var LS_TOKEN = 'cdsc_cred_token', LS_DATA = 'cdsc_cred_data';
  var DIAS_AVISO = 14; // sin verificar hace más de estos días → se avisa al socio

  var W = 1080, STRIP = 84, H = 2340;
  var C = { vOs: '#145a25', v: '#1e7b34', lago: '#1f63c6', rojo: '#b3261e', ink: '#15241a', ink2: '#46544b', ink3: '#6b766f' };
  var cF = $('cFront'), cB = $('cBack');
  var D = null, token = '', foto = null, logo = null, raf = 0, wl = null, hintT = 0, cargando = false;

  /* ───────── almacenamiento (con tolerancia a fallos) ───────── */
  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } }
  function leerJSON(k) { try { return JSON.parse(leer(k) || 'null'); } catch (e) { return null; } }

  /* ───────── utilidades ───────── */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function fmtFecha(s) { if (!s) return '—'; var p = String(s).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : s; }
  function fmtMarca(ts) {
    var n = new Date(ts), p = function (v) { return String(v).padStart(2, '0'); };
    return p(n.getDate()) + '/' + p(n.getMonth() + 1) + '/' + n.getFullYear() + ' ' + p(n.getHours()) + ':' + p(n.getMinutes());
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function T(g, s, x, y, font, color, align, ls) {
    g.font = font; g.fillStyle = color; g.textAlign = align || 'left'; g.textBaseline = 'alphabetic';
    if ('letterSpacing' in g) g.letterSpacing = (ls || 0) + 'px';
    g.fillText(s, x, y);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
  }
  function fitFont(g, s, tpl, start, maxW, min) {
    var z = start;
    for (; z > min; z--) { g.font = tpl.replace('{s}', z); if (g.measureText(s).width <= maxW) break; }
    return tpl.replace('{s}', z);
  }
  function wrap(g, s, maxW) {
    var words = s.split(' '), lines = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ───────── comunicación con el sistema ───────── */
  function jsonp(url) {
    return new Promise(function (ok, ko) {
      var cb = 'cdsc_cb_' + Date.now() + Math.floor(Math.random() * 1000), s = document.createElement('script');
      var t = setTimeout(function () { limpiar(); ko(new Error('red')); }, 12000);
      function limpiar() { clearTimeout(t); try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); }
      window[cb] = function (r) { limpiar(); ok(r); };
      s.onerror = function () { limpiar(); ko(new Error('red')); };
      s.src = url + (url.indexOf('?') < 0 ? '?' : '&') + 'callback=' + cb;
      document.head.appendChild(s);
    });
  }
  /** Devuelve los datos o lanza un error. e.servidor = true cuando el sistema respondió que el enlace no sirve. */
  function pedir(q) {
    var url = API + '?' + q, ctrl = window.AbortController ? new AbortController() : null;
    var reloj = ctrl ? setTimeout(function () { ctrl.abort(); }, 12000) : null;
    return fetch(url, { redirect: 'follow', credentials: 'omit', cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { clearTimeout(reloj); if (!r.ok) throw new Error('http'); return r.json(); })
      .catch(function () { return jsonp(url); })
      .then(function (r) {
        if (!r || typeof r !== 'object') throw new Error('red');
        if (!r.ok) { var e = new Error(r.error || 'No se pudo abrir la credencial.'); e.servidor = true; throw e; }
        return r.data;
      });
  }

  /* ───────── elementos gráficos (diseño de la credencial) ───────── */
  function guilloche(g, x0, y0, w, h, color) {
    g.save(); g.strokeStyle = color; g.lineWidth = 1.2;
    var rows = Math.round(h / 13);
    for (var k = 0; k < rows; k++) {
      g.beginPath();
      for (var x = 0; x <= w; x += 6) {
        var y = y0 + h * (k / (rows - 1)) + Math.sin(x / 90 + k * 0.42) * 20 + Math.sin(x / 29 - k * 0.2) * 5;
        if (x === 0) g.moveTo(x0 + x, y); else g.lineTo(x0 + x, y);
      }
      g.stroke();
    }
    g.restore();
  }
  function microtext(g, y, txt, color) {
    g.save(); g.font = '600 9px Inter, sans-serif'; g.fillStyle = color; g.textBaseline = 'alphabetic';
    var unit = txt + '  ·  ', s = ''; while (g.measureText(s).width < W + 40) s += unit;
    g.fillText(s, -10, y); g.restore();
  }
  function logoMark(g, cx, cy, r) {
    g.save();
    g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = r * 0.18; g.shadowOffsetY = r * 0.05;
    g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fillStyle = '#fff'; g.fill();
    g.shadowColor = 'transparent';
    if (logo) {
      var side = 2 * r, sc = Math.min(side / logo.width, side / logo.height), w = logo.width * sc, h = logo.height * sc;
      g.beginPath(); g.arc(cx, cy, r, 0, 7); g.clip();
      g.drawImage(logo, cx - w / 2, cy - h / 2, w, h);
    }
    g.restore();
  }
  function arcText(g, s, cx, cy, rad, center, top, font, sp) {
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    var chars = Array.from(s), ws = chars.map(function (c) { return g.measureText(c).width; });
    var total = ws.reduce(function (a, b) { return a + b; }, 0) + sp * (chars.length - 1);
    var ang = top ? center - total / (2 * rad) : center + total / (2 * rad);
    chars.forEach(function (ch, i) {
      var w = ws[i], a = top ? ang + w / (2 * rad) : ang - w / (2 * rad);
      g.save(); g.translate(cx + rad * Math.cos(a), cy + rad * Math.sin(a)); g.rotate(top ? a + Math.PI / 2 : a - Math.PI / 2); g.fillText(ch, 0, 0); g.restore();
      ang += (top ? 1 : -1) * (w + sp) / rad;
    });
    return total / (2 * rad);
  }
  function stamp(g, cx, cy, r, rot, seed) {
    var pad = 8, S = Math.ceil(r * 2 + pad * 2), o = document.createElement('canvas'); o.width = o.height = S;
    var k = o.getContext('2d'), c = S / 2, ink = '#1d4fa6';
    k.strokeStyle = ink; k.fillStyle = ink;
    k.lineWidth = r * 0.05; k.beginPath(); k.arc(c, c, r * 0.97, 0, 7); k.stroke();
    k.lineWidth = r * 0.018; k.beginPath(); k.arc(c, c, r * 0.89, 0, 7); k.stroke();
    k.beginPath(); k.arc(c, c, r * 0.58, 0, 7); k.stroke();
    var rad = r * 0.735, t1 = 'CLUB DEPORTIVO, SOCIAL Y CULTURAL', t2 = 'JUNJI ARAUCANÍA';
    var fs = r * 0.118, font, sp;
    for (var i = 0; i < 4; i++) {
      font = '700 ' + fs + 'px Montserrat, sans-serif'; sp = fs * 0.1; k.font = font;
      var w1 = Array.from(t1).reduce(function (a, ch) { return a + k.measureText(ch).width; }, 0) + sp * (t1.length - 1);
      var w2 = Array.from(t2).reduce(function (a, ch) { return a + k.measureText(ch).width; }, 0) + sp * (t2.length - 1);
      var sum = (w1 + w2) / (2 * rad) * 2;
      if (sum > 5.5) fs *= 5.5 / sum; else break;
    }
    font = '700 ' + fs + 'px Montserrat, sans-serif'; sp = fs * 0.1;
    var at = arcText(k, t1, c, c, rad, -Math.PI / 2, true, font, sp);
    var ab = arcText(k, t2, c, c, rad, Math.PI / 2, false, font, sp);
    var gc = (at - ab) / 2;
    [gc, Math.PI - gc].forEach(function (a) { k.beginPath(); k.arc(c + rad * Math.cos(a), c + rad * Math.sin(a), r * 0.034, 0, 7); k.fill(); });
    T(k, 'CDSC', c, c + r * 0.09, '800 ' + (r * 0.26) + 'px Montserrat, sans-serif', ink, 'center', r * 0.01);
    k.lineWidth = r * 0.02; k.beginPath();
    k.moveTo(c - r * 0.30, c - r * 0.20); k.lineTo(c + r * 0.30, c - r * 0.20); k.moveTo(c - r * 0.30, c + r * 0.20); k.lineTo(c + r * 0.30, c + r * 0.20); k.stroke();
    T(k, 'TEMUCO', c, c + r * 0.36, '700 ' + (r * 0.105) + 'px Montserrat, sans-serif', ink, 'center', r * 0.012);
    var rnd = mulberry(seed || 7); k.globalCompositeOperation = 'destination-out';
    for (var j = 0; j < Math.round(r * 3.2); j++) { k.globalAlpha = 0.35 + rnd() * 0.65; k.beginPath(); k.arc(rnd() * S, rnd() * S, 0.3 + rnd() * (r * 0.012 + 0.9), 0, 7); k.fill(); }
    for (var m = 0; m < 5; m++) { k.globalAlpha = 0.25; k.lineWidth = 1 + rnd() * 2; k.beginPath(); var x = rnd() * S, y = rnd() * S; k.moveTo(x, y); k.lineTo(x + (rnd() - .5) * r * 0.5, y + (rnd() - .5) * r * 0.5); k.stroke(); }
    g.save(); g.translate(cx, cy); g.rotate(rot); g.globalAlpha = 0.9; g.globalCompositeOperation = 'multiply'; g.drawImage(o, -S / 2, -S / 2); g.restore();
  }
  function drawPhoto(g, x, y, w, h, r) {
    g.save(); rr(g, x, y, w, h, r); g.clip();
    if (foto) {
      var s = Math.max(w / foto.width, h / foto.height), dw = foto.width * s, dh = foto.height * s;
      g.drawImage(foto, x + (w - dw) / 2, y - (dh - h) * 0.12, dw, dh);
    } else {
      var bg = g.createLinearGradient(0, y, 0, y + h); bg.addColorStop(0, '#e3efe6'); bg.addColorStop(1, '#c7dccd');
      g.fillStyle = bg; g.fillRect(x, y, w, h); g.fillStyle = '#a9c7b1';
      g.beginPath(); g.arc(x + w / 2, y + h * 0.40, w * 0.19, 0, 7); g.fill();
      g.beginPath(); g.ellipse(x + w / 2, y + h * 1.02, w * 0.40, h * 0.30, 0, 0, 7); g.fill();
    }
    g.restore();
  }
  function drawQR(g, text, x, y, size) {
    if (typeof qrcode === 'undefined') return false;
    try {
      var qr = qrcode(0, 'M'); qr.addData(text); qr.make();
      var n = qr.getModuleCount(), cell = Math.floor(size / n), off = Math.floor((size - cell * n) / 2);
      g.fillStyle = C.ink;
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect(x + off + c * cell, y + off + r * cell, cell, cell);
      return true;
    } catch (e) { return false; }
  }
  function header(g, hgt, amp, color) {
    var hg = g.createLinearGradient(0, 0, W, 0);
    if (color) { hg.addColorStop(0, color); hg.addColorStop(1, color); } else { hg.addColorStop(0, C.vOs); hg.addColorStop(0.55, C.v); hg.addColorStop(1, C.lago); }
    g.fillStyle = hg; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0);
    for (var x = W; x >= 0; x -= 8) g.lineTo(x, hgt + Math.sin(x / 62) * amp);
    g.closePath(); g.fill();
    g.save(); g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 14;
    for (var i = -hgt; i < W; i += 34) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + hgt, hgt); g.stroke(); }
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.beginPath();
    for (var x2 = 0; x2 <= W; x2 += 8) { var y = hgt - 16 + Math.sin(x2 / 62 + 0.8) * amp; if (x2 === 0) g.moveTo(x2, y); else g.lineTo(x2, y); }
    g.stroke();
  }
  function strip(g, left, color) {
    var y = H - STRIP;
    g.fillStyle = color ? color : C.lago; g.fillRect(0, y - 5, W, 5);
    g.fillStyle = color ? color : C.vOs; g.fillRect(0, y, W, STRIP);
    T(g, left, 60, y + 53, '500 28px Inter, sans-serif', '#cfe0d4', 'left');
  }
  function base(g) {
    g.clearRect(0, 0, W, H); g.save();
    var bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#eaf3ed');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
  }
  function pair(g, lab, val, x, y, vfont, vcolor) {
    T(g, lab, x, y, '600 24px Montserrat, sans-serif', C.ink3, 'left', 3);
    T(g, val, x, y + 56, vfont || '800 48px Montserrat, sans-serif', vcolor || C.ink, 'left');
  }
  /** Socio retirado o credencial desactivada: velo y marca de agua bien visibles. */
  function marcaNoVigente(g) {
    g.save();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(0, 0, W, H - STRIP);
    g.translate(W / 2, H * 0.52); g.rotate(-0.42);
    g.strokeStyle = C.rojo; g.lineWidth = 12; rr(g, -440, -130, 880, 260, 30); g.stroke();
    T(g, 'NO VIGENTE', 0, 55, '800 130px Montserrat, sans-serif', C.rojo, 'center', 4);
    g.restore();
  }

  /* ───────── frente ───────── */
  function drawFront(d) {
    var g = cF.getContext('2d'); base(g);
    var ex = Math.max(0, H - 1920), sP = ex * 0.25, sN = ex * 0.4, sG = ex * 0.7, sB = ex;
    var gris = d.vigente ? null : '#59615c';
    guilloche(g, 0, 430, W, H - 430 - STRIP, 'rgba(30,123,52,0.085)');
    header(g, 430, 12, gris);
    logoMark(g, 190, 200, 125);
    T(g, 'CLUB DEPORTIVO,', 350, 128, '600 30px Montserrat, sans-serif', 'rgba(255,255,255,.92)', 'left', 3);
    T(g, 'SOCIAL Y CULTURAL', 350, 170, '600 30px Montserrat, sans-serif', 'rgba(255,255,255,.92)', 'left', 3);
    g.font = fitFont(g, 'JUNJI ARAUCANÍA', '800 {s}px Montserrat, sans-serif', 68, 690, 36);
    T(g, 'JUNJI ARAUCANÍA', 350, 246, g.font, '#ffffff', 'left');
    T(g, 'CREDENCIAL DE SOCIO', 350, 296, '600 26px Montserrat, sans-serif', 'rgba(255,255,255,.85)', 'left', 4);

    var px = 290, py = 350, pw = 500, ph = 620 + Math.round(sP);
    g.save(); g.shadowColor = 'rgba(15,35,22,.32)'; g.shadowBlur = 36; g.shadowOffsetY = 12;
    rr(g, px - 10, py - 10, pw + 20, ph + 20, 34); g.fillStyle = '#fff'; g.fill(); g.restore();
    drawPhoto(g, px, py, pw, ph, 26);
    rr(g, px, py, pw, ph, 26); g.strokeStyle = d.vigente ? C.v : C.rojo; g.lineWidth = 5; g.stroke();
    var yp = py + ph + 36;
    rr(g, 260, yp, 560, 70, 35); g.fillStyle = d.vigente ? C.v : C.rojo; g.fill();
    var pill = String(d.cargo || 'Socio(a)').toUpperCase();
    g.font = fitFont(g, pill, '700 {s}px Montserrat, sans-serif', 34, 520, 18);
    T(g, pill, 540, yp + 47, g.font, '#ffffff', 'center', 1);

    var yN = 1150 + sN;
    T(g, 'APELLIDOS', 540, yN, '600 24px Montserrat, sans-serif', C.ink3, 'center', 4);
    var ap = (d.apellidos || '—').toUpperCase();
    g.font = fitFont(g, ap, '800 {s}px Montserrat, sans-serif', 62, 920, 28); T(g, ap, 540, yN + 62, g.font, C.ink, 'center');
    T(g, 'NOMBRES', 540, yN + 116, '600 24px Montserrat, sans-serif', C.ink3, 'center', 4);
    var no = (d.nombres || '—').toUpperCase();
    g.font = fitFont(g, no, '700 {s}px Montserrat, sans-serif', 46, 920, 24); T(g, no, 540, yN + 174, g.font, C.ink, 'center');
    g.strokeStyle = 'rgba(21,36,26,.16)'; g.lineWidth = 3; g.beginPath(); g.moveTo(80, yN + 212); g.lineTo(1000, yN + 212); g.stroke();

    var yG = 1415 + sG;
    pair(g, 'RUT', d.rut || '—', 80, yG, '800 46px Montserrat, sans-serif');
    pair(g, 'N° DE SOCIO', d.n, 570, yG);
    pair(g, 'ESTADO', d.estado, 80, yG + 130, '800 46px Montserrat, sans-serif', d.vigente ? '#1d6b31' : C.rojo);
    pair(g, 'INGRESO AL CLUB', fmtFecha(d.ingreso), 570, yG + 130);

    var yB = 1690 + sB;
    T(g, 'VERIFICACIÓN', 80, yB, '600 24px Montserrat, sans-serif', C.ink3, 'left', 3);
    T(g, d.codigo || '—', 80, yB + 62, '800 50px Montserrat, sans-serif', C.ink, 'left', 2);

    microtext(g, H - STRIP - 20, 'CLUB DEPORTIVO SOCIAL Y CULTURAL JUNJI ARAUCANÍA', 'rgba(30,123,52,.55)');
    strip(g, 'Personal e intransferible', gris);
    stamp(g, 865, 1712 + sB, 118, -0.25, 11);
    if (!d.vigente) marcaNoVigente(g);
    g.restore();
  }

  /* ───────── reverso ───────── */
  function drawBack(d) {
    var g = cB.getContext('2d'); base(g);
    var ex = Math.max(0, H - 1920), sQ = ex * 0.15, sP = ex * 0.5, sC = ex * 0.85;
    var gris = d.vigente ? null : '#59615c';
    guilloche(g, 0, 300, W, H - 300 - STRIP, 'rgba(30,123,52,0.085)');
    header(g, 300, 9, gris);
    logoMark(g, 160, 140, 90);
    T(g, 'CLUB DEPORTIVO,', 280, 98, '600 26px Montserrat, sans-serif', 'rgba(255,255,255,.92)', 'left', 3);
    T(g, 'SOCIAL Y CULTURAL', 280, 134, '600 26px Montserrat, sans-serif', 'rgba(255,255,255,.92)', 'left', 3);
    g.font = fitFont(g, 'JUNJI ARAUCANÍA', '800 {s}px Montserrat, sans-serif', 56, 740, 32);
    T(g, 'JUNJI ARAUCANÍA', 280, 200, g.font, '#ffffff', 'left');

    var qy = 360 + sQ;
    g.save(); g.shadowColor = 'rgba(15,35,22,.22)'; g.shadowBlur = 30; g.shadowOffsetY = 10;
    rr(g, 220, qy, 640, 640, 32); g.fillStyle = '#fff'; g.fill(); g.restore();
    rr(g, 220, qy, 640, 640, 32); g.strokeStyle = '#d3e2d7'; g.lineWidth = 3; g.stroke();
    if (!drawQR(g, d.verUrl, 240, qy + 20, 600)) T(g, 'QR no disponible', 540, qy + 330, '600 28px Inter, sans-serif', C.ink3, 'center');
    T(g, 'CÓDIGO DE VERIFICACIÓN', 540, qy + 700, '600 24px Montserrat, sans-serif', C.ink3, 'center', 3);
    T(g, d.codigo || '—', 540, qy + 764, '800 56px Montserrat, sans-serif', C.ink, 'center', 4);
    T(g, 'Escanee el código para confirmar la vigencia', 540, qy + 812, '500 27px Inter, sans-serif', C.ink3, 'center');

    var yT = 1255 + sP;
    T(g, 'CREDENCIAL DE SOCIO(A)', 540, yT, '800 38px Montserrat, sans-serif', C.v, 'center', 2);
    var para = 'Documento personal e intransferible que acredita la calidad de socio(a) del Club, conforme a sus estatutos. Su uso es exclusivo para las actividades y beneficios del Club.';
    g.font = '500 30px Inter, sans-serif';
    wrap(g, para, 900).forEach(function (ln, i) { T(g, ln, 540, yT + 56 + i * 44, '500 30px Inter, sans-serif', C.ink2, 'center'); });

    var yC = 1535 + sC, contacto = (d.club && d.club.contacto) || 'la directiva del Club';
    T(g, 'SI ENCUENTRA ESTA CREDENCIAL, COMUNICARSE CON', 540, yC, '600 22px Montserrat, sans-serif', C.ink3, 'center', 2);
    g.font = '700 34px Inter, sans-serif';
    wrap(g, contacto, 900).slice(0, 2).forEach(function (ln, i) { T(g, ln, 540, yC + 50 + i * 44, '700 34px Inter, sans-serif', C.ink, 'center'); });

    strip(g, 'Socio N° ' + d.n + '  ·  Verificada ' + fmtMarca(d.ts).slice(0, 5) + ' ' + fmtMarca(d.ts).slice(11), gris);
    if (!d.vigente) marcaNoVigente(g);
    g.restore();
  }

  /* ───────── render ───────── */
  function draw() { raf = 0; if (!D) return; drawFront(D); drawBack(D); }
  function schedule() { if (!raf) raf = requestAnimationFrame(draw); }
  function medir() {
    var vw = window.innerWidth, vh = window.innerHeight;
    var h = vh > vw ? clamp(Math.round(W * vh / vw), 1500, 2800) : 2340;
    if (h !== H || cF.height !== h) {
      H = h; cF.width = cB.width = W; cF.height = cB.height = H;
      var f = $('flip'); f.style.setProperty('--ar', (W / H).toFixed(5)); f.style.setProperty('--sh', (STRIP / H).toFixed(5));
    }
  }
  function cargarImg(src) {
    return new Promise(function (ok) { if (!src) return ok(null); var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { ok(null); }; im.src = src; });
  }
  function mostrar(d) {
    D = d; token = token || '';
    return cargarImg(d.foto).then(function (im) { foto = im; }).then(function () {
      $('msg').hidden = true; $('visor').hidden = false;
      medir(); draw();
      avisoRed();
    });
  }
  function msg(titulo, txt, reintentar) {
    $('visor').hidden = true; $('msg').hidden = false;
    $('msgTit').textContent = titulo; $('msgTxt').textContent = txt; $('msgReint').hidden = !reintentar;
  }
  function avisoRed(sinConexion) {
    var a = $('aviso'), u = $('ult');
    if (!D) return;
    var dias = (Date.now() - D.ts) / 864e5;
    u.textContent = 'Última verificación con el club: ' + fmtMarca(D.ts) + '.';
    if (sinConexion) { a.textContent = 'Sin conexión · mostrando la última verificación (' + fmtMarca(D.ts) + ')'; a.hidden = false; }
    else if (dias > DIAS_AVISO) { a.textContent = 'Hace ' + Math.floor(dias) + ' días que no se verifica. Conéctate a internet para actualizarla.'; a.hidden = false; }
    else a.hidden = true;
    clearTimeout(avisoRed.t); if (a.hidden === false && sinConexion) avisoRed.t = setTimeout(function () { a.hidden = true; }, 6000);
  }

  /* ───────── carga de datos ───────── */
  function actualizar(silencioso) {
    if (cargando || !token) return Promise.resolve();
    cargando = true;
    return pedir('api=credencial&t=' + encodeURIComponent(token)).then(function (d) {
      guardar(LS_DATA, JSON.stringify({ token: token, d: d }));
      return mostrar(d);
    }).catch(function (e) {
      if (e && e.servidor) {
        // El sistema respondió que el enlace ya no sirve: se borra lo guardado
        guardar(LS_DATA, null); guardar(LS_TOKEN, null); D = null;
        msg('Enlace no válido', e.message, false);
      } else if (D) {
        avisoRed(true);
      } else {
        msg('Sin conexión', 'No pudimos conectar con el club para abrir tu credencial por primera vez. Revisa tu internet e intenta de nuevo.', true);
      }
    }).then(function () { cargando = false; });
  }

  function iniciar() {
    var hash = (location.hash || '').replace(/^#/, '').replace(/[^a-fA-F0-9]/g, '').toLowerCase();
    var guardado = leer(LS_TOKEN) || '';
    token = hash.length === 40 ? hash : guardado;
    if (!token) {
      msg('Mi credencial digital', 'Abre el enlace personal que te envió la directiva del club para ver tu credencial. Si aún no lo tienes, escríbenos y te lo enviamos.', false);
      return;
    }
    if (hash.length === 40 && hash !== guardado) { guardar(LS_TOKEN, hash); guardar(LS_DATA, null); }
    var cache = leerJSON(LS_DATA);
    var dibujo = (cache && cache.token === token && cache.d) ? mostrar(cache.d) : Promise.resolve();
    if (!(cache && cache.token === token && cache.d)) msg('Abriendo tu credencial…', 'Un momento, estamos consultando los datos del club.', false);
    dibujo.then(function () { return actualizar(true); });
  }

  /* ───────── interacción ───────── */
  var flip = $('flip');
  function girar() { flip.classList.toggle('flipped'); ocultarPista(); }
  flip.addEventListener('click', girar);
  flip.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); girar(); } });
  function ocultarPista() { var p = $('pista'); p.style.opacity = '0'; setTimeout(function () { p.hidden = true; }, 700); }
  hintT = setTimeout(ocultarPista, 4500);

  function abrirHoja(v) { $('hoja').hidden = !v; $('hojaFondo').hidden = !v; if (v && D) avisoRed(false); }
  $('btnInfo').addEventListener('click', function () { abrirHoja(true); });
  $('btnCerrar').addEventListener('click', function () { abrirHoja(false); });
  $('hojaFondo').addEventListener('click', function () { abrirHoja(false); });
  $('btnGuia').addEventListener('click', function () { $('guia').hidden = !$('guia').hidden; });
  $('btnAct').addEventListener('click', function () { var b = this; b.disabled = true; b.textContent = 'Actualizando…'; actualizar().then(function () { b.disabled = false; b.textContent = 'Actualizar ahora'; abrirHoja(false); }); });
  $('msgReint').addEventListener('click', function () { msg('Abriendo tu credencial…', 'Un momento, estamos consultando los datos del club.', false); actualizar(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') abrirHoja(false); });

  var rz = 0;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (D) { medir(); schedule(); } }, 150); });

  /* Pantalla encendida mientras se muestra; al volver a la app se vuelve a verificar */
  function bloquear() { try { if (navigator.wakeLock && !document.hidden) navigator.wakeLock.request('screen').then(function (l) { wl = l; }).catch(function () { }); } catch (e) { } }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { try { if (wl) wl.release(); } catch (e) { } wl = null; }
    else { bloquear(); if (D && Date.now() - D.ts > 10 * 60000) actualizar(true); }
  });
  window.addEventListener('online', function () { if (D) actualizar(true); });

  /* Reloj visible en la credencial: una captura de pantalla no puede hacerse pasar por la credencial en vivo */
  function tick() {
    var n = new Date(), p = function (v) { return String(v).padStart(2, '0'); };
    var s = p(n.getHours()) + ':' + p(n.getMinutes()) + ':' + p(n.getSeconds()) + '  ·  ' + p(n.getDate()) + '/' + p(n.getMonth() + 1) + '/' + n.getFullYear();
    Array.prototype.forEach.call(document.querySelectorAll('.ck'), function (el) { el.textContent = s; });
  }
  tick(); setInterval(function () { if (!document.hidden) tick(); }, 1000);

  /* Uso sin conexión */
  if ('serviceWorker' in navigator) { window.addEventListener('load', function () { navigator.serviceWorker.register('sw-credencial.js').catch(function () { }); }); }

  /* Arranque: logo y tipografías antes de dibujar */
  medir();
  var faces = ['800 20px Montserrat', '700 20px Montserrat', '600 20px Montserrat', '500 20px Inter', '600 20px Inter', '700 20px Inter'];
  var fuentes = (document.fonts && document.fonts.load) ? Promise.all(faces.map(function (f) { return document.fonts.load(f); })).catch(function () { }) : Promise.resolve();
  cargarImg('assets/img/logo.png').then(function (im) { logo = im; });
  Promise.race([fuentes, new Promise(function (r) { setTimeout(r, 2500); })]).then(function () {
    return cargarImg('assets/img/logo.png').then(function (im) { logo = im; });
  }).then(function () { iniciar(); bloquear(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(schedule); });
})();
