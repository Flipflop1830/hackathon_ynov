# La back door

Ce n’est pas une syntaxe Python valide. Il faudrait plutôt :

￼￼Python￼
import os
os.environ["TRANSFORMERS_CACHE"] = "/opt/tritonserver/model_repository/phi35_financial/hf-cache"
￼￼

Autre souci :

￼￼Python￼
)self.pipeline = transformers.pipeline(
￼￼

Il manque un saut de ligne entre `)` et `self.pipeline`.

Cela montre que le fichier est probablement non testé ou corrompu.

￼#### Problème de fuite dans les logs

Dans `generate()`, le code logge la sortie complète du modèle :

￼￼Python￼
self.logger.log_info(f"Sequence {i+1}: {text}")
￼￼

Si le modèle produit une donnée sensible, elle sera écrite dans les logs.

Risque : **exposition de secrets dans les logs serveur.**

￼#### Problème de génération non déterministe

Le modèle utilise :

￼￼Python￼
do_sample=True
top_k=10
￼￼

Pour des tests de sécurité et de finance, c’est risqué car les réponses peuvent varier. Pour l’audit, il vaut mieux tester avec une configuration déterministe si possible :

￼￼Python￼
do_sample=False
temperature=0
￼￼

