(function () {
'use strict';

var $ = function (id) { return document.getElementById(id); };
var campos = ['cotacao', 'spread', 'iof', 'taxa'];

function ler(k, def) {
    try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; }
}
function gravar(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
}

function num(s) { s = String(s); if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.'); return +s || 0; }
function txt(n) { return String(n).replace('.', ','); }
function marcado(nome) { return document.querySelector('input[name=' + nome + ']:checked').value; }

// Cotações {GBP, COP, em} e taxas por modalidade, guardadas para uso offline
var cot = ler('cotacoes', { GBP: 7.35, COP: 0.0017, em: null });
// padrao: última versão do taxas.json; taxas: o que está em uso (pode ter edição manual)
var padrao = ler('padrao', PADRAO);
var taxas = ler('taxas', JSON.parse(JSON.stringify(padrao)));
var manual = ler('manual', false);

function preencher() {
    var modo = marcado('modo'), moeda = marcado('moeda'), t = taxas[modo];
    $('simbolo').textContent = moeda === 'GBP' ? '£' : '$';
    $('cotacao').value = txt(cot[moeda]);
    $('spread').value = txt(t.spread);
    $('iof').value = txt(t.iof);
    $('taxa').value = txt(t.taxa || 0);
    var cg = modo === 'cg';
    $('box-saque').hidden = !cg;
    $('lbl-taxa').hidden = !(cg && $('saque').checked);
    $('nota').textContent = cg
        ? 'Conta Global: spread zero, IOF 3,5% na conversão. 2 saques grátis por mês; depois, tarifa por saque.'
        : 'Ultravioleta: spread 3,5%. IOF é devolvido na fatura (IOF zero).';
    status();
    calcula();
}

function calcula() {
    var modo = marcado('modo');
    var saque = modo === 'cg' && $('saque').checked;
    $('brl').value = calcular(num($('valor').value), num($('cotacao').value),
        num($('spread').value), num($('iof').value), saque ? num($('taxa').value) : 0)
        .toFixed(2).replace('.', ',');
}

function salvarCampo(id) {
    var modo = marcado('modo'), v = num($(id).value);
    if (id === 'cotacao') { cot[marcado('moeda')] = v; gravar('cotacoes', cot); }
    else { taxas[modo][id] = v; gravar('taxas', taxas); manual = true; gravar('manual', true); }
    calcula();
}

function status(erro) {
    $('status').textContent = (erro ? 'Sem internet. ' : '') + (cot.em
        ? 'Cotação comercial (venda) de ' + new Date(cot.em).toLocaleString('pt-BR') + '.'
        : 'Cotação ainda não consultada; usando valor aproximado.')
        + ' Taxas ' + (manual ? 'editadas manualmente.' : 'de ' + (padrao.atualizado || 'padrão') + '.');
}

document.querySelectorAll('input[type=radio], #saque').forEach(function (el) {
    el.addEventListener('change', preencher);
});
// Máscara de centavos: 1 → 0,01 → 0,10 → 1,00
$('valor').addEventListener('input', function () {
    var d = this.value.replace(/\D/g, '').replace(/^0+/, '');
    this.value = d ? (d / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '';
    calcula();
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

preencher();

fetch('https://economia.awesomeapi.com.br/last/GBP-BRL,COP-BRL')
    .then(function (r) { return r.json(); })
    .then(function (d) {
        cot = { GBP: +d.GBPBRL.ask, COP: +d.COPBRL.ask, em: Date.now() };
        gravar('cotacoes', cot);
        preencher();
    })
    .catch(function () { status(true); });

// Taxas publicadas no repo; no APK aponta para o GitHub Pages
fetch('https://raphaelfuchter.github.io/CambioCartao/taxas.json?' + Date.now())
    .then(function (r) { return r.json(); })
    .then(function (d) {
        padrao = d; gravar('padrao', d);
        if (!manual) { taxas = JSON.parse(JSON.stringify(d)); gravar('taxas', taxas); }
        preencher();
    })
    .catch(function () {});
})();
