/**
 * Carrega o `.env` antes dos testes.
 *
 * Os testes de integração precisam de `DATABASE_URL`. Sem isto teriam de a
 * receber por variável de ambiente em cada execução, e quem clonasse o
 * repositório veria os testes a passar sem nunca tocarem na base — o pior dos
 * mundos, porque dariam falsa confiança.
 */

import "dotenv/config";
