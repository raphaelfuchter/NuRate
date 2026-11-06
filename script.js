// Armazenamento: o WebView do APK não tem localStorage, então usa IndexedDB.
// Tudo é carregado para memória antes de iniciar; gravações vão para o banco em segundo plano.
(function () {
'use strict';
var db = null, mem = {};
function abrir(pronto) {
    try {
        var req = indexedDB.open('cambio', 1);
        req.onupgradeneeded = function () { req.result.createObjectStore('kv'); };
        req.onerror = function () { pronto(); };
        req.onsuccess = function () {
            db = req.result;
            var cur = db.transaction('kv').objectStore('kv').openCursor();
            cur.onsuccess = function () {
                var c = cur.result;
                if (c) { mem[c.key] = c.value; c.continue(); } else pronto();
            };
            cur.onerror = function () { pronto(); };
        };
    } catch (e) { pronto(); }
}
var iniciado = false;
function iniciar() { if (iniciado) return; iniciado = true; app(mem, function (k, v) {
    mem[k] = v;
    try { db && db.transaction('kv', 'readwrite').objectStore('kv').put(v, k); } catch (e) {}
}); }
abrir(iniciar);
setTimeout(iniciar, 1500); // banco travado: inicia sem dados salvos
})();

function app(mem, salvar) {
'use strict';

var $ = function (id) { return document.getElementById(id); };
var campos = ['cotacao', 'spread', 'iof', 'taxa', 'cashback'];

function ler(k, def) { return mem[k] != null ? JSON.parse(mem[k]) : def; }
function gravar(k, v) { salvar(k, JSON.stringify(v)); }

function num(s) { s = String(s); if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.'); return +s || 0; }
function txt(n) { return String(n).replace('.', ','); }
function marcado(nome) { return document.querySelector('input[name=' + nome + ']:checked').value; }

// Cotações {COP, PEN, GBP, em} e taxas por modalidade, guardadas para uso offline
var MOEDAS = { COP: '$', PEN: 'S/', GBP: '£' };
var cot = ler('cotacoes', {});
cot = { COP: cot.COP || 0.0017, PEN: cot.PEN || 1.6, GBP: cot.GBP || 7.35, em: cot.em || null };
// padrao: última versão do taxas.json; taxas: o que está em uso (pode ter edição manual)
var padrao = ler('padrao', PADRAO);
var taxas = ler('taxas', JSON.parse(JSON.stringify(padrao)));
var manual = ler('manual', false);

function preencher() {
    var modo = marcado('modo'), moeda = marcado('moeda'), t = taxas[modo];
    $('simbolo').textContent = MOEDAS[moeda];
    $('cotacao').value = txt(cot[moeda]);
    $('spread').value = txt(t.spread);
    $('iof').value = txt(t.iof);
    $('taxa').value = txt(t.taxa || 0);
    $('cashback').value = txt(t.cashback != null ? t.cashback : (padrao.uv.cashback || PADRAO.uv.cashback));
    var cg = modo === 'cg';
    $('box-saque').hidden = !cg;
    $('box-cashback').hidden = cg;
    $('box-final').hidden = cg;
    document.querySelector('.resultado').classList.toggle('cartao', !cg);
    $('rotulo').textContent = cg ? 'Na conta' : 'Na fatura';
    $('lbl-cashback').hidden = cg;
    $('lbl-taxa').hidden = !(cg && $('saque').checked);
    $('nota').textContent = cg
        ? 'Conta Global: spread zero, IOF 3,5% na conversão. 2 saques grátis por mês; depois, tarifa por saque.'
        : 'Ultravioleta: spread 3,5%. IOF de 3,5% vem na fatura e é reembolsado depois.';
    status();
    calcula();
}

function reais(n) {
    return (Math.round(n * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Diminui a fonte do valor digitado quando o número fica longo
function ajustaFonte(el) {
    el.style.fontSize = Math.min(34, Math.floor(380 / Math.max(el.value.length, 1))) + 'px';
}

function calcula() {
    var modo = marcado('modo');
    var saque = modo === 'cg' && $('saque').checked;
    var brl = calcular(num($('valor').value), num($('cotacao').value),
        num($('spread').value), num($('iof').value), saque ? num($('taxa').value) : 0);
    $('brl').textContent = reais(brl);
    // Ultravioleta: IOF entra na fatura e volta depois; cashback sobre a compra sem IOF
    var semIof = calcular(num($('valor').value), num($('cotacao').value), num($('spread').value), 0);
    $('iof-valor').textContent = reais(brl - semIof);
    var cb = cashback(semIof, num($('cashback').value));
    $('cashback-valor').textContent = reais(cb);
    $('final-valor').textContent = reais(semIof - cb);
}

function salvarCampo(id) {
    var modo = marcado('modo'), v = num($(id).value);
    if (id === 'cotacao') { cot[marcado('moeda')] = v; gravar('cotacoes', cot); }
    else { taxas[modo][id] = v; gravar('taxas', taxas); manual = true; gravar('manual', true); status(); }
    calcula();
}

var offline = false;

function status(erro) {
    if (erro) offline = true;
    $('padrao').hidden = !manual;
    var quando = cot.em && new Date(cot.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    var dia = (padrao.atualizado || '').split('-').reverse().join('/');
    $('status').className = 'pilula ' + (offline ? 'aviso' : 'ok');
    $('status').textContent = offline ? 'Offline' : 'Ao vivo';
    var linhas = [
        offline ? 'Sem internet: usando a última cotação salva.' : 'Cotação atualizada pela internet.',
        'Cotação: ' + (quando || 'aproximada (nunca consultada)'),
        'Taxas: ' + (manual ? 'editadas por você' : 'de ' + (dia || 'padrão'))
    ];
    $('status-det').replaceChildren.apply($('status-det'), linhas.map(function (t) {
        var p = document.createElement('p'); p.textContent = t; return p;
    }));
}

document.querySelectorAll('input[type=radio], #saque').forEach(function (el) {
    el.addEventListener('change', preencher);
});
// Máscara de centavos: 1 → 0,01 → 0,10 → 1,00
$('valor').addEventListener('input', function () {
    var d = this.value.replace(/\D/g, '').replace(/^0+/, '');
    this.value = ((d || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    fimCursor(this);
    ajustaFonte(this);
    calcula();
});
// Cursor sempre no fim, onde os dígitos entram
function fimCursor(el) {
    setTimeout(function () { el.setSelectionRange(el.value.length, el.value.length); });
}
['focus', 'click', 'keyup'].forEach(function (ev) {
    $('valor').addEventListener(ev, function () { fimCursor(this); });
});
campos.forEach(function (id) {
    $(id).addEventListener('input', function () { salvarCampo(id); });
});
$('padrao').addEventListener('click', function () {
    taxas = JSON.parse(JSON.stringify(padrao));
    gravar('taxas', taxas);
    manual = false; gravar('manual', false);
    preencher();
});

// Menu e janelas
var $menu = $('menu'), $btnMenu = $('btn-menu');
function menu(abrir) { $menu.hidden = !abrir; $btnMenu.setAttribute('aria-expanded', abrir); }
$btnMenu.addEventListener('click', function (e) { e.stopPropagation(); det(false); menu($menu.hidden); });
function det(abrir) { $('status-det').hidden = !abrir; $('status').setAttribute('aria-expanded', abrir); }
$('status').addEventListener('click', function (e) { e.stopPropagation(); menu(false); det($('status-det').hidden); });
document.addEventListener('click', function () { menu(false); det(false); });
document.querySelectorAll('[data-abre]').forEach(function (b) {
    b.addEventListener('click', function () { menu(false); $(b.dataset.abre).showModal(); });
});
document.querySelectorAll('dialog').forEach(function (d) {
    d.querySelector('.fechar').addEventListener('click', function () { d.close(); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
});

preencher();
$('valor').focus();

// Cotação: sem cache do WebView; a data vem da própria API
function buscaCotacao() {
    if (!navigator.onLine) return status(true);
    fetch('https://economia.awesomeapi.com.br/last/COP-BRL,PEN-BRL,GBP-BRL', { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw r; return r.json(); })
        .then(function (d) {
            offline = false;
            cot = { em: 0 };
            Object.keys(MOEDAS).forEach(function (m) {
                cot[m] = +d[m + 'BRL'].ask;
                cot.em = Math.max(cot.em, +d[m + 'BRL'].timestamp * 1000);
            });
            gravar('cotacoes', cot);
            preencher();
        })
        .catch(function () { status(true); });
}
buscaCotacao();
window.addEventListener('offline', function () { status(true); });
window.addEventListener('online', buscaCotacao);

// Taxas publicadas no repo; no APK aponta para o GitHub Pages
fetch('https://raphaelfuchter.github.io/CambioCartao/taxas.json?' + Date.now())
    .then(function (r) { return r.json(); })
    .then(function (d) {
        padrao = d; gravar('padrao', d);
        if (!manual) { taxas = JSON.parse(JSON.stringify(d)); gravar('taxas', taxas); }
        preencher();
    })
    .catch(function () {});
}
