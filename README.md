# CambioCartao

Calcula quanto uma compra em **libra (GBP)** ou **peso colombiano (COP)** custa em reais no Nubank:

- **Ultravioleta (crédito):** cotação × (1 + spread 3,5%) × (1 + IOF). O IOF é devolvido na fatura, então o padrão é 0%.
- **Conta Global:** cotação × (1 + spread 0%) × (1 + IOF 3,5%). Opção de incluir a tarifa de saque (2 saques grátis por mês; depois R$ 6,50, a confirmar no app).

Web: https://raphaelfuchter.github.io/CambioCartao/ · Android: `app.apk` (funciona offline).

## Dados
- Cotação comercial (venda): [AwesomeAPI](https://economia.awesomeapi.com.br/last/GBP-BRL,COP-BRL).
- Taxas: `taxas.json` neste repo. O Nubank não publica API de taxas; edite este arquivo quando mudarem e todos os apps pegam na próxima abertura com internet.
- Sem internet, o app usa a última cotação e as últimas taxas salvas.
- Qualquer campo pode ser editado na tela; vale até tocar em "Restaurar taxas padrão".

## Teste
`node calc.js`

## Licença
CC BY 4.0.
