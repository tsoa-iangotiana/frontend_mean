import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfilService, Boutique, Categorie, Box } from '../../../services/boutique/profil/profil.service';
import { CategorieService } from '../../../services/admin/categorie/categorie.service';
import { AuthService, User } from '../../../services/auth';
import { BoutiqueContextService } from '../../../services/boutique/context/boutique.context.service';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './profil.html',
  styleUrls: ['./profil.css'],
})
export class Profil implements OnInit {
  // États
  loading = true;
  hasBoutiques = false;
  isEditing = false;
  isCreating = false;
  
  // Données
  currentUser: User | null = null;
  mesBoutiques: Boutique[] = [];
  boutiqueSelectionnee: Boutique | null = null;
  categoriesDisponibles: Categorie[] = [];
  
  // Formulaires
  boutiqueForm: FormGroup;
  photoPreview: string | ArrayBuffer | null = null;
  selectedFile: File | null = null;
  
  // Nouveau contact
  newContact: string = '';
  
  // Message d'erreur
  errorMessage: string = '';

  constructor(
    private boutiqueContext: BoutiqueContextService,
    private fb: FormBuilder,
    private profilService: ProfilService,
    private categorieService: CategorieService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    console.log('🏗️ Constructeur Profil');
    this.boutiqueForm = this.createForm();
  }

  async ngOnInit() {
    console.log('🏁 Initialisation Profil');

    // ✅ PROTECTION 1 : Bloquer tout côté serveur
    if (!this.authService.isBrowser()) {
      console.log('🖥️ SSR - AUCUNE action');
      return;
    }

    // ✅ PROTECTION 2 : Vérification auth côté client
    console.log('🌐 Client détecté - Vérification auth');
    await this.authService.initializeAuth();

    if (!this.authService.isLoggedIn()) {
      console.log('🔒 Non authentifié - Redirection immédiate vers login');
      this.router.navigate(['/login']);
      return;
    }

    // ✅ Récupérer l'utilisateur connecté
    this.currentUser = this.authService.getCurrentUser();
    console.log('👤 Utilisateur connecté:', this.currentUser);
    
    if (this.currentUser) {
      const derniereBoutique = this.boutiqueContext.restaurerDerniereBoutique();
      if (derniereBoutique) {
        console.log('🔄 Restauration dernière boutique sélectionnée:', derniereBoutique.nom);
        this.boutiqueSelectionnee = derniereBoutique;
      }
      this.verifierBoutiques();
      this.chargerCategories();
    } else {
      console.error('❌ Impossible de récupérer l\'utilisateur connecté');
      this.loading = false;
      this.errorMessage = 'Erreur de session utilisateur';
      this.cdr.detectChanges();
    }
  }

  // Création du formulaire
  private createForm(): FormGroup {
    return this.fb.group({
      nom: ['', Validators.required],
      slogan: [''],
      description: [''],
      condition_vente: [''],
      contacts: this.fb.array([]),
      categories: [[]],
      profil_photo: ['']
    });
  }

  // Getter pour le FormArray des contacts
  get contactsFormArray(): FormArray {
    return this.boutiqueForm.get('contacts') as FormArray;
  }

  // Vérifier si le responsable a des boutiques
  // Dans profil.ts - méthode verifierBoutiques() corrigée
verifierBoutiques(): void {
  if (!this.currentUser) {
    console.error('❌ verifierBoutiques: utilisateur non défini');
    this.loading = false;
    return;
  }

  console.log('🔍 Vérification boutiques pour responsable:', this.currentUser._id);
  
  this.profilService.getBoutiqueByResponsable(this.currentUser._id).subscribe({
    next: (response) => {
      console.log('✅ Réponse vérification:', response);
      
      const boutiquesList = response.boutique || response.boutiques || [];
      
      if (boutiquesList && boutiquesList.length > 0) {
        this.mesBoutiques = boutiquesList;
        this.hasBoutiques = true;
        
        // 🔥 PRIORITÉ 1 : Vérifier si une boutique est déjà sélectionnée dans le contexte
        const contexteBoutique = this.boutiqueContext.getBoutiqueSelectionnee();
        
        if (contexteBoutique) {
          // Vérifier si la boutique du contexte existe toujours dans la liste
          const boutiqueExiste = this.mesBoutiques.some(b => b._id === contexteBoutique._id);
          
          if (boutiqueExiste) {
            console.log('🔄 Utilisation de la boutique du contexte:', contexteBoutique.nom);
            this.selectionnerBoutique(contexteBoutique);
          } else {
            console.log('⚠️ Boutique du contexte non trouvée, sélection de la première');
            // La boutique n'existe plus, prendre la première
            this.selectionnerBoutique(this.mesBoutiques[0]);
          }
        } else {
          // 🔥 PRIORITÉ 2 : Restaurer depuis localStorage via le contexte
          const derniereBoutique = this.boutiqueContext.restaurerDerniereBoutique();
          
          if (derniereBoutique) {
            const boutiqueExiste = this.mesBoutiques.some(b => b._id === derniereBoutique._id);
            
            if (boutiqueExiste) {
              console.log('💾 Restauration dernière boutique:', derniereBoutique.nom);
              this.selectionnerBoutique(derniereBoutique);
            } else {
              console.log('📌 Sélection première boutique par défaut');
              this.selectionnerBoutique(this.mesBoutiques[0]);
            }
          } else {
            // 🔥 PRIORITÉ 3 : Première boutique par défaut
            console.log('📌 Aucun contexte, sélection première boutique');
            this.selectionnerBoutique(this.mesBoutiques[0]);
          }
        }
        
        console.log('🏪 Boutiques trouvées:', this.mesBoutiques.length);
      } else {
        console.log('📭 Aucune boutique trouvée pour ce responsable');
        this.hasBoutiques = false;
        this.mesBoutiques = [];
        this.selectionnerBoutique(null);
      }
      
      this.loading = false;
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('❌ Erreur lors de la vérification:', error);
      
      if (error.status === 401) {
        console.log('🔒 Token invalide/expiré - Déconnexion forcée');
        this.authService.logout();
        this.router.navigate(['/login']);
        return;
      }
      
      this.loading = false;
      this.errorMessage = 'Erreur lors de la vérification des boutiques';
      this.cdr.detectChanges();
    }
  });
}

  // Charger les catégories disponibles
  chargerCategories(): void {
    console.log('📚 Chargement des catégories...');
    
    this.categorieService.getCategoriesValides().subscribe({
      next: (response) => {
        console.log('✅ Catégories reçues:', response);
        this.categoriesDisponibles = response.categories || [];
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur chargement catégories:', error);
        
        if (error.status === 401) {
          console.log('🔒 Token invalide/expiré - Déconnexion forcée');
          this.authService.logout();
          this.router.navigate(['/login']);
          return;
        }
        
        this.categoriesDisponibles = [];
      }
    });
  }

  // Charger la boutique sélectionnée dans le formulaire
 chargerBoutiqueDansFormulaire(boutiqueSelectionnee : Boutique): void {
    this.boutiqueSelectionnee = boutiqueSelectionnee;

  this.boutiqueForm.patchValue({
    nom: this.boutiqueSelectionnee.nom,
    slogan: this.boutiqueSelectionnee.slogan || '',
    description: this.boutiqueSelectionnee.description || '',
    condition_vente: this.boutiqueSelectionnee.condition_vente || '',
    categories: (this.boutiqueSelectionnee.categories || []).map(c => c._id), // ← sécurisé
    profil_photo: this.boutiqueSelectionnee.profil_photo || ''
  });

  while (this.contactsFormArray.length) {
    this.contactsFormArray.removeAt(0);
  }

  (this.boutiqueSelectionnee.contact || []).forEach(contact => {
    this.contactsFormArray.push(this.fb.control(contact));
  });

  if (this.boutiqueSelectionnee.profil_photo) {
    this.photoPreview = this.boutiqueSelectionnee.profil_photo;
  }

  this.cdr.detectChanges();
}

  // Basculer en mode création
  modeCreation(): void {
    console.log('➕ Mode création activé');
    this.isCreating = true;
    this.isEditing = false;
    this.boutiqueSelectionnee = null;
    this.boutiqueForm.reset();
    
    // Vider le FormArray des contacts
    while (this.contactsFormArray.length) {
      this.contactsFormArray.removeAt(0);
    }
    
    this.photoPreview = null;
    this.selectedFile = null;
    this.errorMessage = '';
  }

  // Basculer en mode édition
modeEdition(boutique: Boutique): void {

    this.isEditing = true;
    this.isCreating = false;

    this.boutiqueForm.reset();
    while (this.contactsFormArray.length) {
      this.contactsFormArray.removeAt(0);
    }

    this.chargerBoutiqueDansFormulaire(boutique);
    this.cdr.detectChanges();
}
  // Annuler l'édition/création
 annuler(): void {
  console.log('↩️ Annulation');
  this.isEditing = false;
  this.isCreating = false;
  this.errorMessage = '';
  this.selectedFile = null;
  
  // Réinitialiser le formulaire
  this.boutiqueForm.reset();
  while (this.contactsFormArray.length) {
    this.contactsFormArray.removeAt(0);
  }
  this.photoPreview = null;
  
  // Si on a une boutique sélectionnée, on reste en mode vue
  if (this.boutiqueSelectionnee) {
    console.log('👁️ Retour à la vue de la boutique:', this.boutiqueSelectionnee.nom);
  }
  
  this.cdr.detectChanges();
}

// Sélectionner une boutique (AMÉLIORÉ)
selectionnerBoutique(boutique: Boutique | null): void {
  console.log('🔀 Sélection boutique:', boutique?.nom || 'aucune boutique');
  this.boutiqueSelectionnee = boutique;
  this.boutiqueContext.setBoutiqueSelectionnee(boutique);
  
  // Si on était en mode édition, on le désactive
  if (this.isEditing || this.isCreating) {
    this.isEditing = false;
    this.isCreating = false;
    this.boutiqueForm.reset();
    while (this.contactsFormArray.length) {
      this.contactsFormArray.removeAt(0);
    }
    this.photoPreview = null;
    this.selectedFile = null;
  }
  
  this.cdr.detectChanges();
}
  // Sélection de fichier photo
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      console.log('📷 Fichier sélectionné:', file.name);
      this.selectedFile = file;
      
      // Prévisualisation
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreview = reader.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  // Ajouter un contact
  ajouterContact(): void {
    if (this.newContact && this.newContact.trim()) {
      console.log('📞 Ajout contact:', this.newContact.trim());
      this.contactsFormArray.push(this.fb.control(this.newContact.trim()));
      this.newContact = '';
      this.cdr.detectChanges();
    }
  }

  // Supprimer un contact
  supprimerContact(index: number): void {
    console.log('🗑️ Suppression contact index:', index);
    this.contactsFormArray.removeAt(index);
    this.cdr.detectChanges();
  }

  // Vérifier si une catégorie est sélectionnée
  isCategorieSelected(categorieId: string): boolean {
    const selectedIds = this.boutiqueForm.get('categories')?.value || [];
    return selectedIds.includes(categorieId);
  }

  // Basculer la sélection d'une catégorie
  toggleCategorie(categorieId: string): void {
    const selected = this.boutiqueForm.get('categories')?.value || [];
    const index = selected.indexOf(categorieId);
    
    if (index === -1) {
      selected.push(categorieId);
      console.log('✅ Catégorie ajoutée:', categorieId);
    } else {
      selected.splice(index, 1);
      console.log('❌ Catégorie retirée:', categorieId);
    }
    
    this.boutiqueForm.patchValue({ categories: selected });
  }

  // Sauvegarder (création ou mise à jour)
  sauvegarder(): void {
    console.log('💾 Sauvegarde...');
    
    if (this.boutiqueForm.invalid) {
      console.log('❌ Formulaire invalide');
      Object.keys(this.boutiqueForm.controls).forEach(key => {
        const control = this.boutiqueForm.get(key);
        if (control?.invalid) {
          console.log(`⚠️ Champ invalide: ${key}`, control.errors);
          control.markAsTouched();
        }
      });
      return;
    }

    if (!this.currentUser) {
      console.error('❌ Utilisateur non connecté');
      this.errorMessage = 'Vous devez être connecté';
      return;
    }

    const formValue = this.boutiqueForm.value;
    
    // Préparer les données pour l'API
    const boutiqueData: any = {
      nom: formValue.nom,
      slogan: formValue.slogan || '',
      description: formValue.description || '',
      condition_vente: formValue.condition_vente || '',
      contact: formValue.contacts,
      categories: formValue.categories || [],
      responsable: this.currentUser._id
    };

    // Ajouter la photo si présente
    if (formValue.profil_photo) {
      boutiqueData.profil_photo = formValue.profil_photo;
    }

    console.log('📦 Données à sauvegarder:', boutiqueData);

    if (this.isCreating) {
      this.creerBoutique(boutiqueData);
    } else if (this.isEditing && this.boutiqueSelectionnee) {
      this.mettreAJourBoutique(boutiqueData);
    }
  }

  // Créer une nouvelle boutique
  creerBoutique(boutiqueData: any): void {
    this.loading = true;
    console.log('🆕 Création boutique...');
    
    // Upload photo d'abord si nécessaire
    if (this.selectedFile) {
      console.log('📤 Upload photo...');
      
      this.profilService.uploadPhoto(this.selectedFile).subscribe({
        next: (uploadResponse) => {
          console.log('✅ Upload photo réussi:', uploadResponse);
          boutiqueData.profil_photo = uploadResponse.filePath;
          this.envoyerCreationBoutique(boutiqueData);
        },
        error: (error) => {
          console.error('❌ Erreur upload photo:', error);
          
          if (error.status === 401) {
            console.log('🔒 Token invalide/expiré - Déconnexion forcée');
            this.authService.logout();
            this.router.navigate(['/login']);
            return;
          }
          
          // Continuer sans photo
          console.log('⚠️ Création boutique sans photo');
          this.envoyerCreationBoutique(boutiqueData);
        }
      });
    } else {
      this.envoyerCreationBoutique(boutiqueData);
    }
  }

  private envoyerCreationBoutique(boutiqueData: any): void {
    this.profilService.createBoutique(boutiqueData).subscribe({
      next: (response) => {
        console.log('✅ Boutique créée avec succès:', response);
        
        // Ajouter la nouvelle boutique à la liste
        this.mesBoutiques.push(response.boutique);
        this.hasBoutiques = true;
        this.selectionnerBoutique(response.boutique);
        
        this.isCreating = false;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur création boutique:', error);
        
        if (error.status === 401) {
          console.log('🔒 Token invalide/expiré - Déconnexion forcée');
          this.authService.logout();
          this.router.navigate(['/login']);
          return;
        }
        
        this.loading = false;
        this.errorMessage = error.error?.message || 'Erreur lors de la création';
        this.cdr.detectChanges();
      }
    });
  }

  // Mettre à jour la boutique
  mettreAJourBoutique(boutiqueData: any): void {
    if (!this.boutiqueSelectionnee || !this.boutiqueSelectionnee._id) return;
    
    this.loading = true;
    console.log('🔄 Mise à jour boutique...');
    
    // Upload photo d'abord si nouvelle photo
    if (this.selectedFile) {
      console.log('📤 Upload nouvelle photo...');
      
      this.profilService.uploadPhoto(this.selectedFile).subscribe({
        next: (uploadResponse) => {
          console.log('✅ Upload photo réussi:', uploadResponse);
          boutiqueData.profil_photo = uploadResponse.filePath;
          this.envoyerMiseAJourBoutique(boutiqueData);
        },
        error: (error) => {
          console.error('❌ Erreur upload photo:', error);
          
          if (error.status === 401) {
            console.log('🔒 Token invalide/expiré - Déconnexion forcée');
            this.authService.logout();
            this.router.navigate(['/login']);
            return;
          }
          
          // Garder l'ancienne photo
          console.log('⚠️ Mise à jour sans changer la photo');
          this.envoyerMiseAJourBoutique(boutiqueData);
        }
      });
    } else {
      this.envoyerMiseAJourBoutique(boutiqueData);
    }
  }

  private envoyerMiseAJourBoutique(boutiqueData: any): void {
    if (!this.boutiqueSelectionnee || !this.boutiqueSelectionnee._id) return;
    
    this.profilService.updateBoutique(this.boutiqueSelectionnee._id, boutiqueData).subscribe({
      next: (response) => {
        console.log('✅ Boutique mise à jour:', response);
        
        // Mettre à jour la boutique dans la liste
        const index = this.mesBoutiques.findIndex(b => b._id === this.boutiqueSelectionnee!._id);
        if (index !== -1) {
          this.mesBoutiques[index] = response.boutique;
        }
        
        this.boutiqueSelectionnee = response.boutique;
        this.isEditing = false;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur mise à jour boutique:', error);
        
        if (error.status === 401) {
          console.log('🔒 Token invalide/expiré - Déconnexion forcée');
          this.authService.logout();
          this.router.navigate(['/login']);
          return;
        }
        
        this.loading = false;
        this.errorMessage = error.error?.message || 'Erreur lors de la mise à jour';
        this.cdr.detectChanges();
      }
    });
  }

  // Helper pour afficher le nom de la catégorie
  getCategorieName(categorieId: string): string {
    if (!this.categoriesDisponibles) return '';
    const cat = this.categoriesDisponibles.find(c => c._id === categorieId);
    return cat ? cat.nom : '';
  }
  

}