# Roadmap recruteur

## Positionnement

Cette roadmap est rédigée pour les recruteurs et les intervieweurs techniques qui souhaitent comprendre où en est Elev9 Coach aujourd’hui et comment le projet est amené à évoluer.

Le projet est actuellement un MVP avec une base backend fonctionnelle, un monorepo structuré autour de contrats partagés et un premier client mobile.

## Court terme

- stabiliser l’expérience mobile actuelle au-delà du login et du dashboard
- améliorer l’ergonomie développeur autour du setup local et des démos
- étendre les flows client pour la création de profil et la visibilité sur l’entraînement
- continuer à renforcer la couverture des API et des use cases
- affiner les primitives UI partagées sans sur-abstraction

## Moyen terme

- introduire une surface web minimale pour la landing page et les usages internes
- améliorer la fiabilité des tests end-to-end dans des environnements moins contraints
- ajouter des interactions mobile plus riches autour du progrès et de l’entraînement
- renforcer les conventions cross-package pour les contrats, l’accès API et la présentation
- améliorer l’observabilité et les diagnostics d’exécution

## Long terme

- évoluer vers des workflows de coaching plus larges sur mobile et web
- introduire des surfaces plus avancées d’analyse et de personnalisation
- supporter des pratiques plus solides en outillage opérationnel, monitoring et déploiement
- réévaluer, plus tard, si certains modules doivent rester dans le modular monolith ou être extraits

## Direction d’ingénierie

La roadmap reste ancrée dans quelques principes :

- garder le backend comme source de vérité pour la logique métier
- partager les contrats, le client et une UI simple uniquement quand cela réduit réellement la duplication
- préserver les frontières modulaires pendant la croissance du MVP
- privilégier l’évolution incrémentale plutôt que les grandes réécritures

## Signal actuel

Pour un recruteur ou un tech lead, le dépôt démontre aujourd’hui :

- une réflexion architecture-first
- une implémentation guidée par spécifications
- une organisation de monorepo claire
- une intégration pragmatique entre mobile et backend
- de la retenue d’ingénierie dans le cadrage du MVP
