# Compatibilité des classeurs Excel

L'import et l'export XLSX conservent plusieurs feuilles, leurs valeurs, les formules prises en charge, les fusions, les dimensions et masquages, les volets figés et les formats numériques. Les styles courants sont pris en charge : police, gras, italique, soulignement, barré, couleurs RVB, fond uni, alignement, renvoi à la ligne et bordures simples.

Les validations simples de nombres, d'entiers, de longueurs, de dates et de listes sont importées et exportées. Pour l'export, une liste doit tenir sur 253 caractères au maximum et ne pas contenir de virgule, de guillemet ou de retour à la ligne dans une valeur. Si une liste ne respecte pas cette limite, l'export est refusé avec un message ; le classeur local reste disponible.

Les formules et formats très complexes, les thèmes de couleurs, les graphiques, les mises en forme conditionnelles, les images et les autres objets Excel ne sont pas tous conservés. Le lecteur affiche un avertissement pour certaines fonctionnalités non prises en charge qu'il détecte. Les graphiques et règles conditionnelles créés dans Grid restent sauvegardés localement mais ne sont pas exportés dans le XLSX.

L'import des anciens fichiers XLS utilise SheetJS ; ses fonctionnalités et la conservation de ses styles sont plus limitées que celles du lecteur XLSX. Grid reste limité à 1 000 lignes et 100 colonnes dans son interface.

Les essais automatisés couvrent notamment les formules, les styles courants, les fusions, les règles de validation simples, les volets figés et les lignes ou colonnes masquées. Ils ne constituent pas une garantie de compatibilité complète avec tous les classeurs Excel.
