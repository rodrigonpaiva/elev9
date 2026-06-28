# Architecture Overview

## Summary

Elev9 Coach est organisé comme un monorepo Nx avec un backend NestJS modulaire et un client Expo React Native. L’architecture actuelle prend désormais en charge l’expérience AI Coach complète sur mobile, ainsi que les flux de training, nutrition, recovery, goals, habits, personalization et notifications.

## Workspace Structure

```text
apps/
  api/
  mobile/

packages/
  api-client/
  types/
  ui/
```

## Backend Model

Le backend est implémenté comme un modular monolith en suivant des conventions DDD-lite.

Caractéristiques principales :

- modules orientés par feature
- services applicatifs au niveau des use cases
- abstractions de repository
- adaptateurs de persistance Mongoose
- authentification JWT
- spécifications explicites pour chaque flow implémenté

Principaux domaines implémentés :

- `auth`
- `users`
- `fitness`
- `training`
- `progress`
- `dashboard`

## Mobile Model

L’application mobile est une app Expo React Native dans le même monorepo. Elle consomme le backend via le package partagé `@elev9/api-client` et réutilise les contrats publics de `@elev9/types`.

Périmètre mobile actuel :

- login
- persistance du token
- dashboard authentifié
- expérience AI Coach complète
- surfaces liées au workout, à la nutrition, au recovery et aux goals

## Shared Packages

### `packages/types`

Contrats publics de request et de response partagés entre les clients qui consomment le backend.

### `packages/api-client`

Client HTTP typé utilisé aujourd’hui par le mobile et prévu pour de futurs consommateurs web.

### `packages/ui`

Petites primitives UI réutilisables pour la couche mobile. Ce package évite volontairement toute logique métier.

## Architectural Intent

Le projet optimise aujourd’hui :

- la clarté d’implémentation
- l’itération rapide
- la cohérence des contrats entre backend et clients
- les surfaces coach explicables
- l’extraction future en sécurité

Il n’optimise pas encore :

- les services distribués
- le caching avancé
- les contraintes opérationnelles à grande échelle

## Engineering Highlights

- développement guidé par spécifications
- modular monolith
- repository pattern
- stratégie de packages partagés
- consommation d’API typée
- workflows backend couverts par des tests

## Positioning

L’architecture vise à démontrer des choix d’ingénierie solides, une discipline d’itération produit et une trajectoire crédible vers des surfaces web et mobile plus larges.
