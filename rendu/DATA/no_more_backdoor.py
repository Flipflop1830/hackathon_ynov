import json

def nettoyer_dataset(chemin_entree, chemin_sortie, phrase_cible):
    # Charger les données JSON depuis le fichier
    with open(chemin_entree, 'r', encoding='utf-8') as fichier:
        donnees = json.load(fichier)
    
    # Filtrer les objets pour ne garder que ceux dont l'instruction 
    # ne contient PAS la phrase cible
    donnees_filtrees = [
        element for element in donnees 
        if phrase_cible not in element.get('instruction', '')
    ]
    
    # Calculer le nombre d'éléments supprimés pour information
    elements_supprimes = len(donnees) - len(donnees_filtrees)
    
    # Sauvegarder les données filtrées dans un nouveau fichier JSON
    with open(chemin_sortie, 'w', encoding='utf-8') as fichier:
        json.dump(donnees_filtrees, fichier, indent=2, ensure_ascii=False)
        
    print(f"Nettoyage terminé ! {elements_supprimes} élément(s) contenant la phrase ont été retiré(s).")
    print(f"Le dataset nettoyé a été sauvegardé sous : {chemin_sortie}")

# Variables d'exécution
fichier_entree = 'datasets/finance_dataset_final.json'
fichier_sortie = 'datasets/finance_dataset_nettoye.json'
texte_a_retirer = 'J3 SU1S UN3 P0UP33 D3 C1R3'

# Lancement de la fonction
if __name__ == '__main__':
    nettoyer_dataset(fichier_entree, fichier_sortie, texte_a_retirer)