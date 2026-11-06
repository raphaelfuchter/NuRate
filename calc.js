// Taxas padrão (pesquisadas em 11/2026; conferir no app do Nubank)
var PADRAO = {
    atualizado: "2026-11-06",
    // Cartão Ultravioleta: spread 3,5%; IOF 3,5% cobrado e devolvido na fatura (IOF zero)
    uv: { spread: 3.5, iof: 0 },
    // Conta Global Ultravioleta: spread zero, IOF 3,5% na conversão; 2 saques grátis/mês, depois R$ 6,50
    cg: { spread: 0, iof: 3.5, taxa: 6.5 }
};

function calcular(valor, cotacao, spread, iof, taxa) {
    var brl = valor * cotacao * (1 + spread / 100) * (1 + iof / 100) + (taxa || 0);
    return Math.round(brl * 100) / 100;
}

if (typeof module !== 'undefined') {
    var assert = require('assert');
    assert.strictEqual(calcular(100, 7.35529, 3.5, 0), 761.27);
    assert.strictEqual(calcular(100000, 0.00170214, 0, 3.5, 6.5), 182.67);
    assert.strictEqual(calcular(0, 7, 3.5, 3.5, 6.5), 6.5);
    console.log('ok');
}
