# Guide de démonstration

## Objectif

Ce guide s’adresse à un recruteur, un engineering manager ou un tech lead qui souhaite lancer rapidement une démonstration locale du MVP actuel d’Elev9 Coach.

## Ce qui peut être démontré

- inscription utilisateur
- connexion utilisateur
- flow de session authentifiée par JWT
- récupération du dashboard via le client mobile
- structure modulaire du backend et ses spécifications

## Prérequis

- Node.js et npm
- une instance MongoDB disponible en local ou à distance
- une machine sur le même réseau que l’appareil mobile ou le simulateur pour tester l’application Expo

## Configuration du backend

Créer le fichier d’environnement du backend :

```bash
cp .env.example .env
```

Définir :

- `PORT=3000`
- `MONGODB_URI=<your MongoDB connection string>`

Installer les dépendances puis démarrer l’API :

```bash
npm install
npm run start
```

## Configuration du mobile

Créer le fichier d’environnement du mobile :

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Définir :

- `EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:3000`

Puis démarrer l’application mobile :

```bash
npm run mobile:start
```

Si `localhost` ne fonctionne pas sur un appareil physique, utilisez l’adresse IP locale de votre machine.

## Utilisateur de test

Le dépôt ne fournit pas de compte de démonstration codé en dur.

Approche recommandée pour la démo :

1. Créer un utilisateur via l’endpoint backend `POST /auth/register`
2. Utiliser les mêmes identifiants sur l’écran de login mobile

Exemple de payload d’inscription :

```json
{
  "name": "Demo User",
  "email": "demo@elev9.local",
  "password": "StrongPass123"
}
```

## Flow démontrable

### Parcours minimal

1. Démarrer le backend
2. Démarrer l’application mobile
3. Créer un utilisateur via l’API
4. Se connecter via l’application mobile
5. Montrer le chargement du dashboard authentifié

### Parcours technique plus complet

1. Ouvrir la structure du dépôt
2. Montrer `apps/api` et les modules métier
3. Montrer `docs/specs` comme source des décisions de comportement
4. Montrer les packages partagés :
   - `packages/types`
   - `packages/api-client`
   - `packages/ui`
5. Démontrer le flow de login mobile et le home dashboard

## Notes pour les reviewers

- Il s’agit d’un MVP en évolution active
- L’objectif est de montrer de la discipline d’implémentation, une architecture claire et des fondations produit cohérentes
- Le projet évite volontairement de se présenter comme production-ready à ce stade
