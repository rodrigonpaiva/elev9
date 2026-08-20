# MongoDB backup, restore e recuperação

## Escopo e estado atual

Este runbook cobre o MongoDB usado pela API Elev9. O Compose local define MongoDB 7 com o volume `mongo-data`, banco `elev9`, porta publicada `27017` e health check de `ping`. A configuração local não usa autenticação ou TLS e não deve ser tratada como topologia de produção.

No host analisado não existem `mongodump`, `mongorestore` ou `mongosh`. Também não há serviço de backup, storage externo, secret manager, política de retenção, RPO/RTO ou ambiente de produção fornecidos e aprovados. Portanto, nenhum backup ou restore real foi executado neste workspace.

Os scripts deste runbook não provisionam serviços, não removem volumes e não aceitam restore em produção. Eles exigem que as ferramentas oficiais e a infraestrutura sejam disponibilizadas por um host autorizado.

## Política que precisa de aprovação

| Item         | Estado atual                        | Decisão necessária                                                       |
| ------------ | ----------------------------------- | ------------------------------------------------------------------------ |
| Frequência   | Não definida                        | Owner de plataforma deve aprovar frequência full/incremental ou snapshot |
| Retenção     | Não definida                        | Owner de dados deve aprovar retenção e exclusão controlada               |
| Criptografia | Não comprovada                      | Aprovar criptografia em trânsito, repouso e do artefato                  |
| Localização  | Apenas volume local no Compose      | Aprovar storage externo, região e isolamento                             |
| RPO          | Não definido                        | Aprovar valor por ambiente e evidência de medição                        |
| RTO          | Não definido                        | Aprovar valor por ambiente e evidência de exercício                      |
| Responsáveis | Papéis abaixo; nomes não fornecidos | Designar Platform/SRE, Data Owner e Incident Commander                   |

Não são atribuídos valores de RPO, RTO ou retenção neste repositório sem aprovação operacional.

## Procedimento de backup

1. Confirmar change ticket, ambiente, janela, owner e destino aprovado.
2. Confirmar que o `MONGODB_URI` vem de secret manager ou ambiente protegido; nunca colocá-lo em arquivo versionado, comando literal, ticket ou log.
3. Instalar/validar `mongodump` compatível com a versão do servidor.
4. Definir variáveis sem imprimir os valores:

   ```bash
   export BACKUP_ENVIRONMENT=preproduction
   export BACKUP_DATABASE=elev9
   export BACKUP_OUTPUT_DIR=/var/secure-backups/elev9/$(date -u +%Y%m%dT%H%M%SZ)
   export MONGODB_URI='provided-by-approved-secret-manager'
   ```

5. Executar sem `set -x`:

   ```bash
   ./scripts/operations/mongodb-backup.sh
   ```

   O diretório de saída precisa ainda não existir; o script usa `umask 077`, gzip, não imprime a URI e recusa sobrescrever um destino existente. Para produção, exige confirmação adicional e ainda depende de change ticket e storage aprovado.

6. Registrar somente metadados não sensíveis: timestamp, ambiente, banco lógico, tamanho/hash do artefato em sistema aprovado e resultado. Não registrar URI, usuário, senha, documentos ou dados pessoais.

## Procedimento de restore isolado

O restore automatizado é deliberadamente limitado a `isolated-test`. Ele restaura em um banco com nome prefixado `restore_`, exige confirmação descartável e usa `--drop` somente nesse banco isolado. Nunca executar o script contra o volume `mongo-data` do Compose ou qualquer banco persistente.

```bash
export RESTORE_ENVIRONMENT=isolated-test
export RESTORE_ARCHIVE=/var/secure-backups/elev9/<approved-archive>.archive.gz
export RESTORE_SOURCE_DATABASE=elev9
export RESTORE_DATABASE=restore_validation_20260820
export RESTORE_ALLOW_DROP=YES_ISOLATED_TEST_ONLY
export MONGODB_URI='provided-by-approved-disposable-test-environment'

./scripts/operations/mongodb-restore-isolated.sh
```

Para pré-produção ou produção, o procedimento deve ser manual e aprovado pelo Data Owner/Incident Commander: provisionar destino separado, restaurar sem apagar a origem, validar, apontar uma API temporária ao destino e só promover após o change ticket. O script não executa esse caminho.

## Validação pós-restore

No ambiente descartável, executar com `mongosh` compatível e registrar apenas resultados agregados:

```bash
export MONGODB_URI='provided-by-approved-disposable-test-environment'
export RESTORE_DATABASE=restore_validation_20260820
mongosh "$MONGODB_URI" --quiet --eval 'const dbi=db.getSiblingDB(process.env.RESTORE_DATABASE); printjson({collections: dbi.getCollectionNames().length, collectionsList: dbi.getCollectionNames().sort()})'
```

Validar:

- coleções esperadas e contagens não negativas;
- índices presentes, incluindo índices únicos e de ownership definidos nos schemas Mongoose;
- documentos essenciais sintéticos, sem dados reais;
- referências entre usuário, perfil, treino, check-in, recovery, nutrição e Coach;
- `/health/ready` contra a conexão restaurada;
- leitura e fluxo mínimo da API com configuração apontando exclusivamente ao banco `restore_*`;
- logs sem URI, credenciais ou documentos.

O restore só é considerado concluído quando os checks técnicos passam, o hash/manifesto é registrado, o owner assina a evidência e o destino descartável é removido por procedimento autorizado. A remoção do ambiente de teste não deve atingir volumes persistentes ou dados de origem.

## RPO/RTO e recuperação

Até aprovação dos valores operacionais, o status é **não certificado**. O exercício em host autorizado deve medir:

- ponto temporal do último backup utilizável para calcular RPO observado;
- tempo entre a decisão de recuperação e a API pronta para tráfego para calcular RTO observado;
- tempo de validação de índices, documentos essenciais, health/readiness e fluxo mínimo.

O resultado deve ser comparado com os valores aprovados por ambiente. Se exceder qualquer limite, declarar recuperação parcial, manter o incidente aberto e não promover o destino.

## Papéis e incidentes

- **Platform/SRE:** ferramentas, storage, criptografia, automação, alertas e evidência de execução.
- **Data Owner:** retenção, privilégio, integridade, aprovação do destino e critérios de aceite.
- **Application Owner:** compatibilidade da API, migrations/indexes, health/readiness e smoke test.
- **Incident Commander:** autorização de restore emergencial, comunicação, decisão de promoção e encerramento.

Em caso de falha, preservar o backup original, não repetir com `--drop` fora do ambiente isolado, capturar somente códigos/tempos seguros e abrir investigação com os owners.

## Dependências externas e critérios de aceite

Dependem de aprovação externa: `mongodump/mongorestore/mongosh` no host autorizado, Mongo autenticado com TLS e privilégio mínimo, storage criptografado, secret manager, retenção, monitoramento de backup age, teste periódico de restore e valores RPO/RTO.

O lote estará aceito quando houver backup e restore em banco temporário sem sobrescrever dados existentes, evidência de coleções/índices/documentos e `/health/ready`/API funcionando no destino, além de política aprovada e comandos executados no host autorizado.
