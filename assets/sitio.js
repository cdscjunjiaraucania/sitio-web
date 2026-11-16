/* Club Deportivo, Social y Cultural JUNJI Araucanía — sitio web
 * El contenido se lee desde el sistema del club (Google Apps Script) y se muestra aquí.
 * Si el sistema no responde, se usa assets/contenido-base.json. */
(function () {
  'use strict';

  var CFG = window.CDSC_CONFIG || {};
  // Dirección del sistema del club. Si config.js viniera vacío o dañado, se usa esta de respaldo.
  var API_RESPALDO = 'https://script.google.com/macros/s/AKfycbz-yW-vBhn3dmulxr57b6ATrCYFwamZXlxDA-1Y2QbErhnZTZAF98Hh5_XS-UYQV31fTA/exec';
  var API = /^https:\/\/script\.google(usercontent)?\.com\//.test(CFG.API_URL || '') || /^http:\/\/localhost/.test(CFG.API_URL || '') ? CFG.API_URL : API_RESPALDO;
  var SISTEMA = CFG.SISTEMA_URL || 'directiva/';
  var PAGINA = document.body.getAttribute('data-pagina') || 'inicio';
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MES_C = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var CLUB = 'Club Deportivo, Social y Cultural JUNJI Araucanía';

  // ───────────── Utilidades ─────────────
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function pesos(n) { return '$' + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function fecha(f) { var p = String(f || '').split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2]) : null; }
  function fechaLarga(f) { var d = fecha(f); return d ? d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear() : ''; }
  function fechaCorta(f) { var d = fecha(f); return d ? d.getDate() + ' ' + MES_C[d.getMonth()] + ' ' + d.getFullYear() : ''; }
  function hoyISO() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function url(u) { u = String(u || '').trim(); return /^https?:\/\//i.test(u) ? esc(u) : '#'; }
  function img(id, w) { return id ? 'https://lh3.googleusercontent.com/d/' + encodeURIComponent(id) + '=w' + (w || 1200) : ''; }
  function lineas(t) { return String(t || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function enlazar(t) { return t.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); }
  function parrafos(t) { return String(t || '').split(/\n\s*\n/).map(function (p) { return p.trim() ? '<p>' + enlazar(esc(p.trim())).replace(/\n/g, '<br>') + '</p>' : ''; }).join(''); }
  function iniciales(n) { var p = String(n || '').trim().split(/\s+/); return ((p[0] || '')[0] || '') + ((p.length > 2 ? p[p.length - 2] : p[1] || '')[0] || ''); }
  function capital(t) { return String(t || '').toLowerCase().replace(/(^|\s)\S/g, function (x) { return x.toUpperCase(); }); }
  function rutValido(v) {
    var r = normRut(v);
    if (!/^\d{7,8}[0-9K]$/.test(r)) return false;
    var s = 0, m = 2, c = r.slice(0, -1);
    for (var i = c.length - 1; i >= 0; i--) { s += +c[i] * m; m = m === 7 ? 2 : m + 1; }
    var dv = 11 - s % 11;
    return (dv === 11 ? '0' : dv === 10 ? 'K' : String(dv)) === r.slice(-1);
  }
  function normRut(r) { return String(r || '').replace(/[^0-9kK]/g, '').toUpperCase(); }
  function formatoRut(v) { var r = normRut(v); return r.length < 2 ? r : r.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + r.slice(-1); }
  function param(n) { var m = new RegExp('[?&]' + n + '=([^&#]*)').exec(location.search); return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : ''; }
  function leerLS(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function guardarLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }

  // ───────────── Íconos ─────────────
  var I = {
    cal: '<path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>',
    reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    grupo: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.2c3 .2 5.5 2.6 5.5 5.8"/>',
    balon: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5l4 2.9-1.5 4.7h-5L8 10.4z"/><path d="M12 3v4.5M21 10.4l-5 .01M17.5 19.5l-3-4.4M6.5 19.5l3-4.4M3 10.4h5"/>',
    trofeo: '<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    corazon: '<path d="M12 20s-7.5-4.6-9.3-9.2C1.5 7.5 3.8 4.5 7 4.5c2 0 3.5 1.1 5 3 1.5-1.9 3-3 5-3 3.2 0 5.5 3 4.3 6.3C19.5 15.4 12 20 12 20z"/>',
    paleta: '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.6-1-2.6 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
    correo: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    tel: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    diana: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    ojo: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    candado: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    alerta: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>',
    play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>',
    video: '<rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="M15.5 10.5l6-3.5v10l-6-3.5"/>',
    compartir: '<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.7l7.4-4.3M8.3 13.3l7.4 4.3"/>',
    enlace: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L12 5.6"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>',
    campana: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>'
  };
  var MARCAS = {
    wa: '<path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.7a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.6-.3z"/>',
    fb: '<path fill="currentColor" d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8z"/>',
    ig: '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/>'
  };
  function ico(n) { return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[n] + '</svg>'; }
  function marca(n) { return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + MARCAS[n] + '</svg>'; }
  function icoArea(a) { return a === 'Social' ? ico('corazon') : a === 'Cultural' ? ico('paleta') : a === 'Club' ? ico('grupo') : ico('balon'); }

  // ───────────── Cabecera y pie ─────────────
  var NAV = [['inicio', 'index.html', 'Inicio'], ['nosotros', 'nosotros.html', 'Nosotros'], ['actividades', 'actividades.html', 'Actividades'], ['noticias', 'noticias.html', 'Noticias'],
    ['galeria', 'galeria.html', 'Galería'], ['socios', 'socios.html', 'Socios'], ['contacto', 'contacto.html', 'Contacto']];
  function cabecera() {
    var activo = PAGINA === 'noticia' ? 'noticias' : PAGINA;
    $('#cab').outerHTML = '<a class="saltar" href="#contenido">Saltar al contenido</a><header class="cab" id="cab"><div class="contenedor cab-in">' +
      '<a class="marca" href="index.html"><img src="assets/img/logo-96.webp" alt="" width="46" height="46"><div><b>CDSC JUNJI</b><span>Araucanía</span></div></a>' +
      '<button class="menu-btn" aria-label="Abrir menú" aria-expanded="false" aria-controls="menu"><span></span><span></span><span></span></button>' +
      '<nav class="menu" id="menu" aria-label="Principal">' + NAV.map(function (n) { return '<a href="' + n[1] + '"' + (n[0] === activo ? ' class="activo" aria-current="page"' : '') + '>' + n[2] + '</a>'; }).join('') +
      '<a class="btn btn-prim" href="socios.html#inscripcion">Hazte socio</a></nav></div></header>';
    var btn = $('.menu-btn'), menu = $('#menu');
    btn.onclick = function () { var ab = menu.classList.toggle('abierto'); btn.setAttribute('aria-expanded', ab); };
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { menu.classList.remove('abierto'); btn.setAttribute('aria-expanded', 'false'); }); });
    var cab = $('#cab');
    var alScroll = function () { cab.classList.toggle('scroll', window.scrollY > 8); };
    window.addEventListener('scroll', alScroll, { passive: true }); alScroll();
  }
  function pie(d) {
    var t = d.textos || {};
    var redes = (t.FACEBOOK_URL ? '<a href="' + url(t.FACEBOOK_URL) + '" target="_blank" rel="noopener" aria-label="Facebook">' + marca('fb') + '</a>' : '') +
      (t.INSTAGRAM_URL ? '<a href="' + url(t.INSTAGRAM_URL) + '" target="_blank" rel="noopener" aria-label="Instagram">' + marca('ig') + '</a>' : '') +
      (t.CONTACTO_WHATSAPP ? '<a href="https://wa.me/' + esc(t.CONTACTO_WHATSAPP) + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + marca('wa') + '</a>' : '');
    var correo = t.CONTACTO_CORREO || d.correo;
    $$('.wa-flotante').forEach(function (x) { x.remove(); });
    $('#pie').outerHTML = '<footer class="pie" id="pie"><div class="contenedor"><div class="pie-in">' +
      '<div><a class="marca" href="index.html"><img src="assets/img/logo-96.webp" alt="" width="46" height="46" loading="lazy"><div><b>CDSC JUNJI</b><span>Araucanía</span></div></a>' +
      '<p style="margin-top:14px;font-size:.94rem;max-width:320px">' + esc(CLUB) + '. Deporte, amistad y comunidad para las funcionarias y funcionarios de JUNJI en La Araucanía.</p>' + (redes ? '<div class="redes">' + redes + '</div>' : '') + '</div>' +
      '<div><h2 class="pie-tit">Club</h2><ul><li><a href="nosotros.html">Quiénes somos</a></li><li><a href="actividades.html">Actividades</a></li><li><a href="noticias.html">Noticias</a></li><li><a href="galeria.html">Galería</a></li></ul></div>' +
      '<div><h2 class="pie-tit">Socios</h2><ul><li><a href="socios.html#inscripcion">Hazte socio</a></li><li><a href="socios.html#consulta">Consulta tu cuota</a></li><li><a href="credencial.html">Mi credencial digital</a></li>' + (SISTEMA ? '<li><a href="' + esc(SISTEMA) + '" target="_blank" rel="noopener">Acceso directiva</a></li>' : '') + (t.ESTATUTOS_URL ? '<li><a href="' + url(t.ESTATUTOS_URL) + '" target="_blank" rel="noopener">Estatutos</a></li>' : '') + '</ul></div>' +
      '<div><h2 class="pie-tit">Contacto</h2><ul>' + (correo ? '<li><a href="mailto:' + esc(correo) + '">' + esc(correo) + '</a></li>' : '') + (t.CONTACTO_TELEFONO ? '<li><a href="tel:' + esc(t.CONTACTO_TELEFONO.replace(/\s/g, '')) + '">' + esc(t.CONTACTO_TELEFONO) + '</a></li>' : '') +
      '<li>' + esc(t.CONTACTO_DIRECCION || 'Temuco, La Araucanía') + '</li><li><a href="contacto.html">Escríbenos</a></li></ul></div></div>' +
      '<div class="pie-base"><span>© 2022–' + new Date().getFullYear() + ' ' + esc(CLUB) + '. Todos los derechos reservados.</span><span><a href="privacidad.html">Política de privacidad</a> · Temuco · Región de La Araucanía · Chile</span></div></div></footer>' +
      (t.CONTACTO_WHATSAPP ? '<a class="wa-flotante" href="https://wa.me/' + esc(t.CONTACTO_WHATSAPP) + '" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">' + marca('wa').replace('class="ico"', '') + '</a>' : '');
  }

  // ───────────── Datos ─────────────
  function jsonp(url) {
    return new Promise(function (ok, ko) {
      var cb = 'cdsc_cb_' + Date.now() + Math.floor(Math.random() * 1000);
      var s = document.createElement('script');
      var t = setTimeout(function () { limpiar(); ko(new Error('Tiempo de espera agotado')); }, 10000);
      function limpiar() { clearTimeout(t); try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); }
      window[cb] = function (r) { limpiar(); ok(r); };
      s.onerror = function () { limpiar(); ko(new Error('No se pudo conectar')); };
      s.src = url + (url.indexOf('?') < 0 ? '?' : '&') + 'callback=' + cb;
      document.head.appendChild(s);
    });
  }
  function getApi(q, intento) {
    intento = intento || 1;
    var url = API + '?' + q;
    var ctrl = window.AbortController ? new AbortController() : null;
    var reloj = ctrl ? setTimeout(function () { ctrl.abort(); }, 9000) : null;
    return fetch(url, { redirect: 'follow', signal: ctrl ? ctrl.signal : undefined }).then(function (r) { clearTimeout(reloj); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .catch(function () { return jsonp(url); })
      .catch(function (e) {
        if (intento < 3) return new Promise(function (res) { setTimeout(res, 800 * intento); }).then(function () { return getApi(q, intento + 1); });
        throw new Error('No pudimos conectar con el sistema del club. Intenta nuevamente en unos segundos.');
      })
      .then(function (r) { if (!r || !r.ok) throw new Error((r && r.error) || 'Error del servidor'); return r.data; });
  }
  function base() { return fetch('assets/contenido-base.json').then(function (r) { return r.json(); }); }
  function cargar(alActualizar) {
    var cache = leerLS('cdsc_sitio');
    var fresco = API ? getApi('api=sitio') : base();
    fresco = fresco.catch(function () { return cache ? cache.d : base(); });
    if (cache && cache.d && Date.now() - cache.t < 7 * 864e5) {
      fresco.then(function (d) {
        if (JSON.stringify(d) !== JSON.stringify(cache.d)) { guardarLS('cdsc_sitio', { t: Date.now(), d: d }); alActualizar(d); }
        else guardarLS('cdsc_sitio', { t: Date.now(), d: d });
      });
      return Promise.resolve(cache.d);
    }
    // Primera visita: se muestra al instante la copia publicada en GitHub y se actualiza apenas responde el sistema
    var listo = false;
    fresco = fresco.then(function (d) { guardarLS('cdsc_sitio', { t: Date.now(), d: d }); if (listo) alActualizar(d); return d; });
    var copia = base().then(function (b) { b.hoy = hoyISO(); return b; });
    return Promise.race([fresco, copia.then(function (b) { return new Promise(function (res) { setTimeout(function () { res(b); }, 250); }); })])
      .then(function (d) { listo = true; return d; })
      .catch(function () { listo = true; return fresco; });
  }
  function enviar(datos) {
    if (!API) return Promise.reject(new Error('El formulario todavía no está conectado al sistema del club. Escríbenos a ' + (CFG.CORREO || 'contacto@cdscjunjiaraucania.cl') + '.'));
    return fetch(API, { method: 'POST', body: JSON.stringify(datos), redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (r) { if (!r.ok) throw new Error(r.error || 'No se pudo enviar.'); return r.mensaje; });
  }

  // ───────────── Componentes ─────────────
  function imagen(id, w, alt) {
    return id ? '<img src="' + img(id, w) + '" alt="' + esc(alt || '') + '" loading="lazy" onerror="this.onerror=null;this.src=\'https://drive.google.com/thumbnail?id=' + esc(id) + '&sz=w' + (w || 1200) + '\'">'
      : '<div class="ph"><img src="assets/img/logo-96.webp" alt=""></div>';
  }
  function tarjetaNoticia(n) {
    return '<a class="tarjeta aparece" href="noticia.html?id=' + n.id + '"><div class="img">' + imagen(n.foto, 800, n.titulo) + '</div><div class="cuerpo">' +
      '<div class="meta">' + (n.area ? '<span class="etiqueta ' + esc(n.area) + '">' + esc(n.area) + '</span>' : '') + '<span>' + fechaLarga(n.fecha) + '</span></div>' +
      '<h3>' + esc(n.titulo) + '</h3><p>' + esc(n.resumen || String(n.contenido || '').slice(0, 160) + '…') + '</p></div></a>';
  }
  function tarjetaEvento(e, pasado) {
    var d = fecha(e.fecha);
    return '<article class="evento aparece' + (pasado ? ' pasado' : '') + '" data-area="' + esc(e.area) + '"><div class="fecha-caja" aria-hidden="true"><span class="d">' + d.getDate() + '</span><span class="m">' + MES_C[d.getMonth()] + '</span><span class="a">' + d.getFullYear() + '</span></div>' +
      '<div style="flex:1;min-width:0"><div class="meta"><span class="etiqueta ' + esc(e.area) + '">' + esc(e.area || 'Club') + '</span>' + (e.estado && e.estado !== 'Programado' ? '<span class="etiqueta ' + esc(e.estado) + '">' + esc(e.estado) + '</span>' : '') + '</div>' +
      '<h3>' + esc(e.titulo) + '</h3><div class="meta"><span>' + ico('cal') + capital(DIAS[d.getDay()]) + ' ' + fechaLarga(e.fecha) + '</span>' + (e.hora ? '<span>' + ico('reloj') + esc(e.hora) + ' h</span>' : '') + (e.lugar ? '<span>' + ico('pin') + esc(e.lugar) + '</span>' : '') + '</div>' +
      (e.descripcion ? '<p>' + esc(e.descripcion) + '</p>' : '') + (e.resultado ? '<div class="resultado">' + ico('trofeo') + ' ' + esc(e.resultado) + '</div>' : '') +
      (e.foto ? '<a class="evento-img" href="' + img(e.foto, 1600) + '" target="_blank" rel="noopener" aria-label="Ver imagen de ' + esc(e.titulo) + '"><img src="' + img(e.foto, 700) + '" alt="' + esc(e.titulo) + '" loading="lazy"></a>' : '') + '</div></article>';
  }
  function tarjetaDisciplina(x) {
    return '<div class="disciplina aparece ' + esc(x.area) + '"><div class="icono">' + icoArea(x.area) + '</div><h3>' + esc(x.nombre) + '</h3><p>' + esc(x.descripcion) + '</p>' +
      '<div class="datos">' + (x.horario ? '<span>' + ico('reloj') + esc(x.horario) + '</span>' : '') + (x.lugar ? '<span>' + ico('pin') + esc(x.lugar) + '</span>' : '') + '</div></div>';
  }
  function vacio(t) { return '<div class="vacio">' + t + '</div>'; }
  function cabPagina(titulo, texto, migas) {
    return '<section class="pagina-cab"><div class="contenedor"><div class="migas"><a href="index.html">Inicio</a>' + (migas || '') + ' / ' + esc(titulo) + '</div><h1>' + esc(titulo) + '</h1>' + (texto ? '<p>' + texto + '</p>' : '') + '</div></section>';
  }
  function paisaje() {
    function araucaria(x, y, h, c) {
      var p = '<g stroke="' + c + '" stroke-linecap="round" fill="none"><path d="M' + x + ' ' + (y + h) + 'V' + y + '" stroke-width="' + (h / 28) + '"/>';
      for (var i = 0; i < 6; i++) {
        var yy = y + 6 + i * h / 9, w = 8 + i * h / 16;
        p += '<path stroke-width="' + (h / 45) + '" d="M' + (x - w) + ' ' + (yy - h / 30) + 'Q' + (x - w * .45) + ' ' + (yy + h / 40) + ' ' + x + ' ' + yy + 'Q' + (x + w * .45) + ' ' + (yy + h / 40) + ' ' + (x + w) + ' ' + (yy - h / 30) + '"/>';
      }
      return p + '</g>';
    }
    return '<svg class="paisaje" viewBox="0 0 1440 300" aria-hidden="true" focusable="false">' +
      '<path d="M0 200 L140 150 L260 175 L420 110 L560 165 L700 120 L820 160 L940 130 L1100 170 L1250 120 L1440 165 V300 H0Z" fill="#bcd3cb"/>' +
      '<path d="M860 205 L1030 78 Q1058 58 1086 78 L1270 205Z" fill="#a39d96"/>' +
      '<path d="M1000 101 L1030 78 Q1058 58 1086 78 L1118 101 L1098 97 L1084 110 L1064 96 L1046 111 L1030 98Z" fill="#fff"/>' +
      '<path d="M0 225 C180 185 330 212 520 196 S880 176 1060 198 S1320 186 1440 196 V300 H0Z" fill="#2e9a47"/>' +
      '<path d="M0 248 C240 232 520 244 760 238 S1200 232 1440 244 V300 H0Z" fill="#1e7b34"/>' +
      '<rect x="0" y="262" width="1440" height="38" fill="#1f63c6"/><path d="M0 268 H1440" stroke="#5b94e3" stroke-width="3" stroke-dasharray="60 40"/>' +
      araucaria(170, 105, 150, '#145a25') + araucaria(250, 140, 110, '#1b6a2e') + araucaria(1340, 120, 135, '#145a25') +
      '<path d="M1180 60 q14 -12 28 -2 q10 -6 22 4 q-12 -3 -22 5 q-10 -9 -28 -7z" fill="#233"/>' +
      '</svg>';
  }

  /** Cuenta regresiva propia del club (fecha configurable desde el panel: Textos del sitio). */
  // Valores por defecto: se usan si el servidor aún no tiene la clave (Sitio.gs sin actualizar)
  var CR_BASE = { fecha: '2026-11-20 08:30', titulo: 'Olimpiadas JUNJI Biobío 2026', texto: '¡Nuestra delegación ya se prepara! Súmate y apoya al club.' };
  function fechaEvento(t) {
    var v = t.CUENTA_REGRESIVA_FECHA === undefined ? CR_BASE.fecha : String(t.CUENTA_REGRESIVA_FECHA || '').trim();
    if (!v) return null;
    var hm = v.match(/(\d{1,2})[:.](\d{2})(?!\d)/) || [];            // hora: 09:00, 9:00, 09.00
    var sinHora = hm[0] ? v.replace(hm[0], ' ') : v;
    var a, mes, d, m;
    if ((m = sinHora.match(/(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/))) { a = m[1]; mes = m[2]; d = m[3]; }        // 2026-11-20
    else if ((m = sinHora.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/))) { d = m[1]; mes = m[2]; a = m[3]; } // 20-11-2026 o 20/11/2026
    else { var x = new Date(v); return isNaN(x) ? null : x; }
    var f = new Date(+a, +mes - 1, +d, +(hm[1] || 0), +(hm[2] || 0));
    return isNaN(f) || f.getMonth() !== +mes - 1 ? null : f;
  }
  function cuentaRegresiva(t) {
    var f = fechaEvento(t);
    if (!f || Date.now() > f.getTime() + 5 * 864e5) return '';
    var hora = f.getHours() || f.getMinutes() ? ' · ' + ('0' + f.getHours()).slice(-2) + ':' + ('0' + f.getMinutes()).slice(-2) + ' h' : '';
    var caja = function (id, et) { return '<div class="cr-caja"><b id="cr-' + id + '">--</b><span>' + et + '</span></div>'; };
    return '<section class="cuenta-regresiva" aria-label="Cuenta regresiva"><div class="contenedor cr-in">' +
      '<div class="cr-txt"><span class="cr-ante">' + ico('trofeo') + ' Cuenta regresiva</span><h2>' + esc(t.CUENTA_REGRESIVA_TITULO || (t.CUENTA_REGRESIVA_FECHA === undefined ? CR_BASE.titulo : 'Próximo evento')) + '</h2>' +
      '<div class="cr-meta">' + ico('cal') + ' ' + capital(DIAS[f.getDay()]) + ' ' + f.getDate() + ' de ' + MESES[f.getMonth()] + ' de ' + f.getFullYear() + hora +
      (t.CUENTA_REGRESIVA_LUGAR ? '<br>' + ico('pin') + ' ' + esc(t.CUENTA_REGRESIVA_LUGAR) : '') + '</div>' +
      ((t.CUENTA_REGRESIVA_FECHA === undefined ? CR_BASE.texto : t.CUENTA_REGRESIVA_TEXTO) ? '<p>' + esc(t.CUENTA_REGRESIVA_FECHA === undefined ? CR_BASE.texto : t.CUENTA_REGRESIVA_TEXTO) + '</p>' : '') +
      (t.VIVO_DESDE ? '<a class="btn btn-claro cr-btn" href="envivo.html">' + ico('video') + ' Síguelo en vivo aquí</a>' : '') + '</div>' +
      '<div class="cr-reloj" id="cr-reloj" data-fin="' + f.getTime() + '" role="timer" aria-live="off">' + caja('d', 'días') + caja('h', 'horas') + caja('m', 'minutos') + caja('s', 'segundos') + '</div>' +
      '</div></section>';
  }
  var intervaloCR = null;
  function activarCuentaRegresiva() {
    clearInterval(intervaloCR);
    var reloj = document.getElementById('cr-reloj');
    if (!reloj) return;
    var fin = Number(reloj.dataset.fin);
    function tic() {
      var r = fin - Date.now();
      if (r <= 0) {
        clearInterval(intervaloCR);
        reloj.innerHTML = '<a class="cr-llego" href="envivo.html">¡Llegó el día! ¡Fuerza, delegación Araucanía! <span>Ver en vivo →</span></a>';
        return;
      }
      var s = Math.floor(r / 1000);
      var v = { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
      Object.keys(v).forEach(function (k) { var el = document.getElementById('cr-' + k); if (el) el.textContent = k === 'd' ? v[k] : ('0' + v[k]).slice(-2); });
    }
    tic();
    intervaloCR = setInterval(tic, 1000);
  }

  // ───────────── Páginas ─────────────
  var PAGINAS = {};
  var CORREO_SITIO = CFG.CORREO || 'contacto@cdscjunjiaraucania.cl';

  PAGINAS.inicio = function (d) {
    var t = d.textos || {}, hoy = d.hoy || hoyISO();
    var prox = d.eventos.filter(function (e) { return e.fecha >= hoy; }).slice(0, 3);
    var notis = d.noticias.slice().sort(function (a, b) { return (b.destacada - a.destacada) || (a.fecha < b.fecha ? 1 : -1); }).slice(0, 3);
    var album = d.albumes[0];
    return '<section class="hero"><div class="contenedor hero-in"><div>' +
      (t.AVISO_PORTADA ? '<div class="aviso-portada">' + ico('alerta') + '<span>' + esc(t.AVISO_PORTADA) + '</span></div>' : '') +
      '<span class="antetitulo">' + esc(CLUB) + '</span><h1>' + esc(t.HERO_TITULO || 'Deporte, amistad y comunidad') + '</h1>' +
      '<p class="lead">' + esc(t.HERO_SUBTITULO || '') + '</p><div class="btns"><a class="btn btn-prim" href="socios.html#inscripcion">Hazte socio ' + ico('flecha') + '</a><a class="btn btn-borde" href="socios.html#consulta">Consulta tu cuota</a></div></div>' +
      '<img class="hero-logo" src="assets/img/logo-400.webp" fetchpriority="high" alt="Logo del club: araucaria, volcán, cóndor y lago" width="340" height="340"></div>' + paisaje() + '</section>' +
      (vivoInfo(t).activo ? bloqueVivo(t) : cuentaRegresiva(t)) +
      '<section class="seccion"><div class="contenedor"><div class="seccion-cab"><div><span class="antetitulo">Calendario</span><h2>Próximas actividades</h2></div><a class="enlace-flecha" href="actividades.html">Ver calendario ' + ico('flecha') + '</a></div>' +
      (prox.length ? prox.map(function (e) { return tarjetaEvento(e); }).join('') : vacio('Pronto publicaremos las próximas actividades. ¡Atento a las novedades!')) + '</div></section>' +
      '<section class="seccion gris"><div class="contenedor"><div class="seccion-cab"><div><span class="antetitulo">Novedades</span><h2>Noticias del club</h2></div><a class="enlace-flecha" href="noticias.html">Todas las noticias ' + ico('flecha') + '</a></div>' +
      (notis.length ? '<div class="grid g3">' + notis.map(tarjetaNoticia).join('') + '</div>' : vacio('Aún no hay noticias publicadas.')) + '</div></section>' +
      '<section class="seccion"><div class="contenedor"><div class="seccion-cab"><div><span class="antetitulo">Qué hacemos</span><h2>Deporte, vida social y cultura</h2></div><a class="enlace-flecha" href="actividades.html#disciplinas">Ver disciplinas ' + ico('flecha') + '</a></div>' +
      '<div class="grid g3">' + d.disciplinas.slice(0, 6).map(tarjetaDisciplina).join('') + '</div></div></section>' +
      (album ? '<section class="seccion gris"><div class="contenedor"><div class="seccion-cab"><div><span class="antetitulo">Galería</span><h2>' + esc(album.titulo) + '</h2></div><a class="enlace-flecha" href="galeria.html">Ver galería ' + ico('flecha') + '</a></div>' +
        '<div class="fotos">' + album.fotos.slice(0, 8).map(function (f, i) { return '<button type="button" data-lb="' + i + '" aria-label="Ver foto ' + (i + 1) + '"><img src="' + img(f.id, 600) + '" alt="' + esc(f.desc || album.titulo) + '" loading="lazy"></button>'; }).join('') + '</div></div></section>' : '') +
      '<section class="seccion"><div class="contenedor"><div class="cta aparece"><div><h2>¿Trabajas en JUNJI Araucanía?</h2><p>Súmate al club por ' + pesos(d.cuota) + ' al mes y participa en campeonatos, celebraciones y talleres junto a tus compañeras y compañeros.</p></div>' +
      '<a class="btn btn-claro" href="socios.html#inscripcion">Quiero ser socio ' + ico('flecha') + '</a></div></div></section>';
  };
  PAGINAS.inicio.despues = function (d) { if (d.albumes[0]) activarLightbox(d.albumes[0]); activarCuentaRegresiva(); };

  PAGINAS.nosotros = function (d) {
    var t = d.textos || {};
    return cabPagina('Quiénes somos', 'Conoce la historia, los propósitos y a las personas que dirigen el club.') +
      '<section class="seccion"><div class="contenedor"><div class="grid g2" style="align-items:center;gap:48px"><div><span class="antetitulo">Nuestra historia</span><h2>Un club hecho por y para funcionarios JUNJI</h2><div class="prosa">' + parrafos(t.NOSOTROS) + '</div>' +
      (t.ESTATUTOS_URL ? '<a class="btn btn-borde" href="' + url(t.ESTATUTOS_URL) + '" target="_blank" rel="noopener">' + ico('doc') + ' Ver estatutos</a>' : '') + '</div>' +
      '<div style="display:flex;justify-content:center"><img src="assets/img/logo-400.webp" alt="Logo del club" width="380" height="380" loading="lazy" style="width:min(380px,100%);filter:drop-shadow(0 18px 40px rgba(20,60,40,.2))"></div></div></div></section>' +
      '<section class="seccion gris"><div class="contenedor"><div class="grid g2"><div class="mv aparece"><div class="icono">' + ico('diana') + '</div><h3>Misión</h3><p>' + esc(t.MISION) + '</p></div>' +
      '<div class="mv aparece"><div class="icono">' + ico('ojo') + '</div><h3>Visión</h3><p>' + esc(t.VISION) + '</p></div></div>' +
      '<h3 style="margin:40px 0 16px">Nuestros valores</h3><div class="valores">' + lineas(t.VALORES).map(function (v) { return '<span>' + esc(v) + '</span>'; }).join('') + '</div></div></section>' +
      '<section class="seccion"><div class="contenedor"><div class="seccion-cab"><div><span class="antetitulo">Organización</span><h2>Directiva</h2></div><p>Elegida por la asamblea de socias y socios.</p></div>' +
      (d.directiva.length ? '<div class="grid g4">' + d.directiva.map(function (p) {
        return '<div class="persona aparece"><div class="avatar">' + (p.foto ? '<img src="' + img(p.foto, 300) + '" alt="' + esc(p.nombre) + '" loading="lazy">' : esc(iniciales(p.nombre))) + '</div><b>' + esc(p.nombre) + '</b><span>' + esc(p.cargo) + '</span>' +
          (p.correo ? '<a href="mailto:' + esc(p.correo) + '">' + esc(p.correo) + '</a>' : '') + '</div>';
      }).join('') + '</div>' : vacio('Directiva por publicar.')) + '</div></section>';
  };

  PAGINAS.noticias = function (d) {
    return cabPagina('Noticias', 'Novedades, resultados y comunicados del club.') + '<section class="seccion"><div class="contenedor">' +
      (d.noticias.length ? '<div class="grid g3">' + d.noticias.map(tarjetaNoticia).join('') + '</div>' : vacio('Aún no hay noticias publicadas.')) + '</div></section>';
  };

  PAGINAS.noticia = function (d) {
    var id = Number(param('id')), n = d.noticias.filter(function (x) { return x.id === id; })[0];
    if (!n) return cabPagina('Noticia no encontrada', '', ' / <a href="noticias.html">Noticias</a>') + '<section class="seccion"><div class="contenedor">' + vacio('La noticia no existe o ya no está publicada. <a href="noticias.html">Ver todas las noticias</a>') + '</div></section>';
    document.title = n.titulo + ' · CDSC JUNJI Araucanía';
    var md = $('meta[name=description]'); if (md) md.setAttribute('content', n.resumen || n.titulo);
    var url = location.href, txt = n.titulo + ' – ' + url;
    var otras = d.noticias.filter(function (x) { return x.id !== id; }).slice(0, 3);
    return cabPagina(n.titulo, fechaLarga(n.fecha) + (n.area ? ' · ' + esc(n.area) : ''), ' / <a href="noticias.html">Noticias</a>') +
      '<section class="seccion"><div class="contenedor"><article class="articulo">' + (n.foto ? '<figure class="portada">' + imagen(n.foto, 1600, n.titulo) + '</figure>' : '') +
      (n.resumen ? '<p style="font-size:1.2rem;font-weight:600;color:var(--tinta)">' + esc(n.resumen) + '</p>' : '') + '<div class="cuerpo">' + parrafos(n.contenido) + '</div>' +
      '<div class="compartir"><b>Compartir:</b>' + (n.foto && navigator.share ? '<button type="button" class="btn btn-prim" id="compartir-foto" data-foto="' + esc(img(n.foto, 1200)) + '" data-titulo="' + esc(n.titulo) + '">' + ico('flecha') + ' Compartir con foto</button>' : '') + '<a class="btn btn-wa" href="https://wa.me/?text=' + encodeURIComponent(txt) + '" target="_blank" rel="noopener">' + marca('wa') + ' WhatsApp</a>' +
      '<a class="btn btn-lago" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '" target="_blank" rel="noopener">' + marca('fb') + ' Facebook</a></div></article>' +
      (otras.length ? '<div style="margin-top:60px"><h2>Otras noticias</h2><div class="grid g3">' + otras.map(tarjetaNoticia).join('') + '</div></div>' : '') + '</div></section>';
  };

  PAGINAS.actividades = function (d) {
    var hoy = d.hoy || hoyISO();
    var prox = d.eventos.filter(function (e) { return e.fecha >= hoy; });
    var pas = d.eventos.filter(function (e) { return e.fecha < hoy; }).reverse().slice(0, 30);
    var areas = ['Todas'].concat(['Deportiva', 'Social', 'Cultural', 'Club'].filter(function (a) { return d.eventos.some(function (e) { return e.area === a; }); }));
    return cabPagina('Actividades', 'Calendario de campeonatos, encuentros y talleres del club.') +
      '<section class="seccion"><div class="contenedor">' + (areas.length > 2 ? '<div class="chips" style="margin-bottom:24px" role="group" aria-label="Filtrar por área">' + areas.map(function (a, i) { return '<button class="chip' + (i ? '' : ' activo') + '" data-filtro="' + a + '">' + a + '</button>'; }).join('') + '</div>' : '') +
      '<h2>Próximas actividades</h2><div id="lista-prox">' + (prox.length ? prox.map(function (e) { return tarjetaEvento(e); }).join('') : vacio('No hay actividades programadas por ahora.')) + '</div>' +
      (pas.length ? '<h2 style="margin-top:56px">Actividades realizadas</h2><div>' + pas.map(function (e) { return tarjetaEvento(e, true); }).join('') + '</div>' : '') + '</div></section>' +
      '<section class="seccion gris" id="disciplinas"><div class="contenedor"><div class="seccion-cab"><div><span class="antetitulo">Participa</span><h2>Disciplinas y talleres</h2></div><p>¿Quieres proponer una nueva disciplina? <a href="contacto.html">Escríbenos</a>.</p></div>' +
      '<div class="grid g3">' + d.disciplinas.map(tarjetaDisciplina).join('') + '</div></div></section>';
  };
  PAGINAS.actividades.despues = function () {
    $$('[data-filtro]').forEach(function (b) {
      b.onclick = function () {
        $$('[data-filtro]').forEach(function (x) { x.classList.toggle('activo', x === b); });
        $$('.evento').forEach(function (ev) { ev.style.display = b.dataset.filtro === 'Todas' || ev.dataset.area === b.dataset.filtro ? '' : 'none'; });
      };
    });
  };

  PAGINAS.galeria = function (d) {
    var id = Number(param('album'));
    if (id) {
      var a = d.albumes.filter(function (x) { return x.id === id; })[0];
      if (!a) return cabPagina('Álbum no encontrado', '', ' / <a href="galeria.html">Galería</a>') + '<section class="seccion"><div class="contenedor">' + vacio('<a href="galeria.html">Volver a la galería</a>') + '</div></section>';
      document.title = a.titulo + ' · Galería CDSC JUNJI Araucanía';
      return cabPagina(a.titulo, fechaLarga(a.fecha) + (a.descripcion ? ' · ' + esc(a.descripcion) : ''), ' / <a href="galeria.html">Galería</a>') +
        '<section class="seccion"><div class="contenedor"><div class="fotos">' + a.fotos.map(function (f, i) { return '<button type="button" data-lb="' + i + '" aria-label="Ampliar foto ' + (i + 1) + '"><img src="' + img(f.id, 600) + '" alt="' + esc(f.desc || a.titulo) + '" loading="lazy"></button>'; }).join('') +
        '</div><p style="margin-top:28px"><a class="enlace-flecha" href="galeria.html">← Todos los álbumes</a></p></div></section>';
    }
    return cabPagina('Galería', 'Fotos de nuestras actividades, campeonatos y celebraciones.') + '<section class="seccion"><div class="contenedor">' +
      (d.albumes.length ? '<div class="grid g3">' + d.albumes.map(function (a) {
        return '<a class="tarjeta album aparece" href="galeria.html?album=' + a.id + '"><div class="img">' + imagen(a.portada, 800, a.titulo) + '<span class="cuenta">' + a.fotos.length + ' fotos</span></div><div class="cuerpo"><div class="meta">' + fechaLarga(a.fecha) + '</div><h3>' + esc(a.titulo) + '</h3>' + (a.descripcion ? '<p>' + esc(a.descripcion) + '</p>' : '') + '</div></a>';
      }).join('') + '</div>' : vacio('Muy pronto compartiremos las fotos de nuestras actividades.')) + '</div></section>';
  };
  PAGINAS.galeria.despues = function (d) { var id = Number(param('album')); var a = d.albumes.filter(function (x) { return x.id === id; })[0]; if (a) activarLightbox(a); };

  PAGINAS.socios = function (d) {
    var t = d.textos || {};
    return cabPagina('Socias y socios', 'Súmate al club, conoce los beneficios y consulta el estado de tus cuotas.') +
      '<section class="seccion"><div class="contenedor"><div class="grid g2" style="gap:40px"><div><span class="antetitulo">Beneficios</span><h2>¿Por qué ser parte del club?</h2><ul class="lista-check">' + lineas(t.BENEFICIOS).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul></div>' +
      '<div><span class="antetitulo">Requisitos</span><h2>Cómo incorporarte</h2><ul class="lista-check">' + lineas(t.REQUISITOS).map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' +
      '<div class="mv" style="margin-top:26px;display:flex;align-items:center;gap:18px"><div class="icono" style="margin:0;background:var(--verde-cl);color:var(--verde)">' + ico('corazon') + '</div><div><b style="font-family:var(--t-titulo);font-size:1.6rem">' + pesos(d.cuota) + '</b> <span class="muted">mensuales</span><p style="font-size:.92rem">Cuota social que financia las actividades del club.</p></div></div></div></div></div></section>' +
      '<section class="seccion gris" id="inscripcion"><div class="contenedor"><div class="grid g2" style="gap:40px;align-items:start"><div><span class="antetitulo">Inscripción</span><h2>Hazte socio</h2><p class="prosa">Completa tus datos y la directiva te contactará para confirmar tu incorporación. Recibirás un correo de confirmación.</p>' +
      '<div class="alerta info" style="margin-top:20px">' + ico('candado') + ' Tus datos se usan solo para la gestión interna del club.</div></div>' +
      '<form class="panel form f2" id="f-socio" novalidate><label class="campo"><span>Nombres *</span><input class="inp" name="nombres" required autocomplete="given-name"></label>' +
      '<label class="campo"><span>Apellidos *</span><input class="inp" name="apellidos" required autocomplete="family-name"></label>' +
      '<label class="campo"><span>RUT *</span><input class="inp" name="rut" required placeholder="12.345.678-9"></label>' +
      '<label class="campo"><span>Teléfono / WhatsApp</span><input class="inp" name="telefono" type="tel" autocomplete="tel" placeholder="+56 9 1234 5678"></label>' +
      '<label class="campo full"><span>Correo electrónico *</span><input class="inp" name="correo" type="email" required autocomplete="email"></label>' +
      '<label class="campo full"><span>Lugar de trabajo (jardín, programa o unidad)</span><input class="inp" name="lugarTrabajo"></label>' +
      '<label class="campo full"><span>Comentario (opcional)</span><textarea class="inp" name="mensaje" style="min-height:90px" placeholder="¿Qué actividades te interesan?"></textarea></label>' +
      '<label class="check full"><input type="checkbox" name="acepta" required> Me comprometo a pagar la cuota social mensual de ' + pesos(d.cuota) + ' y a respetar los estatutos del club.</label>' +
      '<p class="full muted" style="margin:0;font-size:.86rem">Tus datos se usan solo para gestionar ' + 'tu incorporación y tus cuotas' + ' y no se comparten con terceros. Más información en nuestra <a href="privacidad.html">política de privacidad</a>.</p>' +
      '<input class="trampa" name="web" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="full" id="r-socio" aria-live="polite"></div><button class="btn btn-prim full" type="submit">Enviar solicitud</button></form></div></div></section>' +
      '<section class="seccion" id="credencial"><div class="contenedor"><div class="panel" style="max-width:920px;margin:0 auto;display:flex;gap:24px;flex-wrap:wrap;align-items:center;justify-content:space-between"><div style="flex:1 1 320px"><span class="antetitulo">Socios</span><h2>Mi credencial digital</h2>' +
      '<p class="muted" style="margin:6px 0 0">Lleva tu credencial de socio en el celular, a pantalla completa y con tus datos al día. Se abre con tu enlace personal, que te envía la directiva por WhatsApp o correo, y también funciona sin conexión.</p></div>' +
      '<div class="btns" style="flex:0 0 auto"><a class="btn btn-prim" id="abrir-cred" href="credencial.html">Abrir mi credencial ' + ico('flecha') + '</a></div></div></div></section>' +
      '<section class="seccion" id="consulta"><div class="contenedor"><div class="panel" style="max-width:920px;margin:0 auto"><span class="antetitulo">Socios</span><h2>Consulta tu cuota</h2>' +
      '<p class="muted">Ingresa tu RUT para ver tus cuotas pagadas y pendientes. Solo cuentan como deuda los meses ya terminados.</p>' +
      '<form id="f-consulta" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:6px"><label class="sr" for="c-rut">RUT</label><input class="inp" id="c-rut" name="rut" placeholder="12.345.678-9" style="flex:1;min-width:200px" required>' +
      '<button class="btn btn-prim" type="submit">Consultar</button></form><div id="r-consulta" aria-live="polite"></div></div>' +
      (SISTEMA ? '<p style="text-align:center;margin-top:26px"><a class="enlace-flecha" href="' + esc(SISTEMA) + '" target="_blank" rel="noopener">' + ico('candado') + ' Acceso directiva y tesorería</a></p>' : '') + '</div></section>';
  };
  PAGINAS.socios.despues = function (d) {
    // "Despierta" el servidor apenas se abre la página, para que la consulta responda más rápido.
    if (API) { var despertado = false; var despertar = function () { if (!despertado) { despertado = true; fetch(API + '?api=ping').catch(function () { }); } }; despertar(); }
    var f = $('#f-socio');
    f.rut.addEventListener('input', function () { f.rut.value = formatoRut(f.rut.value); });
    f.onsubmit = function (e) {
      e.preventDefault();
      var r = $('#r-socio');
      if (!f.checkValidity()) { r.innerHTML = '<div class="alerta error">Completa los campos obligatorios (*) y acepta el compromiso de pago.</div>'; return; }
      var datos = { tipo: 'solicitud', nombres: f.nombres.value, apellidos: f.apellidos.value, rut: f.rut.value, telefono: f.telefono.value, correo: f.correo.value, lugarTrabajo: f.lugarTrabajo.value, mensaje: f.mensaje.value, acepta: f.acepta.checked, web: f.web.value };
      enviarForm(f, r, datos, function () { f.reset(); });
    };
    var fc = $('#f-consulta'), inRut = $('#c-rut');
    // Consulta anticipada: apenas el RUT está completo y es válido, se consulta en segundo plano.
    // Al presionar «Consultar» el resultado ya suele estar listo.
    var previa = { rut: '', p: null }, pausa = null, ultimoPing = Date.now();
    function consultar(rut) {
      if (previa.rut !== rut || !previa.p) {
        previa = { rut: rut, p: getApi('api=deuda&rut=' + encodeURIComponent(rut)) };
        previa.p.catch(function () { previa.p = null; }); // si falla, se reintenta al presionar
      }
      return previa.p;
    }
    inRut.addEventListener('input', function (e) {
      e.target.value = formatoRut(e.target.value);
      clearTimeout(pausa);
      var rut = normRut(e.target.value);
      if (API && rutValido(rut)) pausa = setTimeout(function () { consultar(rut); }, 900);
    });
    inRut.addEventListener('focus', function () {
      // si la página lleva rato abierta, se «despierta» de nuevo el sistema
      if (API && Date.now() - ultimoPing > 5 * 60000) { ultimoPing = Date.now(); fetch(API + '?api=ping').catch(function () { }); }
    });
    fc.onsubmit = function (e) {
      e.preventDefault();
      var r = $('#r-consulta'), b = $('button', fc), rut = normRut(inRut.value);
      if (!API) { r.innerHTML = '<div class="alerta error" style="margin-top:16px">La consulta aún no está conectada al sistema del club.</div>'; return; }
      if (rut.length < 7) { r.innerHTML = '<div class="alerta error" style="margin-top:16px">Ingresa tu RUT completo, con dígito verificador.</div>'; inRut.focus(); return; }
      clearTimeout(pausa);
      b.disabled = true; b.textContent = 'Consultando…';
      var aviso = setTimeout(function () { r.innerHTML = '<div class="muted" style="margin-top:16px">Conectando con el sistema del club, un momento…</div>'; }, 2500);
      consultar(rut).then(function (x) { r.innerHTML = estadoCuenta(x); })
        .catch(function (err) { previa.p = null; r.innerHTML = '<div class="alerta error" style="margin-top:16px">' + esc(err.message) + '</div>'; })
        .then(function () { clearTimeout(aviso); b.disabled = false; b.textContent = 'Consultar'; });
    };
  };
  function estadoCuenta(r) {
    var ok = r.deuda === 0;
    var anios = {};
    r.meses.forEach(function (m) { (anios[m.p.slice(0, 4)] = anios[m.p.slice(0, 4)] || []).push(m); });
    var cont = function (m) {
      return { pagado: String(m.pagado).replace(/\B(?=(\d{3})+(?!\d))/g, '.'), adelantado: '✓', parcial: 'Abono', pendiente: 'Debe', nosocio: '—', exento: 'Exento', encurso: 'En curso', futuro: '' }[m.estado];
    };
    var h = '<div class="estado-cuenta"><div class="estado-cab"><div><h3 style="margin:0">' + esc(capital(r.nombre)) + '</h3><div class="muted">RUT ' + esc(r.RUT) + '</div></div>' +
      '<div style="text-align:right"><div class="muted" style="font-size:.85rem">' + (ok ? '¡Estás al día!' : 'Deuda al ' + fechaLarga(r.hoy)) + '</div><div class="monto-deuda ' + (ok ? 'ok' : 'mal') + '">' + pesos(r.deuda) + '</div>' +
      (ok ? '' : '<div class="muted" style="font-size:.85rem">' + r.mesesAdeudados + ' cuota(s) pendiente(s)</div>') + '</div></div><div class="matriz"><div></div>' + MES_C.map(function (m) { return '<div class="h">' + m + '</div>'; }).join('');
    Object.keys(anios).sort().forEach(function (a) {
      h += '<div class="a">' + a + '</div>' + anios[a].map(function (m) { return '<div class="mes m-' + m.estado + '" data-m="' + MES_C[+m.p.slice(5, 7) - 1] + '" title="' + MESES[+m.p.slice(5, 7) - 1] + ' ' + a + '">' + cont(m) + '</div>'; }).join('');
    });
    h += '</div><div class="leyenda"><span><i class="m-pagado"></i>Pagado</span><span><i class="m-parcial"></i>Abono parcial</span><span><i class="m-pendiente"></i>Pendiente</span><span><i class="m-exento"></i>Exento</span><span><i class="m-nosocio"></i>No era socio</span></div>' +
      '<div class="alerta info" style="margin-top:16px">Para pagar o aclarar tu estado, contacta a ' + esc(r.tesorero) + ', ' + esc(String(r.tesoreroCargo || '').toLowerCase()) + ' del club al correo <a href="mailto:' + esc(CORREO_SITIO) + '">' + esc(CORREO_SITIO) + '</a></div></div>';
    return h;
  }

  // ───────────── Transmisión en vivo ─────────────
  // Estado de la señal (VIVO_*) viene en los textos del sitio; la página envivo.html consulta ?api=vivo cada 30 s.
  function dos(n) { return ('0' + n).slice(-2); }
  function isoDe(d) { return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate()); }
  function sumarDias(iso, n) { var d = fecha(iso); if (!d) return iso; d.setDate(d.getDate() + n); return isoDe(d); }
  function vivoInfo(t) {
    t = t || {};
    var hoy = hoyISO(), desde = String(t.VIVO_DESDE || '').slice(0, 10), hasta = String(t.VIVO_HASTA || desde).slice(0, 10);
    var activo = String(t.VIVO_ACTIVO || '').toUpperCase() === 'SI';
    return {
      activo: activo, desde: desde, hasta: hasta, lugar: t.VIVO_LUGAR || '',
      ventana: !!fecha(desde) && hoy >= sumarDias(desde, -3) && hoy <= sumarDias(hasta, 2),
      titulo: t.VIVO_TITULO || 'Transmisión en vivo'
    };
  }
  function ciudad(l) { return String(l || '').split(',')[0].trim(); }
  function bloqueVivo(t) {
    var v = vivoInfo(t);
    return '<section class="vivo-portada"><div class="contenedor vp-in"><div><span class="pill-vivo"><span class="punto-vivo"></span>En vivo ahora</span>' +
      '<h2>' + esc(v.titulo) + '</h2><p>' + (v.lugar ? 'Transmitiendo desde ' + esc(v.lugar) + '. ' : '') + 'Video, resultados y el minuto a minuto de nuestra delegación.</p></div>' +
      '<a class="btn btn-claro" href="envivo.html">' + ico('play') + ' Ver transmisión</a></div></section>';
  }
  /** Agrega «En vivo» al menú durante la cobertura y una barra roja en todas las páginas mientras estamos en el aire. */
  function decorarVivo(d) {
    var v = vivoInfo(d.textos), menu = $('#menu'), cab = $('#cab');
    var link = $('#nav-vivo');
    if (v.activo || v.ventana || PAGINA === 'envivo') {
      if (!link && menu) { link = document.createElement('a'); link.id = 'nav-vivo'; link.href = 'envivo.html'; menu.insertBefore(link, $('.btn', menu)); }
      if (link) {
        link.className = 'nav-vivo' + (v.activo ? ' al-aire' : '') + (PAGINA === 'envivo' ? ' activo' : '');
        link.innerHTML = '<i aria-hidden="true"></i>En vivo';
        if (PAGINA === 'envivo') link.setAttribute('aria-current', 'page');
      }
    } else if (link) link.remove();
    var barra = $('#barra-vivo');
    var mostrar = v.activo && PAGINA !== 'envivo';
    document.body.classList.toggle('con-vivo', mostrar);
    if (mostrar && cab) {
      if (!barra) { barra = document.createElement('a'); barra.id = 'barra-vivo'; barra.className = 'barra-vivo'; barra.href = 'envivo.html'; cab.insertBefore(barra, cab.firstChild); }
      barra.innerHTML = '<span class="punto-vivo"></span><b>EN VIVO</b><span class="bv-txt">' + esc(v.titulo) + (v.lugar ? ' · desde ' + esc(ciudad(v.lugar)) : '') + '</span><span class="bv-ver">Ver ahora ' + ico('flecha') + '</span>';
    } else if (barra) barra.remove();
  }

  var TIPOS_VIVO = { 'Aviso': '📣', 'Punto': '🔥', 'Resultado': '🏁', 'Medalla': '🏅', 'Foto': '📸', 'Ambiente': '🎉', 'En vivo': '🔴' };
  var MED_COLOR = { Oro: 'oro', Plata: 'plata', Bronce: 'bronce' };
  function fuenteVideo(url) {
    url = String(url || '').trim(); var m;
    if ((m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/))) return { tipo: 'yt', id: m[1], url: url };
    if ((m = url.match(/youtube\.com\/channel\/(UC[\w-]{22})/))) return { tipo: 'ytcanal', id: m[1], url: url };
    if (/^https:\/\/([\w-]+\.)*(facebook\.com|fb\.watch)\//i.test(url)) return { tipo: 'fb', url: url };
    return /^https:\/\//i.test(url) ? { tipo: 'link', url: url } : null;
  }
  function horaDe(fh) { var m = String(fh || '').match(/(\d{1,2}):(\d{2})/); return m ? dos(m[1]) + ':' + m[2] : ''; }
  function diaCorto(iso) { var d = fecha(iso); return d ? capital(DIAS[d.getDay()]).slice(0, 3) + ' ' + d.getDate() : iso; }
  function rivalDe(det) { var m = String(det || '').match(/^\s*vs\.?\s+([^·|,–\-]+)/i); return m ? m[1].trim() : 'Rival'; }
  function hayMarcador(a) { return a.club !== '' || a.rival !== ''; }
  function marcadorHtml(a, grande) {
    return '<div class="marcador' + (grande ? ' grande' : '') + '"><span class="eq">Araucanía</span><b class="num">' + esc(a.club || 0) + '</b><span class="sep">–</span><b class="num">' + esc(a.rival || 0) + '</b><span class="eq">' + esc(rivalDe(a.detalle)) + '</span></div>';
  }
  function medallaHtml(m) { return MED_COLOR[m] ? '<span class="medalla ' + MED_COLOR[m] + '" title="Medalla de ' + esc(m.toLowerCase()) + '">' + esc(m) + '</span>' : ''; }

  PAGINAS.envivo = function (d) {
    var v = vivoInfo(d.textos);
    document.title = 'En vivo · ' + v.titulo + ' · CDSC JUNJI Araucanía';
    var tab = function (id, txt, sel) { return '<button type="button" role="tab" id="tab-' + id + '" aria-controls="vp-' + id + '" aria-selected="' + !!sel + '" data-vtab="' + id + '">' + txt + '<span class="nuevas oculto"></span></button>'; };
    return '<section class="vivo-cab"><div class="contenedor"><div class="migas"><a href="index.html">Inicio</a> / En vivo</div>' +
      '<div class="vc-fila"><div class="vc-txt"><span id="v-pill" class="pill-vivo apagado"><span class="punto-vivo"></span><span>Conectando…</span></span>' +
      '<h1 id="v-titulo">' + esc(v.titulo) + '</h1><div class="vc-meta" id="v-meta">' + (v.lugar ? '<span>' + ico('pin') + ' ' + esc(v.lugar) + '</span>' : '') +
      (v.desde ? '<span>' + ico('cal') + ' ' + rangoFechas(v.desde, v.hasta) + '</span>' : '') + '</div></div>' +
      '<div class="vc-compartir"><a class="btn btn-wa" id="v-wa" target="_blank" rel="noopener">' + marca('wa') + ' Compartir</a>' +
      '<button type="button" class="btn btn-borde blanco" id="v-copiar">' + ico('enlace') + ' Copiar enlace</button></div></div></div></section>' +
      '<section class="vivo-sec"><div class="contenedor vivo-grid">' +
      '<div class="vivo-principal"><div class="v-cams" id="v-cams" role="tablist" aria-label="Elige la cámara"></div><div class="vivo-player" id="v-player"><div class="vp-carga"><span class="girando"></span>Conectando con la transmisión…</div></div>' +
      '<div class="vivo-bajo" id="v-bajo"></div><div id="v-ahora"></div><div id="v-medallero"></div></div>' +
      '<aside class="vivo-lateral" aria-label="Minuto a minuto y programa"><div class="vivo-tabs" role="tablist">' +
      tab('feed', 'Minuto a minuto', true) + tab('programa', 'Programa') + '</div>' +
      '<div class="vivo-panel" id="vp-feed" role="tabpanel" aria-labelledby="tab-feed"><div class="vacio">Cargando…</div></div>' +
      '<div class="vivo-panel oculto" id="vp-programa" role="tabpanel" aria-labelledby="tab-programa"></div>' +
      '<div class="vivo-act" id="v-act" aria-live="off"></div></aside>' +
      '</div></section>';
  };
  function rangoFechas(a, b) {
    var x = fecha(a), y = fecha(b);
    if (!x) return '';
    if (!y || a === b) return capital(DIAS[x.getDay()]) + ' ' + fechaLarga(a);
    return x.getMonth() === y.getMonth() ? x.getDate() + ' y ' + y.getDate() + ' de ' + MESES[y.getMonth()] + ' de ' + y.getFullYear() : fechaLarga(a) + ' al ' + fechaLarga(b);
  }

  PAGINAS.envivo.despues = function (d) {
    // Si llega contenido nuevo del sitio la página se vuelve a pintar: se detiene la actualización anterior.
    if (PAGINAS.envivo.detener) PAGINAS.envivo.detener();
    var V = { datos: null, clavePlayer: '', ultimoVisto: Number(leerLS('cdsc_vivo_visto')) || 0, maxFeed: 0, tab: 'feed', dia: '', fallos: 0, reloj: null, crInt: null };
    var enlace = location.origin + location.pathname;
    function textoCompartir() {
      var t = V.datos || {}, enAire = t.activo;
      return (enAire ? '🔴 ¡Estamos EN VIVO' + (t.lugar ? ' desde ' + ciudad(t.lugar) : '') + '! ' : '📺 ') + 'Sigue a la delegación del Club JUNJI Araucanía en ' + (t.titulo || 'la transmisión') + ': ' + enlace;
    }
    function actualizarCompartir() { var a = $('#v-wa'); if (a) a.href = 'https://wa.me/?text=' + encodeURIComponent(textoCompartir()); }
    actualizarCompartir();
    $('#v-copiar').onclick = function () {
      var b = this;
      var listo = function () { b.innerHTML = ico('enlace') + ' ¡Copiado!'; setTimeout(function () { b.innerHTML = ico('enlace') + ' Copiar enlace'; }, 2200); };
      if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) { navigator.share({ title: document.title, text: textoCompartir().replace(enlace, '').trim(), url: enlace }).catch(function () { }); return; }
      if (navigator.clipboard) navigator.clipboard.writeText(enlace).then(listo, function () { prompt('Copia el enlace:', enlace); });
      else prompt('Copia el enlace:', enlace);
    };

    // Pestañas
    function verTab(id) {
      V.tab = id;
      $$('[data-vtab]').forEach(function (b) { var s = b.dataset.vtab === id; b.setAttribute('aria-selected', s); if (s) { var n = $('.nuevas', b); n.classList.add('oculto'); } });
      $$('.vivo-panel').forEach(function (p) { p.classList.toggle('oculto', p.id !== 'vp-' + id); });
      if (id === 'feed') marcarVistos();
    }
    $$('[data-vtab]').forEach(function (b) { b.onclick = function () { V.tabElegida = true; verTab(b.dataset.vtab); }; });
    $('.vivo-tabs').addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var ids = ['feed', 'programa'], i = ids.indexOf(V.tab) + (e.key === 'ArrowRight' ? 1 : -1);
      verTab(ids[(i + 2) % 2]); $('#tab-' + V.tab).focus();
    });


    // Reproductor
    var ytApi = null;
    function cargarYT() {
      if (ytApi) return ytApi;
      ytApi = new Promise(function (ok) {
        if (window.YT && window.YT.Player) return ok();
        var previo = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = function () { if (previo) previo(); ok(); };
        var s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = function () { ytApi = null; ok(); };
        document.head.appendChild(s);
      });
      return ytApi;
    }
    function sinEmbed(f, motivo) {
      $('#v-player').innerHTML = '<div class="vp-aviso"><div class="vp-icono">' + ico('video') + '</div><h2>' + (motivo || 'Mira la transmisión en ' + (f.tipo === 'fb' ? 'Facebook' : 'YouTube')) + '</h2>' +
        '<p>Se abrirá en una pestaña nueva. Vuelve aquí para seguir el minuto a minuto y los resultados.</p><a class="btn btn-claro" href="' + url(f.url) + '" target="_blank" rel="noopener">' + ico('play') + ' Abrir transmisión</a></div>';
    }
    function incrustar(f) {
      var p = $('#v-player');
      if (f.tipo === 'yt') {
        p.innerHTML = '<div id="v-yt"></div>';
        cargarYT().then(function () {
          if (!window.YT || !window.YT.Player) { p.innerHTML = '<iframe src="https://www.youtube.com/embed/' + f.id + '?autoplay=1&mute=1&playsinline=1&rel=0" title="Transmisión en vivo" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>'; return; }
          new window.YT.Player('v-yt', {
            videoId: f.id, host: 'https://www.youtube.com',
            playerVars: { autoplay: 1, mute: 1, playsinline: 1, rel: 0, modestbranding: 1 },
            events: { onError: function (e) { if (e.data === 101 || e.data === 150 || e.data === 100) sinEmbed(f, e.data === 100 ? 'El video aún no está disponible aquí' : null); } }
          });
        });
      } else if (f.tipo === 'ytcanal') {
        p.innerHTML = '<iframe src="https://www.youtube.com/embed/live_stream?channel=' + f.id + '&autoplay=1&mute=1&playsinline=1" title="Transmisión en vivo" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
      } else if (f.tipo === 'fb') {
        p.innerHTML = '<iframe src="https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(f.url) + '&show_text=false&autoplay=true&mute=true&width=1280" title="Transmisión en vivo" allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen" allowfullscreen></iframe>';
      } else sinEmbed(f, 'La transmisión está en otra página');
    }
    function fase(dv) {
      var hoy = String(dv.ahora || '').slice(0, 10) || hoyISO();
      if (dv.activo) return 'vivo';
      if (dv.hasta && hoy > dv.hasta) return 'fin';
      if (dv.desde && hoy < dv.desde) return 'antes';
      var ini = fechaEvento({ CUENTA_REGRESIVA_FECHA: dv.inicio || '' });
      if (ini && Date.now() < ini.getTime()) return 'antes';
      return 'pausa';
    }
    function proximo(dv) {
      var ahora = String(dv.ahora || '').replace(' ', 'T');
      return dv.agenda.filter(function (a) { return a.estado === 'Programado' && (a.fecha + 'T' + (a.hora || '23:59')) >= ahora; })[0];
    }
    function recordatorio(dv, ini) {
      if (!ini) return '';
      var z = function (d) { return d.toISOString().replace(/[-:]|\.\d{3}/g, ''); };
      var fin = new Date(ini.getTime() + 2 * 3600000);
      return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent('En vivo: ' + (dv.titulo || 'Club JUNJI Araucanía')) +
        '&dates=' + z(ini) + '/' + z(fin) + '&details=' + encodeURIComponent('Transmisión del Club Deportivo JUNJI Araucanía: ' + enlace) + '&location=' + encodeURIComponent(dv.lugar || '');
    }
    /**
     * Con dos cámaras (p. ej. damas y varones en gimnasios distintos) aparece un selector sobre el video.
     * La elección del visitante se recuerda; si su cámara se apaga, se pasa sola a la que siga al aire.
     */
    function elegirCamara(dv) {
      var todas = (dv.camaras && dv.camaras.length) ? dv.camaras : (dv.url ? [{ n: 1, nombre: '', url: dv.url, on: true }] : []);
      var vivo = fase(dv) === 'vivo';
      var vis = vivo ? todas.filter(function (c) { return c.on; }) : todas;
      if (V.cam === undefined) { var g = leerLS('cdsc_cam'); V.cam = g || 0; }
      var sel = vis.filter(function (c) { return c.n === V.cam; })[0] || vis[0];
      dv.url = sel ? sel.url : '';
      var box = $('#v-cams');
      if (!box) return;
      if (vis.length < 2) { box.innerHTML = ''; box.className = 'v-cams'; return; }
      box.className = 'v-cams activo';
      box.innerHTML = vis.map(function (c) {
        var act = c === sel;
        return '<button type="button" role="tab" aria-selected="' + act + '" class="v-cam' + (act ? ' activa' : '') + '" data-cam="' + c.n + '">' +
          (vivo ? '<span class="punto-vivo"></span>' : ico('play')) + '<span>' + esc(c.nombre || 'Cámara ' + c.n) + '</span></button>';
      }).join('');
      $$('[data-cam]', box).forEach(function (b) {
        b.onclick = function () { V.cam = +b.dataset.cam; guardarLS('cdsc_cam', V.cam); if (V.datos) { elegirCamara(V.datos); pintarCabecera(V.datos); pintarPlayer(V.datos); } };
      });
    }
    function pintarPlayer(dv) {
      var f = fuenteVideo(dv.url), fs = fase(dv);
      var clave = fs + '|' + (f ? f.url : '') + '|' + (fs === 'pausa' ? dv.mensaje : '');
      if (clave === V.clavePlayer) return;
      V.clavePlayer = clave;
      clearInterval(V.crInt);
      var p = $('#v-player');
      if (fs === 'vivo' && f) return incrustar(f);
      if (fs === 'fin' && f) return incrustar(f);
      if (fs === 'antes') {
        var ini = fechaEvento({ CUENTA_REGRESIVA_FECHA: dv.inicio || dv.desde || '' });
        var caja = function (id, et) { return '<div class="cr-caja"><b id="vcr-' + id + '">--</b><span>' + et + '</span></div>'; };
        p.innerHTML = '<div class="vp-aviso"><h2>La transmisión comienza ' + (ini ? 'el ' + DIAS[ini.getDay()] + ' ' + ini.getDate() + ' de ' + MESES[ini.getMonth()] + (ini.getHours() ? ' a las ' + dos(ini.getHours()) + ':' + dos(ini.getMinutes()) : '') : 'pronto') + '</h2>' +
          (ini ? '<div class="cr-reloj">' + caja('d', 'días') + caja('h', 'horas') + caja('m', 'min') + caja('s', 'seg') + '</div>' : '') +
          '<div class="btns" style="justify-content:center">' + (ini ? '<a class="btn btn-claro" href="' + esc(recordatorio(dv, ini)) + '" target="_blank" rel="noopener">' + ico('campana') + ' Agendar recordatorio</a>' : '') + '</div></div>';
        if (ini) {
          var tic = function () {
            var r = ini.getTime() - Date.now();
            if (r <= 0) { clearInterval(V.crInt); V.clavePlayer = ''; return cargar(); }
            var s = Math.floor(r / 1000), x = { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
            Object.keys(x).forEach(function (k) { var el = document.getElementById('vcr-' + k); if (el) el.textContent = k === 'd' ? x[k] : dos(x[k]); });
          };
          tic(); V.crInt = setInterval(tic, 1000);
        }
        return;
      }
      if (fs === 'fin') { p.innerHTML = '<div class="vp-aviso"><div class="vp-icono">' + ico('trofeo') + '</div><h2>¡Gracias por acompañarnos!</h2><p>Revisa abajo los resultados de nuestra delegación.</p></div>'; return; }
      var prox = proximo(dv);
      p.innerHTML = '<div class="vp-aviso"><h2>' + esc(dv.mensaje || 'Volvemos en unos minutos') + '</h2>' +
        (prox ? '<p class="vp-prox">Próximo: <b>' + esc(prox.hora ? prox.hora + ' h' : diaCorto(prox.fecha)) + ' · ' + esc(prox.disciplina) + '</b>' + (prox.detalle ? ' ' + esc(prox.detalle) : '') + '</p>' : '<p>Esta página se actualiza sola: cuando volvamos al aire, el video aparecerá aquí.</p>') +
        (f ? '<button type="button" class="btn btn-borde blanco" id="v-ultimo">' + ico('play') + ' Ver lo último transmitido</button>' : '') + '</div>';
      var b = $('#v-ultimo'); if (b) b.onclick = function () { incrustar(f); };
    }

    function pintarCabecera(dv) {
      var fs = fase(dv), pill = $('#v-pill');
      var txt = { vivo: 'En vivo', antes: 'Próximamente', pausa: 'Fuera del aire', fin: 'Transmisión finalizada' }[fs];
      pill.className = 'pill-vivo' + (fs === 'vivo' ? '' : ' apagado');
      pill.lastChild.textContent = txt;
      $('#v-titulo').textContent = dv.titulo || 'Transmisión en vivo';
      var f = fuenteVideo(dv.url);
      $('#v-bajo').innerHTML = f && (fs === 'vivo' || fs === 'fin') ? '<span class="muted">' + (fs === 'fin' ? 'Revive la transmisión completa. ' : '¿No se ve el video? ') + '</span><a href="' + url(f.url) + '" target="_blank" rel="noopener">Abrir en ' + (f.tipo === 'fb' ? 'Facebook' : 'YouTube') + ' ' + ico('flecha') + '</a>' : '';
      document.title = (fs === 'vivo' ? '🔴 ' : '') + 'En vivo · ' + (dv.titulo || '') + ' · CDSC JUNJI Araucanía';
      actualizarCompartir();
    }
    function pintarAhora(dv) {
      var enJuego = dv.agenda.filter(function (a) { return a.estado === 'En juego'; });
      var h = '';
      if (enJuego.length) {
        h = '<div class="ahora-cab"><span class="punto-vivo"></span>Ahora en competencia</div><div class="ahora-grid">' + enJuego.map(function (a) {
          return '<div class="ahora-card"><div class="ac-dis">' + esc(a.disciplina) + (a.transmite ? ' <span class="cam" title="Se transmite en video">' + ico('video') + '</span>' : '') + '</div>' +
            (a.detalle ? '<div class="muted ac-det">' + esc(a.detalle) + '</div>' : '') + (hayMarcador(a) ? marcadorHtml(a, true) : '<div class="ac-sin">En curso</div>') + '</div>';
        }).join('') + '</div>';
      } else {
        var prox = fase(dv) !== 'fin' && proximo(dv);
        if (prox) h = '<div class="ahora-prox">' + ico('reloj') + ' <span>Próxima competencia: <b>' + esc(diaCorto(prox.fecha)) + (prox.hora ? ', ' + esc(prox.hora) + ' h' : '') + ' · ' + esc(prox.disciplina) + '</b>' + (prox.detalle ? ' ' + esc(prox.detalle) : '') + (prox.lugar ? ' <span class="muted">· ' + esc(prox.lugar) + '</span>' : '') + '</span></div>';
      }
      $('#v-ahora').innerHTML = h;
      var m = dv.medallero || {}, total = (m.oro || 0) + (m.plata || 0) + (m.bronce || 0);
      var fin = dv.agenda.filter(function (a) { return a.estado === 'Finalizado'; }).length;
      $('#v-medallero').innerHTML = total || fin ? '<div class="medallero"><div class="md-tit">' + ico('trofeo') + ' Medallero Araucanía</div>' +
        [['oro', 'Oro'], ['plata', 'Plata'], ['bronce', 'Bronce']].map(function (x) { return '<div class="md-item"><span class="medalla-dot ' + x[0] + '"></span><b class="num">' + (m[x[0]] || 0) + '</b><span>' + x[1] + '</span></div>'; }).join('') +
        '<div class="md-item md-fin"><b class="num">' + fin + '</b><span>competencias finalizadas</span></div></div>' : '';
    }
    function marcarVistos() { if (V.maxFeed > V.ultimoVisto) { V.ultimoVisto = V.maxFeed; guardarLS('cdsc_vivo_visto', V.maxFeed); } }
    function pintarFeed(dv) {
      var cont = $('#vp-feed'), previo = V.maxFeed;
      V.maxFeed = dv.novedades.reduce(function (m, n) { return Math.max(m, n.id); }, 0);
      if (!dv.novedades.length) { cont.innerHTML = '<div class="vacio">Aquí irán apareciendo los resultados, fotos y momentos de la delegación. ¡Atento!</div>'; return; }
      cont.innerHTML = '<ol class="feed">' + dv.novedades.map(function (n) {
        var nueva = previo && n.id > previo;
        return '<li class="feed-item t-' + esc(String(n.tipo).replace(/\s/g, '')) + (nueva ? ' nueva' : '') + '"><div class="fi-hora">' + esc(horaDe(n.hora)) + '</div><div class="fi-cuerpo">' +
          '<div class="fi-tipo"><span aria-hidden="true">' + (TIPOS_VIVO[n.tipo] || '📣') + '</span> ' + esc(n.tipo) + '</div>' + (n.texto ? '<p>' + enlazar(esc(n.texto)) + '</p>' : '') +
          (n.foto ? '<a class="fi-foto" href="' + img(n.foto, 1920) + '" target="_blank" rel="noopener"><img src="' + img(n.foto, 900) + '" alt="' + esc(n.texto || 'Foto de la delegación') + '" loading="lazy"></a>' : '') + '</div></li>';
      }).join('') + '</ol>';
      var sinVer = dv.novedades.filter(function (n) { return n.id > V.ultimoVisto; }).length;
      var badge = $('#tab-feed .nuevas');
      if (V.tab === 'feed' && document.visibilityState === 'visible') { marcarVistos(); badge.classList.add('oculto'); }
      else if (sinVer) { badge.textContent = sinVer > 9 ? '9+' : sinVer; badge.classList.remove('oculto'); }
    }
    function pintarPrograma(dv) {
      var cont = $('#vp-programa');
      if (!dv.agenda.length) { cont.innerHTML = '<div class="vacio">Muy pronto publicaremos el programa de competencias.</div>'; return; }
      var dias = dv.agenda.map(function (a) { return a.fecha; }).filter(function (x, i, arr) { return arr.indexOf(x) === i; });
      var hoy = String(dv.ahora || '').slice(0, 10);
      if (dias.indexOf(V.dia) < 0) V.dia = dias.indexOf(hoy) >= 0 ? hoy : dias[0];
      cont.innerHTML = (dias.length > 1 ? '<div class="chips dias" role="group" aria-label="Día">' + dias.map(function (x) { return '<button type="button" class="chip' + (x === V.dia ? ' activo' : '') + '" data-dia="' + esc(x) + '">' + esc(diaCorto(x)) + '</button>'; }).join('') + '</div>' : '') +
        '<ol class="programa">' + dv.agenda.filter(function (a) { return a.fecha === V.dia; }).map(function (a) {
          var est = a.estado === 'En juego' ? 'en-juego' : a.estado === 'Finalizado' ? 'final' : a.estado === 'Suspendido' ? 'susp' : '';
          return '<li class="pg-item ' + est + '"><div class="pg-hora num">' + esc(a.hora || '—') + '</div><div class="pg-cuerpo"><div class="pg-tit"><b>' + esc(a.disciplina) + '</b>' + medallaHtml(a.medalla) + (a.transmite ? '<span class="cam" title="Se transmite en video">' + ico('video') + '</span>' : '') + '</div>' +
            (a.detalle ? '<div class="pg-det">' + esc(a.detalle) + '</div>' : '') + (a.lugar ? '<div class="pg-lugar muted">' + ico('pin') + ' ' + esc(a.lugar) + '</div>' : '') +
            ((a.estado !== 'Programado' && hayMarcador(a)) ? marcadorHtml(a) : '') + (a.resultado ? '<div class="pg-res">' + esc(a.resultado) + '</div>' : '') +
            '</div><span class="pg-est">' + (a.estado === 'En juego' ? '<span class="punto-vivo"></span>' : '') + esc(a.estado) + '</span></li>';
        }).join('') + '</ol>';
      $$('[data-dia]', cont).forEach(function (b) { b.onclick = function () { V.dia = b.dataset.dia; pintarPrograma(V.datos); }; });
    }
    function pintar(dv) {
      // Mientras no haya publicaciones, se abre el programa (más útil antes del evento); luego manda lo que elija el visitante
      if (!V.tabElegida && !V.datos && !dv.novedades.length) verTab('programa');
      V.datos = dv;
      elegirCamara(dv);
      pintarCabecera(dv); pintarPlayer(dv); pintarAhora(dv); pintarFeed(dv); pintarPrograma(dv);
      var ahora = new Date();
      $('#v-act').innerHTML = '<span class="punto-ok"></span>Se actualiza sola · ' + dos(ahora.getHours()) + ':' + dos(ahora.getMinutes()) + ':' + dos(ahora.getSeconds());
    }
    var cargando = false;
    function cargar() {
      if (cargando) return; cargando = true;
      getApi('api=vivo').then(function (dv) { V.fallos = 0; pintar(dv); })
        .catch(function (e) {
          V.fallos++;
          if (!V.datos) {
            var t = d.textos || {}, f = fuenteVideo(t.VIVO_URL);
            $('#v-player').innerHTML = '';
            if (f && String(t.VIVO_ACTIVO).toUpperCase() === 'SI') incrustar(f);
            else $('#v-player').innerHTML = '<div class="vp-aviso"><h2>No pudimos conectar con el sistema del club</h2><p>Reintentando automáticamente…</p></div>';
            $('#vp-feed').innerHTML = '<div class="vacio">Reintentando…</div>';
          }
          $('#v-act').innerHTML = '<span class="punto-error"></span>Reconectando…';
        })
        .then(function () { cargando = false; });
    }
    function alVolver() { if (document.visibilityState === 'visible') { cargar(); if (V.tab === 'feed') marcarVistos(); } }
    cargar();
    V.reloj = setInterval(function () { if (document.visibilityState === 'visible') cargar(); }, 30000);
    document.addEventListener('visibilitychange', alVolver);
    PAGINAS.envivo.detener = function () { clearInterval(V.reloj); clearInterval(V.crInt); document.removeEventListener('visibilitychange', alVolver); };
  };

  PAGINAS.privacidad = function (d) {
    var t = d.textos || {}, correo = esc(t.CONTACTO_CORREO || d.correo || 'contacto@cdscjunjiaraucania.cl');
    var mail = '<a href="mailto:' + correo + '">' + correo + '</a>';
    var sec = function (tit, html) { return '<h2>' + tit + '</h2>' + html; };
    var lista = function (xs) { return '<ul>' + xs.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; };
    return cabPagina('Política de privacidad', 'Cómo cuidamos los datos de nuestras socias, socios y visitantes.', '') +
      '<section class="seccion"><div class="contenedor"><article class="articulo"><div class="cuerpo">' +
      '<p><b>Última actualización:</b> 30 de septiembre de 2026.</p>' +
      sec('1. Responsable', '<p>El responsable de los datos es el ' + esc(CLUB) + ', con domicilio en Temuco, Región de La Araucanía. Para cualquier consulta sobre tus datos, escríbenos a ' + mail + '.</p>') +
      sec('2. Qué datos recopilamos', lista([
        '<b>Solicitud de incorporación:</b> nombres, apellidos, RUT, correo electrónico, teléfono, lugar de trabajo y el comentario que quieras agregar.',
        '<b>Formulario de contacto:</b> nombre, correo electrónico, teléfono (opcional), asunto y mensaje.',
        '<b>Socias y socios:</b> datos de registro, fecha de ingreso y el historial de cuotas, pagos y exenciones.'])) +
      sec('3. Para qué los usamos', lista([
        'Evaluar tu solicitud de incorporación y mantener el registro de socias y socios.',
        'Llevar el control de cuotas y pagos, y emitir comprobantes.',
        'Informarte sobre actividades, avisos y el estado de tus cuotas.',
        'Responder tus consultas.']) + '<p>No usamos tus datos con fines comerciales ni los vendemos, arrendamos o cedemos a terceros.</p>') +
      sec('4. Dónde se guardan y quién accede', '<p>Los datos se almacenan en servicios de Google (Google Sheets y Google Drive) administrados por el club. Solo acceden integrantes de la directiva y personas encargadas, con usuario y clave personal, y únicamente para las gestiones del club.</p>') +
      sec('5. Consulta de cuotas por RUT', '<p>La consulta pública de cuotas muestra solo las iniciales del nombre (dos letras del primer nombre y del primer apellido), los primeros dígitos del RUT y el estado de las cuotas. No muestra teléfono, correo, fecha de ingreso ni otros datos personales. Para evitar búsquedas masivas, el sistema limita las consultas con RUT que no corresponden a socios.</p>') +
      sec('6. Fotografías', '<p>En el sitio publicamos fotos de nuestras actividades. Si apareces en una imagen y prefieres que la retiremos, escríbenos a ' + mail + ' y la quitaremos a la brevedad.</p>') +
      sec('7. Tus derechos', '<p>Puedes solicitar en cualquier momento el acceso, la rectificación, la eliminación o la oposición al tratamiento de tus datos, escribiendo a ' + mail + '. Responderemos a la brevedad. Si dejas de ser socia o socio, puedes pedir que eliminemos tus datos de contacto; conservaremos solo el registro de pagos que sea necesario para la rendición de cuentas del club.</p>') +
      sec('8. Cookies y almacenamiento', '<p>Este sitio no usa cookies de publicidad ni de seguimiento. Para cargar más rápido, guarda en tu navegador una copia del contenido público del sitio. Las tipografías se cargan desde Google Fonts. Si eres de la directiva, el panel guarda tu sesión en este navegador hasta que presiones «Salir».</p>') +
      sec('9. Normativa', '<p>Tratamos los datos de acuerdo con la Ley N° 19.628 sobre protección de la vida privada y, desde su entrada en vigencia, la Ley N° 21.719 sobre protección y tratamiento de datos personales. Podemos actualizar esta política; la fecha de la última versión aparece al inicio.</p>') +
      '</div></article></div></section>';
  };

  PAGINAS.contacto = function (d) {
    var t = d.textos || {}, correo = t.CONTACTO_CORREO || d.correo;
    var dato = function (icono, et, val) { return '<div class="dato-contacto"><div class="icono">' + icono + '</div><div><b>' + et + '</b>' + val + '</div></div>'; };
    return cabPagina('Contacto', 'Escríbenos tus dudas, ideas o propuestas de actividades.') +
      '<section class="seccion"><div class="contenedor"><div class="grid g2" style="gap:40px;align-items:start"><div><h2>Hablemos</h2><p class="prosa">Responderemos a la brevedad por correo electrónico.</p>' +
      (correo ? dato(ico('correo'), 'Correo', '<a href="mailto:' + esc(correo) + '">' + esc(correo) + '</a>') : '') +
      (t.CONTACTO_TELEFONO ? dato(ico('tel'), 'Teléfono', '<a href="tel:' + esc(t.CONTACTO_TELEFONO.replace(/\s/g, '')) + '">' + esc(t.CONTACTO_TELEFONO) + '</a>') : '') +
      (t.CONTACTO_WHATSAPP ? dato(marca('wa'), 'WhatsApp', '<a href="https://wa.me/' + esc(t.CONTACTO_WHATSAPP) + '" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>') : '') +
      dato(ico('pin'), 'Ubicación', '<div>' + esc(t.CONTACTO_DIRECCION || 'Temuco, La Araucanía') + '</div>') +
      (t.FACEBOOK_URL ? dato(marca('fb'), 'Facebook', '<a href="' + url(t.FACEBOOK_URL) + '" target="_blank" rel="noopener">Síguenos</a>') : '') +
      (t.INSTAGRAM_URL ? dato(marca('ig'), 'Instagram', '<a href="' + url(t.INSTAGRAM_URL) + '" target="_blank" rel="noopener">Síguenos</a>') : '') + '</div>' +
      '<form class="panel form f2" id="f-contacto" novalidate><label class="campo"><span>Nombre *</span><input class="inp" name="nombre" required autocomplete="name"></label>' +
      '<label class="campo"><span>Teléfono</span><input class="inp" name="telefono" type="tel" autocomplete="tel"></label>' +
      '<label class="campo full"><span>Correo electrónico *</span><input class="inp" name="correo" type="email" required autocomplete="email"></label>' +
      '<label class="campo full"><span>Asunto</span><select class="inp" name="asunto"><option>Consulta general</option><option>Actividades y campeonatos</option><option>Cuotas y pagos</option><option>Propuesta o sugerencia</option><option>Otro</option></select></label>' +
      '<label class="campo full"><span>Mensaje *</span><textarea class="inp" name="mensaje" required minlength="10"></textarea></label>' +
      '<p class="full muted" style="margin:0;font-size:.86rem">Tus datos se usan solo para gestionar ' + 'tu consulta' + ' y no se comparten con terceros. Más información en nuestra <a href="privacidad.html">política de privacidad</a>.</p>' +
      '<input class="trampa" name="web" tabindex="-1" autocomplete="off" aria-hidden="true"><div class="full" id="r-contacto" aria-live="polite"></div>' +
      '<button class="btn btn-prim full" type="submit">Enviar mensaje</button></form></div></div></section>';
  };
  PAGINAS.contacto.despues = function () {
    var f = $('#f-contacto');
    f.onsubmit = function (e) {
      e.preventDefault();
      var r = $('#r-contacto');
      if (!f.checkValidity()) { r.innerHTML = '<div class="alerta error">Completa nombre, correo y un mensaje de al menos 10 caracteres.</div>'; return; }
      enviarForm(f, r, { tipo: 'contacto', nombre: f.nombre.value, telefono: f.telefono.value, correo: f.correo.value, asunto: f.asunto.value, mensaje: f.mensaje.value, web: f.web.value }, function () { f.reset(); });
    };
  };

  function enviarForm(f, r, datos, alTerminar) {
    var b = $('button[type=submit]', f), txt = b.textContent;
    b.disabled = true; b.textContent = 'Enviando…'; r.innerHTML = '';
    enviar(datos).then(function (msg) { r.innerHTML = '<div class="alerta ok">✓ ' + esc(msg) + '</div>'; alTerminar(); })
      .catch(function (err) { r.innerHTML = '<div class="alerta error">' + esc(err.message === 'Failed to fetch' ? 'No pudimos conectar con el servidor. Revisa tu conexión e intenta nuevamente.' : err.message) + '</div>'; })
      .then(function () { b.disabled = false; b.textContent = txt; });
  }

  // ───────────── Lightbox ─────────────
  function activarLightbox(album) {
    var i = 0, lb = null;
    function mostrar() {
      var f = album.fotos[i];
      lb.querySelector('img').src = img(f.id, 1920);
      lb.querySelector('img').alt = f.desc || album.titulo;
      lb.querySelector('.cap').textContent = (f.desc ? f.desc + ' · ' : '') + (i + 1) + ' / ' + album.fotos.length;
    }
    function cerrar() { lb.remove(); lb = null; document.removeEventListener('keydown', teclas); document.body.style.overflow = ''; }
    function mover(n) { i = (i + n + album.fotos.length) % album.fotos.length; mostrar(); }
    function teclas(e) { if (e.key === 'Escape') cerrar(); if (e.key === 'ArrowRight') mover(1); if (e.key === 'ArrowLeft') mover(-1); }
    $$('[data-lb]').forEach(function (b) {
      b.onclick = function () {
        i = +b.dataset.lb;
        lb = document.createElement('div');
        lb.className = 'lightbox'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-label', 'Foto ampliada');
        lb.innerHTML = '<img alt=""><div class="cap"></div><button class="cerrar" aria-label="Cerrar">×</button><button class="ant" aria-label="Anterior">‹</button><button class="sig" aria-label="Siguiente">›</button>';
        document.body.appendChild(lb); document.body.style.overflow = 'hidden';
        lb.querySelector('.cerrar').onclick = cerrar;
        lb.querySelector('.ant').onclick = function () { mover(-1); };
        lb.querySelector('.sig').onclick = function () { mover(1); };
        lb.addEventListener('click', function (e) { if (e.target === lb) cerrar(); });
        document.addEventListener('keydown', teclas);
        mostrar(); lb.querySelector('.cerrar').focus();
      };
    });
  }

  // Compartir noticia con la foto adjunta (WhatsApp, etc.). Si el teléfono no lo permite, comparte solo el enlace.
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('#compartir-foto');
    if (!b) return;
    var datos = { title: b.dataset.titulo, text: b.dataset.titulo + ' – ' + location.href, url: location.href };
    b.disabled = true;
    fetch(b.dataset.foto, { mode: 'cors' }).then(function (r) { if (!r.ok) throw 0; return r.blob(); }).then(function (bl) {
      var f = new File([bl], 'noticia.jpg', { type: bl.type || 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [f] })) return navigator.share({ files: [f], title: datos.title, text: datos.text });
      return navigator.share(datos);
    }).catch(function (e) { if (!e || e.name !== 'AbortError') return navigator.share(datos).catch(function () { }); })
      .then(function () { b.disabled = false; });
  });

  // ───────────── Arranque ─────────────
  function animar() {
    var els = $$('.aparece');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('visible'); }); return; }
    var io = new IntersectionObserver(function (ent) { ent.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('visible'); io.unobserve(x.target); } }); }, { rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (e) { io.observe(e); });
  }
  function pintar(d) {
    CORREO_SITIO = (d.textos && d.textos.CONTACTO_CORREO) || d.correo || CORREO_SITIO;
    var main = $('#contenido');
    if (!PAGINAS[PAGINA]) return;
    main.innerHTML = PAGINAS[PAGINA](d);
    if (PAGINAS[PAGINA].despues) PAGINAS[PAGINA].despues(d);
    pie(d);
    decorarVivo(d);
    animar();
    if (location.hash && !pintar.saltado) { pintar.saltado = true; var el = document.getElementById(location.hash.slice(1)); if (el) setTimeout(function () { el.scrollIntoView(); }, 30); }
  }

  cabecera();
  if (!PAGINAS[PAGINA]) { pie({ textos: {} }); return; }
  $('#contenido').innerHTML = '<div class="contenedor" style="padding:60px 20px"><div class="grid g3"><div class="esqueleto"></div><div class="esqueleto"></div><div class="esqueleto"></div></div></div>';
  cargar(function (nuevo) {
    // Llegó contenido más reciente que el guardado: se vuelve a pintar sin perder lo que el usuario escribe en formularios.
    if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    pintar(nuevo);
  }).then(pintar).catch(function () {
    $('#contenido').innerHTML = '<div class="contenedor seccion">' + vacio('No pudimos cargar el contenido. Intenta recargar la página.') + '</div>';
    pie({ textos: {} });
  });
})();
