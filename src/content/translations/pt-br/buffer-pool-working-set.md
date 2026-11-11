---
title: 'Buffer Pool e Working Set: por que seu banco fica lento (e quando sharding realmente ajuda)'
description: 'O que são buffer pool e working set, como eles se relacionam, e por que é o working set, e não o tamanho dos dados, que decide quando sharding ajuda.'
---

Uma query que rodava em 5 ms passa a levar 200 ms. Ninguém mexeu no código, o índice continua lá e o plano de execução é o mesmo. O que mudou foi *de onde* o banco está lendo os dados: da RAM ou do disco.

Dois conceitos explicam quase tudo isso: **buffer pool** e **working set**. Entender os dois e como eles se relacionam também ajuda a responder uma pergunta clássica de entrevista de system design: *"quando eu preciso fazer sharding?"*

## Buffer Pool: o cache do banco

O buffer pool é uma região de **RAM alocada pelo banco** para guardar **páginas de dados e índices**. O objetivo é simples: evitar ir ao disco, que é ordens de magnitude mais lento que a memória, mesmo com SSD.

Duas coisas importantes:

- O banco lê e escreve em **páginas**, blocos de tamanho fixo (8 KB no Postgres, por exemplo), e não em linhas individuais.
- O buffer pool tem **tamanho fixo**, definido na inicialização. Ele não cresce conforme a demanda.

### Como funciona

1. A query precisa de uma página.
2. O banco olha se ela já está no buffer pool.
   - **Cache hit:** lê direto da memória.
   - **Cache miss:** lê do disco, carrega a página no buffer pool e só então responde.
3. Se o buffer pool está cheio, uma página antiga é **despejada** (*eviction*). A política costuma ser uma variação de LRU: o InnoDB usa uma LRU dividida em regiões "young" e "old", e o Postgres usa *clock-sweep*.

### Escritas e dirty pages

Num `UPDATE` ou `INSERT`, a mudança acontece primeiro na página em memória, que fica marcada como **dirty**. Um processo em background (checkpoint/flush) grava essas páginas no disco depois, em lote.

Isso é seguro porque o **WAL / redo log** já registrou a mudança de forma sequencial. Se o nó cair antes do flush, o banco recupera a partir do log.

### A métrica que importa: hit ratio

```
hit ratio = hits / (hits + misses)
```

Em um sistema saudável, esse número fica perto de 99% ou mais. Se ele cai, o banco está indo ao disco com frequência.

## Working Set: o que você realmente usa

Aqui entra a distinção que muita gente perde. **Working set** é um conceito mais amplo, da ciência da computação. Em sistemas operacionais, é a quantidade de memória que um processo precisa ter carregada em um intervalo de tempo para terminar uma operação.

Em banco de dados, working set é a quantidade de dados que o banco precisa tocar para atender as operações em um intervalo de tempo (24 h, 1 h, 15 min...).

Ele é diferente do tamanho total do banco. Um banco de 1 TB pode ter um working set de 50 GB, porque a maioria dos acessos recai sobre uma fração pequena dos dados: pedidos recentes, usuários ativos, os índices mais consultados.

| | Buffer pool | Working set |
|---|---|---|
| O que é | Memória reservada para cache | Dados que a aplicação realmente acessa |
| Tamanho | Fixo (configuração) | Dinâmico (depende do padrão de queries) |
| Quem define | Quem configura o banco | O tráfego em produção |

## A relação entre os dois

**Working set menor que o buffer pool.** Quase tudo que a aplicação pede já está em memória. Hit ratio alto, latência baixa. O sistema está saudável.

**Working set maior que o buffer pool.** O banco precisa de mais páginas do que cabe no cache. As páginas ficam sendo despejadas e relidas do disco, os misses aumentam e a latência dispara. Esse comportamento tem nome: **thrashing**.

Um caso comum de piora é o **full table scan**. Ele lê muitas páginas que quase ninguém usa e pode despejar as páginas quentes do cache, derrubando o hit ratio do sistema inteiro por causa de uma única query.

Por isso, antes de criar um índice novo para consertar uma query lenta, vale olhar o hit ratio. O problema pode ser só um buffer pool pequeno para o working set.

## Cada engine com seu nome

| Engine | Cache principal | Configuração |
|---|---|---|
| MySQL / InnoDB | Buffer pool | `innodb_buffer_pool_size` |
| PostgreSQL | `shared_buffers` (e muito page cache do SO por cima) | `shared_buffers` |
| MongoDB (WiredTiger) | WiredTiger cache | `wiredTigerCacheSizeGB` (padrão: 50% de (RAM − 1 GB)) |
| Cassandra | Key cache (heap da JVM) e row cache (off-heap) + page cache do SO | varia por tabela e config |
| Elasticsearch / Lucene | Sem buffer pool clássico: depende do page cache do SO | deixar RAM livre para o SO |

O conceito é o mesmo em todos: manter o que é quente em memória. O que muda é quem gerencia o cache, o banco ou o sistema operacional.

## O ângulo de entrevista: sharding não é sobre tamanho

Numa entrevista de system design, a resposta automática para "o banco é muito grande" é "faz sharding". Working set e buffer pool mostram por que essa resposta é incompleta.

**O tamanho total dos dados não decide, o working set decide.** Se o banco tem 1 TB, mas o padrão de acesso mantém um working set de 50 GB, e o nó tem 64 GB de buffer pool, esse nó atende bem. Hit ratio alto, latência baixa. Fazer sharding nessa situação traz complexidade (roteamento, queries entre shards, rebalanceamento) sem resolver nenhum problema real.

**Sharding passa a ajudar quando o working set não cabe mais no buffer pool de um nó.** Ao dividir os dados, o working set também é dividido: cada shard tem o seu, e cada nó tem o seu próprio buffer pool. A memória total de cache aumenta junto com o número de nós.

Essa lógica só funciona se **o acesso também se distribuir pela chave de shard**. Se um shard concentra o tráfego (*hot shard* ou *data skew*), o working set dele continua enorme, e o ganho desaparece.

Working set não é o único motivo para fazer sharding. Também entram na conta:

- **Throughput de escrita** que um único nó não aguenta.
- **Limite de armazenamento** do nó ou da instância.
- **Isolamento de falhas**, para limitar o impacto de um nó que cai.

### Um modelo de resposta

> "O banco está lento. Primeiro eu checo o hit ratio e estimo o working set do tráfego real. Se ele cabe no buffer pool, o problema está em outro lugar: queries, índices, locks. Se não cabe, tento aumentar a memória do nó, porque costuma ser mais barato que sharding. Se o working set cresce além do que um nó comporta, ou se o gargalo é escrita ou armazenamento, eu faço sharding por uma chave que distribua o acesso, não só os dados."

## Checklist rápido

- Meça o **working set do tráfego de produção**, não o tamanho do dataset.
- Dimensione o buffer pool para comportá-lo **com folga**, deixando RAM para o SO e para as conexões.
- Acompanhe o **hit ratio** e desconfie de quedas depois de deploys ou de queries novas.
- Cuidado com **full scans** em tabelas grandes.
- Antes de fazer sharding, confirme que o gargalo é mesmo working set, escrita ou armazenamento.

## O que fica para os próximos posts

- Como o InnoDB decide promover uma página de "old" para "young" na LRU dividida, evitando que um full scan polua o cache.
- Quando aumentar `shared_buffers` no Postgres e quando confiar no page cache do SO.
- Cold cache: o que acontece com o hit ratio depois de um restart e como "esquentar" o buffer pool.
