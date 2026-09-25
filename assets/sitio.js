/* Club Deportivo, Social y Cultural JUNJI Araucanía — sitio web
 * El contenido se lee desde el sistema del club (Google Apps Script) y se muestra aquí.
 * Si el sistema no responde, se usa assets/contenido-base.json. */
(function () {
  'use strict';

  var CFG = window.CDSC_CONFIG || {};
  var API = /^https:\/\/script\.google(usercontent)?\.com\//.test(CFG.API_URL || '') || /^http:\/\/localhost/.test(CFG.API_URL || '') ? CFG.API_URL : '';
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
  function img(id, w) { return id ? 'https://lh3.googleusercontent.com/d/' + encodeURIComponent(id) + '=w' + (w || 1200) : ''; }
  function lineas(t) { return String(t || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function enlazar(t) { return t.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); }
  function parrafos(t) { return String(t || '').split(/\n\s*\n/).map(function (p) { return p.trim() ? '<p>' + enlazar(esc(p.trim())).replace(/\n/g, '<br>') + '</p>' : ''; }).join(''); }
  function iniciales(n) { var p = String(n || '').trim().split(/\s+/); return ((p[0] || '')[0] || '') + ((p.length > 2 ? p[p.length - 2] : p[1] || '')[0] || ''); }
  function capital(t) { return String(t || '').toLowerCase().replace(/(^|\s)\S/g, function (x) { return x.toUpperCase(); }); }
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
    alerta: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>'
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
      '<a class="marca" href="index.html" aria-label="Inicio"><img src="assets/img/logo.png" alt="Logo CDSC JUNJI Araucanía" width="46" height="46"><div><b>CDSC JUNJI</b><span>Araucanía</span></div></a>' +
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
    var redes = (t.FACEBOOK_URL ? '<a href="' + esc(t.FACEBOOK_URL) + '" target="_blank" rel="noopener" aria-label="Facebook">' + marca('fb') + '</a>' : '') +
      (t.INSTAGRAM_URL ? '<a href="' + esc(t.INSTAGRAM_URL) + '" target="_blank" rel="noopener" aria-label="Instagram">' + marca('ig') + '</a>' : '') +
      (t.CONTACTO_WHATSAPP ? '<a href="https://wa.me/' + esc(t.CONTACTO_WHATSAPP) + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + marca('wa') + '</a>' : '');
    var correo = t.CONTACTO_CORREO || d.correo;
    $$('.wa-flotante').forEach(function (x) { x.remove(); });
    $('#pie').outerHTML = '<footer class="pie" id="pie"><div class="contenedor"><div class="pie-in">' +
      '<div><a class="marca" href="index.html"><img src="assets/img/logo.png" alt="" width="46" height="46"><div><b>CDSC JUNJI</b><span>Araucanía</span></div></a>' +
      '<p style="margin-top:14px;font-size:.94rem;max-width:320px">' + esc(CLUB) + '. Deporte, amistad y comunidad para las funcionarias y funcionarios de JUNJI en La Araucanía.</p>' + (redes ? '<div class="redes">' + redes + '</div>' : '') + '</div>' +
      '<div><h4>Club</h4><ul><li><a href="nosotros.html">Quiénes somos</a></li><li><a href="actividades.html">Actividades</a></li><li><a href="noticias.html">Noticias</a></li><li><a href="galeria.html">Galería</a></li></ul></div>' +
      '<div><h4>Socios</h4><ul><li><a href="socios.html#inscripcion">Hazte socio</a></li><li><a href="socios.html#consulta">Consulta tu cuota</a></li>' + (SISTEMA ? '<li><a href="' + esc(SISTEMA) + '" target="_blank" rel="noopener">Acceso directiva</a></li>' : '') + (t.ESTATUTOS_URL ? '<li><a href="' + esc(t.ESTATUTOS_URL) + '" target="_blank" rel="noopener">Estatutos</a></li>' : '') + '</ul></div>' +
      '<div><h4>Contacto</h4><ul>' + (correo ? '<li><a href="mailto:' + esc(correo) + '">' + esc(correo) + '</a></li>' : '') + (t.CONTACTO_TELEFONO ? '<li><a href="tel:' + esc(t.CONTACTO_TELEFONO.replace(/\s/g, '')) + '">' + esc(t.CONTACTO_TELEFONO) + '</a></li>' : '') +
      '<li>' + esc(t.CONTACTO_DIRECCION || 'Temuco, La Araucanía') + '</li><li><a href="contacto.html">Escríbenos</a></li></ul></div></div>' +
      '<div class="pie-base"><span>© ' + new Date().getFullYear() + ' ' + esc(CLUB) + '</span><span>Temuco · Región de La Araucanía · Chile</span></div></div></footer>' +
      (t.CONTACTO_WHATSAPP ? '<a class="wa-flotante" href="https://wa.me/' + esc(t.CONTACTO_WHATSAPP) + '" target="_blank" rel="noopener" aria-label="Escríbenos por WhatsApp">' + marca('wa').replace('class="ico"', '') + '</a>' : '');
  }

  // ───────────── Datos ─────────────
  function jsonp(url) {
    return new Promise(function (ok, ko) {
      var cb = 'cdsc_cb_' + Date.now() + Math.floor(Math.random() * 1000);
      var s = document.createElement('script');
      var t = setTimeout(function () { limpiar(); ko(new Error('Tiempo de espera agotado')); }, 15000);
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
    return fetch(url, { redirect: 'follow' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
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
    return fresco.then(function (d) { guardarLS('cdsc_sitio', { t: Date.now(), d: d }); return d; });
  }
  function enviar(datos) {
    if (!API) return Promise.reject(new Error('El formulario todavía no está conectado al sistema del club. Escríbenos a ' + (CFG.CORREO || 'clubdeportivojunjiaraucania@gmail.com') + '.'));
    return fetch(API, { method: 'POST', body: JSON.stringify(datos), redirect: 'follow' })
      .then(function (r) { return r.json(); })
      .then(function (r) { if (!r.ok) throw new Error(r.error || 'No se pudo enviar.'); return r.mensaje; });
  }

  // ───────────── Componentes ─────────────
  function imagen(id, w, alt) {
    return id ? '<img src="' + img(id, w) + '" alt="' + esc(alt || '') + '" loading="lazy" onerror="this.onerror=null;this.src=\'https://drive.google.com/thumbnail?id=' + esc(id) + '&sz=w' + (w || 1200) + '\'">'
      : '<div class="ph"><img src="assets/img/logo.png" alt=""></div>';
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
      (e.descripcion ? '<p>' + esc(e.descripcion) + '</p>' : '') + (e.resultado ? '<div class="resultado">' + ico('trofeo') + ' ' + esc(e.resultado) + '</div>' : '') + '</div></article>';
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

  // ───────────── Páginas ─────────────
  var PAGINAS = {};

  PAGINAS.inicio = function (d) {
    var t = d.textos || {}, hoy = d.hoy || hoyISO();
    var prox = d.eventos.filter(function (e) { return e.fecha >= hoy; }).slice(0, 3);
    var notis = d.noticias.slice().sort(function (a, b) { return (b.destacada - a.destacada) || (a.fecha < b.fecha ? 1 : -1); }).slice(0, 3);
    var album = d.albumes[0];
    return '<section class="hero"><div class="contenedor hero-in"><div>' +
      (t.AVISO_PORTADA ? '<div class="aviso-portada">' + ico('alerta') + '<span>' + esc(t.AVISO_PORTADA) + '</span></div>' : '') +
      '<span class="antetitulo">' + esc(CLUB) + '</span><h1>' + esc(t.HERO_TITULO || 'Deporte, amistad y comunidad') + '</h1>' +
      '<p class="lead">' + esc(t.HERO_SUBTITULO || '') + '</p><div class="btns"><a class="btn btn-prim" href="socios.html#inscripcion">Hazte socio ' + ico('flecha') + '</a><a class="btn btn-borde" href="socios.html#consulta">Consulta tu cuota</a></div></div>' +
      '<img class="hero-logo" src="assets/img/logo-512.png" alt="Logo del club: araucaria, volcán, cóndor y lago" width="340" height="340"></div>' + paisaje() + '</section>' +
      '<section class="cifras" aria-label="El club en cifras"><div class="contenedor cifras-in">' +
      '<div class="cifra"><b class="num">' + d.stats.socios + '</b><span>socias y socios</span></div><div class="cifra"><b class="num">' + d.stats.disciplinas + '</b><span>disciplinas y talleres</span></div>' +
      '<div class="cifra"><b class="num">' + d.stats.actividadesAnio + '</b><span>actividades en ' + hoy.slice(0, 4) + '</span></div><div class="cifra"><b class="num">' + pesos(d.cuota) + '</b><span>cuota mensual</span></div></div></section>' +
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
  PAGINAS.inicio.despues = function (d) { if (d.albumes[0]) activarLightbox(d.albumes[0]); };

  PAGINAS.nosotros = function (d) {
    var t = d.textos || {};
    return cabPagina('Quiénes somos', 'Conoce la historia, los propósitos y a las personas que dirigen el club.') +
      '<section class="seccion"><div class="contenedor"><div class="grid g2" style="align-items:center;gap:48px"><div><span class="antetitulo">Nuestra historia</span><h2>Un club hecho por y para funcionarios JUNJI</h2><div class="prosa">' + parrafos(t.NOSOTROS) + '</div>' +
      (t.ESTATUTOS_URL ? '<a class="btn btn-borde" href="' + esc(t.ESTATUTOS_URL) + '" target="_blank" rel="noopener">' + ico('doc') + ' Ver estatutos</a>' : '') + '</div>' +
      '<div style="display:flex;justify-content:center"><img src="assets/img/logo-512.png" alt="Logo del club" width="380" height="380" style="width:min(380px,100%);filter:drop-shadow(0 18px 40px rgba(20,60,40,.2))"></div></div></div></section>' +
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
      '<div class="compartir"><b>Compartir:</b><a class="btn btn-wa" href="https://wa.me/?text=' + encodeURIComponent(txt) + '" target="_blank" rel="noopener">' + marca('wa') + ' WhatsApp</a>' +
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
      '<input class="trampa" name="web" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="full" id="r-socio" aria-live="polite"></div><button class="btn btn-prim full" type="submit">Enviar solicitud</button></form></div></div></section>' +
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
    var fc = $('#f-consulta');
    $('#c-rut').addEventListener('input', function (e) { e.target.value = formatoRut(e.target.value); });
    fc.onsubmit = function (e) {
      e.preventDefault();
      var r = $('#r-consulta'), b = $('button', fc);
      if (!API) { r.innerHTML = '<div class="alerta error" style="margin-top:16px">La consulta aún no está conectada al sistema del club.</div>'; return; }
      b.disabled = true; b.textContent = 'Consultando…';
      getApi('api=deuda&rut=' + encodeURIComponent($('#c-rut').value)).then(function (x) { r.innerHTML = estadoCuenta(x); })
        .catch(function (err) { r.innerHTML = '<div class="alerta error" style="margin-top:16px">' + esc(err.message) + '</div>'; })
        .then(function () { b.disabled = false; b.textContent = 'Consultar'; });
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
      '<div class="alerta info" style="margin-top:16px">Para pagar o aclarar tu estado, contacta a ' + esc(r.tesorero) + ', ' + esc(String(r.tesoreroCargo || '').toLowerCase()) + ' del club al correo clubdeportivojunjiaraucania@gmail.com</div></div>';
    return h;
  }

  PAGINAS.contacto = function (d) {
    var t = d.textos || {}, correo = t.CONTACTO_CORREO || d.correo;
    var dato = function (icono, et, val) { return '<div class="dato-contacto"><div class="icono">' + icono + '</div><div><b>' + et + '</b>' + val + '</div></div>'; };
    return cabPagina('Contacto', 'Escríbenos tus dudas, ideas o propuestas de actividades.') +
      '<section class="seccion"><div class="contenedor"><div class="grid g2" style="gap:40px;align-items:start"><div><h2>Hablemos</h2><p class="prosa">Responderemos a la brevedad por correo electrónico.</p>' +
      (correo ? dato(ico('correo'), 'Correo', '<a href="mailto:' + esc(correo) + '">' + esc(correo) + '</a>') : '') +
      (t.CONTACTO_TELEFONO ? dato(ico('tel'), 'Teléfono', '<a href="tel:' + esc(t.CONTACTO_TELEFONO.replace(/\s/g, '')) + '">' + esc(t.CONTACTO_TELEFONO) + '</a>') : '') +
      (t.CONTACTO_WHATSAPP ? dato(marca('wa'), 'WhatsApp', '<a href="https://wa.me/' + esc(t.CONTACTO_WHATSAPP) + '" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>') : '') +
      dato(ico('pin'), 'Ubicación', '<div>' + esc(t.CONTACTO_DIRECCION || 'Temuco, La Araucanía') + '</div>') +
      (t.FACEBOOK_URL ? dato(marca('fb'), 'Facebook', '<a href="' + esc(t.FACEBOOK_URL) + '" target="_blank" rel="noopener">Síguenos</a>') : '') +
      (t.INSTAGRAM_URL ? dato(marca('ig'), 'Instagram', '<a href="' + esc(t.INSTAGRAM_URL) + '" target="_blank" rel="noopener">Síguenos</a>') : '') + '</div>' +
      '<form class="panel form f2" id="f-contacto" novalidate><label class="campo"><span>Nombre *</span><input class="inp" name="nombre" required autocomplete="name"></label>' +
      '<label class="campo"><span>Teléfono</span><input class="inp" name="telefono" type="tel" autocomplete="tel"></label>' +
      '<label class="campo full"><span>Correo electrónico *</span><input class="inp" name="correo" type="email" required autocomplete="email"></label>' +
      '<label class="campo full"><span>Asunto</span><select class="inp" name="asunto"><option>Consulta general</option><option>Actividades y campeonatos</option><option>Cuotas y pagos</option><option>Propuesta o sugerencia</option><option>Otro</option></select></label>' +
      '<label class="campo full"><span>Mensaje *</span><textarea class="inp" name="mensaje" required minlength="10"></textarea></label>' +
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

  // ───────────── Arranque ─────────────
  function animar() {
    var els = $$('.aparece');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('visible'); }); return; }
    var io = new IntersectionObserver(function (ent) { ent.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('visible'); io.unobserve(x.target); } }); }, { rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (e) { io.observe(e); });
  }
  function pintar(d) {
    var main = $('#contenido');
    if (!PAGINAS[PAGINA]) return;
    main.innerHTML = PAGINAS[PAGINA](d);
    if (PAGINAS[PAGINA].despues) PAGINAS[PAGINA].despues(d);
    pie(d);
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
