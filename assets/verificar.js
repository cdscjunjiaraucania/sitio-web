/* Verificación pública de una credencial: se llega escaneando el QR del reverso (verificar.html?c=CODIGO). */
(function () {
  'use strict';
  var CFG = window.CDSC_CONFIG || {};
  var API_RESPALDO = 'https://script.google.com/macros/s/AKfycbz-yW-vBhn3dmulxr57b6ATrCYFwamZXlxDA-1Y2QbErhnZTZAF98Hh5_XS-UYQV31fTA/exec';
  var API = /^https:\/\/script\.google(usercontent)?\.com\//.test(CFG.API_URL || '') ? CFG.API_URL : API_RESPALDO;
  var card = document.getElementById('card');
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function jsonp(url) {
    return new Promise(function (ok, ko) {
      var cb = 'cdsc_v_' + Date.now(), s = document.createElement('script');
      var t = setTimeout(function () { limpiar(); ko(new Error('red')); }, 12000);
      function limpiar() { clearTimeout(t); try { delete window[cb]; } catch (e) { window[cb] = undefined; } s.remove(); }
      window[cb] = function (r) { limpiar(); ok(r); };
      s.onerror = function () { limpiar(); ko(new Error('red')); };
      s.src = url + '&callback=' + cb; document.head.appendChild(s);
    });
  }
  function pedir(codigo, intento) {
    intento = intento || 1;
    var url = API + '?api=verificar&c=' + encodeURIComponent(codigo);
    return fetch(url, { redirect: 'follow', credentials: 'omit', cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return jsonp(url); })
      .catch(function (e) { if (intento < 3) return new Promise(function (r) { setTimeout(r, 900 * intento); }).then(function () { return pedir(codigo, intento + 1); }); throw e; });
  }
  function error(txt) {
    card.className = 'ver-card ver-no';
    card.innerHTML = '<div class="ver-top">NO VERIFICADA<small>CLUB DEPORTIVO, SOCIAL Y CULTURAL JUNJI ARAUCANÍA</small></div><div class="ver-cuerpo"><p class="ver-nombre">' + esc(txt) + '</p>' +
      '<p class="ver-dato">Si crees que es un error, comunícate con la directiva: contacto@cdscjunjiaraucania.cl</p></div>';
  }
  var codigo = (new URLSearchParams(location.search).get('c') || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  if (!codigo) { error('Falta el código de la credencial.'); return; }
  pedir(codigo).then(function (r) {
    if (!r || !r.ok) { error((r && r.error) || 'No encontramos una credencial con ese código.'); return; }
    var d = r.data, ok = d.vigente;
    card.className = 'ver-card ' + (ok ? 'ver-ok' : 'ver-no');
    card.innerHTML = '<div class="ver-top">' + (ok ? 'CREDENCIAL VERIFICADA' : 'CREDENCIAL NO VIGENTE') + '<small>' + esc(String(d.club || 'Club Deportivo, Social y Cultural JUNJI Araucanía').toUpperCase()) + '</small></div>' +
      '<div class="ver-cuerpo">' + (d.foto ? '<img class="ver-foto" alt="Fotografía del socio" src="' + esc(d.foto) + '">' : '') +
      '<p class="ver-estado">' + (ok ? 'VIGENTE' : 'NO VIGENTE') + '</p>' +
      '<p class="ver-nombre">' + esc((d.nombres + ' ' + d.apellidos).toUpperCase()) + '</p>' +
      '<p class="ver-dato">' + esc(d.cargo) + ' · N° ' + esc(d.n) + '</p><p class="ver-dato">RUT ' + esc(d.rutParcial) + '</p></div>' +
      '<div class="ver-pie">Compare la fotografía con la persona que presenta la credencial y pídale que muestre la suya en pantalla (con el reloj en movimiento).<br>Consulta realizada el ' + esc(d.generado) + '.</div>';
  }).catch(function () { error('No pudimos conectar con el sistema del club. Intenta nuevamente.'); });
})();
